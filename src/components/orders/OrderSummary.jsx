import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ShieldCheck,
  User,
  Calendar,
  Package,
  Landmark,
  CreditCard,
  ArrowRight,
  Truck,
  CheckCircle2,
  ClipboardCheck,
  Receipt,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import CopyButton from '../ui/CopyButton';
import OrderStatus from './OrderStatus';
import DeliveryTimeline from '../delivery/DeliveryTimeline';
import OrderReceiptModal from './OrderReceiptModal';
import { getFinancingRequestForOrder } from '../../utils/financing';
import { getDeliveryForOrder, calculateTransportFinancials } from '../../utils/deliveries';
import { getInspectionForOrder } from '../../utils/inspection';
import { hasSpecificVariety } from '../../data/commodityTaxonomy';
import { formatDualVolume } from '../../utils/pricingUnits';
import { getCurrentUser } from '../../utils/auth';
import { toast } from '../../context/ToastContext';
import { depositOrderEscrow, completeBuyerOrderWithFreightPayment, updateOrderStatus } from '../../utils/orders';
import { calculateOrderFinancials } from '../../utils/commission';
import { initiateRazorpayRouteCheckout } from '../../utils/razorpayRouteClient';
import { generateOrderSmartVAN, processSmartVanWebhookCredit, ESCROW_NODAL_ACCOUNT } from '../../utils/escrowApi';

