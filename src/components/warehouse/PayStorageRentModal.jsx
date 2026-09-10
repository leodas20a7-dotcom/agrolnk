import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Building2,
  Receipt,
  Sparkles,
  ArrowRight,
  Info,
  Clock
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { calculateStorageRentalDues, payStorageRent } from '../../utils/warehouses';
import { initiateRazorpayWarehouseRentCheckout } from '../../utils/razorpayRouteClient';

export default function PayStorageRentModal({
  inventory,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) {
  if (!isOpen || !inventory) return null;

  const dues = calculateStorageRentalDues(inventory);
  const [extendedDays, setExtendedDays] = useState(30);
  const [paymentMode, setPaymentMode] = useState('razorpay'); // 'razorpay' | 'auto_escrow'
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  const monthlyRate = dues?.monthlyRate || 350;
  const calculatedPayAmount = Math.round((monthlyRate / 30) * extendedDays);

  const handlePay = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (paymentMode === 'auto_escrow') {
        const res = await payStorageRent(inventory.id, {
          amount: calculatedPayAmount,
          method: 'Agrolnk Escrow Balance Deduction',
          extendedDays,
          paidBy: currentUser?.name || 'Sakthi Vel',
        });
        setIsProcessing(false);
        setPaymentSuccess(res.payment);
        onSuccess?.(res.receipt);
        return;
      }

      // Launch Razorpay Payment Gateway
      await initiateRazorpayWarehouseRentCheckout({
        inventory,
        amount: calculatedPayAmount,
        extendedDays,
        farmerUser: currentUser || { name: 'Sakthi Vel', role: 'farmer' },
        onSuccess: async (rzpRes) => {
          const res = await payStorageRent(inventory.id, {
            amount: calculatedPayAmount,
            method: `Razorpay Online / UPI (${rzpRes.razorpay_payment_id})`,
            extendedDays,
            paidBy: currentUser?.name || 'Sakthi Vel',
          });
          setIsProcessing(false);
          setPaymentSuccess(res.payment);
          onSuccess?.(res.receipt);
        },
        onFailure: (err) => {
          console.warn('Warehouse rent payment cancelled / notice:', err);
          setIsProcessing(false);
        },
      });
    } catch (err) {
      console.error('Payment error:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose?.();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <Receipt className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                Warehouse Storage Rent
              </h3>
              <span className="text-xs text-[#566861]">
                {inventory.receiptNumber} • {inventory.commodity} ({inventory.totalQuantity} {inventory.unit})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentSuccess ? (
          /* Payment Success State */
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-[#EBF5F0] text-[#10B981] rounded-3xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-extrabold text-[#0B3326] font-heading">
                Rent Payment Successful!
              </h4>
              <p className="text-xs text-[#566861]">
                Transaction Ref: <span className="font-mono font-bold text-[#14211D]">{paymentSuccess.transactionRef}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-left space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#566861]">Amount Paid:</span>
                <span className="font-bold text-[#0B3326]">₹{paymentSuccess.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#566861]">Validity Extended By:</span>
                <span className="font-bold text-[#10B981]">+{paymentSuccess.extendedDays} Days</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#566861]">Warehouse Facility:</span>
                <span className="font-medium text-[#14211D]">{inventory.warehouseName}</span>
              </div>
            </div>

            <Button
              variant="accent"
              size="md"
              onClick={() => {
                setPaymentSuccess(null);
                onClose();
              }}
              className="w-full justify-center text-xs font-bold py-3"
            >
              Done & Return to Inventory
            </Button>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handlePay} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Warehouse Facility Info */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[#10B981]" />
                  <div>
                    <span className="text-xs font-bold text-[#0B3326] block">
                      {inventory.warehouseName}
                    </span>
                    <span className="text-[11px] text-[#566861]">
                      {inventory.chamber || 'Chamber Storage'} • Rate: ₹{monthlyRate}/mo
                    </span>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">
                  WDRA Insured
                </Badge>
              </div>

              {/* Explanatory Note on Zero Cash Upfront */}
              <div className="p-3 rounded-2xl bg-[#F2FBF6] border border-[#10B981]/20 flex gap-2.5 items-start text-left">
                <Info className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#0B3326] leading-relaxed">
                  <strong className="font-bold">Smart Option:</strong> You do not need to pay now if you plan to sell on Agrolnk! Rent is automatically deducted from buyer payment when your produce sells.
                </p>
              </div>

              {/* Extension Duration Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Select Storage Duration Extension
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { days: 30, label: '30 Days (1 Mo)' },
                    { days: 60, label: '60 Days (2 Mo)' },
                    { days: 90, label: '90 Days (3 Mo)' },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setExtendedDays(opt.days)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        extendedDays === opt.days
                          ? 'border-[#10B981] bg-[#EBF5F0] text-[#0B3326] font-bold shadow-xs'
                          : 'border-[#E5EDE8] bg-white text-[#566861] hover:border-[#10B981]/50'
                      }`}
                    >
                      <span className="text-xs block font-bold">{opt.label}</span>
                      <span className="text-[11px] font-semibold text-[#10B981]">
                        ₹{Math.round((monthlyRate / 30) * opt.days)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                  Payment Method
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      paymentMode === 'razorpay' ? 'border-[#10B981] bg-[#F2FBF6]' : 'border-[#E5EDE8]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="payMode"
                        checked={paymentMode === 'razorpay'}
                        onChange={() => setPaymentMode('razorpay')}
                        className="text-[#10B981] focus:ring-[#10B981]"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#14211D] block">Razorpay Gateway (UPI, GPay, Cards, NetBanking)</span>
                        <span className="text-[10px] text-[#566861] block">Instant online payment verification</span>
                      </div>
                    </div>
                    <Badge variant="blue" size="sm">Instant</Badge>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      paymentMode === 'auto_escrow' ? 'border-[#10B981] bg-[#F2FBF6]' : 'border-[#E5EDE8]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="payMode"
                        checked={paymentMode === 'auto_escrow'}
                        onChange={() => setPaymentMode('auto_escrow')}
                        className="text-[#10B981] focus:ring-[#10B981]"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#14211D] block">Agrolnk Escrow Balance Deduction</span>
                        <span className="text-[10px] text-[#566861] block">Auto-deduct from your sales payout</span>
                      </div>
                    </div>
                    <Badge variant="emerald" size="sm">Zero Fee</Badge>
                  </label>
                </div>
              </div>

              {/* Total Calculation Summary */}
              <div className="p-4 rounded-2xl bg-[#0B3326] text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#34D399] block tracking-wider">
                    Total Storage Rent to Pay
                  </span>
                  <span className="text-xl font-extrabold font-heading">
                    ₹{calculatedPayAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-xs text-[#DCFCE7]/90 font-medium">
                  +{extendedDays} Days Extension
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-[#E5EDE8] bg-white flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
                disabled={isProcessing}
                className="text-xs font-bold"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="accent"
                size="md"
                disabled={isProcessing}
                className="text-xs font-bold px-6 py-2.5 shadow-md shadow-[#10B981]/20 cursor-pointer"
              >
                {isProcessing ? 'Processing Payment...' : `Pay ₹${calculatedPayAmount.toLocaleString('en-IN')}`}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
