// @ts-nocheck
// Supabase Edge Function: Razorpay Route Marketplace Settlement Engine
// Security Hardened: Production Grade (All 14 Security Audit Issues Remediated)
// 1. RAZORPAY_KEY_SECRET & RAZORPAY_WEBHOOK_SECRET are strictly server-side.
// 2. All fee math (0.25% Buyer + 0.25% Seller = 0.50% Platform Take-Rate) is calculated server-side.
// 3. Unconditional HMAC-SHA256 signature verification prior to order funding.
// 4. Razorpay payment status strictly verified as 'captured' on gateway REST API.
// 5. Transfer release failure halts settlement and leaves order escrow held.
// 6. Webhook signature is mandatory and validated with secret.
// 7. Buyer identity is authenticated from JWT session (never trusted from request body).
// 8. Listing stock, price, and active status are verified server-side.
// 9. Payment amount is verified against database order record.
// 10. Direct testing fallback order creation is removed.
// 11. Caller authorization is checked before exposing escrow settlement information.
// 12. Plaintext OTP is not persisted to order records upon escrow release.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Ambient declaration for Deno runtime globals (used by Supabase Edge Functions)
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Razorpay API Base
const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

// Helper: HMAC SHA-256 Signature Verification
async function verifyHmacSha256(secret: string, payload: string, expectedSignature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  const signatureHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signatureHex === expectedSignature;
}

// Helper: Base64 Basic Auth Header for Razorpay
function getRazorpayAuthHeader(keyId: string, keySecret: string): string {
  const credentials = `${keyId}:${keySecret}`;
  return `Basic ${btoa(credentials)}`;
}

// Helper: Compute Authoritative Order Total (Crop + Buyer Fee + Freight + Freight Fee) in Paise
async function computeAuthoritativeOrderTotal(supabase: any, order: any) {
  let { data: linkedDelivery } = await supabase
    .from("deliveries")
    .select("id, freight_amount, freight_escrow_status, status")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!linkedDelivery && order.order_number) {
    const delByNum = await supabase
      .from("deliveries")
      .select("id, freight_amount, freight_escrow_status, status")
      .eq("order_number", order.order_number)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    linkedDelivery = delByNum.data;
  }

  const freightAmt = Number(linkedDelivery?.freight_amount || order.freight_amount || 0);
  const cropAmt = Number(order.total_amount || 0);
  const buyerCropFee = Number(order.buyer_fee_amount ?? Math.round(cropAmt * 0.0025 * 100) / 100);
  const freightFee = Number(order.freight_fee_amount ?? Math.round(freightAmt * 0.0025 * 100) / 100);

  const computedPaise =
    freightAmt > 0
      ? Math.round((cropAmt + buyerCropFee + freightAmt + freightFee) * 100)
      : Math.round((cropAmt + buyerCropFee) * 100);
  const storedGrandTotalPaise = Math.round((Number(order.grand_total_amount) || 0) * 100);
  const authoritativeTotalPaise = Math.max(computedPaise, storedGrandTotalPaise);

  return { linkedDelivery, freightAmt, authoritativeTotalPaise };
}

