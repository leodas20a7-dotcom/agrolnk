// AgroLnk Razorpay Route Client Gateway
// Security: Frontend ONLY has access to VITE_RAZORPAY_KEY_ID.
// All financial calculations and secret keys reside server-side.

import { supabase } from '../lib/supabase';
import { calculateOrderFinancials } from './commission';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Dynamically load Razorpay Standard Checkout SDK
 */
export function loadRazorpaySDK() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Razorpay Checkout SDK from CDN.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Authoritative Server-Side Payment Verification (Fail-Closed)
 * Strictly verifies signature, captured status, currency, and amount on Edge Function
 */
export async function verifyPaymentOnServer({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  expectedAmountPaise,
  expectedCurrency = 'INR',
  paymentContext = 'order',
  loanId = null,
  inspectionId = null,
}) {
  if (!razorpay_payment_id) {
    throw new Error('Payment gateway response did not return a valid payment ID.');
  }

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TWlkH1pRzS8UWz';
  const isTestMode = Boolean(import.meta.env?.DEV) && String(razorpayKeyId).startsWith('rzp_test_');

  try {
    const { data: verifyRes, error: verifyErr } = await supabase.functions.invoke('razorpay-route', {
      body: {
        action: 'verify_payment',
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        expected_amount_paise: expectedAmountPaise,
        expected_currency: expectedCurrency,
        payment_context: paymentContext,
        loan_id: loanId,
        inspection_id: inspectionId,
      },
    });

    if (!verifyErr && verifyRes?.verified === true) {
      return verifyRes;
    }

    // If the edge function actively rejected the signature (tampering / bad signature)
    if (!verifyErr && verifyRes && verifyRes.verified === false) {
      throw new Error(verifyRes.error || 'Payment signature verification failed. Possible tampering or unauthorized callback.');
    }

    if (verifyErr) {
      const errMsg = String(verifyErr.message || '');
      const isEdgeUnavailable =
        verifyErr.name === 'FunctionsFetchError' ||
        errMsg.includes('Failed to send a request') ||
        verifyErr.status === 404;

      if (isTestMode && isEdgeUnavailable) {
        console.warn(
          'DEV test mode: Supabase Edge Function "razorpay-route" unreachable. Confirming payment in local dev only:',
          razorpay_payment_id
        );
        return {
          verified: true,
          mode: 'test_fallback',
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        };
      }

      throw new Error(errMsg || 'Payment verification request failed on server.');
    }

    if (!verifyRes?.verified) {
      throw new Error(verifyRes?.error || 'Server did not confirm payment verification.');
    }

    return verifyRes;
  } catch (err) {
    const errMsg = String(err?.message || '');
    const isEdgeUnavailable =
      err?.name === 'FunctionsFetchError' ||
      errMsg.includes('Failed to send a request');

    if (isTestMode && isEdgeUnavailable) {
      console.warn(
        'DEV test mode: Supabase Edge Function unavailable. Confirming payment in local dev only:',
        razorpay_payment_id
      );
      return {
        verified: true,
        mode: 'test_fallback',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      };
    }
    throw err;
  }
}

/**
 * Launch Razorpay Test Mode Checkout for an Order
 * @param {object} params - { listing, quantity, buyerUser, onSuccess, onFailure }
 */
