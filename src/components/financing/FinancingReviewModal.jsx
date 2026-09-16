import React, { useState, useEffect } from 'react';
import {
  X,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  CreditCard
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import FinancingStatusBadge from './FinancingStatusBadge';
import { updateFinancingStatus, underwriteFinancingRequest, getFinancingRequestForOrder } from '../../utils/financing';
import { initiateBuyerMarginDepositCheckout } from '../../utils/razorpayRouteClient';
import { ensureOrderForFinancing } from '../../utils/orders';

export default function FinancingReviewModal({
  request,
  viewerRole = 'financier', // 'financier' | 'farmer' | 'buyer'
  onClose,
  onStatusUpdated,
}) {
  const [activeRequest, setActiveRequest] = useState(request);
  const [approvedAmount, setApprovedAmount] = useState(
    request ? (request.approvedAmount || request.requestedAmount) : 0
  );
  const [reviewNotes, setReviewNotes] = useState(request?.reviewNotes || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPayingMargin, setIsPayingMargin] = useState(false);
  const [marginPaidSuccess, setMarginPaidSuccess] = useState(Boolean(request?.marginPaid));

  useEffect(() => {
    setActiveRequest(request);
    if (request) {
      setApprovedAmount(request.approvedAmount || request.requestedAmount || 0);
      setReviewNotes(request.reviewNotes || '');
      setMarginPaidSuccess(Boolean(request.marginPaid));
    }

    let isMounted = true;
    const loadFresh = async () => {
      const orderNum = request?.orderNumber || request?.orderId;
      const reqId = request?.id || request?.requestNumber;
      if (orderNum || reqId) {
        const fresh = await getFinancingRequestForOrder(orderNum, reqId);
        if (isMounted && fresh) {
          setActiveRequest(fresh);
          setApprovedAmount(fresh.approvedAmount || fresh.requestedAmount || 0);
          setReviewNotes(fresh.reviewNotes || '');
          setMarginPaidSuccess(Boolean(fresh.marginPaid));
        }
      }
    };
    loadFresh();

    const handleSync = (e) => {
      const detail = e?.detail;
      const targetReq = activeRequest || request;
      if (!targetReq) return;
      if (
        detail &&
        (detail.id === targetReq.id ||
          detail.requestNumber === targetReq.requestNumber ||
          detail.orderNumber === targetReq.orderNumber)
      ) {
        setActiveRequest(detail);
        setApprovedAmount(detail.approvedAmount || detail.requestedAmount || 0);
        setReviewNotes(detail.reviewNotes || '');
        setMarginPaidSuccess(Boolean(detail.marginPaid));
      } else {
        loadFresh();
      }
    };

    window.addEventListener('agrolnk_financing_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('agrolnk_financing_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [request?.id, request?.requestNumber, request?.orderNumber, request?.orderId, request?.status]);

  const curr = activeRequest || request;
  if (!curr) return null;

  const isFinancier = viewerRole === 'financier';
  const isBuyer = viewerRole === 'buyer';
  const isApproved = curr.status === 'approved' || curr.status === 'disbursed' || curr.status === 'escrow_secured';
  const totalTxValue = Number(curr.transactionValue || 0);
  const effectiveApproved = Number(curr.approvedAmount || curr.requestedAmount || approvedAmount || 0);
  const marginDeposit = Math.max(0, totalTxValue - effectiveApproved);
  const isMarginSettled = Boolean(curr.marginPaid || marginPaidSuccess || curr.status === 'disbursed');

  const handlePayMargin = async () => {
    setIsPayingMargin(true);
    try {
      await initiateBuyerMarginDepositCheckout({
        request: curr,
        marginAmount: marginDeposit,
        buyerUser: { name: curr.applicantName },
        onSuccess: async (res) => {
          setMarginPaidSuccess(true);
          setIsPayingMargin(false);
          const targetKey = curr.id || curr.requestNumber || curr.orderNumber;
          const updatedPayload = {
            ...curr,
            status: 'approved',
            marginPaid: true,
            escrowFunded: true,
            marginPaidAt: new Date().toISOString(),
            paymentId: res.razorpay_payment_id,
          };
          const updated = await underwriteFinancingRequest(targetKey, updatedPayload);
          const resolved = updated || updatedPayload;

          // Materialize / update order in orders table and local cache as funded
          try {
            await ensureOrderForFinancing(resolved, res);
          } catch (orderErr) {
            console.warn('ensureOrderForFinancing note:', orderErr);
          }

          try {
            window.dispatchEvent(new CustomEvent('agrolnk_financing_updated', { detail: resolved }));
            window.dispatchEvent(new Event('storage'));
          } catch {}
          onStatusUpdated?.(resolved);
        },
        onFailure: (err) => {
          console.warn('Payment dismissed or failed:', err);
          setIsPayingMargin(false);
        },
      });
    } catch (err) {
      console.error('Error initiating margin checkout:', err);
      setIsPayingMargin(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    setIsUpdating(true);
    try {
      const targetKey = curr.id || curr.requestNumber || curr.orderNumber;
      const updated = updateFinancingStatus(
        targetKey,
        newStatus,
        newStatus === 'approved' ? approvedAmount : null,
        reviewNotes
      );
      setIsUpdating(false);
      onStatusUpdated?.(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update financing status:', err);
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUpdating && !isPayingMargin) {
          onClose?.();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-150 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple Header */}
        <div className="p-5 pb-4 border-b border-[#E5EDE8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#0B3326]">
                  Trade Credit {curr.requestNumber || ''}
                </h3>
                <FinancingStatusBadge status={curr.status} />
              </div>
              <span className="text-xs text-[#566861]">
                {curr.orderNumber ? `Order ${curr.orderNumber}` : (curr.orderId ? `Order #${curr.orderId}` : 'Escrow Collateral')}
              </span>
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
        <div className="p-5 space-y-4">
          {/* Produce Summary */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#14211D] text-base">{curr.commodity || 'Produce Lot'}</span>
                <Badge variant="dark" size="sm">Grade {curr.grade || 'A'}</Badge>
              </div>
              <span className="text-xs text-[#566861]">
                {Number(curr.quantity || 0).toLocaleString('en-IN')} {curr.unit || 'kg'} • {curr.variety || 'Standard'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#566861] block font-medium">Total Value</span>
              <span className="text-lg font-extrabold text-[#0B3326]">
                ₹{Number(curr.transactionValue || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* If NOT approved yet and viewing as Buyer/Farmer */}
          {!isFinancier && !isApproved && (
            <div className="p-6 rounded-2xl bg-[#FEF3C7]/40 border border-[#FDE68A] text-center space-y-2">
              <Clock className="w-6 h-6 text-[#D97706] mx-auto animate-pulse" />
              <h4 className="text-sm font-bold text-[#0B3326]">Credit Application Under Review</h4>
              <p className="text-xs text-[#566861] max-w-sm mx-auto">
                Institutional lenders are evaluating your request. You will be able to pay the remaining 20% balance once approved.
              </p>
            </div>
          )}

          {/* Simple Clean Payment Split (When Approved for Buyer) */}
          {isApproved && (
            <div className="p-4 rounded-2xl bg-white border border-[#E5EDE8] space-y-3">
              <div className="text-xs font-bold text-[#566861] uppercase tracking-wider">
                Payment Breakdown
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAF8]">
                  <span className="text-[#566861] font-medium">NBFC Loan (80%)</span>
                  <span className="font-bold text-[#10B981]">₹{effectiveApproved.toLocaleString('en-IN')} (Approved ✓)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EBF5F0] border border-[#10B981]/30">
                  <span className="text-[#0B3326] font-bold">Your Balance Due (20%)</span>
                  <span className="font-extrabold text-sm text-[#0B3326]">₹{marginDeposit.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#566861] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                <span>30-day net settlement. Both funds stay in Escrow until delivery.</span>
              </div>
            </div>
          )}

          {/* Buyer Action Button */}
          {isBuyer && isApproved && (
            <div>
              {!isMarginSettled ? (
                <Button
                  variant="accent"
                  size="lg"
                  disabled={isPayingMargin}
                  onClick={handlePayMargin}
                  icon={CreditCard}
                  iconPosition="left"
                  className="w-full justify-center font-bold text-sm py-3 shadow-md cursor-pointer text-[#0B3326] bg-[#34D399] hover:bg-[#10B981]"
                >
                  {isPayingMargin ? 'Opening Razorpay Gateway...' : `Pay ₹${marginDeposit.toLocaleString('en-IN')} & Place Order`}
                </Button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 flex items-center justify-center gap-2 text-xs font-bold text-[#0B3326]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>Paid ₹{marginDeposit.toLocaleString('en-IN')} ✓ 100% Escrow Secured & Order Placed</span>
                </div>
              )}
            </div>
          )}

          {/* Financier Underwriting Controls (Only for Financier role) */}
          {isFinancier && (
            <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-3">
              <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider block">
                Financier Underwriting
              </span>

              <div className="space-y-1">
                <label className="text-xs font-medium text-white/80 block">Approved Amount (₹)</label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  max={totalTxValue}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#34D399]"
                />
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('rejected')}
                  icon={XCircle}
                  className="w-full justify-center text-xs font-bold"
                >
                  Reject
                </Button>

                <Button
                  variant="accent"
                  size="sm"
                  disabled={isUpdating || !approvedAmount}
                  onClick={() => handleStatusChange('approved')}
                  icon={CheckCircle2}
                  className="w-full justify-center text-xs font-bold"
                >
                  {isUpdating ? 'Approving...' : `Approve ₹${Number(approvedAmount).toLocaleString('en-IN')}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
