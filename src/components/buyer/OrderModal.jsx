import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Check, AlertCircle, ShoppingBag, Zap, Landmark, ArrowRight, Sparkles, Percent, CheckCircle2, Clock, MapPin } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { calculateOrderFinancials, formatINR } from '../../utils/commission';
import { initiateRazorpayRouteCheckout } from '../../utils/razorpayRouteClient';
import { createFinancingRequest, getFinancingRequests } from '../../utils/financing';
import { getResolvedUserKycStatus } from '../../utils/auth';
import { convertVolume, getRateInUnit } from '../../utils/pricingUnits';

export default function OrderModal({ listing, isOpen, onClose, onConfirm, currentUser }) {
  const [purchaseUnit, setPurchaseUnit] = useState(listing?.unit === 'MT' ? 'Quintal' : (listing?.unit || 'Quintal'));
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [paymentMode, setPaymentMode] = useState('direct'); // 'direct' | 'trade_credit'
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

  useEffect(() => {
    if (listing?.quantity) {
      const defaultUnit = listing.unit === 'MT' ? 'Quintal' : (listing.unit || 'kg');
      setPurchaseUnit(defaultUnit);
      const maxInUnit = convertVolume(listing.quantity, listing.unit, defaultUnit);
      const initialQty = defaultUnit === 'MT' ? Math.min(1, maxInUnit) : (defaultUnit === 'Quintal' ? Math.min(10, maxInUnit) : Math.min(100, maxInUnit));
      setPurchaseQty(initialQty > 0 ? initialQty : maxInUnit);
    }
    setPaymentMode('direct');
    setCreditSuccessMsg(null);
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

  if (!isOpen || !listing) return null;

  const qty = Math.max(0, Number(purchaseQty || 0));
  const activeRate = getRateInUnit(listing.price, listing.unit, purchaseUnit);
  const subtotal = Math.round(qty * activeRate);
  const financials = calculateOrderFinancials(subtotal);

  // Canonical cross-unit conversions
  const maxInSelectedUnit = convertVolume(listing.quantity, listing.unit, purchaseUnit);
  const quantityInListingUnit = convertVolume(qty, purchaseUnit, listing.unit);
  const totalKg = convertVolume(qty, purchaseUnit, 'kg');
  const totalQuintals = convertVolume(qty, purchaseUnit, 'Quintal');
  const totalMT = convertVolume(qty, purchaseUnit, 'MT');

  const financedLoanAmount = Math.round(financials.totalBuyerPayable * financePct);
  const buyerMarginDeposit = financials.totalBuyerPayable - financedLoanAmount;

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
          paymentMode: 'direct',
          state: listing.state,
          district: listing.district,
          razorpay_payment_id: paymentData?.razorpay_payment_id,
          razorpay_order_id: paymentData?.razorpay_order_id,
          razorpay_signature: paymentData?.razorpay_signature,
        });
      },
      onFailure: (err) => {
        setIsSubmitting(false);
        if (err.message && !err.message.includes('closed')) {
          setError(err.message || 'Payment processing failed. Please try again.');
        }
      },
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
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
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
            <label className="block text-xs font-bold text-[#0B3326] uppercase tracking-wider">
              Select Payment & Settlement Method
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Option 1: Direct Pay */}
              <button
                type="button"
                onClick={() => setPaymentMode('direct')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMode === 'direct'
                    ? 'border-[#10B981] bg-[#F2FBF6] ring-2 ring-[#10B981]/20'
                    : 'border-[#E5EDE8] bg-white hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0B3326] flex items-center gap-1.5">
                    <Zap className={`w-3.5 h-3.5 ${paymentMode === 'direct' ? 'text-[#10B981]' : 'text-[#566861]'}`} />
                    Direct Escrow
                  </span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMode === 'direct' ? 'border-[#10B981] bg-[#10B981]' : 'border-gray-300'}`}>
                    {paymentMode === 'direct' && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                </div>
                <p className="text-[11px] text-[#566861] mt-1.5 leading-snug">
                  Pay 100% upfront via UPI / Netbanking to Razorpay Route.
                </p>
              </button>

              {/* Option 2: Trade Credit / NBFC Financing */}
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
                    Trade Credit (NBFC)
                  </span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMode === 'trade_credit' ? 'border-[#10B981] bg-[#10B981]' : 'border-gray-300'}`}>
                    {paymentMode === 'trade_credit' && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                </div>
                <p className="text-[11px] text-[#566861] mt-1.5 leading-snug">
                  {existingCreditReq
                    ? `Application ${existingCreditReq.requestNumber} is under review.`
                    : 'Short on funds? Get up to 80% NBFC institutional financing.'}
                </p>
              </button>

            </div>
          </div>

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
            icon={paymentMode === 'trade_credit' ? Landmark : Zap}
            iconPosition="left"
            className={`flex-1 justify-center font-bold text-xs py-2.5 sm:py-3 shadow-xs cursor-pointer w-full sm:w-auto text-white ${
              paymentMode === 'trade_credit'
                ? existingCreditReq
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                : 'bg-[#0B3326] hover:bg-[#0A261D]'
            }`}
          >
            {isSubmitting
              ? 'Processing Application...'
              : paymentMode === 'trade_credit'
              ? existingCreditReq
                ? `Application Under Review (${existingCreditReq.requestNumber})`
                : `Apply for Trade Credit (${formatINR(financedLoanAmount)})`
              : `Pay ${formatINR(financials.totalBuyerPayable)}`}
          </Button>
        </div>
        </>
      )}

      </div>
    </div>
  );
}