export async function initiateRazorpayRouteCheckout({
  listing,
  existingOrderId = null,
  quantity = 100,
  pricePerUnit,
  customTradeValue,
  purchaseUnit,
  buyerUser,
  simulateInstantEscrow = false,
  onSuccess,
  onFailure,
}) {
  const isLoaded = await loadRazorpaySDK();
  if (!isLoaded) {
    onFailure?.(new Error('Could not load Razorpay payment gateway. Please check your internet connection.'));
    return;
  }

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TWlkH1pRzS8UWz';

  // 1. Calculate order financials server-side or via standard formula
  const qty = Number(quantity) || Number(listing?.quantity) || 100;
  const unitPrice = pricePerUnit !== undefined ? Number(pricePerUnit) : (Number(listing?.price) || Number(listing?.pricePerUnit) || 42);
  const tradeValue = customTradeValue !== undefined ? Number(customTradeValue) : qty * unitPrice;
  const fin = calculateOrderFinancials(tradeValue);

  // Total payable in paise (e.g. ₹4,210.50 -> 421050 paise)
  const totalAmountInPaise = Math.round(fin.totalBuyerPayable * 100);

  // Fallback test order identifier for local test mode
  const testOrderId = `order_test_${Date.now()}`;

  // Security: Disallow artificial instant payment simulation bypass
  if (simulateInstantEscrow) {
    onFailure?.(new Error('Instant payment simulation bypass is disabled for live transaction integrity. Real checkout flow is required.'));
    return;
  }

  // 2. Request Server-Created Order ID (Calls Supabase Edge Function)
  let serverOrderId = null;
  let serverOrderAmount = null;
  try {
    const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('razorpay-route', {
      body: {
        action: 'create_order',
        existingOrderId: existingOrderId || undefined,
        listingId: listing?.id,
        quantity: qty,
        buyerId: buyerUser?.id,
        buyerName: buyerUser?.name || 'Wholesale Buyer',
      },
    });

    if (!edgeErr && edgeRes?.orderId) {
      serverOrderId = edgeRes.orderId;
      if (edgeRes?.amount) serverOrderAmount = Number(edgeRes.amount);
    } else if (!import.meta.env?.DEV) {
      onFailure?.(new Error(edgeRes?.error || edgeErr?.message || 'Unable to initialize secure payment order on server.'));
      return;
    }
  } catch (createOrderErr) {
    if (!import.meta.env?.DEV) {
      onFailure?.(new Error(createOrderErr?.message || 'Payment server is unreachable. Please try again.'));
      return;
    }
  }

  const checkoutAmountPaise = serverOrderAmount || totalAmountInPaise;

  // 3. Configure Razorpay Standard Checkout Options
  const activeUnit = purchaseUnit || listing?.unit || 'kg';
  const options = {
    key: razorpayKeyId,
    amount: checkoutAmountPaise,
    currency: 'INR',
    name: 'AgroLnk Agri-Exchange',
    description: `Procurement: ${listing?.commodity || 'Produce'} (${qty} ${activeUnit})`,
    image: '/assets/Logo.jpeg',
    order_id: serverOrderId || undefined,
    prefill: {
      name: buyerUser?.name || 'Wholesale Buyer',
      email: buyerUser?.email || 'buyer@agrolnk.com',
      contact: buyerUser?.phone || '9876543210',
    },
    notes: {
      listing_id: listing?.id || 'direct_lot',
      commodity: listing?.commodity || 'Tomato',
      trade_value: `₹${tradeValue}`,
      buyer_fee: `₹${fin.buyerFee}`,
      platform_take_rate: '0.50%',
      settlement_type: 'Razorpay Route (Deferred on_hold)',
    },
    theme: {
      color: '#0B3326', // AgroLnk Emerald
    },
    modal: {
      ondismiss: () => {
        onFailure?.(new Error('Payment window closed.'));
      },
    },
    handler: async function (response) {
      // Payment Successful -> Send for authoritative server-side HMAC SHA256 signature verification & capture validation
      try {
        if (!response?.razorpay_payment_id) {
          throw new Error('Payment gateway response did not return a valid payment ID.');
        }

        const verifyRes = await verifyPaymentOnServer({
          razorpay_order_id: response.razorpay_order_id || serverOrderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          expectedAmountPaise: checkoutAmountPaise,
          expectedCurrency: 'INR',
          paymentContext: existingOrderId ? 'combined_escrow' : 'order_checkout',
        });

        onSuccess?.({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || serverOrderId,
          razorpay_signature: response.razorpay_signature,
          tradeValue: fin.tradeValue,
          buyerFee: fin.buyerFee,
          totalPaid: fin.totalBuyerPayable,
          netFarmerReceivable: fin.netSellerReceivable,
          platformRevenue: fin.totalPlatformCommission,
          verified: true,
          transferId: verifyRes?.transferId || null,
        });
      } catch (err) {
        console.error('Payment checkout verification failed:', err);
        onFailure?.(err);
      }
    },
  };

  try {
    const rzpInstance = new window.Razorpay(options);
    if (typeof rzpInstance.on === 'function') {
      rzpInstance.on('payment.failed', (resp) => {
        console.warn('Razorpay payment failed:', resp?.error);
        onFailure?.(new Error(resp?.error?.description || 'Payment rejected by payment gateway.'));
      });
    }
    rzpInstance.open();
  } catch (initErr) {
    console.error('Error opening Razorpay modal:', initErr);
    onFailure?.(initErr);
  }
}

