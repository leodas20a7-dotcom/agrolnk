import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Landmark,
  CreditCard,
  Copy,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { calculateFreightFinancials, formatINR } from '../../utils/commission';
import { depositFreightEscrow } from '../../utils/deliveries';
import { initiateRazorpayTransportCheckout } from '../../utils/razorpayRouteClient';

export default function FreightEscrowModal({
  isOpen,
  onClose,
  delivery,
  currentUser,
  onSuccess,
}) {
  const [paymentMode, setPaymentMode] = useState('direct_razorpay');
  const [bankUtr, setBankUtr] = useState('');
  const [utrError, setUtrError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const freightAmount = Number(delivery?.freightAmount || 0);
  const fin = calculateFreightFinancials(freightAmount);
  const isHighValue = freightAmount >= 50000;

  useEffect(() => {
    if (isOpen) {
      if (isHighValue) {
        setPaymentMode('escrow_van');
      } else {
        setPaymentMode('direct_razorpay');
      }
      setBankUtr('');
      setUtrError('');
      setCopiedField('');
    }
  }, [isOpen, freightAmount, isHighValue]);

  // AgroLnk Bank details from environment variables
  const bankDetails = {
    accountName: import.meta.env.VITE_AGROLNK_ESCROW_ACCOUNT_NAME || 'AGROLNK PRIVATE LIMITED',
    accountNumber: import.meta.env.VITE_AGROLNK_ESCROW_ACCOUNT_NUMBER || '50200088991122',
    ifsc: import.meta.env.VITE_AGROLNK_ESCROW_IFSC || 'HDFC0000040',
    bankName: import.meta.env.VITE_AGROLNK_ESCROW_BANK_NAME || 'HDFC Bank',
    branch: import.meta.env.VITE_AGROLNK_ESCROW_BRANCH || 'Corporate Banking Branch',
  };

  const handleCopy = (text, fieldName) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2500);
    } catch {}
  };

  const handleConfirmEscrowPayment = async () => {
    setUtrError('');

    if (paymentMode === 'escrow_van') {
      const cleanUtr = bankUtr.trim().toUpperCase();
      if (!cleanUtr) {
        setUtrError('Please enter the bank UTR / NEFT reference number.');
        return;
      }
      if (cleanUtr.length < 6) {
        setUtrError('Valid bank transfer UTR reference must be at least 6 characters.');
        return;
      }

      setIsSubmitting(true);
      try {
        await depositFreightEscrow({
          deliveryId: delivery.id,
          paymentMode: 'escrow_van',
          bankUtr: cleanUtr,
          payerUser: currentUser,
          freightBreakdown: fin,
        });
        if (onSuccess) onSuccess();
        onClose();
      } catch (err) {
        console.error('Failed to submit freight UTR:', err);
        setUtrError(err.message || 'Failed to submit freight escrow transfer.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Instant Razorpay Checkout (< ₹50,000)
      setIsSubmitting(true);
      try {
        await initiateRazorpayTransportCheckout({
          delivery: {
            ...delivery,
            freightAmount: fin.totalFreightDeposit,
          },
          farmerUser: currentUser,
          onSuccess: async (rzpPayment) => {
            await depositFreightEscrow({
              deliveryId: delivery.id,
              paymentMode: 'direct_razorpay',
              bankUtr: rzpPayment?.razorpay_payment_id || null,
              payerUser: currentUser,
              freightBreakdown: fin,
            });
            if (onSuccess) onSuccess();
            onClose();
          },
          onFailure: (err) => {
            console.warn('Transport payment cancelled:', err);
            setIsSubmitting(false);
          },
        });
      } catch (err) {
        console.error('Failed to initiate razorpay:', err);
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen || !delivery) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left relative">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0B3326] text-[#34D399] flex items-center justify-center text-xl shadow-md shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                Deposit Freight in AgroLnk Escrow
              </h3>
              <p className="text-xs text-[#566861]">
                Delivery #{delivery.deliveryNumber} • Carrier: {delivery.transporterName || 'Assigned Transporter'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Alert */}
        <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-2.5 text-xs text-[#166534]">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Escrow Protection Active:</strong> Your freight fare is held safely by AgroLnk. Transporter will only receive payment after produce is delivered and recipient provides the Delivery OTP.
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#566861]">Base Freight Quote:</span>
            <span className="font-semibold text-[#14211D]">{formatINR(fin.baseFare)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#566861]">AgroLnk Platform Fee (0.25%):</span>
            <span className="font-semibold text-[#0B3326]">+{formatINR(fin.consignorFee)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E5EDE8]">
            <span className="font-bold text-[#0B3326]">Total Amount to Deposit:</span>
            <span className="text-base font-extrabold text-[#10B981] font-heading">
              {formatINR(fin.totalFreightDeposit)}
            </span>
          </div>
        </div>

        {/* Payment Mode Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
            Select Escrow Payment Mode
          </label>

          {isHighValue && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
              ℹ️ <strong>High-Value Cargo Freight (≥ ₹50,000):</strong> Routed exclusively via AgroLnk Escrow Virtual Account (NEFT/RTGS) to eliminate gateway fees.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isHighValue && (
              <div
                onClick={() => setPaymentMode('direct_razorpay')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMode === 'direct_razorpay'
                    ? 'border-[#10B981] bg-[#EBF5F0] ring-2 ring-[#10B981]/20'
                    : 'border-[#E5EDE8] bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap className="w-4 h-4 text-[#10B981]" />
                  <span className="text-xs font-bold text-[#0B3326]">Instant UPI / Cards</span>
                </div>
                <p className="text-[11px] text-[#566861]">
                  Instant verification & immediate driver dispatch lock.
                </p>
              </div>
            )}

            <div
              onClick={() => setPaymentMode('escrow_van')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                paymentMode === 'escrow_van'
                  ? 'border-[#10B981] bg-[#EBF5F0] ring-2 ring-[#10B981]/20'
                  : 'border-[#E5EDE8] bg-white hover:border-gray-300'
              } ${isHighValue ? 'sm:col-span-2' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Landmark className="w-4 h-4 text-emerald-800" />
                <span className="text-xs font-bold text-[#0B3326]">AgroLnk Escrow Account (NEFT / RTGS)</span>
              </div>
              <p className="text-[11px] text-[#566861]">
                Zero transaction fee. Funds verified by Admin bank statement check.
              </p>
            </div>
          </div>
        </div>

        {/* NEFT / RTGS Bank Transfer Details */}
        {paymentMode === 'escrow_van' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0B3326] to-[#144233] text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-semibold text-[#34D399] flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" /> Official Escrow Collection Account
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/80">
                  Real-World NetBanking
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Beneficiary:</span>
                  <span className="font-semibold text-white">{bankDetails.accountName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Account Number:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#34D399]">{bankDetails.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankDetails.accountNumber, 'account')}
                      className="p-1 rounded text-white/60 hover:text-white cursor-pointer"
                    >
                      {copiedField === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">IFSC Code:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#34D399]">{bankDetails.ifsc}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankDetails.ifsc, 'ifsc')}
                      className="p-1 rounded text-white/60 hover:text-white cursor-pointer"
                    >
                      {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Bank & Branch:</span>
                  <span className="text-white/90">{bankDetails.bankName} ({bankDetails.branch})</span>
                </div>
              </div>
            </div>

            {/* UTR Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B3326] block">
                Bank Transfer Reference (UTR Number) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bankUtr}
                onChange={(e) => {
                  setBankUtr(e.target.value.toUpperCase());
                  setUtrError('');
                }}
                placeholder="e.g. UTRN24081923849"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-xs font-mono font-semibold text-[#14211D] focus:ring-2 focus:ring-[#10B981] focus:outline-none uppercase"
              />
              {utrError ? (
                <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {utrError}
                </p>
              ) : (
                <p className="text-[11px] text-[#566861]">
                  AgroLnk Admin verifies this UTR against bank credit before unlocking driver pickup.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5EDE8]">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            icon={ShieldCheck}
            iconPosition="left"
            disabled={isSubmitting}
            onClick={handleConfirmEscrowPayment}
            className="text-xs font-bold py-2.5 px-5 cursor-pointer shadow-sm"
          >
            {isSubmitting
              ? 'Securing Escrow...'
              : paymentMode === 'escrow_van'
              ? 'Submit UTR for Bank Verification'
              : `Deposit ${formatINR(fin.totalFreightDeposit)} in Escrow`}
          </Button>
        </div>

      </div>
    </div>
  );
}

