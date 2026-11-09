import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Check, AlertCircle, ShoppingBag, Zap, Landmark, ArrowRight, Sparkles, Percent, CheckCircle2, Clock, MapPin, Copy, ExternalLink, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { calculateOrderFinancials, formatINR } from '../../utils/commission';
import { initiateRazorpayRouteCheckout } from '../../utils/razorpayRouteClient';
import { createFinancingRequest, getFinancingRequests } from '../../utils/financing';
import { getResolvedUserKycStatus } from '../../utils/auth';
import { convertVolume, getRateInUnit } from '../../utils/pricingUnits';
import { ESCROW_NODAL_ACCOUNT, generateOrderSmartVAN, processSmartVanWebhookCredit } from '../../utils/escrowApi';
import { supabase } from '../../lib/supabase';

export default function OrderModal({ listing, isOpen, onClose, onConfirm, currentUser }) {
  const [purchaseUnit, setPurchaseUnit] = useState(listing?.unit === 'MT' ? 'Quintal' : (listing?.unit || 'Quintal'));
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [paymentMode, setPaymentMode] = useState('direct_razorpay'); // 'direct_razorpay' | 'escrow_van' | 'trade_credit'
  const [copiedEscrowField, setCopiedEscrowField] = useState(null);
  const [financePct, setFinancePct] = useState(0.8); // 80% financing by default
  const [deliveryState, setDeliveryState] = useState(currentUser?.state || 'Tamil Nadu');
  const [deliveryDistrict, setDeliveryDistrict] = useState(currentUser?.district || 'Chennai');
  const [deliveryAddress, setDeliveryAddress] = useState(currentUser?.address || currentUser?.companyAddress || 'Wholesale Market Hub');
  const [deliveryPincode, setDeliveryPincode] = useState(currentUser?.pincode || '600001');
  const [buyerPhone, setBuyerPhone] = useState(currentUser?.phone || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creditSuccessMsg, setCreditSuccessMsg] = useState(null);
  const [existingCreditReq, setExistingCreditReq] = useState(null);

  // Automated Smart Collect VAN State
  const [vanSession, setVanSession] = useState(null); // { orderId, orderNumber, vanNumber, ifsc, amount, status, utr }
  const [isAwaitingWebhook, setIsAwaitingWebhook] = useState(false);
  const [vanVerificationMode, setVanVerificationMode] = useState('auto'); // 'auto' | 'manual'
  const [manualUtrInput, setManualUtrInput] = useState('');

  useEffect(() => {
    if (listing?.quantity) {
      const defaultUnit = listing.unit === 'MT' ? 'Quintal' : (listing.unit || 'kg');
      setPurchaseUnit(defaultUnit);
      const maxInUnit = convertVolume(listing.quantity, listing.unit, defaultUnit);
      const initialQty = defaultUnit === 'MT' ? Math.min(1, maxInUnit) : (defaultUnit === 'Quintal' ? Math.min(10, maxInUnit) : Math.min(100, maxInUnit));
      const targetQty = initialQty > 0 ? initialQty : maxInUnit;
      setPurchaseQty(targetQty);
      const estRate = getRateInUnit(listing.price, listing.unit, defaultUnit);
      const estTotal = Math.round(targetQty * estRate);
      const estFin = calculateOrderFinancials(estTotal);
      setPaymentMode(estFin.totalBuyerPayable >= 50000 ? 'escrow_van' : 'direct_razorpay');
    } else {
      setPaymentMode('direct_razorpay');
    }
    setCreditSuccessMsg(null);
    setVanSession(null);
    setIsAwaitingWebhook(false);
    setError('');

    if (currentUser) {
      setDeliveryState(currentUser.state || 'Tamil Nadu');
      setDeliveryDistrict(currentUser.district || 'Chennai');
      setDeliveryAddress(currentUser.address || currentUser.companyAddress || 'Wholesale Market Hub');
      setDeliveryPincode(currentUser.pincode || '600001');
      setBuyerPhone(currentUser.phone || '');
    }

    let isMounted = true;
    if (listing && currentUser) {
      getFinancingRequests().then((all) => {
        if (!isMounted) return;
        const applicantKey = String(currentUser.id || currentUser.email || '').toLowerCase();
        const found = all.find(
          (r) =>
            r.status !== 'rejected' &&
            r.status !== 'cancelled' &&
            r.status !== 'repaid' &&
            r.status !== 'settled' &&
            r.status !== 'closed' &&
            r.status !== 'completed' &&
            !r.repaidAt &&
            (r.status === 'pending' || r.status === 'under_review' || r.status === 'in_review') &&
            ((r.listingId && r.listingId === listing.id) ||
             (r.commodity === listing.commodity && r.variety === listing.variety && (String(r.applicantId || '').toLowerCase() === applicantKey || (currentUser.name && r.applicantName?.toLowerCase().includes(currentUser.name.toLowerCase())))))
        );
        setExistingCreditReq(found || null);
      }).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [listing, currentUser, isOpen]);

  const qty = Math.max(0, Number(purchaseQty || 0));
  const activeRate = listing ? getRateInUnit(listing.price, listing.unit, purchaseUnit) : 0;
  const subtotal = Math.round(qty * activeRate);
  const financials = calculateOrderFinancials(subtotal);

  // Dual-Tier Rule: Bulk orders >= 50,000 must use Escrow Virtual Account to eliminate gateway fees
  const isBulkOrder = (financials?.totalBuyerPayable || 0) >= 50000;

  useEffect(() => {
    if (isOpen && isBulkOrder && paymentMode === 'direct_razorpay') {
      setPaymentMode('escrow_van');
    }
  }, [isOpen, isBulkOrder, paymentMode]);

  if (!isOpen || !listing) return null;

  // Canonical cross-unit conversions
  const maxInSelectedUnit = convertVolume(listing.quantity, listing.unit, purchaseUnit);
  const quantityInListingUnit = convertVolume(qty, purchaseUnit, listing.unit);
  const totalKg = convertVolume(qty, purchaseUnit, 'kg');
  const totalQuintals = convertVolume(qty, purchaseUnit, 'Quintal');
  const totalMT = convertVolume(qty, purchaseUnit, 'MT');

  const financedLoanAmount = Math.round(financials.totalBuyerPayable * financePct);
  const buyerMarginDeposit = financials.totalBuyerPayable - financedLoanAmount;

  const handleCopyEscrow = (text, fieldKey) => {
    if (!text) return;
    navigator.clipboard?.writeText(String(text));
    setCopiedEscrowField(fieldKey);
    setTimeout(() => setCopiedEscrowField(null), 2000);
  };

  const handleUnitSwitch = (newUnit) => {
    if (newUnit === purchaseUnit) return;
    const currentQtyNum = Number(purchaseQty) || 0;
    const converted = convertVolume(currentQtyNum, purchaseUnit, newUnit);
    const rounded = Number.isInteger(converted) ? converted : Math.round(converted * 100) / 100;
    setPurchaseUnit(newUnit);
    setPurchaseQty(rounded > 0 ? rounded : 1);
  };

  const deliveryLocationPayload = {
    state: deliveryState.trim() || currentUser?.state || 'Tamil Nadu',
    district: deliveryDistrict.trim() || currentUser?.district || 'Chennai',
    address: deliveryAddress.trim() || currentUser?.address || 'Wholesale Market Hub',
    pincode: deliveryPincode.trim() || currentUser?.pincode || '600001',
    companyName: currentUser?.companyName || currentUser?.orgName || currentUser?.name || 'Buyer Enterprise',
    phone: buyerPhone.trim() || currentUser?.phone || '',
  };

  const handleConfirmOrder = () => {
    setError('');

    if (getResolvedUserKycStatus(currentUser) !== 'verified') {
      setError('Buyer KYC verification is required before placing purchase orders.');
      return;
    }

    if (!qty || qty <= 0) {
      setError('Please enter a valid purchase quantity.');
      return;
    }
    if (qty > maxInSelectedUnit) {
      setError(`Cannot purchase more than available quantity (${maxInSelectedUnit.toLocaleString('en-IN')} ${purchaseUnit}).`);
      return;
    }
    if (!deliveryDistrict.trim() || !deliveryAddress.trim()) {
      setError('Please provide your delivery destination district and address.');
      return;
    }

    if (paymentMode === 'trade_credit') {
      if (existingCreditReq) {
        setError(`An active trade credit application (${existingCreditReq.requestNumber}) is already under review for this lot.`);
        return;
      }
      handleTradeCreditFinancing();
      return;
    }

    if (paymentMode === 'escrow_van') {
      setIsSubmitting(true);
      handleGenerateSmartVan();
      return;
    }

    setIsSubmitting(true);

    // Launch Razorpay Route Checkout for direct payment
    initiateRazorpayRouteCheckout({
      listing,
      quantity: qty,
      pricePerUnit: activeRate,
      customTradeValue: subtotal,
      purchaseUnit: purchaseUnit,
      buyerUser: currentUser,
      onSuccess: (paymentData) => {
        executeOrderPlacement(paymentData);
      },
      onFailure: (err) => {
        setIsSubmitting(false);
        setError(err.message || 'Payment checkout was cancelled or failed. Please try again.');
      },
    });
  };

  const executeOrderPlacement = (paymentData) => {
    if (paymentMode !== 'trade_credit' && paymentMode !== 'escrow_van' && !paymentData?.razorpay_payment_id) {
      setError('A verified payment confirmation from the gateway is required to place this order.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onConfirm({
      listingId: listing.id,
      farmerId: listing.farmerId,
      farmerName: listing.farmerName,
      buyerPhone: buyerPhone.trim() || currentUser?.phone || '',
      buyerEmail: currentUser?.email || '',
      buyerCompany: currentUser?.companyName || currentUser?.orgName || '',
      buyerAddress: deliveryLocationPayload.address,
      buyerDistrict: deliveryLocationPayload.district,
      buyerState: deliveryLocationPayload.state,
      buyerPincode: deliveryLocationPayload.pincode,
      deliveryLocation: deliveryLocationPayload,
      commodity: listing.commodity,
      variety: listing.variety,
      grade: listing.grade,
      quantity: qty,
      unit: purchaseUnit,
      pricePerUnit: activeRate,
      totalAmount: subtotal,
      quantityInListingUnit: quantityInListingUnit,
      listingUnit: listing.unit,
      totalKg: totalKg,
      totalMT: totalMT,
      totalQuintals: totalQuintals,
      buyerFee: financials.buyerFee,
      sellerFee: financials.sellerFee,
      platformRevenue: financials.totalPlatformCommission,
      netFarmerPayout: financials.netSellerReceivable,
      paymentMode: paymentMode,
      paymentMethod: paymentMode,
      bankUtr: paymentData?.bankUtr || paymentData?.razorpay_payment_id || null,
      escrowStatus: paymentData?.escrowStatus || (paymentMode === 'escrow_van' ? (paymentData?.autoVerified ? 'funded' : 'pending') : 'funded'),
      status: paymentData?.status || (paymentMode === 'escrow_van' ? (paymentData?.autoVerified ? 'order_placed' : 'pending') : 'order_placed'),
      state: listing.state,
      district: listing.district,
      razorpay_payment_id: paymentData?.razorpay_payment_id || null,
      razorpay_order_id: paymentData?.razorpay_order_id || null,
      razorpay_signature: paymentData?.razorpay_signature || null,
    });
  };

  const handleGenerateSmartVan = () => {
    setIsSubmitting(false);
    const orderSalt = Math.floor(1000 + Math.random() * 9000);
    const generatedOrderNum = `#AGM-${orderSalt}`;
    
    // Utilize centralized Smart VAN generator
    const smartVanData = generateOrderSmartVAN({
      orderNumber: generatedOrderNum,
      buyerPhone: currentUser?.phone,
      orderAmount: financials.totalBuyerPayable
    });

    setVanSession({
      orderNumber: generatedOrderNum,
      vanNumber: smartVanData.accountNumber,
      ifsc: smartVanData.ifscCode,
      bankName: smartVanData.bankName,
      beneficiary: smartVanData.beneficiaryName,
      amount: financials.totalBuyerPayable,
      status: 'awaiting_clearing',
      utr: null,
    });
    setIsAwaitingWebhook(true);
  };

  const handleSimulateBankCredit = async () => {
    if (!vanSession) return;
    setIsSubmitting(true);
    // Generate authentic Indian Bank UTR format (e.g. ICICR2026110698124)
    const simulatedUtr = `ICICR${new Date().getFullYear()}${String(Date.now()).slice(-8)}`;

    try {
      // Process through real-time escrow webhook processor
      await processSmartVanWebhookCredit({
        orderNumber: vanSession.orderNumber,
        bankUtr: simulatedUtr,
        amount: vanSession.amount,
        remitterName: currentUser?.name || 'Buyer Enterprise',
      });

      setVanSession(prev => ({
        ...prev,
        status: 'credited',
        utr: simulatedUtr
      }));
      setIsSubmitting(false);

      // Auto-confirm order with captured bank UTR
      setTimeout(() => {
        executeOrderPlacement({
          bankUtr: simulatedUtr,
          razorpay_payment_id: `pay_van_${Date.now()}`,
          autoVerified: true,
          escrowStatus: 'funded',
          status: 'order_placed',
        });
      }, 1600);
    } catch (_err) {
      setIsSubmitting(false);
    }
  };

  const handleManualUtrSubmit = () => {
    setError('');
    const cleanUtr = (manualUtrInput || '').trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 6) {
      setError('Please enter a valid Bank UTR / NEFT reference number (at least 6 characters).');
      return;
    }
    executeOrderPlacement({
      bankUtr: cleanUtr,
      autoVerified: false,
      escrowStatus: 'pending',
      status: 'pending',
    });
  };

  const handleTradeCreditFinancing = async () => {
    setIsSubmitting(true);
    try {
      const generatedOrderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const generatedOrderNum = `#AGM-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const finReq = await createFinancingRequest({
        applicantId: currentUser?.id || currentUser?.email || 'buyer_trade',
        applicantName: currentUser?.name || 'Buyer Partner',
        applicantRole: 'buyer',
        listingId: listing.id,
        orderId: generatedOrderId,
        orderNumber: generatedOrderNum,
        commodity: listing.commodity,
        variety: listing.variety || 'Standard Lot',
        grade: listing.grade || 'A',
        quantity: qty,
        unit: purchaseUnit,
        transactionValue: financials.totalBuyerPayable,
        requestedAmount: financedLoanAmount,
        purpose: 'trade_credit',
        purposeLabel: 'Procurement Trade Credit & Purchase Settlement (NBFC Supported)',
        repaymentOption: '30_day_settlement',
        repaymentLabel: '30-Day Net Settlement',
        notes: `Direct purchase trade credit application for ${qty} ${purchaseUnit} (${totalMT} MT / ${totalQuintals} Qtl) of ${listing.commodity}. Destination: ${deliveryLocationPayload.district}, ${deliveryLocationPayload.state}. Margin money deposit: ${formatINR(buyerMarginDeposit)}.`,
      });

      // Dispatch event for other tabs/underwriter desk
      try {
        window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: finReq }));
      } catch (e) {}

      const orderPayload = {
        id: generatedOrderId,
        orderNumber: generatedOrderNum,
        listingId: listing.id,
        farmerId: listing.farmerId,
        farmerName: listing.farmerName,
        commodity: listing.commodity,
        variety: listing.variety,
        grade: listing.grade,
        quantity: qty,
        unit: purchaseUnit,
        pricePerUnit: activeRate,
        totalAmount: subtotal,
        quantityInListingUnit: quantityInListingUnit,
        listingUnit: listing.unit,
        totalKg: totalKg,
        totalMT: totalMT,
        totalQuintals: totalQuintals,
        buyerFee: financials.buyerFee,
        sellerFee: financials.sellerFee,
        platformRevenue: financials.totalPlatformCommission,
        netFarmerPayout: financials.netSellerReceivable,
        paymentMode: 'trade_credit',
        financingAmount: financedLoanAmount,
        buyerMarginDeposit: buyerMarginDeposit,
        financingRequestId: finReq.id,
        financingRequestNumber: finReq.requestNumber,
        buyerPhone: buyerPhone.trim() || currentUser?.phone || '',
        buyerEmail: currentUser?.email || '',
        buyerCompany: currentUser?.companyName || currentUser?.orgName || '',
        buyerAddress: deliveryLocationPayload.address,
        buyerDistrict: deliveryLocationPayload.district,
        buyerState: deliveryLocationPayload.state,
        buyerPincode: deliveryLocationPayload.pincode,
        deliveryLocation: deliveryLocationPayload,
        state: listing.state,
        district: listing.district,
      };

      setIsSubmitting(false);
      setCreditSuccessMsg({
        reqNum: finReq.requestNumber || '#FIN-CREDIT',
        amount: financedLoanAmount,
        orderPayload: orderPayload,
      });

      // Auto-redirect after 3.5 seconds if user doesn't click earlier
      setTimeout(() => {
        onConfirm(orderPayload);
      }, 3500);

    } catch (err) {
      console.error('Failed to submit trade credit application:', err);
      setError('Unable to submit trade credit request. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleManualTrack = () => {
    if (creditSuccessMsg?.orderPayload) {
      onConfirm(creditSuccessMsg.orderPayload);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !creditSuccessMsg) {
          onClose?.();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SUCCESS VIEW SCREEN */}
        {creditSuccessMsg ? (
          <div className="p-7 sm:p-9 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center mx-auto shadow-sm ring-8 ring-[#EBF5F0]/50">
              <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5" /> Application Dispatched to NBFC
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B3326] font-heading">
                Trade Credit Submitted!
              </h3>
              <p className="text-xs text-[#566861] max-w-sm mx-auto leading-relaxed">
                Application <strong className="text-[#0B3326] font-mono">{creditSuccessMsg.reqNum}</strong> for <strong className="text-blue-700">{formatINR(creditSuccessMsg.amount)}</strong> has been routed to Institutional NBFC Underwriters.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs space-y-2 text-left">
              <div className="flex justify-between items-center text-[#566861]">
                <span>Produce Consignment:</span>
                <strong className="text-[#14211D]">{listing.commodity} ({qty} {listing.unit})</strong>
              </div>
              <div className="flex justify-between items-center text-[#566861]">
                <span>NBFC Financing Coverage:</span>
                <strong className="text-blue-700 font-bold">{formatINR(creditSuccessMsg.amount)} ({Math.round(financePct * 100)}%)</strong>
              </div>
              <div className="flex justify-between items-center text-[#566861]">
                <span>Buyer Margin Deposit:</span>
                <strong className="text-[#0B3326] font-bold">{formatINR(buyerMarginDeposit)}</strong>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="accent"
                size="lg"
                onClick={handleManualTrack}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full justify-center font-bold text-sm py-3.5 shadow-md shadow-[#10B981]/20 cursor-pointer"
              >
                Track in My Orders Now
              </Button>
              <p className="text-[11px] text-[#566861] flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-[#10B981]" /> Auto-redirecting to orders terminal...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                    Confirm Purchase
                  </h3>
                  <span className="text-xs text-[#566861]">Direct Procurement Order</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

          {/* Produce Overview Snapshot */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-[#0B3326] font-heading">
                  {listing.commodity}
                </h4>
                <Badge variant="emerald" size="sm">
                  Grade {listing.grade}
                </Badge>
              </div>
              <p className="text-xs text-[#566861] mt-0.5">
                Available lot: <strong className="text-[#14211D]">{listing.quantity} {listing.unit}</strong>
                {listing.unit === 'MT' && (
                  <span className="text-[#10B981] ml-1 font-semibold">
                    ({(listing.quantity * 10).toLocaleString('en-IN')} Quintals)
                  </span>
                )}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Fixed Unit Rate</span>
              <div className="space-y-0.5">
                <span className="text-base font-bold text-[#0B3326] block">
                  ₹{listing.price.toLocaleString('en-IN')} / {listing.unit}
                </span>
                {listing.unit === 'MT' && (
                  <span className="text-[11px] font-semibold text-[#10B981] block">
                    (₹{Math.round(listing.price / 10).toLocaleString('en-IN')} / Quintal)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quantity & Unit Selection Bay */}
          <div className="space-y-3 p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-[#14211D] block">
                Select Purchase Unit &amp; Volume
              </label>

              {/* Unit Toggle Pill Buttons */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl text-xs font-semibold">
                {['Quintal', 'MT', 'kg'].map((u) => {
                  const isSelected = purchaseUnit === u;
                  const label = u === 'Quintal' ? 'Quintal (Qtl)' : u === 'MT' ? 'Metric Tonne (MT)' : 'kg';
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => handleUnitSwitch(u)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#10B981] text-white shadow-xs'
                          : 'text-[#566861] hover:text-[#0B3326] hover:bg-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input & Entire Lot CTA */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  step={purchaseUnit === 'MT' ? '0.01' : '1'}
                  min={purchaseUnit === 'MT' ? '0.01' : '1'}
                  max={maxInSelectedUnit}
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5EDE8] text-base font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
                  placeholder="Enter quantity"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#566861] pointer-events-none">
                  {purchaseUnit}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPurchaseQty(maxInSelectedUnit)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-colors cursor-pointer shrink-0"
              >
                Buy Entire Lot
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#566861] flex-wrap gap-1">
              <span>
                Max available: <strong className="text-[#0B3326]">{maxInSelectedUnit.toLocaleString('en-IN')} {purchaseUnit}</strong>
                {purchaseUnit !== listing.unit && (
                  <span className="text-[#10B981] ml-1">
                    ({listing.quantity} {listing.unit})
                  </span>
                )}
              </span>
              <span>
                Rate in {purchaseUnit}: <strong className="text-[#0B3326]">₹{activeRate.toLocaleString('en-IN')}/{purchaseUnit}</strong>
              </span>
            </div>

            {/* Real-time Multi-Unit Conversion Breakdown Pill */}
            {qty > 0 && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-[#F2FBF6] to-white border border-[#10B981]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-[#0B3326] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                    Order Lot Conversion:
                  </span>
                  <p className="text-[11px] text-[#2D5A47]">
                    <strong className="text-[#0B3326]">{qty} {purchaseUnit}</strong> = {totalQuintals.toLocaleString('en-IN')} Quintals ({totalMT.toLocaleString('en-IN')} MT • {totalKg.toLocaleString('en-IN')} kg)
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] text-[#566861] block">Batch Subtotal:</span>
                  <span className="font-extrabold text-[#0B3326] text-sm">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Destination Confirmation */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
                Delivery Destination (Your Shop / Hub)
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                Autofilled from Profile
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={deliveryDistrict}
                onChange={(e) => setDeliveryDistrict(e.target.value)}
                placeholder="District (e.g. Chennai)"
                className="px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
              <input
                type="text"
                value={deliveryState}
                onChange={(e) => setDeliveryState(e.target.value)}
                placeholder="State (e.g. Tamil Nadu)"
                className="px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Shop / Hub / Street Address"
                className="col-span-2 px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
              <input
                type="text"
                value={deliveryPincode}
                onChange={(e) => setDeliveryPincode(e.target.value)}
                placeholder="PIN Code"
                className="px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
          </div>

          {/* Payment & Funding Mode Selector */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                Select Payment &amp; Settlement Method
              </label>
              {isBulkOrder && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Bulk Order (≥ ₹50,000)
                </span>
              )}
            </div>

            {/* High-Value Routing Banner */}
            {isBulkOrder && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/90 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-950">
                  <span className="flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-amber-700" />
                    High-Value Direct Escrow Policy
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    0% Gateway Fee
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  In compliance with bulk B2B trade policy, orders of ₹50,000 and above are routed via Escrow Virtual Bank Account (NEFT/RTGS/IMPS) to protect margins and eliminate gateway limits.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Razorpay Route Gateway (Only for retail lots < ₹50,000) */}
              {!isBulkOrder && (
                <button
                  type="button"
                  onClick={() => setPaymentMode('direct_razorpay')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMode === 'direct_razorpay'
                      ? 'border-[#10B981] bg-[#F2FBF6] ring-2 ring-[#10B981]/20'
                      : 'border-[#E5EDE8] bg-white hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#0B3326] flex items-center gap-1.5">
                      <ShieldCheck className={`w-3.5 h-3.5 ${paymentMode === 'direct_razorpay' ? 'text-[#10B981]' : 'text-[#566861]'}`} />
                      Razorpay Instant
                    </span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMode === 'direct_razorpay' ? 'border-[#10B981] bg-[#10B981]' : 'border-gray-300'}`}>
                      {paymentMode === 'direct_razorpay' && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 inline-block">
                      UPI / Cards / NetBanking
                    </span>
                    <p className="text-[10px] text-[#566861] leading-snug">
                      Instant checkout for orders under ₹50,000.
                    </p>
                  </div>
                </button>
              )}

              {/* Option 2: Escrow Virtual Account (NEFT / RTGS) */}
              <button
                type="button"
                onClick={() => setPaymentMode('escrow_van')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isBulkOrder ? 'sm:col-span-2' : ''
                } ${
                  paymentMode === 'escrow_van'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                    : 'border-[#E5EDE8] bg-white hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0B3326] flex items-center gap-1.5">
                    <Landmark className={`w-3.5 h-3.5 ${paymentMode === 'escrow_van' ? 'text-emerald-700' : 'text-[#566861]'}`} />
                    Escrow Virtual Account (VAN)
                  </span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMode === 'escrow_van' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                    {paymentMode === 'escrow_van' && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1">
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-block">
                    NEFT / RTGS / IMPS • 0% Fee
                  </span>
                  <p className="text-[10px] text-[#566861] leading-snug">
                    Direct bank transfer to AgroLnk Escrow Trust Account.
                  </p>
                </div>
              </button>

              {/* Option 3: Trade Credit / NBFC Financing */}
              {!isBulkOrder && (
                <button
                  type="button"
                  onClick={() => setPaymentMode('trade_credit')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentMode === 'trade_credit'
                      ? 'border-[#10B981] bg-[#F2FBF6] ring-2 ring-[#10B981]/20'
                      : 'border-[#E5EDE8] bg-white hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#0B3326] flex items-center gap-1.5">
                      <Landmark className={`w-3.5 h-3.5 ${paymentMode === 'trade_credit' ? 'text-[#10B981]' : 'text-blue-600'}`} />
                      Trade Credit
                    </span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMode === 'trade_credit' ? 'border-[#10B981] bg-[#10B981]' : 'border-gray-300'}`}>
                      {paymentMode === 'trade_credit' && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 inline-block">
                      NBFC Financed
                    </span>
                    <p className="text-[10px] text-[#566861] leading-snug">
                      {existingCreditReq
                        ? `Application ${existingCreditReq.requestNumber} is under review.`
                        : 'Get up to 80% NBFC institutional financing.'}
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Escrow Virtual Account Banking Details (Rendered when escrow_van is selected) */}
          {paymentMode === 'escrow_van' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-[#F8FAF8] border-2 border-emerald-300 space-y-3.5 text-left animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5 uppercase tracking-wide">
                  <Landmark className="w-4 h-4 text-emerald-700" />
                  Official AgroLnk Escrow Virtual Account (VAN)
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Flat ₹15 Fee • NEFT / RTGS
                </span>
              </div>

              {!isAwaitingWebhook ? (
                <>
                  <p className="text-[11px] text-[#566861] leading-relaxed">
                    For bulk orders $\ge$ ₹50,000, AgroLnk provisions a dedicated <strong>Order Virtual Account</strong>. Funds settle directly into RBI-regulated Escrow without manual UTR submission.
                  </p>

                  <div className="p-3 rounded-xl bg-white border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#566861] uppercase tracking-wider block font-semibold">Payment Destination</span>
                      <span className="font-bold text-[#0B3326] text-xs block">
                        {ESCROW_NODAL_ACCOUNT.bankName} • Escrow Trust Account
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      IFSC: {ESCROW_NODAL_ACCOUNT.ifscCode}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Click <strong>"Generate Escrow Bank Link"</strong> below. The system automatically creates your unique Order-VAN and captures the bank UTR via real-time webhooks.
                    </span>
                  </div>
                </>
              ) : (
                /* Active Smart Collect Awaiting Webhook Screen */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-white border-2 border-emerald-500 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Order {vanSession?.orderNumber} Virtual Account
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700">
                        {formatINR(vanSession?.amount)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">Order Virtual A/C No.</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-mono font-extrabold text-[#0B3326] text-xs">
                            {vanSession?.vanNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyEscrow(vanSession?.vanNumber, 'van')}
                            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
                          >
                            {copiedEscrowField === 'van' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">IFSC Code</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-mono font-extrabold text-[#0B3326] text-xs">
                            {vanSession?.ifsc}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyEscrow(vanSession?.ifsc, 'ifsc')}
                            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
                          >
                            {copiedEscrowField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mode Selector: Automated Webhook vs Manual UTR Fallback */}
                  <div className="flex items-center gap-1.5 p-1 bg-white/70 border border-emerald-200 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setVanVerificationMode('auto')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        vanVerificationMode === 'auto'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-[#566861] hover:text-[#0B3326]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ Auto Webhook (Recommended)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVanVerificationMode('manual')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        vanVerificationMode === 'manual'
                          ? 'bg-blue-800 text-white shadow-xs'
                          : 'text-[#566861] hover:text-[#0B3326]'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      <span>📝 Manual UTR (Fallback)</span>
                    </button>
                  </div>

                  {vanSession?.status === 'credited' ? (
                    <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 flex items-center gap-3 animate-in zoom-in-95">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-xs block">Bank Payment Verified &amp; Secured in Escrow!</span>
                        <span className="text-[11px] font-mono text-emerald-800">
                          Captured Bank UTR: <strong>{vanSession.utr}</strong>
                        </span>
                      </div>
                    </div>
                  ) : vanVerificationMode === 'manual' ? (
                    /* Manual UTR Submission Fallback View */
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                      <div>
                        <span className="text-xs font-bold text-blue-950 block">Bank Transfer Reference (UTR Number)</span>
                        <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                          Already transferred via your NetBanking/branch? Paste your 12–16 digit Bank UTR / RRN below. AgroLnk Admin will verify the deposit from the bank statement.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={manualUtrInput}
                          onChange={(e) => setManualUtrInput(e.target.value.toUpperCase())}
                          placeholder="e.g. ICICR20261109123456 or UTRN9876543210"
                          className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleManualUtrSubmit}
                        disabled={isSubmitting || !manualUtrInput.trim()}
                        className="w-full py-2.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4 text-blue-200" />
                        <span>Confirm &amp; Submit UTR for Bank Verification</span>
                      </button>
                    </div>
                  ) : (
                    /* Automated Bank Webhook Listener View */
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                          <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                          <span>Awaiting Bank Webhook Clearing...</span>
                        </div>
                        <span className="text-[10px] text-amber-700 font-medium">Auto-Listening</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        Transfer ₹{vanSession?.amount?.toLocaleString('en-IN')} via your bank app's RTGS/NEFT to the account above. The UTR will be captured automatically.
                      </p>

                      {/* Developer Sandbox Testing Simulation Trigger */}
                      <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between">
                        <span className="text-[10px] text-amber-700 italic">Dev Sandbox Mode:</span>
                        <button
                          type="button"
                          onClick={handleSimulateBankCredit}
                          disabled={isSubmitting}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          {isSubmitting ? 'Simulating Credit...' : 'Simulate Bank Credit (Auto-Capture UTR)'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* If an active credit application is already pending for this lot */}
          {paymentMode === 'trade_credit' && existingCreditReq && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs text-amber-950">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Credit Application Already Submitted ({existingCreditReq.requestNumber})</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                You already have an active trade credit application of <strong>{formatINR(existingCreditReq.requestedAmount)}</strong> for this lot. Duplicate repeat applications are disabled.
              </p>
            </div>
          )}

          {/* Trade Credit Parameter Breakdown (If Selected and not yet applied) */}
          {paymentMode === 'trade_credit' && !existingCreditReq && (
            <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E40AF] flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-[#2563EB]" />
                  Institutional Trade Credit Facility
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD]">
                  30 Days Net • 0.85%/mo
                </span>
              </div>

              {/* LTV Presets */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#1E40AF] font-semibold">Credit Coverage:</span>
                {[0.5, 0.7, 0.8].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setFinancePct(pct)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      financePct === pct
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-white text-[#1E40AF] border border-[#BFDBFE] hover:bg-[#DBEAFE]'
                    }`}
                  >
                    {pct * 100}%
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-[#BFDBFE]/70">
                  <span className="text-[10px] text-[#566861] block font-medium">NBFC Funded Loan</span>
                  <span className="font-extrabold text-[#2563EB] text-sm">
                    {formatINR(financedLoanAmount)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#BFDBFE]/70">
                  <span className="text-[10px] text-[#566861] block font-medium">Buyer Margin Deposit</span>
                  <span className="font-extrabold text-[#0B3326] text-sm">
                    {formatINR(buyerMarginDeposit)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Subtotal & Fee Calculation Box */}
          <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#DCFCE7]/80">
              <span>Produce Value ({qty} {listing.unit} × ₹{listing.price})</span>
              <span className="font-semibold text-white">{formatINR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#DCFCE7]/80">
              <span>Buyer Platform Fee (0.25%)</span>
              <span className="font-semibold text-[#34D399]">+{formatINR(financials.buyerFee)}</span>
            </div>
            <div className="flex items-baseline justify-between pt-2 border-t border-[#14624A]">
              <span className="text-sm font-semibold text-white">
                {paymentMode === 'trade_credit' ? 'Total Order Value' : 'Total Payable'}
              </span>
              <span className="text-2xl font-extrabold font-heading text-[#34D399]">
                {formatINR(financials.totalBuyerPayable)}
              </span>
            </div>
          </div>

          {/* Trust Guarantee / Settlement Notice */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326]">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>
              {paymentMode === 'trade_credit'
                ? 'NBFC pays 80% directly into Escrow. You pay only the 20% balance once approved.'
                : '100% Escrow Protected. Money is released to the farmer only after you verify delivery.'}
            </span>
          </div>

        </div>

        {/* Fixed Actions Footer */}
        <div className="p-4 sm:p-6 pt-4 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 bg-[#FAFBF9]">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 justify-center font-semibold text-xs py-2.5 sm:py-3 cursor-pointer w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirmOrder}
            disabled={isSubmitting || Boolean(creditSuccessMsg) || (paymentMode === 'trade_credit' && Boolean(existingCreditReq))}
            icon={paymentMode === 'direct_razorpay' ? Zap : Landmark}
            iconPosition="left"
            className={`flex-1 justify-center font-bold text-xs py-2.5 sm:py-3 shadow-xs cursor-pointer w-full sm:w-auto text-white ${
              paymentMode === 'trade_credit'
                ? existingCreditReq
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                : paymentMode === 'escrow_van'
                ? 'bg-emerald-800 hover:bg-emerald-900'
                : 'bg-[#0B3326] hover:bg-[#0A261D]'
            }`}
          >
            {isSubmitting
              ? 'Processing Order...'
              : paymentMode === 'trade_credit'
              ? existingCreditReq
                ? `Application Under Review (${existingCreditReq.requestNumber})`
                : `Apply for Trade Credit (${formatINR(financedLoanAmount)})`
              : paymentMode === 'escrow_van'
              ? isAwaitingWebhook
                ? `Awaiting Bank Clearing (${formatINR(financials.totalBuyerPayable)})`
                : `Generate Escrow Bank Link (${formatINR(financials.totalBuyerPayable)})`
              : `Pay ${formatINR(financials.totalBuyerPayable)} via Razorpay`}
          </Button>
        </div>
        </>
      )}

      </div>
    </div>
  );
}
