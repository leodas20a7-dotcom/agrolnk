import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Landmark,
  User,
  Package,
  FileCheck,
  CreditCard,
  Lock,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Zap,
  Check,
  AlertTriangle
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { calculateOrderFinancials, formatINR } from '../../utils/commission';
import { getUserBankDetails, maskAccountNumber } from '../../utils/bankDetails';
import { adminVerifyAndReleaseOrderEscrow, adminHoldOrDisputeOrderEscrow } from '../../utils/orders';

export default function AdminCallVerificationModal({
  isOpen,
  onClose,
  order,
  adminUser,
  onSuccess,
}) {
  const [checks, setChecks] = useState({
    spokeWithBuyer: true,
    weightSlipVerified: true,
    qualityAssayMatches: true,
    packagingIntact: true,
  });

  const [callNotes, setCallNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (order) {
      setChecks({
        spokeWithBuyer: true,
        weightSlipVerified: true,
        qualityAssayMatches: true,
        packagingIntact: true,
      });
      setCallNotes(
        `Spoke with ${order.buyerName || 'Buyer'}. Confirmed receipt of ${order.quantity || ''} ${order.unit || 'MT'} ${order.commodity || ''} (${order.grade || 'A'} Grade). Produce quality & weight slips verified in good order. Approved for instant escrow release.`
      );
      setErrorMsg('');
      setSuccessData(null);
    }
  }, [order, isOpen]);

  const activeOrder = order || {};
  const fin = calculateOrderFinancials(activeOrder.totalAmount || 0);
  const farmerBank = getUserBankDetails(activeOrder.farmerId) || {
    bankName: activeOrder.payoutBankName || 'State Bank of India',
    accountNumber: activeOrder.payoutAccountNumber || '38291048211',
    ifscCode: activeOrder.payoutIfsc || 'SBIN0004921',
    accountHolderName: activeOrder.farmerName || 'Sakthi Vel',
    upiId: 'sakthivel@oksbi',
  };

  const buyerPhone = activeOrder.buyerPhone || '+91 98840 55667';
  const buyerCompany = activeOrder.buyerCompany || activeOrder.buyerName || 'Ananya Agro Foods Pvt Ltd';

  const toggleCheck = (key) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = checks.spokeWithBuyer && checks.weightSlipVerified && checks.qualityAssayMatches && checks.packagingIntact;

  const handleApproveRelease = async () => {
    if (!callNotes.trim()) {
      setErrorMsg('Please log admin call verification notes before releasing.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const updated = await adminVerifyAndReleaseOrderEscrow({
        orderId: order.orderNumber || order.id,
        adminNotes: callNotes.trim(),
        adminUser,
        verificationChecks: checks,
      });

      setSuccessData(updated);
      if (onSuccess) onSuccess(updated);
    } catch (err) {
      console.error('Failed to release escrow:', err);
      setErrorMsg(err.message || 'Failed to disburse escrow. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHoldDispute = async () => {
    if (!callNotes.trim()) {
      setErrorMsg('Please specify reason for dispute/hold in notes.');
      return;
    }

    setIsDisputing(true);
    setErrorMsg('');
    try {
      const updated = await adminHoldOrDisputeOrderEscrow({
        orderId: order.orderNumber || order.id,
        disputeReason: callNotes.trim(),
        adminUser,
      });
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setErrorMsg('Failed to place dispute hold.');
    } finally {
      setIsDisputing(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center text-xl shadow-md shrink-0">
              <PhoneCall className="w-6 h-6 text-[#34D399]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#0B3326] font-heading">
                  Buyer Verification & Escrow Release Desk
                </h3>
                <Badge variant="emerald" size="sm">
                  {order.orderNumber}
                </Badge>
              </div>
              <p className="text-xs text-[#566861] mt-0.5">
                Admin Supervised Escrow: Verify buyer satisfaction by telephone before releasing funds to producer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner if settled */}
        {successData ? (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#EBF5F0] via-[#F2FBF6] to-white border border-[#10B981] space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3 text-[#0B3326]">
              <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-md">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold font-heading">
                  Escrow Funds Disbursed to Producer Bank Account!
                </h4>
                <p className="text-xs text-[#566861] mt-0.5">
                  Real-time ICICI Nodal IMPS Settlement Executed • UTR Generated & Logged
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white border border-[#E5EDE8]">
              <div>
                <span className="text-[10px] text-[#566861] uppercase font-bold block">Banking UTR</span>
                <span className="font-mono text-xs font-extrabold text-[#0B3326]">{successData.bankUtr}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#566861] uppercase font-bold block">Net Credited</span>
                <span className="font-bold text-xs text-[#10B981]">{formatINR(fin.netSellerReceivable)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#566861] uppercase font-bold block">Beneficiary A/C</span>
                <span className="font-mono text-xs text-[#14211D]">{farmerBank.bankName} • {maskAccountNumber(farmerBank.accountNumber)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="accent" size="sm" onClick={onClose} className="font-bold text-xs">
                Done & Return to Ledger
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Split Grid: Buyer Contact Card vs. Beneficiary Payout Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Buyer Contact Card */}
              <div className="p-5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1E40AF]" /> Buyer To Contact
                  </span>
                  <Badge variant="blue" size="sm">Consignment Arrived</Badge>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-bold text-[#14211D]">
                    {order.buyerName || 'Procurement Officer'}
                  </div>
                  <div className="text-xs text-[#566861]">
                    {buyerCompany} • {order.district || 'Salem'}, {order.state || 'Tamil Nadu'}
                  </div>
                </div>

                {/* Direct Dial Button */}
                <div className="pt-2 flex items-center justify-between border-t border-[#E5EDE8]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#10B981]" />
                    <span className="font-mono text-xs font-bold text-[#14211D]">{buyerPhone}</span>
                  </div>
                  <a
                    href={`tel:${buyerPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Call Buyer
                  </a>
                </div>
              </div>

              {/* Card 2: Beneficiary Farmer Payout Destination */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B3326] to-[#104735] text-white space-y-3 border border-[#14624A] shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-[#34D399]" /> Farmer Beneficiary Bank
                  </span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/80">
                    Auto-Disbursal Target
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    {farmerBank.accountHolderName || order.farmerName || 'Sakthi Vel'}
                  </div>
                  <div className="font-mono text-xs text-white/80">
                    {farmerBank.bankName} • {maskAccountNumber(farmerBank.accountNumber)}
                  </div>
                  <div className="text-[11px] text-[#34D399] font-mono">
                    IFSC: {farmerBank.ifscCode}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/70">Net Farmer Payout:</span>
                  <span className="text-base font-extrabold text-[#34D399] font-heading">
                    {formatINR(fin.netSellerReceivable)}
                  </span>
                </div>
              </div>

            </div>

            {/* Consignment & Financials Summary Bar */}
            <div className="p-4 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] text-[#566861] uppercase font-bold block">Trade Lot</span>
                <span className="font-bold text-[#0B3326]">{order.commodity} ({order.quantity} {order.unit}) • Grade {order.grade || 'A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#566861] uppercase font-bold block">Escrow Deposited</span>
                <span className="font-bold text-[#0B3326]">{formatINR(fin.totalBuyerPayable)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#566861] uppercase font-bold block">AgroLnk 0.50% Fee</span>
                <span className="font-bold text-[#10B981]">{formatINR(fin.totalPlatformCommission)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#566861] uppercase font-bold block">Escrow Status</span>
                <Badge variant="amber" size="sm">Pending Admin Call</Badge>
              </div>
            </div>

            {/* Section: Telephonic Verification Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-[#10B981]" /> Admin Phone Call Checklist
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                
                <label
                  onClick={() => toggleCheck('spokeWithBuyer')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    checks.spokeWithBuyer ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326]' : 'bg-white border-[#E5EDE8] text-[#566861]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checks.spokeWithBuyer}
                    onChange={() => {}}
                    className="w-4 h-4 text-[#10B981] rounded focus:ring-0"
                  />
                  <span className="text-xs font-semibold">1. Spoke with Buyer / Store Incharge</span>
                </label>

                <label
                  onClick={() => toggleCheck('weightSlipVerified')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    checks.weightSlipVerified ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326]' : 'bg-white border-[#E5EDE8] text-[#566861]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checks.weightSlipVerified}
                    onChange={() => {}}
                    className="w-4 h-4 text-[#10B981] rounded focus:ring-0"
                  />
                  <span className="text-xs font-semibold">2. Quantity & Weighbridge Slip Matches</span>
                </label>

                <label
                  onClick={() => toggleCheck('qualityAssayMatches')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    checks.qualityAssayMatches ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326]' : 'bg-white border-[#E5EDE8] text-[#566861]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checks.qualityAssayMatches}
                    onChange={() => {}}
                    className="w-4 h-4 text-[#10B981] rounded focus:ring-0"
                  />
                  <span className="text-xs font-semibold">3. Produce Quality & Moisture OK</span>
                </label>

                <label
                  onClick={() => toggleCheck('packagingIntact')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    checks.packagingIntact ? 'bg-[#EBF5F0] border-[#10B981] text-[#0B3326]' : 'bg-white border-[#E5EDE8] text-[#566861]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checks.packagingIntact}
                    onChange={() => {}}
                    className="w-4 h-4 text-[#10B981] rounded focus:ring-0"
                  />
                  <span className="text-xs font-semibold">4. Packaging & Handover Confirmed</span>
                </label>

              </div>
            </div>

            {/* Call Log & Notes */}
            <div>
              <label className="block text-xs font-bold text-[#14211D] mb-1">
                Admin Telephonic Audit Log & Verification Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Record buyer conversation notes..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="pt-4 border-t border-[#E5EDE8] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleHoldDispute}
                disabled={isDisputing || isProcessing}
                className="text-xs font-bold border-red-200 bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer justify-center"
              >
                {isDisputing ? 'Placing Hold...' : '⚠️ Raise Dispute / Escrow Hold'}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  icon={Zap}
                  iconPosition="left"
                  onClick={handleApproveRelease}
                  disabled={isProcessing || !allChecked}
                  className="text-xs font-bold shadow-md cursor-pointer justify-center"
                >
                  {isProcessing ? 'Disbursing via ICICI Nodal...' : '⚡ Approve & Release Payment to Farmer'}
                </Button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