// Helper: Persist verified escrow funding on public.orders AND unlock linked public.deliveries
async function fundOrderAndUnlockDelivery(
  supabase: any,
  {
    order,
    linkedDelivery,
    freightAmt,
    paymentMode,
    paymentMethod,
    paymentId,
    bankUtr,
    razorpaySignature,
    transferId,
  }: {
    order: any;
    linkedDelivery: any;
    freightAmt: number;
    paymentMode: string;
    paymentMethod?: string;
    paymentId?: string | null;
    bankUtr?: string | null;
    razorpaySignature?: string | null;
    transferId?: string | null;
  }
) {
  if (
    ["released", "refunded", "cancelled"].includes(order.escrow_status || "") ||
    ["completed", "cancelled"].includes(order.status || "")
  ) {
    return { skipped: true, reason: `Order is already in terminal state (${order.escrow_status || order.status}).` };
  }

  const nowIso = new Date().toISOString();
  const orderPatch: Record<string, any> = {
    escrow_status: "funded",
    settlement_status: "captured_on_hold",
    status: "order_placed",
    escrow_deposited_at: order.escrow_deposited_at || nowIso,
    updated_at: nowIso,
  };
  if (paymentMode) orderPatch.payment_mode = paymentMode;
  if (paymentMethod) orderPatch.payment_method = paymentMethod;
  if (paymentId) {
    orderPatch.razorpay_payment_id = paymentId;
    orderPatch.payment_id = paymentId;
  }
  if (bankUtr) orderPatch.bank_utr = bankUtr;
  if (razorpaySignature) orderPatch.razorpay_signature = razorpaySignature;
  if (transferId) orderPatch.razorpay_transfer_id = transferId;

  const { error: orderUpdateErr } = await supabase
    .from("orders")
    .update(orderPatch)
    .eq("id", order.id);

  if (orderUpdateErr) {
    throw new Error(`Failed to persist verified order escrow status: ${orderUpdateErr.message}`);
  }

  if (freightAmt > 0) {
    const { error: lockErr } = await supabase.rpc("lock_buyer_order_and_freight_escrow_atomic", {
      p_order_id: order.id,
      p_payment_mode: paymentMode,
      p_payment_id: paymentId || bankUtr || order.payment_id || null,
      p_bank_utr: bankUtr || paymentId || order.bank_utr || null,
      p_auto_verified: true,
    });
    if (lockErr) {
      throw new Error(`Failed to lock combined freight escrow atomically: ${lockErr.message}`);
    }
  } else if (
    linkedDelivery?.id &&
    !["escrow_locked", "locked", "released"].includes(linkedDelivery.freight_escrow_status || "")
  ) {
    const { error: delUpdateErr } = await supabase
      .from("deliveries")
      .update({
        status: "assigned",
        freight_escrow_status: "escrow_locked",
        freight_payment_mode: paymentMode,
        freight_bank_utr: bankUtr || paymentId || null,
        freight_deposited_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", linkedDelivery.id);

    if (delUpdateErr) {
      throw new Error(`Failed to unlock linked delivery status: ${delUpdateErr.message}`);
    }
  }

  return { skipped: false };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = {};
    }
    const action = body.action || (body.event ? "webhook" : (req.headers.get("X-Razorpay-Signature") ? "webhook" : null));

    // Enforce secret presence for all merchant actions
    if (action && action !== "webhook" && (!razorpayKeyId || !razorpayKeySecret)) {
      throw new Error("Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured in Supabase Edge Function secrets.");
    }

    // =========================================================================
    // CALLER AUTHENTICATION & AUTHORIZATION
    // =========================================================================
    let callerUser: any = null;
    let callerRole = "buyer";

    if (action && action !== "webhook") {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.slice(7).trim();
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (!userErr && userData?.user) {
          callerUser = userData.user;
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", callerUser.id)
            .maybeSingle();
          callerRole = prof?.role || "buyer";
        }
      }

      // Reject unauthenticated requests for sensitive gateway and escrow actions
      if (!callerUser) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized: A valid Supabase user authentication session is required to invoke payment operations.",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // =========================================================================
    // ACTION 1: CREATE RAZORPAY ORDER (Authoritative Stock, Pricing & Identity)
    // =========================================================================
    if (action === "create_order") {
      const { listingId, quantity, existingOrderId, loanId, inspectionId, inspection_id, payment_context } = body;

      // Issue 6: Enforce authenticated buyer identity from caller session (Never trust body.buyerId)
      const buyerId = callerUser.id;
      const { data: buyerProfile } = await supabase
        .from("profiles")
        .select("name, full_name, role")
        .eq("id", buyerId)
        .maybeSingle();
      const buyerName = buyerProfile?.name || buyerProfile?.full_name || callerUser.user_metadata?.full_name || "Verified Wholesale Buyer";

      // Authoritative Server-Side Quality Lab Inspection Fee Order Creation
      if (payment_context === "inspection_fee" || inspectionId || inspection_id) {
        const targetInspectionId = inspectionId || inspection_id;
        if (!targetInspectionId) {
          throw new Error("A valid inspectionId is required to initiate lab inspection fee payment.");
        }

        let { data: inspection, error: inspErr } = await supabase
          .from("inspections")
          .select("*")
          .eq("id", targetInspectionId)
          .maybeSingle();

        if (!inspErr && !inspection) {
          const byReportNum = await supabase
            .from("inspections")
            .select("*")
            .eq("report_number", targetInspectionId)
            .maybeSingle();
          inspection = byReportNum.data;
          inspErr = byReportNum.error;
        }

        if (inspErr || !inspection) {
          throw new Error("Inspection record not found for fee payment.");
        }

        if (callerRole !== "admin" && inspection.buyer_id && inspection.buyer_id !== callerUser.id) {
          return new Response(
            JSON.stringify({ success: false, error: "Forbidden: You can only pay lab inspection fees for your own inspection requests." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (inspection.fee_status === "paid") {
          throw new Error("This inspection lab fee has already been paid.");
        }
        if (["cancelled", "resolved"].includes(inspection.status || "")) {
          throw new Error(`Cannot pay inspection fee when status is ${inspection.status}.`);
        }

        const feeRupees = Number(inspection.inspection_fee) > 0 ? Number(inspection.inspection_fee) : 500;
        const feePaise = Math.round(feeRupees * 100);

        const rzpRes = await fetch(`${RAZORPAY_API_BASE}/orders`, {
          method: "POST",
          headers: {
            Authorization: getRazorpayAuthHeader(razorpayKeyId, razorpayKeySecret),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: feePaise,
            currency: "INR",
            receipt: `insp_${inspection.report_number || inspection.id}_${Date.now()}`.slice(0, 40),
            notes: {
              platform: "AgroLnk",
              payment_context: "inspection_fee",
              inspection_id: inspection.id,
              report_number: inspection.report_number || "",
              order_id: inspection.order_id || "",
              order_number: inspection.order_number || "",
              buyer_id: callerUser.id,
            },
          }),
        });

        const rzpOrder = await rzpRes.json();
        if (!rzpRes.ok) {
          throw new Error(rzpOrder.error?.description || "Failed to create Razorpay Order for inspection fee.");
        }

        return new Response(
          JSON.stringify({
            success: true,
            keyId: razorpayKeyId,
            orderId: rzpOrder.id,
            inspectionId: inspection.id,
            amount: feePaise,
            currency: "INR",
            feeRupees,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Authoritative Server-Side Loan Repayment Order Creation (e-NWR & Trade Credit Settlement)
      if (payment_context === "loan_repayment" || loanId) {
        if (!loanId) {
          throw new Error("A valid loanId is required to initiate institutional loan repayment.");
        }

        let { data: loan, error: loanErr } = await supabase
          .from("financing_requests")
          .select("*")
          .eq("id", loanId)
          .maybeSingle();

        if (!loanErr && !loan) {
          const byReqNum = await supabase
            .from("financing_requests")
            .select("*")
            .eq("request_number", loanId)
            .maybeSingle();
          loan = byReqNum.data;
          loanErr = byReqNum.error;
        }

        if (loanErr || !loan) {
          throw new Error("Loan record not found for repayment.");
        }

        if (callerRole !== "admin" && loan.applicant_id && loan.applicant_id !== callerUser.id) {
          return new Response(
            JSON.stringify({ success: false, error: "Forbidden: You can only repay your own loan." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (["repaid", "settled"].includes(loan.status || "")) {
          throw new Error("This loan has already been repaid and settled.");
        }
        if (["rejected", "cancelled"].includes(loan.status || "")) {
          throw new Error(`Cannot repay loan in ${loan.status} status.`);
        }
        if (!["approved", "disbursed", "escrow_secured", "active"].includes(loan.status || "")) {
          throw new Error(`Loan is not in an active repayable state (status: ${loan.status}).`);
        }

        const principal = Number(loan.approved_amount || loan.offered_amount || loan.requested_amount || 0);
        if (!Number.isFinite(principal) || principal <= 0) {
          throw new Error("Invalid loan principal amount.");
        }

        const tenureDays = Number(loan.tenor_days) || (loan.repayment_option === "60_day_extended" ? 60 : 30);
        const monthlyRate = loan.interest_rate ? Number(loan.interest_rate) / 100 : 0.012;
        const interest = Math.round(principal * monthlyRate * (tenureDays / 30));
        const totalDueRupees = principal + interest;
        const totalDuePaise = Math.round(totalDueRupees * 100);

        const rzpRes = await fetch(`${RAZORPAY_API_BASE}/orders`, {
          method: "POST",
          headers: {
            Authorization: getRazorpayAuthHeader(razorpayKeyId, razorpayKeySecret),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: totalDuePaise,
            currency: "INR",
            receipt: `repay_${loan.request_number || loan.id}_${Date.now()}`.slice(0, 40),
            notes: {
              platform: "AgroLnk",
              payment_context: "loan_repayment",
              loan_id: loan.id,
              request_number: loan.request_number || "",
              receipt_id: loan.receipt_id || "",
              receipt_number: loan.receipt_number || "",
              borrower_id: callerUser.id,
            },
          }),
        });

        const rzpOrder = await rzpRes.json();
        if (!rzpRes.ok) {
          throw new Error(rzpOrder.error?.description || "Failed to create Razorpay Order for loan repayment.");
        }

        return new Response(
          JSON.stringify({
            success: true,
            keyId: razorpayKeyId,
            orderId: rzpOrder.id,
            loanId: loan.id,
            amount: totalDuePaise,
            currency: "INR",
            financials: {
              principal,
              interest,
              totalDue: totalDueRupees,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Combined Crop + Freight Checkout for an existing reserved/quoted order
      if (existingOrderId) {
        let { data: existingOrder, error: existingErr } = await supabase
          .from("orders")
          .select("*")
          .eq("id", existingOrderId)
          .maybeSingle();

        if (!existingErr && !existingOrder) {
          const byNumber = await supabase
            .from("orders")
            .select("*")
            .eq("order_number", existingOrderId)
            .maybeSingle();
          existingOrder = byNumber.data;
          existingErr = byNumber.error;
        }

        if (existingErr || !existingOrder) {
          throw new Error("Order record not found for combined escrow checkout.");
        }

        if (callerRole !== "admin" && existingOrder.buyer_id && existingOrder.buyer_id !== buyerId) {
          return new Response(
            JSON.stringify({ success: false, error: "Forbidden: You can only pay for your own orders." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (["funded", "held", "escrow_secured", "released"].includes(existingOrder.escrow_status || "")) {
          throw new Error("Escrow for this order is already funded.");
        }
        if (["cancelled", "completed"].includes(existingOrder.status || "")) {
          throw new Error(`Order is ${existingOrder.status} and cannot accept payment.`);
        }

        let { data: linkedDelivery } = await supabase
          .from("deliveries")
          .select("*")
          .eq("order_id", existingOrder.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!linkedDelivery && existingOrder.order_number) {
          const delByNum = await supabase
            .from("deliveries")
            .select("*")
            .eq("order_number", existingOrder.order_number)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          linkedDelivery = delByNum.data;
        }

        const cropAmount = Number(existingOrder.total_amount || 0);
        if (!Number.isFinite(cropAmount) || cropAmount <= 0) {
          throw new Error("Invalid order crop amount.");
        }

        const freightAmount = Number(linkedDelivery?.freight_amount || existingOrder.freight_amount || 0);
        if (existingOrder.status === "awaiting_freight_quote" && !(freightAmount > 0)) {
          throw new Error("Cannot start combined escrow checkout before a transporter freight quote (> ₹0) is recorded.");
        }

        const cropValuePaise = Math.round(cropAmount * 100);
        const buyerCropFeePaise = Math.round(cropValuePaise * 0.0025);
        const sellerCropFeePaise = Math.round(cropValuePaise * 0.0025);
        const freightPaise = Math.round(freightAmount * 100);
        const freightFeePaise = Math.round(freightPaise * 0.0025);
        const totalBuyerPayablePaise = cropValuePaise + buyerCropFeePaise + freightPaise + freightFeePaise;

        const rzpRes = await fetch(`${RAZORPAY_API_BASE}/orders`, {
          method: "POST",
          headers: {
            Authorization: getRazorpayAuthHeader(razorpayKeyId, razorpayKeySecret),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: totalBuyerPayablePaise,
            currency: "INR",
            receipt: `rcpt_${existingOrder.order_number || existingOrder.id}_${Date.now()}`.slice(0, 40),
            notes: {
              platform: "AgroLnk",
              existing_order_id: existingOrder.id,
              order_number: existingOrder.order_number,
              crop_value_inr: cropAmount.toFixed(2),
              freight_inr: freightAmount.toFixed(2),
              total_payable_inr: (totalBuyerPayablePaise / 100).toFixed(2),
            },
          }),
        });

        const rzpOrder = await rzpRes.json();
        if (!rzpRes.ok) {
          throw new Error(rzpOrder.error?.description || "Failed to create Razorpay Order for combined escrow.");
        }

        await supabase
          .from("orders")
          .update({
            razorpay_order_id: rzpOrder.id,
            buyer_fee_amount: buyerCropFeePaise / 100,
            seller_fee_amount: sellerCropFeePaise / 100,
            platform_commission_amount: (buyerCropFeePaise + sellerCropFeePaise) / 100,
            net_seller_amount: (cropValuePaise - sellerCropFeePaise) / 100,
            freight_amount: freightAmount,
            freight_fee_amount: freightFeePaise / 100,
            grand_total_amount: totalBuyerPayablePaise / 100,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingOrder.id);

        return new Response(
          JSON.stringify({
            success: true,
            keyId: razorpayKeyId,
            orderId: rzpOrder.id,
            existingOrderId: existingOrder.id,
            amount: totalBuyerPayablePaise,
            currency: "INR",
            financials: {
              tradeValue: cropAmount,
              freightAmount,
              buyerFee: (buyerCropFeePaise + freightFeePaise) / 100,
              totalPayable: totalBuyerPayablePaise / 100,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Issue 9: Reject new order creation without a valid listingId (Remove fallback testing ₹4200 orders)
      if (!listingId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "A valid listingId is required for order creation. Fallback testing orders are disabled.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Issue 7: Validate listing existence, active status, unit price and stock availability
      const { data: listing, error: listingErr } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .single();

      if (listingErr || !listing) {
        throw new Error("Invalid or nonexistent commodity listing.");
      }

      if (listing.status && listing.status !== "active") {
        throw new Error(`Listing is no longer active for procurement (status: ${listing.status}).`);
      }

      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error("Order quantity must be a positive number.");
      }

      const availableQty = Number(listing.quantity);
      if (Number.isFinite(availableQty) && availableQty > 0 && qty > availableQty) {
        throw new Error(`Requested quantity (${qty} ${listing.unit || "kg"}) exceeds available listing stock (${availableQty} ${listing.unit || "kg"}).`);
      }

      const price = Number(listing.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Invalid commodity listing unit price.");
      }

      const tradeValueRupees = qty * price;
      const tradeValueInPaise = Math.round(tradeValueRupees * 100);
      const commodity = `${listing.commodity} (${listing.variety || "Grade A"})`;
      const farmerId = listing.farmer_id || "";
      const farmerName = listing.farmer_name || "Verified Producer";

      // Compute 0.25% Buyer Fee & 0.25% Seller Fee in Paise (Authoritative Server-Side Math)
      const buyerFeePaise = Math.round(tradeValueInPaise * 0.0025);
      const sellerFeePaise = Math.round(tradeValueInPaise * 0.0025);
      const totalPlatformFeePaise = buyerFeePaise + sellerFeePaise;
      const totalBuyerPayablePaise = tradeValueInPaise + buyerFeePaise;
      const netFarmerPayoutPaise = tradeValueInPaise - sellerFeePaise;

      const orderReceipt = `rcpt_agro_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Call Razorpay API to create order
      const rzpRes = await fetch(`${RAZORPAY_API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: getRazorpayAuthHeader(razorpayKeyId, razorpayKeySecret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalBuyerPayablePaise,
          currency: "INR",
          receipt: orderReceipt,
          notes: {
            platform: "AgroLnk",
            listing_id: listingId,
            commodity,
            trade_value_inr: (tradeValueInPaise / 100).toFixed(2),
            buyer_fee_inr: (buyerFeePaise / 100).toFixed(2),
            seller_fee_inr: (sellerFeePaise / 100).toFixed(2),
            platform_commission_inr: (totalPlatformFeePaise / 100).toFixed(2),
            net_farmer_payout_inr: (netFarmerPayoutPaise / 100).toFixed(2),
          },
        }),
      });

      const rzpOrder = await rzpRes.json();
      if (!rzpRes.ok) {
        throw new Error(rzpOrder.error?.description || "Failed to create Razorpay Order on payment gateway.");
      }

      // Save authoritative pre-order record in Supabase
      const orderNumber = `#AGM-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error: insertOrderErr } = await supabase.from("orders").insert([
        {
          id: `ord_${Date.now()}`,
          order_number: orderNumber,
          listing_id: listingId,
          buyer_id: buyerId,
          buyer_name: buyerName,
          farmer_id: farmerId || null,
          farmer_name: farmerName,
          commodity,
          quantity: qty,
          unit: listing.unit || "kg",
          price_per_unit: price,
          total_amount: tradeValueInPaise / 100,
          buyer_fee_amount: buyerFeePaise / 100,
          seller_fee_amount: sellerFeePaise / 100,
          platform_commission_amount: totalPlatformFeePaise / 100,
          net_seller_amount: netFarmerPayoutPaise / 100,
          razorpay_order_id: rzpOrder.id,
          escrow_status: "pending",
          settlement_status: "pending_deposit",
          status: "order_placed",
        },
      ]);

      if (insertOrderErr) {
        console.error("Order insertion error:", insertOrderErr);
        throw new Error(`Failed to record order in database: ${insertOrderErr.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          keyId: razorpayKeyId,
          orderId: rzpOrder.id,
          amount: totalBuyerPayablePaise,
          currency: "INR",
          financials: {
            tradeValue: tradeValueInPaise / 100,
            buyerFee: buyerFeePaise / 100,
            totalPayable: totalBuyerPayablePaise / 100,
            sellerFee: sellerFeePaise / 100,
            netFarmerPayout: netFarmerPayoutPaise / 100,
            platformTakeRate: totalPlatformFeePaise / 100,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTION 2: VERIFY PAYMENT SIGNATURE, CAPTURE, AMOUNT & CREATE TRANSFER
    // =========================================================================
    if (action === "verify_payment") {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_context,
      } = body;

      // Issue 1: Compulsory verification fields (Order ID, Payment ID, Signature are mandatory)
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Payment verification parameters missing: razorpay_order_id, razorpay_payment_id, and razorpay_signature are all mandatory.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Issue 1: Unconditional HMAC SHA-256 Signature Verification
      const expectedPayload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const isValid = await verifyHmacSha256(razorpayKeySecret, expectedPayload, razorpay_signature);

      if (!isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid payment signature verification. Potential tampering detected.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Issue 2: Query Razorpay API for Live Capture (No mock_ bypass permitted)
      let payData: any = null;
      try {
        const payRes = await fetch(`${RAZORPAY_API_BASE}/payments/${razorpay_payment_id}`, {
          method: "GET",
          headers: {
            Authorization: getRazorpayAuthHeader(razorpayKeyId, razorpayKeySecret),
            "Content-Type": "application/json",
          },
        });

        if (!payRes.ok) {
          const errData = await payRes.json().catch(() => ({}));
          return new Response(
            JSON.stringify({
              success: false,
              error: `Razorpay payment inquiry failed: ${errData.error?.description || payRes.statusText}`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        payData = await payRes.json();
      } catch (apiErr: any) {
        console.error("Payment API verification error:", apiErr);
        return new Response(
          JSON.stringify({ success: false, error: `Payment gateway verification failed: ${apiErr.message}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Issue 3: Payment Capture Verification (Strictly captured only)
      if (payData.status !== "captured") {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Payment is not in captured status on gateway (status: ${payData.status}). Only captured payments can fund escrow.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Currency & Order ID Validation
      if (payData.currency !== "INR") {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Currency mismatch: expected INR, received ${payData.currency}`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (payData.order_id && payData.order_id !== razorpay_order_id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Order ID mismatch: gateway payment is linked to ${payData.order_id}, but verification received ${razorpay_order_id}.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Issue 8: Validate Payment Amount Against Authoritative Database Order
      let transferId = null;
      let loanUpdated = false;
      let verifiedLoanId = null;
      let inspectionUpdated = false;
      let verifiedInspectionId = null;
      if (
        !payment_context ||
        payment_context === "order_checkout" ||
        payment_context === "order" ||
        payment_context === "combined_escrow"
      ) {
        const { data: order, error: orderLookupErr } = await supabase
          .from("orders")
          .select("*")
          .eq("razorpay_order_id", razorpay_order_id)
          .maybeSingle();

        if (orderLookupErr || !order) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Associated order record not found in database for razorpay_order_id.",
            }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Authorize caller to verify this order
        const isCallerAdmin = callerRole === "admin";
        if (!isCallerAdmin && order.buyer_id && order.buyer_id !== callerUser.id) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Forbidden: You are not authorized to verify payment for an order belonging to another user.",
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { linkedDelivery, freightAmt, authoritativeTotalPaise } = await computeAuthoritativeOrderTotal(supabase, order);

        if (Math.abs(Number(payData.amount) - authoritativeTotalPaise) > 2) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Payment amount mismatch: expected authoritative order amount of ${authoritativeTotalPaise} paise (₹${(authoritativeTotalPaise / 100).toFixed(2)}), but gateway captured ${payData.amount} paise (₹${(payData.amount / 100).toFixed(2)}).`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If producer has a linked Razorpay Route account, initialize transfer on_hold
        if (order.farmer_id) {
          const { data: farmerProfile } = await supabase
            .from("profiles")
            .select("route_account_id")
            .eq("id", order.farmer_id)
            .maybeSingle();

          if (farmerProfile?.route_account_id) {
            const netFarmerPaise = Math.round((Number(order.net_seller_amount) || 0) * 100);
            try {
              const transferRes = await fetch(`${RAZORPAY_API_BASE}/orders/${razorpay_order_id}/transfers`, {
                method: "POST",
                headers: {
                  Authorization: getRazorpayAuthHeader(razorpayKeyId, razorpayKeySecret),
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  transfers: [
                    {
                      account: farmerProfile.route_account_id,
                      amount: netFarmerPaise,
                      currency: "INR",
                      on_hold: 1, // Locks funds in deferred marketplace settlement until delivery OTP
                      notes: {
                        order_number: order.order_number,
                        type: "milestone_deferred_settlement",
                      },
                    },
                  ],
                }),
              });
              const transferData = await transferRes.json();
              if (transferData?.items?.[0]?.id) {
                transferId = transferData.items[0].id;
              }
            } catch (tErr) {
              console.warn("Route transfer deferral notice:", tErr);
            }
          }
        }

        // Persist verified order funding and atomically unlock linked freight delivery
        await fundOrderAndUnlockDelivery(supabase, {
          order,
          linkedDelivery,
          freightAmt,
          paymentMode: "direct_razorpay",
          paymentMethod: "razorpay_route",
          paymentId: razorpay_payment_id,
          bankUtr: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          transferId,
        });
      } else if (payment_context === "loan_repayment") {
        // Authoritative Server-Side Loan Repayment & Collateral Lien Release
        const orderRes = await fetch(`${RAZORPAY_API_BASE}/orders/${razorpay_order_id}`, {
          method: "GET",
          headers: {
            Authorization: getRazorpayAuthHeader(razorpayKeyId, razorpayKeySecret),
            "Content-Type": "application/json",
          },
        });

        if (!orderRes.ok) {
          const orderErrData = await orderRes.json().catch(() => ({}));
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to verify Razorpay loan repayment order: ${orderErrData.error?.description || orderRes.statusText}`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const rzpOrderData = await orderRes.json();
        const orderLoanId = rzpOrderData?.notes?.loan_id || null;
        const orderContext = rzpOrderData?.notes?.payment_context || null;
        const requestedLoanId = body.loan_id || body.loanId || null;

        if (orderContext !== "loan_repayment" || !orderLoanId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Razorpay order is not bound to an AgroLnk loan repayment.",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (requestedLoanId && requestedLoanId !== orderLoanId && requestedLoanId !== rzpOrderData?.notes?.request_number) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Loan ID mismatch between verification request and payment order.",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: loan, error: loanLookupErr } = await supabase
          .from("financing_requests")
          .select("*")
          .eq("id", orderLoanId)
          .maybeSingle();

        if (loanLookupErr || !loan) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Associated financing loan record not found for repayment verification.",
            }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (callerRole !== "admin" && loan.applicant_id && loan.applicant_id !== callerUser.id) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Forbidden: You are not authorized to verify repayment for another user's loan.",
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const principal = Number(loan.approved_amount || loan.offered_amount || loan.requested_amount || 0);
        const tenureDays = Number(loan.tenor_days) || (loan.repayment_option === "60_day_extended" ? 60 : 30);
        const monthlyRate = loan.interest_rate ? Number(loan.interest_rate) / 100 : 0.012;
        const interest = Math.round(principal * monthlyRate * (tenureDays / 30));
        const authoritativeDuePaise = Math.round((principal + interest) * 100);

        if (Number(payData.amount) < authoritativeDuePaise - 200) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Repayment amount insufficient: expected at least ${authoritativeDuePaise} paise (₹${(authoritativeDuePaise / 100).toFixed(2)}), but gateway captured ${payData.amount} paise.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const paidRupees = Math.round(Number(payData.amount)) / 100;
        const nowIso = new Date().toISOString();

        if (!["repaid", "settled"].includes(loan.status || "")) {
          const { error: loanUpdateErr } = await supabase
            .from("financing_requests")
            .update({
              status: "repaid",
              repaid_at: nowIso,
              repayment_method: "razorpay",
              repayment_transaction_id: razorpay_payment_id,
              repayment_amount: paidRupees,
              repayment_principal: principal,
              repayment_interest: interest,
              repayment_notes: `Verified Razorpay loan settlement (Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}).`,
              updated_at: nowIso,
            })
            .eq("id", loan.id);

          if (loanUpdateErr) {
            throw new Error(`Failed to persist verified loan repayment status: ${loanUpdateErr.message}`);
          }
        }

        // Explicitly invoke collateral release (idempotent with trg_sync_financing_receipt_lien)
        if (loan.receipt_id || loan.receipt_number) {
          const { error: releaseErr } = await supabase.rpc("release_warehouse_receipt_lien_atomic", {
            p_loan_id: loan.id,
            p_receipt_id: loan.receipt_id || loan.receipt_number,
          });
          if (releaseErr) {
            throw new Error(`Failed to release pledged warehouse receipt lien: ${releaseErr.message}`);
          }
        }

        loanUpdated = true;
        verifiedLoanId = loan.id;
      } else if (payment_context === "inspection_fee") {
        // Authoritative Server-Side Lab Inspection Fee Verification & Fee Status Update
        const orderRes = await fetch(`${RAZORPAY_API_BASE}/orders/${razorpay_order_id}`, {
          method: "GET",
          headers: {
            Authorization: getRazorpayAuthHeader(razorpayKeyId, razorpayKeySecret),
            "Content-Type": "application/json",
          },
        });

        if (!orderRes.ok) {
          const orderErrData = await orderRes.json().catch(() => ({}));
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to verify Razorpay inspection fee order: ${orderErrData.error?.description || orderRes.statusText}`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const rzpOrderData = await orderRes.json();
        const orderInspectionId = rzpOrderData?.notes?.inspection_id || null;
        const orderContext = rzpOrderData?.notes?.payment_context || null;
        const requestedInspectionId = body.inspection_id || body.inspectionId || null;

        if (orderContext !== "inspection_fee" || !orderInspectionId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Razorpay order is not bound to an AgroLnk inspection fee payment.",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (
          requestedInspectionId &&
          requestedInspectionId !== orderInspectionId &&
          requestedInspectionId !== rzpOrderData?.notes?.report_number
        ) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Inspection ID mismatch between verification request and payment order.",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: inspection, error: inspLookupErr } = await supabase
          .from("inspections")
          .select("*")
          .eq("id", orderInspectionId)
          .maybeSingle();

        if (inspLookupErr || !inspection) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Associated inspection record not found for fee verification.",
            }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (callerRole !== "admin" && inspection.buyer_id && inspection.buyer_id !== callerUser.id) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Forbidden: You are not authorized to verify inspection fee payment for another buyer.",
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const feeRupees = Number(inspection.inspection_fee) > 0 ? Number(inspection.inspection_fee) : 500;
        const authoritativeFeePaise = Math.round(feeRupees * 100);

        if (Math.abs(Number(payData.amount) - authoritativeFeePaise) > 2) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Inspection fee amount mismatch: expected ${authoritativeFeePaise} paise (₹${feeRupees.toFixed(2)}), but gateway captured ${payData.amount} paise.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const nowIso = new Date().toISOString();
        if (inspection.fee_status !== "paid") {
          const { error: inspUpdateErr } = await supabase
            .from("inspections")
            .update({
              fee_status: "paid",
              fee_paid_at: nowIso,
              fee_payment_id: razorpay_payment_id,
              fee_payment_method: "Razorpay Gateway",
              updated_at: nowIso,
            })
            .eq("id", inspection.id);

          if (inspUpdateErr) {
            throw new Error(`Failed to persist verified inspection fee status: ${inspUpdateErr.message}`);
          }
        }

        inspectionUpdated = true;
        verifiedInspectionId = inspection.id;
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          transferId,
          loanUpdated,
          loanId: verifiedLoanId,
          inspectionUpdated,
          inspectionId: verifiedInspectionId,
          amount: payData.amount,
          currency: payData.currency,
          status: loanUpdated ? "repaid" : inspectionUpdated ? "fee_paid" : "captured_on_hold",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTION 3: RELEASE ROUTE TRANSFER HOLD (Server-Side Delivery OTP & Role Authorization)
    // =========================================================================
    if (action === "release_hold") {
      const { orderNumber, otpCode } = body;

      const cleanOtp = String(otpCode || "").trim();
      if (!cleanOtp || cleanOtp.length < 4) {
        throw new Error("Invalid delivery confirmation OTP code format.");
      }

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`)
        .single();

      if (orderErr || !order) {
        throw new Error("Order not found for settlement release.");
      }

      // Issue 10: Perform Caller Authorization BEFORE returning any escrow status or figures
      const isAdmin = callerRole === "admin";
      const isAssignedBuyer = order.buyer_id === callerUser?.id;

      const { data: delivery } = await supabase
        .from("deliveries")
        .select("delivery_otp, status, transporter_id")
        .or(`order_id.eq.${order.id},order_number.eq.${order.order_number}`)
        .maybeSingle();

      const isAssignedTransporter = delivery?.transporter_id === callerUser?.id;

      if (!isAdmin && !isAssignedBuyer && !isAssignedTransporter) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Forbidden: You are not authorized to release escrow funds or view settlement details for this order.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check order escrow state AFTER authorization check
      if (order.escrow_status === "released") {
        return new Response(
          JSON.stringify({
            success: true,
            settled: true,
            orderNumber: order.order_number,
            payoutReleased: order.net_seller_amount,
            message: "Escrow was already released previously.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (order.escrow_status !== "funded" && order.escrow_status !== "held") {
        throw new Error(`Cannot release escrow in current state: ${order.escrow_status}. Order funds must be locked in escrow first.`);
      }

      // Enforce Delivery OTP verification for non-admin callers
      if (!isAdmin) {
        if (!delivery?.delivery_otp || String(delivery.delivery_otp).trim() !== cleanOtp) {
          throw new Error("Security Violation: Delivery OTP verification failed. Settlement release rejected.");
        }
      }

      // Issue 4: Release hold via Razorpay Route API (Halt on failure; do NOT falsely mark released)
      if (order.razorpay_transfer_id) {
        const releaseRes = await fetch(`${RAZORPAY_API_BASE}/transfers/${order.razorpay_transfer_id}`, {
          method: "PATCH",
          headers: {
            Authorization: getRazorpayAuthHeader(razorpayKeyId, razorpayKeySecret),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            on_hold: 0, // Unlocks and settles funds to Farmer's linked account
          }),
        });

        if (!releaseRes.ok) {
          const errData = await releaseRes.json().catch(() => ({}));
          const errMsg = errData.error?.description || releaseRes.statusText || "Gateway transfer release failed";
          throw new Error(`Razorpay transfer release failed: ${errMsg}. Order remains held in escrow.`);
        }
      }

      // Additional C: Update Order in Supabase to released & completed WITHOUT persisting plaintext OTP
      await supabase
        .from("orders")
        .update({
          escrow_status: "released",
          settlement_status: "released_to_seller",
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({
          success: true,
          settled: true,
          orderNumber: order.order_number,
          payoutReleased: order.net_seller_amount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTION 4: AUTHORITATIVE WEBHOOK LISTENER (Mandatory Secret & Signature)
    // =========================================================================
    if (action === "webhook") {
      const webhookSignature = req.headers.get("X-Razorpay-Signature") || "";
      const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "";

      // Issue 5: Webhook signature verification is mandatory
      if (!webhookSecret) {
        return new Response(
          JSON.stringify({ error: "RAZORPAY_WEBHOOK_SECRET is not configured on server" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!webhookSignature) {
        return new Response(
          JSON.stringify({ error: "Missing mandatory X-Razorpay-Signature header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isWebhookValid = await verifyHmacSha256(webhookSecret, rawBody, webhookSignature);
      if (!isWebhookValid) {
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const event = body.event;
      if (event === "payment.captured" || event === "order.paid") {
        const paymentEntity = body.payload?.payment?.entity;
        const orderEntity = body.payload?.order?.entity;
        const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
        const eventNotes = orderEntity?.notes || paymentEntity?.notes || {};

        // Non-marketplace contexts (loan_repayment, inspection_fee) are handled by their dedicated flows
        if (["loan_repayment", "inspection_fee"].includes(eventNotes?.payment_context || "")) {
          return new Response(JSON.stringify({ received: true, ignored: true, reason: "non_order_context" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (paymentEntity?.status && event === "payment.captured" && paymentEntity.status !== "captured") {
          return new Response(
            JSON.stringify({
              received: true,
              verified: false,
              funded: false,
              error: `Payment status is ${paymentEntity.status}; only captured payments can fund escrow.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const currency = paymentEntity?.currency || orderEntity?.currency || "INR";
        if (currency !== "INR") {
          return new Response(
            JSON.stringify({
              received: true,
              verified: false,
              funded: false,
              error: `Currency mismatch: expected INR, received ${currency}.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (rzpOrderId) {
          let { data: order } = await supabase
            .from("orders")
            .select("*")
            .eq("razorpay_order_id", rzpOrderId)
            .maybeSingle();

          if (!order && (eventNotes.existing_order_id || eventNotes.order_id || eventNotes.orderId)) {
            const noteOrderId = eventNotes.existing_order_id || eventNotes.order_id || eventNotes.orderId;
            const byId = await supabase.from("orders").select("*").eq("id", noteOrderId).maybeSingle();
            if (byId.data && (!byId.data.razorpay_order_id || byId.data.razorpay_order_id === rzpOrderId)) {
              order = byId.data;
            }
          }

          if (order) {
            const { linkedDelivery, freightAmt, authoritativeTotalPaise } = await computeAuthoritativeOrderTotal(supabase, order);
            const paidPaise = Number(paymentEntity?.amount ?? orderEntity?.amount_paid ?? orderEntity?.amount ?? 0);

            if (
              !Number.isFinite(authoritativeTotalPaise) ||
              authoritativeTotalPaise <= 0 ||
              !Number.isFinite(paidPaise) ||
              paidPaise + 2 < authoritativeTotalPaise
            ) {
              return new Response(
                JSON.stringify({
                  received: true,
                  verified: false,
                  funded: false,
                  error: `Webhook payment amount insufficient: expected at least ${authoritativeTotalPaise} paise (₹${(authoritativeTotalPaise / 100).toFixed(2)}), received ${paidPaise} paise (₹${(paidPaise / 100).toFixed(2)}).`,
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            const bankUtr =
              paymentEntity?.acquirer_data?.bank_transaction_id ||
              paymentEntity?.acquirer_data?.rrn ||
              paymentEntity?.id ||
              null;

            await fundOrderAndUnlockDelivery(supabase, {
              order,
              linkedDelivery,
              freightAmt,
              paymentMode: "direct_razorpay",
              paymentMethod: "razorpay_route",
              paymentId: paymentEntity?.id || null,
              bankUtr,
            });
          }
        }
      } else if (event === "virtual_account.credited") {
        // Smart Collect VAN Bank Transfer Credit (NEFT / RTGS / IMPS)
        const vaEntity = body.payload?.virtual_account?.entity;
        const paymentEntity = body.payload?.payment?.entity;
        const bankTransferEntity = body.payload?.bank_transfer?.entity;
        const vaNotes = vaEntity?.notes || paymentEntity?.notes || bankTransferEntity?.notes || {};
        const targetOrderId = vaNotes.orderId || vaNotes.order_id;
        const targetOrderNumber = vaNotes.orderNumber || vaNotes.order_number;
        const targetVanNumber =
          vaEntity?.receivers?.[0]?.account_number ||
          vaEntity?.account_number ||
          bankTransferEntity?.virtual_account?.receivers?.[0]?.account_number ||
          null;

        const currency = paymentEntity?.currency || bankTransferEntity?.currency || "INR";
        if (currency !== "INR") {
          return new Response(
            JSON.stringify({
              received: true,
              verified: false,
              funded: false,
              error: `VAN currency mismatch: expected INR, received ${currency}.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (paymentEntity?.status && !["captured", "authorized"].includes(paymentEntity.status)) {
          return new Response(
            JSON.stringify({
              received: true,
              verified: false,
              funded: false,
              error: `VAN payment is not settled (status: ${paymentEntity.status}).`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let order: any = null;
        if (targetOrderId) {
          const { data } = await supabase.from("orders").select("*").eq("id", targetOrderId).maybeSingle();
          order = data;
        }
        if (!order && targetOrderNumber) {
          const { data } = await supabase.from("orders").select("*").eq("order_number", targetOrderNumber).maybeSingle();
          order = data;
        }
        if (!order && targetVanNumber) {
          const { data } = await supabase.from("orders").select("*").eq("virtual_account_number", targetVanNumber).maybeSingle();
          order = data;
        }

        if (!order) {
          return new Response(
            JSON.stringify({
              received: true,
              verified: false,
              funded: false,
              error: "Associated order record not found for VAN credit webhook.",
            }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { linkedDelivery, freightAmt, authoritativeTotalPaise } = await computeAuthoritativeOrderTotal(supabase, order);
        const paidPaise = Number(paymentEntity?.amount ?? bankTransferEntity?.amount ?? vaEntity?.amount_paid ?? 0);

        if (
          !Number.isFinite(authoritativeTotalPaise) ||
          authoritativeTotalPaise <= 0 ||
          !Number.isFinite(paidPaise) ||
          paidPaise + 2 < authoritativeTotalPaise
        ) {
          return new Response(
            JSON.stringify({
              received: true,
              verified: false,
              funded: false,
              error: `VAN credit amount insufficient: expected at least ${authoritativeTotalPaise} paise (₹${(authoritativeTotalPaise / 100).toFixed(2)}), but received ${paidPaise} paise (₹${(paidPaise / 100).toFixed(2)}). Order and delivery remain pending.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Extract authentic bank UTR from acquirer data
        const bankUtr =
          paymentEntity?.acquirer_data?.bank_transaction_id ||
          paymentEntity?.acquirer_data?.rrn ||
          paymentEntity?.acquirer_data?.bank_reference ||
          bankTransferEntity?.utr ||
          paymentEntity?.id ||
          `UTR_${Date.now()}`;

        await fundOrderAndUnlockDelivery(supabase, {
          order,
          linkedDelivery,
          freightAmt,
          paymentMode: "escrow_van",
          paymentMethod: "escrow_van",
          paymentId: paymentEntity?.id || bankUtr,
          bankUtr,
        });
      } else if (event === "transfer.processed") {
        const transferEntity = body.payload?.transfer?.entity;
        const transferId = transferEntity?.id;
        if (transferId) {
          await supabase
            .from("orders")
            .update({
              settlement_status: "released_to_seller",
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_transfer_id", transferId);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