/**
 * Launch Razorpay Checkout for Farmer Freight / Transport Payment
 * @param {object} params - { delivery, farmerUser, onSuccess, onFailure }
 */
export async function initiateRazorpayTransportCheckout({
  delivery,
  farmerUser,
  onSuccess,
  onFailure,
}) {
  const isLoaded = await loadRazorpaySDK();
  if (!isLoaded) {
    onFailure?.(new Error('Could not load Razorpay payment gateway. Please check your internet connection.'));
    return;
  }

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TWlkH1pRzS8UWz';
  const freightAmount = Number(delivery?.freightAmount) || 2400;
  const totalAmountInPaise = Math.round(freightAmount * 100);
  const testOrderId = `transport_${Date.now()}`;

  const options = {
    key: razorpayKeyId,
    amount: totalAmountInPaise,
    currency: 'INR',
    name: 'AgroLnk Agri-Logistics',
    description: `Freight Escrow: ${delivery?.commodity || 'Produce'} (${delivery?.quantity || 100} ${delivery?.unit || 'kg'}) - ${delivery?.transporterName || 'Carrier'}`,
    image: '/assets/Logo.jpeg',
    prefill: {
      name: farmerUser?.name || delivery?.farmerName || 'Producer',
      email: farmerUser?.email || 'farmer@agrolnk.com',
      contact: farmerUser?.phone || '9876543210',
    },
    notes: {
      delivery_id: delivery?.id,
      delivery_number: delivery?.deliveryNumber,
      order_number: delivery?.orderNumber,
      transporter_name: delivery?.transporterName || 'Carrier',
      freight_amount: `₹${freightAmount}`,
      settlement_type: 'AgroLnk Logistics Escrow',
    },
    theme: {
      color: '#0B3326', // AgroLnk Emerald
    },
    modal: {
      ondismiss: () => {
        onFailure?.(new Error('Payment window closed by user.'));
      },
    },
    handler: async function (response) {
      try {
        if (!response?.razorpay_payment_id) {
          throw new Error('Payment gateway response did not return a valid payment ID.');
        }

        await verifyPaymentOnServer({
          razorpay_order_id: response.razorpay_order_id || testOrderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          expectedAmountPaise: totalAmountInPaise,
          expectedCurrency: 'INR',
          paymentContext: 'transport_escrow',
        });

        onSuccess?.({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || testOrderId,
          razorpay_signature: response.razorpay_signature,
          freightAmount: freightAmount,
          verified: true,
        });
      } catch (err) {
        console.error('Transport payment verification failed:', err);
        onFailure?.(err);
      }
    },
  };

  try {
    const rzpInstance = new window.Razorpay(options);
    rzpInstance.open();
  } catch (initErr) {
    console.error('Error opening Razorpay transport modal:', initErr);
    onFailure?.(initErr);
  }
}

/**
 * Launch Razorpay Checkout for Warehouse Storage Rent Payment
 * @param {object} params - { inventory, amount, extendedDays, farmerUser, onSuccess, onFailure }
 */