export default function OrderSummary({
  order,
  viewerRole = 'farmer',
  onRequestFinancing,
  onViewFinancing,
  onArrangeDelivery,
  onViewDelivery,
  onConfirmReceipt,
  onInspectQuality,
}) {
  const [existingFinancing, setExistingFinancing] = useState(null);
  const [existingDelivery, setExistingDelivery] = useState(null);
  const [existingInspection, setExistingInspection] = useState(null);
  const [isLoadingLinkedData, setIsLoadingLinkedData] = useState(true);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [rfqRemainingSec, setRfqRemainingSec] = useState(30 * 60);
  const [selectedPayMethod, setSelectedPayMethod] = useState(null);
  const [vanSession, setVanSession] = useState(null);
  const [manualUtr, setManualUtr] = useState('');
  const [copiedVanField, setCopiedVanField] = useState(null);

  useEffect(() => {
    setSelectedPayMethod(null);
    setVanSession(null);
    setManualUtr('');
  }, [order?.id]);

  useEffect(() => {
    let isMounted = true;
    const loadLinkedData = async (isInitial = false) => {
      if (!order?.orderNumber && !order?.id) {
        if (isMounted) setIsLoadingLinkedData(false);
        return;
      }
      if (isInitial && isMounted) setIsLoadingLinkedData(true);
      try {
        const [fin, dlv, insp] = await Promise.all([
          getFinancingRequestForOrder(order.orderNumber || order.id, null, viewerRole),
          getDeliveryForOrder(order.orderNumber || order.id),
          getInspectionForOrder(order.orderNumber || order.id),
        ]);
        if (isMounted) {
          setExistingFinancing(fin);
          setExistingDelivery(dlv);
          setExistingInspection(insp);
        }
      } catch (err) {
        console.warn('Error fetching linked order data:', err);
      } finally {
        if (isMounted) setIsLoadingLinkedData(false);
      }
    };
    loadLinkedData(true);

    const handleSync = () => {
      loadLinkedData(false);
    };

    window.addEventListener('agrolnk_financing_updated', handleSync);
    window.addEventListener('agrolnk_orders_updated', handleSync);
    window.addEventListener('agrolnk_order_updated', handleSync);
    window.addEventListener('agrolnk_deliveries_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('agrolnk_financing_updated', handleSync);
      window.removeEventListener('agrolnk_orders_updated', handleSync);
      window.removeEventListener('agrolnk_order_updated', handleSync);
      window.removeEventListener('agrolnk_deliveries_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [order?.id, order?.orderNumber, order?.status, viewerRole]);

  useEffect(() => {
    const expiryIso =
      existingDelivery?.rfqExpiresAt ||
      (order?.createdAt
        ? new Date(new Date(order.createdAt).getTime() + 30 * 60 * 1000).toISOString()
        : null);
    if (!expiryIso) return;

    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiryIso).getTime() - Date.now()) / 1000));
      setRfqRemainingSec(diff);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [existingDelivery?.rfqExpiresAt, order?.createdAt]);

  if (!order) return null;

  const isBuyer = viewerRole === 'buyer';

  const pickupStr = typeof order.pickupLocation === 'object'
    ? `${order.pickupLocation?.district || order.district || 'Salem'}, ${order.pickupLocation?.state || order.state || 'Tamil Nadu'}`
    : order.district ? `${order.district}, ${order.state || 'India'}` : 'Origin Farmgate';

  const destStr = typeof order.deliveryLocation === 'object'
    ? `${order.deliveryLocation?.district || order.buyerDistrict || 'Chennai'}, ${order.deliveryLocation?.state || order.buyerState || 'Tamil Nadu'}`
    : `${order.buyerDistrict || 'Chennai'}, ${order.buyerState || 'Tamil Nadu'}`;

  const isFarmerFinancing = Boolean(
    !isBuyer &&
    existingFinancing &&
    (existingFinancing.applicantRole === 'farmer' || existingFinancing.purpose === 'working_capital')
  );

  const isBuyerFinanced = Boolean(
    isBuyer &&
    (existingFinancing ||
      order.paymentMode === 'trade_credit' ||
      order.escrowStatus === 'financing_pending' ||
      order.financingRequestId)
  );

  const financedAmount = existingFinancing?.approvedAmount || existingFinancing?.requestedAmount || order.financingAmount || Math.round(Number(order.totalAmount || 0) * 0.8);
  const buyerMargin = Math.max(0, Number(order.totalAmount || 0) - financedAmount);

  const effectiveDeliveryStatus =
    order.status === 'completed'
      ? 'completed'
      : order.status === 'delivered' && existingDelivery?.status !== 'completed'
      ? 'delivered'
      : existingDelivery?.status || order.status;

  const isPendingEscrow = Boolean(
    (order.escrowStatus === 'pending' ||
      order.escrow_status === 'pending' ||
      order.status === 'pending' ||
      order.status === 'awaiting_freight_quote' ||
      order.status === 'freight_quoted') &&
    !isBuyerFinanced &&
    order.status !== 'completed' &&
    order.status !== 'cancelled'
  );

  const quotedFreightAmount = Number(
    existingDelivery?.lowestQuote?.freightAmount ||
      existingDelivery?.freightAmount ||
      order.freightAmount ||
      0
  );
  const hasFreightQuote = Boolean(
    quotedFreightAmount > 0 &&
    (existingDelivery?.status === 'price_offered' ||
      (existingDelivery?.quotesCount || 0) > 0 ||
      order.status === 'freight_quoted' ||
      order.freightAmount > 0)
  );
  const cropFin = calculateOrderFinancials(Number(order.totalAmount || order.total_amount || 0));
  const freightFin = calculateTransportFinancials(quotedFreightAmount);
  const combinedEscrowPayable = cropFin.totalBuyerPayable + (hasFreightQuote ? freightFin.totalPayableByFarmer : 0);

  const formatRfqTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleDepositEscrow = async () => {
    setIsDepositing(true);
    const currentUser = getCurrentUser();
    const baseCropVal = Number(order.totalAmount || order.total_amount || 0);
    const tradeValToCharge = hasFreightQuote ? baseCropVal + quotedFreightAmount : baseCropVal;

    try {
      await initiateRazorpayRouteCheckout({
        existingOrderId: order.id,
        listing: {
          id: order.listingId || order.listing_id || order.auctionId || order.auction_id || 'lot',
          commodity: order.commodity,
          unit: order.unit,
          price_per_unit: Number(order.pricePerUnit || order.price_per_unit || (baseCropVal / (order.quantity || 1)) || 0),
        },
        quantity: Number(order.quantity || 1),
        pricePerUnit: Number(order.pricePerUnit || order.price_per_unit || (baseCropVal / (order.quantity || 1)) || 0),
        customTradeValue: tradeValToCharge,
        purchaseUnit: order.unit || 'kg',
        buyerUser: currentUser || { name: order.buyerName || 'Buyer Partner', id: order.buyerId },
        onSuccess: async (payRes) => {
          try {
            if (hasFreightQuote) {
              await completeBuyerOrderWithFreightPayment(order.id, {
                paymentMode: `Razorpay Combined Escrow (${payRes?.razorpay_payment_id || 'Gateway'})`,
                paymentId: payRes?.razorpay_payment_id,
                orderId: payRes?.razorpay_order_id,
                signature: payRes?.razorpay_signature,
                verified: Boolean(payRes?.verified),
              });
              toast.success('Combined Crop + Freight Escrow locked! Seller & Transporter notified immediately.');
            } else {
              await depositOrderEscrow(order.id, {
                paymentMode: `Razorpay Route (${payRes?.razorpay_payment_id || 'Gateway'})`,
                paymentId: payRes?.razorpay_payment_id,
                orderId: payRes?.razorpay_order_id,
                signature: payRes?.razorpay_signature,
                verified: Boolean(payRes?.verified),
              });
              toast.success('Escrow deposit secured via Razorpay! Transport dispatch is now authorized.');
            }
          } catch (err) {
            console.error('Error settling order escrow deposit:', err);
            toast.error(err?.message || 'Payment captured, updating order failed. Please refresh.');
          } finally {
            setIsDepositing(false);
          }
        },
        onFailure: (err) => {
          setIsDepositing(false);
          if (err?.message !== 'Payment window closed.') {
            toast.error(err?.message || 'Payment initiation failed.');
          }
        },
      });
    } catch (err) {
      setIsDepositing(false);
      toast.error(err?.message || 'Failed to open escrow payment checkout.');
    }
  };

  const isVanPreferred = Boolean(
    order.paymentMode === 'escrow_van' ||
    order.paymentMethod === 'escrow_van' ||
    combinedEscrowPayable >= 50000
  );
  const activePayMethod = selectedPayMethod || (isVanPreferred ? 'escrow_van' : 'razorpay');

  const handleCopyVanField = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(String(text));
    setCopiedVanField(key);
    setTimeout(() => setCopiedVanField(null), 1800);
  };

  const handleOpenVanDetails = () => {
    const currentUser = getCurrentUser();
    const orderNum = order.orderNumber || `#${String(order.id || '').slice(-6).toUpperCase()}`;
    const smartVan = generateOrderSmartVAN({
      orderNumber: orderNum,
      buyerPhone: order.buyerPhone || currentUser?.phone,
      orderAmount: combinedEscrowPayable,
    });
    setVanSession({
      orderNumber: orderNum,
      vanNumber: smartVan.accountNumber,
      ifsc: smartVan.ifscCode,
      bankName: smartVan.bankName,
      beneficiary: smartVan.beneficiaryName || ESCROW_NODAL_ACCOUNT.accountName,
      amount: combinedEscrowPayable,
      status: 'awaiting_clearing',
      utr: null,
    });
  };

  const handleCompleteVanPayment = async (utrValue) => {
    const cleanUtr = String(utrValue || '').trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 6) {
      toast.error('Please enter a valid Bank UTR / Reference Number (min 6 characters).');
      return;
    }
    setIsDepositing(true);
    const currentUser = getCurrentUser();
    try {
      await processSmartVanWebhookCredit({
        orderNumber: vanSession?.orderNumber || order.orderNumber,
        bankUtr: cleanUtr,
        amount: combinedEscrowPayable,
        remitterName: currentUser?.name || order.buyerName || 'Buyer Enterprise',
      });

      if (hasFreightQuote) {
        await completeBuyerOrderWithFreightPayment(order.id, {
          paymentMode: 'escrow_van',
          bankUtr: cleanUtr,
          autoVerified: false,
          verified: false,
          deliveryId: existingDelivery?.id || order.deliveryId || null,
        });
      } else {
        await depositOrderEscrow(order.id, {
          paymentMode: 'escrow_van',
          bankUtr: cleanUtr,
          autoVerified: false,
          verified: false,
        });
      }

      setVanSession((prev) => (prev ? { ...prev, status: 'credited', utr: cleanUtr } : prev));
      toast.success(`Bank UTR ${cleanUtr} recorded! Seller & Transporter notified.`);
    } catch (err) {
      console.error('VAN UTR submission error:', err);
      toast.error(err?.message || 'Failed to record Bank UTR. Please try again.');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleCancelRfqOrder = async () => {
    if (!window.confirm(`Are you sure you want to cancel quote request ${order.orderNumber}? The reserved lot will be returned to inventory.`)) {
      return;
    }
    try {
      setIsDepositing(true);
      await updateOrderStatus(order.id || order.orderNumber, 'cancelled');
      toast.success(`Order ${order.orderNumber} cancelled and lot returned to inventory.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrolnk_order_updated', { detail: { id: order.id, orderNumber: order.orderNumber, status: 'cancelled' } }));
        window.dispatchEvent(new CustomEvent('agrolnk_orders_updated'));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order request.');
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="space-y-4 text-left">

      {/* 1. Unified Order Header & Produce Summary */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs space-y-4">
        
        {/* Top Title & Total */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E5EDE8]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold text-[#0B3326] font-heading">
                {order.commodity || 'Produce Lot'}
              </h3>
              <Badge variant="dark" size="sm">
                Grade {order.grade || 'A'}
              </Badge>
              <CopyButton
                text={order.orderNumber ? (order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`) : '#Order'}
                label="Order Number"
                variant="badge"
                title="Click to copy Order Number"
              />
              <OrderStatus
                status={hasFreightQuote && order.status === 'awaiting_freight_quote' ? 'freight_quoted' : order.status}
                escrowStatus={order.escrowStatus || order.escrow_status}
                isAuction={Boolean(order.auctionId || order.auction_id)}
                size="sm"
              />
            </div>
            <span className="text-xs text-[#566861] mt-0.5 block">
              {hasSpecificVariety(order.variety) && (
                <>
                  Variety: <strong>{order.variety}</strong> •{' '}
                </>
              )}
              {order.createdAt && !isNaN(new Date(order.createdAt).getTime()) ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Recent'}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-[#566861] block tracking-wider">
              {isPendingEscrow && hasFreightQuote ? 'Produce Value' : 'Total Amount'}
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Essential 3-Column Trade Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Quantity & Unit Price */}
          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-0.5" title={formatDualVolume(order.quantity, order.unit)}>
            <span className="text-[10px] text-[#566861] font-bold uppercase tracking-wider block">
              Quantity & Rate
            </span>
            <span className="font-extrabold text-[#14211D] text-sm block">
              {formatDualVolume(order.quantity, order.unit)}
            </span>
            <span className="text-[11px] text-[#566861]">
              ₹{Number(order.pricePerUnit || (order.totalAmount / (order.quantity || 1)) || 0).toLocaleString('en-IN')}/{order.unit || 'kg'}
            </span>
          </div>

          {/* Counterparty */}
          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-0.5">
            <span className="text-[10px] text-[#566861] font-bold uppercase tracking-wider block">
              {viewerRole === 'farmer' ? 'Buyer' : 'Farmer'}
            </span>
            <span className="font-extrabold text-[#0B3326] text-sm flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span className="truncate">
                {viewerRole === 'farmer' ? order.buyerName || 'Buyer' : order.farmerName || 'Farmer'}
              </span>
            </span>
            <span className="text-[11px] text-[#566861] flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-[#566861] shrink-0" />
              <span className="truncate">{viewerRole === 'farmer' ? destStr : pickupStr}</span>
            </span>
          </div>

          {/* Payment & Security Mode */}
          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-0.5">
            <span className="text-[10px] text-[#566861] font-bold uppercase tracking-wider block">
              Payment Mode &amp; Security
            </span>
            <span className={`font-extrabold text-sm block ${
              isBuyer && isBuyerFinanced 
                ? 'text-blue-700' 
                : (order.paymentMode === 'escrow_van' || order.paymentMethod === 'escrow_van')
                ? 'text-emerald-800'
                : 'text-emerald-700'
            }`}>
              {isBuyer && isBuyerFinanced 
                ? 'Trade Credit (NBFC)' 
                : (order.paymentMode === 'escrow_van' || order.paymentMethod === 'escrow_van')
                ? 'Escrow Bank Transfer (VAN)'
                : '100% Escrow Protected'}
            </span>
            <span className="text-[11px] text-[#566861] block font-mono">
              {order.bankUtr 
                ? `UTR: ${order.bankUtr} • ${order.escrowStatus === 'funded' ? 'Verified ✓' : 'Verifying ⏳'}`
                : isBuyer && isBuyerFinanced 
                ? '30 Days Net Repayment' 
                : isPendingEscrow
                ? (hasFreightQuote ? 'Pending Buyer Escrow' : 'Awaiting Freight Quote')
                : 'Held safely in AgrowLink Escrow'}
            </span>
          </div>
        </div>

        {/* Sleek Credit Facility Tag (If credit is active) */}
        {isBuyer && isBuyerFinanced && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-blue-950 font-semibold">
                NBFC Credit: <strong>₹{financedAmount.toLocaleString('en-IN')}</strong> • Margin Paid: ₹{buyerMargin.toLocaleString('en-IN')}
              </span>
            </div>
            {onViewFinancing && (
              <button
                type="button"
                onClick={() => onViewFinancing(existingFinancing)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer text-left"
              >
                View Credit Terms →
              </button>
            )}
          </div>
        )}

        {/* Farmer Working Capital Offer Received Banner */}
        {!isBuyer && existingFinancing && (existingFinancing.status === 'offer_sent' || existingFinancing.status === 'offer_received') && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left animate-in fade-in shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 shrink-0">
                <Landmark className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-amber-950 text-sm">
                    Term-Sheet Offer Received!
                  </span>
                  <Badge variant="amber" size="xs">
                    {existingFinancing.requestNumber || 'Offer Ready'}
                  </Badge>
                </div>
                <p className="text-[#566861]">
                  Financier <strong className="text-amber-950">{existingFinancing.financierName || 'Financial Institution'}</strong> offered{' '}
                  <strong className="text-emerald-700 font-bold">₹{(Number(existingFinancing.offeredAmount || existingFinancing.approvedAmount || existingFinancing.requestedAmount || 0)).toLocaleString('en-IN')}</strong> working capital advance at{' '}
                  <strong>{existingFinancing.interestRate || 0.85}%/mo</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onViewFinancing && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => onViewFinancing(existingFinancing)}
                  className="font-bold text-xs py-2 px-3.5 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  Review & Accept Offer →
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Farmer Offer Accepted / Pending Escrow Disbursement */}
        {!isBuyer && existingFinancing && (existingFinancing.status === 'borrower_accepted' || existingFinancing.status === 'approved') && (
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-blue-950 font-semibold">
                Term-Sheet Accepted: <strong>₹{(Number(existingFinancing.offeredAmount || existingFinancing.approvedAmount || 0)).toLocaleString('en-IN')}</strong> • Awaiting Escrow Disbursement by Lender.
              </span>
            </div>
            {onViewFinancing && (
              <button
                type="button"
                onClick={() => onViewFinancing(existingFinancing)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0"
              >
                View Terms →
              </button>
            )}
          </div>
        )}

        {/* Farmer Capital Disbursed */}
        {!isBuyer && existingFinancing && existingFinancing.status === 'disbursed' && (
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-emerald-950 font-semibold">
                Working Capital Disbursed: <strong>₹{(Number(existingFinancing.approvedAmount || existingFinancing.requestedAmount || 0)).toLocaleString('en-IN')}</strong> {existingFinancing.bankUtr ? `(UTR: ${existingFinancing.bankUtr})` : ''}
              </span>
            </div>
            {onViewFinancing && (
              <button
                type="button"
                onClick={() => onViewFinancing(existingFinancing)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer shrink-0"
              >
                View Agreement →
              </button>
            )}
          </div>
        )}

        {/* Farmer Request Pending Review */}
        {!isBuyer && existingFinancing && (existingFinancing.status === 'pending' || existingFinancing.status === 'under_review') && (
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="text-amber-950 font-semibold">
                Working Capital Request ({existingFinancing.requestNumber || 'Pending'}): <strong>₹{(Number(existingFinancing.requestedAmount || 0)).toLocaleString('en-IN')}</strong> • Under review by lending desk.
              </span>
            </div>
            {onViewFinancing && (
              <button
                type="button"
                onClick={() => onViewFinancing(existingFinancing)}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer shrink-0"
              >
                Track Request →
              </button>
            )}
          </div>
        )}

        {/* Quality Assay Certificate Strip (If inspected) */}
        {existingInspection && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs">
            <div className="flex items-center gap-2 text-amber-950">
              <ClipboardCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Quality Assay:</strong> Grade {existingInspection.grade || 'A'} • Moisture: {existingInspection.moisture || '10.5'}% ({existingInspection.status === 'passed' ? 'Assay Certified' : 'Assay Disputed'})
              </span>
            </div>
            {isBuyer && onInspectQuality && (
              <button
                type="button"
                onClick={() => onInspectQuality(order)}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                Report
              </button>
            )}
          </div>
        )}
      </div>

      {/* Friendly Loading State while fetching live freight quotes & escrow status */}
      {isPendingEscrow && isLoadingLinkedData && (
        <div className="p-5 rounded-2xl border border-[#E5EDE8] bg-[#F8FAF8] space-y-3 animate-pulse text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-bold text-[#0B3326] block">
                Checking live freight quotes &amp; payment details...
              </span>
              <span className="text-[11px] text-[#566861] block">
                Fetching the latest carrier bid for your order
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="h-12 rounded-xl bg-white border border-[#E5EDE8]" />
            <div className="h-12 rounded-xl bg-white border border-[#E5EDE8]" />
            <div className="h-12 rounded-xl bg-emerald-100/60 border border-emerald-200/60" />
          </div>
        </div>
      )}

      {/* Buyer Freight Quote & Combined Escrow Payment Card */}
      {isBuyer && isPendingEscrow && !isLoadingLinkedData && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-3.5 text-left animate-in fade-in shadow-xs ${
            hasFreightQuote
              ? 'bg-emerald-50/80 border-emerald-300'
              : 'bg-amber-50/80 border-amber-300'
          }`}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  hasFreightQuote ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {hasFreightQuote ? (
                  <Truck className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-700" />
                )}
              </div>
              <div>
                <span className="font-extrabold text-[#0B3326] text-sm block">
                  {order.bankUtr
                    ? 'UTR Submitted • Awaiting Verification'
                    : hasFreightQuote
                    ? 'Ready to Pay & Dispatch'
                    : order.auctionId || order.auction_id
                    ? 'Auction Won — Awaiting Freight Quote'
                    : rfqRemainingSec === 0
                    ? 'Escalated to Operations Desk'
                    : 'Finding Lowest Freight Quote'}
                </span>
                <span className="text-[11px] text-[#566861] block">
                  {order.bankUtr
                    ? 'Your bank transfer reference is recorded. Admin verification unlocks dispatch.'
                    : hasFreightQuote
                    ? 'One combined payment locks crop + freight escrow and notifies seller & carrier.'
                    : `Transporters are bidding on ${pickupStr} → ${destStr}.`}
                </span>
              </div>
            </div>

            <Badge variant={hasFreightQuote ? 'emerald' : 'amber'} size="xs">
              {hasFreightQuote
                ? `${existingDelivery?.quotesCount || 1} Quote Ready`
                : rfqRemainingSec === 0
                ? 'Admin Notified'
                : `⏱ ${formatRfqTime(rfqRemainingSec)} Left`}
            </Badge>
          </div>

          {/* Clean 3-Column Price Breakdown */}
          {hasFreightQuote && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-200/70">
                <span className="text-[10px] font-bold text-[#566861] uppercase block">
                  Crop Escrow
                </span>
                <span className="text-sm font-bold text-[#0B3326] font-heading">
                  ₹{cropFin.totalBuyerPayable.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-200/70">
                <span className="text-[10px] font-bold text-[#566861] uppercase block">
                  Lowest Freight
                </span>
                <span className="text-sm font-bold text-[#0B3326] font-heading">
                  ₹{freightFin.totalPayableByFarmer.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-700 text-white">
                <span className="text-[10px] font-bold text-emerald-100 uppercase block">
                  Total Payable
                </span>
                <span className="text-sm font-extrabold font-heading">
                  ₹{combinedEscrowPayable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Payment Method Switcher + NEFT/RTGS VAN Provision */}
          {hasFreightQuote && !order.bankUtr && (
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayMethod('escrow_van')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    activePayMethod === 'escrow_van'
                      ? 'bg-white border-emerald-600 ring-1 ring-emerald-600/20 shadow-2xs'
                      : 'bg-white/60 border-[#E5EDE8] hover:bg-white'
                  }`}
                >
                  <Landmark className={`w-4 h-4 shrink-0 ${activePayMethod === 'escrow_van' ? 'text-emerald-700' : 'text-[#566861]'}`} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#0B3326] block truncate">NEFT / RTGS (VAN)</span>
                    <span className="text-[10px] text-emerald-700 font-semibold block truncate">Flat ₹15 Fee • Bulk</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayMethod('razorpay');
                    setVanSession(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    activePayMethod === 'razorpay'
                      ? 'bg-white border-emerald-600 ring-1 ring-emerald-600/20 shadow-2xs'
                      : 'bg-white/60 border-[#E5EDE8] hover:bg-white'
                  }`}
                >
                  <CreditCard className={`w-4 h-4 shrink-0 ${activePayMethod === 'razorpay' ? 'text-emerald-700' : 'text-[#566861]'}`} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#0B3326] block truncate">Instant Gateway</span>
                    <span className="text-[10px] text-[#566861] block truncate">UPI / NetBanking / Card</span>
                  </div>
                </button>
              </div>

              {/* Virtual Account Bank Details Box */}
              {activePayMethod === 'escrow_van' && vanSession && (
                <div className="p-3.5 rounded-xl bg-white border-2 border-emerald-500/70 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between gap-2 border-b border-[#E5EDE8] pb-2">
                    <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-emerald-700" />
                      Order {vanSession.orderNumber} Virtual Account
                    </span>
                    <span className="text-xs font-extrabold text-emerald-700">
                      ₹{Number(vanSession.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-[#F8FAF8] border border-[#E5EDE8]">
                      <span className="text-[10px] text-[#566861] uppercase font-bold block">Virtual A/C Number</span>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="font-mono font-extrabold text-[#0B3326] text-xs">{vanSession.vanNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyVanField(vanSession.vanNumber, 'van')}
                          className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
                          title="Copy Virtual Account"
                        >
                          {copiedVanField === 'van' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#F8FAF8] border border-[#E5EDE8]">
                      <span className="text-[10px] text-[#566861] uppercase font-bold block">IFSC Code ({vanSession.bankName})</span>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="font-mono font-extrabold text-[#0B3326] text-xs">{vanSession.ifsc}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyVanField(vanSession.ifsc, 'ifsc')}
                          className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
                          title="Copy IFSC"
                        >
                          {copiedVanField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#566861] flex items-center justify-between gap-2 flex-wrap">
                    <span>Beneficiary: <strong className="text-[#0B3326]">{vanSession.beneficiary}</strong></span>
                    <span className="text-emerald-700 font-semibold">Transfer via NEFT / RTGS / IMPS</span>
                  </div>

                  {vanSession.status === 'credited' ? (
                    <div className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 flex items-center gap-2 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>UTR Recorded: <span className="font-mono">{vanSession.utr}</span></span>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1 border-t border-[#E5EDE8]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={manualUtr}
                          onChange={(e) => setManualUtr(e.target.value.toUpperCase())}
                          placeholder="Enter Bank UTR / Ref No. after transfer"
                          className="flex-1 min-w-0 px-3 py-2 text-xs font-mono rounded-lg border border-[#CBD7D0] focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                        <Button
                          variant="accent"
                          size="sm"
                          disabled={isDepositing || manualUtr.trim().length < 6}
                          onClick={() => handleCompleteVanPayment(manualUtr)}
                          className="text-xs font-bold py-2 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 cursor-pointer"
                        >
                          {isDepositing ? 'Saving...' : 'Submit UTR'}
                        </Button>
                      </div>

                      {import.meta.env.DEV && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-amber-700 italic">Dev Sandbox Mode:</span>
                          <button
                            type="button"
                            disabled={isDepositing}
                            onClick={() => handleCompleteVanPayment(`ICICR${new Date().getFullYear()}${String(Date.now()).slice(-8)}`)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            Simulate Bank Credit Webhook
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Already-submitted VAN UTR notice */}
          {order.bankUtr && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Bank UTR <strong className="font-mono">{order.bankUtr}</strong> submitted — awaiting Admin verification in Escrow Ledger.
              </span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-end gap-2 pt-0.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={isDepositing}
              onClick={handleCancelRfqOrder}
              className="text-xs font-semibold py-2 px-3.5 border-[#CBD7D0] text-[#566861] hover:bg-white cursor-pointer whitespace-nowrap"
            >
              Cancel Order
            </Button>
            {hasFreightQuote && !order.bankUtr && (
              activePayMethod === 'escrow_van' ? (
                !vanSession && (
                  <Button
                    variant="accent"
                    size="sm"
                    disabled={isDepositing}
                    onClick={handleOpenVanDetails}
                    icon={Landmark}
                    iconPosition="left"
                    className="font-bold text-xs py-2.5 px-5 shadow-sm cursor-pointer whitespace-nowrap bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    Pay via NEFT / RTGS (VAN)
                  </Button>
                )
              ) : (
                <Button
                  variant="accent"
                  size="sm"
                  disabled={isDepositing}
                  onClick={handleDepositEscrow}
                  className="font-bold text-xs py-2.5 px-5 shadow-sm cursor-pointer whitespace-nowrap bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  {isDepositing
                    ? 'Opening Payment...'
                    : `Pay Now • ₹${combinedEscrowPayable.toLocaleString('en-IN')}`}
                </Button>
              )
            )}
          </div>
        </div>
      )}

      {/* Farmer Cautionary Banner - Buyer Awaiting Freight Quote / Escrow Deposit */}
      {!isBuyer && isPendingEscrow && !isLoadingLinkedData && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-xs flex items-center gap-3 text-left animate-in fade-in">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-amber-950 text-sm">
                {hasFreightQuote
                  ? 'Freight Quoted — Awaiting Buyer Escrow'
                  : 'Awaiting 30-Min Freight Quote'}
              </span>
              <Badge variant="amber" size="xs">
                ₹0 Farmer Freight • Do Not Dispatch
              </Badge>
            </div>
            <p className="text-amber-900">
              {hasFreightQuote
                ? `Quote: ₹${quotedFreightAmount.toLocaleString('en-IN')}. Dispatch unlocks once buyer funds escrow.`
                : 'Transporters are bidding on delivery. Dispatch unlocks once buyer funds escrow.'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Simple 4-Step Logistics Progress Tracker (shown once escrow is funded) */}
      {!isPendingEscrow && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs space-y-3.5 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#10B981]" />
              <span className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                Consignment Journey
              </span>
            </div>

            {onViewDelivery && existingDelivery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDelivery({ ...existingDelivery, status: effectiveDeliveryStatus })}
                icon={ArrowRight}
                iconPosition="right"
                className="text-xs font-bold text-[#0B3326] cursor-pointer py-1 px-2.5"
              >
                Track Map
              </Button>
            )}
          </div>

          {/* 4-Step Progress Bar */}
          <DeliveryTimeline currentStatus={effectiveDeliveryStatus} delivery={existingDelivery || {}} />

          {/* Driver & Vehicle Tag */}
          {existingDelivery?.vehicleNumber && (
            <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <span className="text-[#0B3326]">
                  Vehicle: <strong className="font-mono">{existingDelivery.vehicleNumber}</strong>
                  {existingDelivery.transporterName ? ` (${existingDelivery.transporterName})` : ''}
                </span>
              </div>
              {existingDelivery.driverPhone && (
                <span className="text-[11px] text-[#566861]">
                  Driver: <strong>{existingDelivery.driverName || 'Driver'}</strong> ({existingDelivery.driverPhone})
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Completed Order Official Settlement Receipt Banner */}
      {(order.status === 'completed' || order.escrow_status === 'released') && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0B3326] to-[#0F4A37] text-white border border-[#14624A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#34D399]/20 text-[#34D399] flex items-center justify-center shrink-0 border border-[#34D399]/30">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">
                Trade Completed & Escrow Settled
              </span>
              <p className="text-[11px] text-white/80">
                {order.bankUtr || order.bank_utr ? `Bank UTR: ${order.bankUtr || order.bank_utr}` : 'Official tax invoice and settlement receipt released.'}
              </p>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            onClick={() => setShowReceiptModal(true)}
            icon={Receipt}
            iconPosition="left"
            className="text-xs font-bold py-2 px-3.5 shadow-md shrink-0 cursor-pointer w-full sm:w-auto justify-center"
          >
            View Settlement Receipt
          </Button>
        </div>
      )}

      {/* 4. Farmer Simple Working Capital Option (Only before completion) */}
      {(viewerRole === 'farmer' || viewerRole === 'fpo') && !isFarmerFinancing && order.status !== 'cancelled' && order.status !== 'completed' && onRequestFinancing && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] gap-2.5 text-left text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0B3326] text-[#34D399]">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#0B3326] block">
                Need Working Capital Credit?
              </span>
              <span className="text-[#566861]">
                Apply for credit up to ₹{Math.round(Number(order.totalAmount || 0) * 0.8).toLocaleString('en-IN')} (30–60 days)
              </span>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            onClick={() => onRequestFinancing(order)}
            className="text-xs font-bold py-1.5 px-3.5 shadow-xs shrink-0 cursor-pointer whitespace-nowrap"
          >
            Apply Credit
          </Button>
        </div>
      )}

      {/* Official Trade Settlement Receipt Modal */}
      {showReceiptModal && (
        <OrderReceiptModal
          isOpen={showReceiptModal}
          order={order}
          onClose={() => setShowReceiptModal(false)}
          viewerRole={viewerRole}
        />
      )}
    </div>
  );
}