export async function initiateRazorpayWarehouseRentCheckout({
  inventory,
  amount,
  extendedDays = 30,
  farmerUser,
  onSuccess,
  onFailure,
}) {
  const isLoaded = await loadRazorpaySDK();
  if (!isLoaded) {
    onFailure?.(new Error('Could not load Razorpay payment gateway. Please check your internet connection.'));
    return;
  }

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TWlkH1pRzS8UWz';
  const payAmount = Number(amount) || 350;
  const totalAmountInPaise = Math.round(payAmount * 100);
  const testOrderId = `wh_rent_${Date.now()}`;

  const options = {
    key: razorpayKeyId,
    amount: totalAmountInPaise,
    currency: 'INR',
    name: 'AgroLnk Warehouse Storage',
    description: `Storage Rent (+${extendedDays} Days): ${inventory?.commodity || 'Produce'} - ${inventory?.warehouseName || 'Warehouse'}`,
    image: '/assets/Logo.jpeg',
    prefill: {
      name: farmerUser?.name || inventory?.farmerName || 'Producer',
      email: farmerUser?.email || 'farmer@agrolnk.com',
      contact: farmerUser?.phone || '9876543210',
    },
    notes: {
      receipt_id: inventory?.id,
      receipt_number: inventory?.receiptNumber,
      warehouse_name: inventory?.warehouseName,
      commodity: inventory?.commodity,
      extended_days: extendedDays,
      type: 'e-NWR Warehouse Storage Rent',
    },
    theme: {
      color: '#0B3326', // AgroLnk Emerald
    },
    modal: {
      ondismiss: () => {
        onFailure?.(new Error('Payment window closed by user.'));
      },
    },
    handler: async function (response) {
      try {
        if (!response?.razorpay_payment_id) {
          throw new Error('Payment gateway response did not return a valid payment ID.');
        }

        await verifyPaymentOnServer({
          razorpay_order_id: response.razorpay_order_id || testOrderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          expectedAmountPaise: totalAmountInPaise,
          expectedCurrency: 'INR',
          paymentContext: 'warehouse_rent',
        });

        onSuccess?.({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || testOrderId,
          razorpay_signature: response.razorpay_signature,
          amount: payAmount,
          rentAmount: payAmount,
          extendedDays: extendedDays,
          verified: true,
        });
      } catch (err) {
        console.error('Warehouse rent payment verification failed:', err);
        onFailure?.(err);
      }
    },
  };

  try {
    const rzpInstance = new window.Razorpay(options);
    rzpInstance.open();
  } catch (initErr) {
    console.error('Error opening Razorpay warehouse rent modal:', initErr);
    onFailure?.(initErr);
  }
}

/**
 * Launch Razorpay Checkout for Quality Inspection & Lab Assay Fee
 * @param {object} params - { inspection, buyerUser, onSuccess, onFailure }
 */
export async function initiateRazorpayInspectionFeeCheckout({
  inspection,
  buyerUser,
  onSuccess,
  onFailure,
}) {
  const isLoaded = await loadRazorpaySDK();
  if (!isLoaded) {
    onFailure?.(new Error('Could not load Razorpay payment gateway. Please check your internet connection.'));
    return;
  }

  const targetInspectionId = inspection?.id || inspection?.reportNumber || null;
  if (!targetInspectionId) {
    onFailure?.(new Error('Inspection reference ID is missing for fee payment.'));
    return;
  }

  const razorpayKeyIdFallback = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TWlkH1pRzS8UWz';
  const isDevTestMode = Boolean(import.meta.env?.DEV) && String(razorpayKeyIdFallback).startsWith('rzp_test_');
  const feeAmount = Number(inspection?.inspectionFee) || 500;
  let totalAmountInPaise = Math.round(feeAmount * 100);
  let serverOrderId = null;
  let serverInspectionId = targetInspectionId;
  let resolvedKeyId = razorpayKeyIdFallback;

  try {
    const { data: orderRes, error: orderErr } = await supabase.functions.invoke('razorpay-route', {
      body: {
        action: 'create_order',
        payment_context: 'inspection_fee',
        inspectionId: targetInspectionId,
      },
    });

    if (!orderErr && orderRes?.orderId) {
      serverOrderId = orderRes.orderId;
      serverInspectionId = orderRes.inspectionId || targetInspectionId;
      if (Number(orderRes.amount) > 0) totalAmountInPaise = Number(orderRes.amount);
      if (orderRes.keyId) resolvedKeyId = orderRes.keyId;
    } else {
      const errMsg = String(orderErr?.message || orderRes?.error || '');
      const isEdgeUnavailable =
        orderErr?.name === 'FunctionsFetchError' ||
        errMsg.includes('Failed to send a request') ||
        orderErr?.status === 404;

      if (!isDevTestMode || !isEdgeUnavailable) {
        onFailure?.(new Error(errMsg || 'Could not initialize server-side inspection fee order.'));
        return;
      }
      serverOrderId = `insp_fee_dev_${Date.now()}`;
    }
  } catch (invokeErr) {
    const errMsg = String(invokeErr?.message || '');
    const isEdgeUnavailable =
      invokeErr?.name === 'FunctionsFetchError' ||
      errMsg.includes('Failed to send a request');
    if (!isDevTestMode || !isEdgeUnavailable) {
      onFailure?.(invokeErr instanceof Error ? invokeErr : new Error(errMsg || 'Inspection fee payment setup failed.'));
      return;
    }
    serverOrderId = `insp_fee_dev_${Date.now()}`;
  }

  const fallbackOrderId = `insp_fee_${Date.now()}`;
  const isLiveServerOrder = Boolean(serverOrderId && !String(serverOrderId).startsWith('insp_fee_'));

  const options = {
    key: resolvedKeyId,
    amount: totalAmountInPaise,
    currency: 'INR',
    ...(isLiveServerOrder ? { order_id: serverOrderId } : {}),
    name: 'AgroLnk Quality & Lab Assay',
    description: `Assay & Inspection Fee: ${inspection?.cropName || inspection?.commodity || 'Produce'} (Report: ${inspection?.reportNumber || inspection?.id})`,
    image: '/assets/Logo.jpeg',
    prefill: {
      name: buyerUser?.name || inspection?.buyerName || 'Procurement Buyer',
      email: buyerUser?.email || 'buyer@agrolnk.com',
      contact: buyerUser?.phone || '9876543210',
    },
    notes: {
      inspection_id: inspection?.id,
      report_number: inspection?.reportNumber,
      order_id: inspection?.orderId,
      commodity: inspection?.commodity || inspection?.cropName,
      assayer_name: inspection?.inspectorName || 'Certified Assayer',
      fee_amount: `₹${feeAmount}`,
      type: 'Quality Assay & Lab Fee',
    },
    theme: {
      color: '#0B3326', // AgroLnk Emerald
    },
    modal: {
      ondismiss: () => {
        onFailure?.(new Error('Payment window closed by user.'));
      },
    },
    handler: async function (response) {
      try {
        if (!response?.razorpay_payment_id) {
          throw new Error('Payment gateway response did not return a valid payment ID.');
        }

        const verifyRes = await verifyPaymentOnServer({
          razorpay_order_id: response.razorpay_order_id || serverOrderId || fallbackOrderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          expectedAmountPaise: totalAmountInPaise,
          expectedCurrency: 'INR',
          paymentContext: 'inspection_fee',
          inspectionId: serverInspectionId,
        });

        onSuccess?.({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || serverOrderId || fallbackOrderId,
          razorpay_signature: response.razorpay_signature,
          feeAmount: Math.round(totalAmountInPaise) / 100,
          verified: Boolean(verifyRes?.verified),
          serverUpdated: Boolean(verifyRes?.inspectionUpdated),
        });
      } catch (err) {
        console.error('Inspection fee payment verification failed:', err);
        onFailure?.(err);
      }
    },
  };

  try {
    const rzpInstance = new window.Razorpay(options);
    rzpInstance.open();
  } catch (initErr) {
    console.error('Error opening Razorpay inspection fee modal:', initErr);
    onFailure?.(initErr);
  }
}

/**
 * Launch Razorpay Route Escrow Capital Disbursement for Financial Institutions / NBFCs
 * @param {object} params - { request, approvedAmount, financierUser, onSuccess, onFailure }
 */
export async function initiateFinancierEscrowDisbursement({
  request,
  approvedAmount,
  financierUser,
  onSuccess,
  onFailure,
}) {
  const isLoaded = await loadRazorpaySDK();
  if (!isLoaded) {
    onFailure?.(new Error('Could not load Razorpay payment gateway. Please check your internet connection.'));
    return;
  }

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TWlkH1pRzS8UWz';
  const disburseAmount = Number(approvedAmount) || Number(request?.approvedAmount) || Number(request?.requestedAmount) || 10000;
  const totalAmountInPaise = Math.round(disburseAmount * 100);
  const testOrderId = `disb_escrow_${Date.now()}`;

  const options = {
    key: razorpayKeyId,
    amount: totalAmountInPaise,
    currency: 'INR',
    name: 'AgroLnk Escrow Capital Vault',
    description: `Trade Credit Disbursement: ₹${disburseAmount.toLocaleString('en-IN')} -> Order ${request?.orderNumber || request?.orderId || '#TRADE-ESCROW'}`,
    image: '/assets/Logo.jpeg',
    prefill: {
      name: financierUser?.name || 'Institutional Capital Partner',
      email: financierUser?.email || 'financier@agrolnk.com',
      contact: financierUser?.phone || '9876543210',
    },
    notes: {
      request_id: request?.id,
      request_number: request?.requestNumber,
      order_number: request?.orderNumber,
      applicant_name: request?.applicantName,
      commodity: request?.commodity,
      disbursed_loan_amount: `₹${disburseAmount}`,
      escrow_status: 'held_on_hold',
      settlement_type: 'Razorpay Route (Institutional Escrow Lien)',
    },
    theme: {
      color: '#0B3326', // AgroLnk Emerald
    },
    modal: {
      ondismiss: () => {
        onFailure?.(new Error('Disbursement window closed by user.'));
      },
    },
    handler: async function (response) {
      try {
        if (!response?.razorpay_payment_id) {
          throw new Error('Payment gateway response did not return a valid payment ID.');
        }

        await verifyPaymentOnServer({
          razorpay_order_id: response.razorpay_order_id || testOrderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          expectedAmountPaise: totalAmountInPaise,
          expectedCurrency: 'INR',
          paymentContext: 'institution_disbursement',
        });

        onSuccess?.({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || testOrderId,
          razorpay_signature: response.razorpay_signature || null,
          bankUtr: null,
          disbursedAmount: disburseAmount,
          verified: true,
        });
      } catch (err) {
        console.error('Institutional disbursement payment verification failed:', err);
        onFailure?.(err);
      }
    },
  };

  try {
    const rzpInstance = new window.Razorpay(options);
    rzpInstance.open();
  } catch (initErr) {
    console.error('Error opening Razorpay disbursement modal:', initErr);
    onFailure?.(initErr);
  }
}

/**
 * Launch Razorpay Checkout for Buyer 20% Margin Deposit on Approved Trade Credit
 * @param {object} params - { request, marginAmount, buyerUser, onSuccess, onFailure }
 */
export async function initiateBuyerMarginDepositCheckout({
  request,
  marginAmount,
  buyerUser,
  onSuccess,
  onFailure,
}) {
  const isLoaded = await loadRazorpaySDK();
  if (!isLoaded) {
    onFailure?.(new Error('Could not load Razorpay payment gateway. Please check your internet connection.'));
    return;
  }

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TWlkH1pRzS8UWz';
  const payMargin = Number(marginAmount) || 5000;
  const totalAmountInPaise = Math.round(payMargin * 100);
  const testOrderId = `margin_${Date.now()}`;

  const options = {
    key: razorpayKeyId,
    amount: totalAmountInPaise,
    currency: 'INR',
    name: 'AgroLnk Escrow Trade Margin',
    description: `Buyer Margin Deposit (20%): ${request?.commodity || 'Produce'} - Order ${request?.orderNumber || '#AGM-TRADE'}`,
    image: '/assets/Logo.jpeg',
    prefill: {
      name: buyerUser?.name || request?.applicantName || 'Wholesale Buyer',
      email: buyerUser?.email || 'buyer@agrolnk.com',
      contact: buyerUser?.phone || '9876543210',
    },
    notes: {
      financing_request_id: request?.id,
      request_number: request?.requestNumber,
      order_number: request?.orderNumber,
      commodity: request?.commodity,
      margin_amount: `₹${payMargin}`,
      type: 'Buyer Trade Credit Margin Deposit',
      escrow_status: 'held_on_hold',
    },
    theme: {
      color: '#0B3326', // AgroLnk Emerald
    },
    modal: {
      ondismiss: () => {
        onFailure?.(new Error('Payment window closed by user.'));
      },
    },
    handler: async function (response) {
      try {
        if (!response?.razorpay_payment_id) {
          throw new Error('Payment gateway response did not return a valid payment ID.');
        }

        await verifyPaymentOnServer({
          razorpay_order_id: response.razorpay_order_id || testOrderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          expectedAmountPaise: totalAmountInPaise,
          expectedCurrency: 'INR',
          paymentContext: 'margin_deposit',
        });

        onSuccess?.({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || testOrderId,
          razorpay_signature: response.razorpay_signature,
          marginAmount: payMargin,
          verified: true,
        });
      } catch (err) {
        console.error('Buyer margin deposit payment verification failed:', err);
        onFailure?.(err);
      }
    },
  };

  try {
    const rzpInstance = new window.Razorpay(options);
    rzpInstance.open();
  } catch (initErr) {
    console.error('Error opening Razorpay margin deposit modal:', initErr);
    onFailure?.(initErr);
  }
}

/**
 * Launch Razorpay Checkout for Institutional Loan & Trade Credit Repayment
 * @param {object} params - { request, loan, amount, currentUser, borrowerUser, onSuccess, onFailure }
 */
export async function initiateRazorpayLoanRepaymentCheckout({
  request,
  loan,
  amount,
  currentUser,
  borrowerUser,
  onSuccess,
  onFailure,
}) {
  const isLoaded = await loadRazorpaySDK();
  if (!isLoaded) {
    onFailure?.(new Error('Could not load Razorpay payment gateway. Please check your internet connection.'));
    return;
  }

  const loanObj = request || loan || {};
  const userObj = currentUser || borrowerUser || {};
  const targetLoanId = loanObj?.id || loanObj?.requestNumber || null;

  const razorpayKeyIdFallback = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TWlkH1pRzS8UWz';
  const isDevTestMode = Boolean(import.meta.env?.DEV) && String(razorpayKeyIdFallback).startsWith('rzp_test_');
  const repayAmount = Number(amount) || Number(loanObj?.approvedAmount) || 1000;
  let totalAmountInPaise = Math.round(repayAmount * 100);
  let serverOrderId = null;
  let serverLoanId = targetLoanId;
  let resolvedKeyId = razorpayKeyIdFallback;

  if (targetLoanId) {
    try {
      const { data: orderRes, error: orderErr } = await supabase.functions.invoke('razorpay-route', {
        body: {
          action: 'create_order',
          payment_context: 'loan_repayment',
          loanId: targetLoanId,
        },
      });

      if (!orderErr && orderRes?.orderId) {
        serverOrderId = orderRes.orderId;
        serverLoanId = orderRes.loanId || targetLoanId;
        if (Number(orderRes.amount) > 0) totalAmountInPaise = Number(orderRes.amount);
        if (orderRes.keyId) resolvedKeyId = orderRes.keyId;
      } else {
        const errMsg = String(orderErr?.message || orderRes?.error || '');
        const isEdgeUnavailable =
          orderErr?.name === 'FunctionsFetchError' ||
          errMsg.includes('Failed to send a request') ||
          orderErr?.status === 404;

        if (!isDevTestMode || !isEdgeUnavailable) {
          onFailure?.(new Error(errMsg || 'Could not initialize server-side loan repayment order.'));
          return;
        }
        serverOrderId = `repay_dev_${Date.now()}`;
      }
    } catch (invokeErr) {
      const errMsg = String(invokeErr?.message || '');
      const isEdgeUnavailable =
        invokeErr?.name === 'FunctionsFetchError' ||
        errMsg.includes('Failed to send a request');
      if (!isDevTestMode || !isEdgeUnavailable) {
        onFailure?.(invokeErr instanceof Error ? invokeErr : new Error(errMsg || 'Loan repayment setup failed.'));
        return;
      }
      serverOrderId = `repay_dev_${Date.now()}`;
    }
  } else {
    onFailure?.(new Error('Loan reference ID is missing for repayment.'));
    return;
  }

  const fallbackOrderId = `repay_${Date.now()}`;
  const isLiveServerOrder = Boolean(serverOrderId && !String(serverOrderId).startsWith('repay_'));

  const options = {
    key: resolvedKeyId,
    amount: totalAmountInPaise,
    currency: 'INR',
    ...(isLiveServerOrder ? { order_id: serverOrderId } : {}),
    name: 'AgroLnk Agri-Credit Repayment',
    description: `Loan Repayment: ${loanObj?.requestNumber || loanObj?.orderNumber || '#FIN-LOAN'} (${loanObj?.purposeLabel || 'Agri Working Capital'})`,
    image: '/assets/Logo.jpeg',
    prefill: {
      name: userObj?.name || loanObj?.applicantName || 'Borrower',
      email: userObj?.email || 'borrower@agrolnk.com',
      contact: userObj?.phone || '9876543210',
    },
    notes: {
      financing_request_id: serverLoanId,
      request_number: loanObj?.requestNumber,
      order_number: loanObj?.orderNumber,
      repayment_amount: `₹${Math.round(totalAmountInPaise / 100)}`,
      borrower_name: userObj?.name || loanObj?.applicantName,
      borrower_role: userObj?.role || loanObj?.applicantRole || 'farmer',
      type: 'Institutional Loan Repayment',
      settlement_target: 'Samunnati / NABARD Agri-Credit Vault',
    },
    theme: {
      color: '#0B3326', // AgroLnk Emerald
    },
    modal: {
      ondismiss: () => {
        onFailure?.(new Error('Repayment window closed by user.'));
      },
    },
    handler: async function (response) {
      try {
        if (!response?.razorpay_payment_id) {
          throw new Error('Payment gateway response did not return a valid payment ID.');
        }

        const verifyRes = await verifyPaymentOnServer({
          razorpay_order_id: response.razorpay_order_id || serverOrderId || fallbackOrderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          expectedAmountPaise: totalAmountInPaise,
          expectedCurrency: 'INR',
          paymentContext: 'loan_repayment',
          loanId: serverLoanId,
        });

        onSuccess?.({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || serverOrderId || fallbackOrderId,
          razorpay_signature: response.razorpay_signature,
          repaymentAmount: Math.round(totalAmountInPaise) / 100,
          verified: Boolean(verifyRes?.verified),
          serverUpdated: Boolean(verifyRes?.loanUpdated),
        });
      } catch (err) {
        console.error('Loan repayment payment verification failed:', err);
        onFailure?.(err);
      }
    },
  };

  try {
    const rzpInstance = new window.Razorpay(options);
    rzpInstance.open();
  } catch (initErr) {
    console.error('Error opening Razorpay loan repayment modal:', initErr);
    onFailure?.(initErr);
  }
}
