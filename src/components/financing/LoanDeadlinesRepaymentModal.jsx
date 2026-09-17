import React, { useState } from 'react';
import {
  X,
  Landmark,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  ShieldCheck,
  Receipt,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Download,
  Printer,
  ChevronRight
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { calculateLoanMaturity, repayFinancingLoan } from '../../utils/financing';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function LoanDeadlinesRepaymentModal({
  isOpen,
  onClose,
  requests = [],
  currentUser,
  onRepaymentSuccess,
}) {
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentStep, setPaymentStep] = useState('list'); // 'list' | 'pay' | 'success'
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'netbanking' | 'bank_transfer'
  const [isProcessing, setIsProcessing] = useState(false);
  const [repaymentReceipt, setRepaymentReceipt] = useState(null);

  if (!isOpen) return null;

  const user = currentUser || { name: 'User', role: 'farmer' };
  const isFarmer = user.role === 'farmer';

  // Filter approved or active loans (and also keep track of repaid ones)
  const activeLoans = requests.filter(
    (r) => r.status === 'approved' || r.status === 'disbursed' || r.status === 'active'
  );

  const repaidLoans = requests.filter((r) => r.status === 'repaid');

  const totalActiveLiability = activeLoans.reduce((sum, r) => {
    const mat = calculateLoanMaturity(r);
    return sum + mat.totalDue;
  }, 0);

  const handleStartRepay = (loan) => {
    setSelectedLoan(loan);
    setPaymentStep('pay');
  };

  const handleConfirmPayment = async () => {
    if (!selectedLoan) return;
    setIsProcessing(true);
    showGlobalLoader('Processing Loan Repayment...', 'Sending settlement to Financial Institution & releasing escrow lien...');

    try {
      const maturity = calculateLoanMaturity(selectedLoan);
      const txnId = `TXN${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

      await repayFinancingLoan(selectedLoan.id || selectedLoan.requestNumber, {
        method: paymentMethod,
        txnId,
        amount: maturity.totalDue,
        notes: `Direct loan repayment by ${user.name} via ${paymentMethod.toUpperCase()}`,
      });

      const receipt = {
        txnId,
        loanNumber: selectedLoan.requestNumber || `#FIN-${String(selectedLoan.id || '').slice(0, 6)}`,
        orderNumber: selectedLoan.orderNumber || 'General Working Capital',
        borrowerName: user.name || selectedLoan.applicantName || 'Borrower',
        borrowerRole: isFarmer ? 'Producer / Farmer' : 'Wholesale Buyer',
        institutionName: 'Samunnati / NABARD Agri-Finance Desk',
        principalAmount: maturity.principal,
        interestAmount: maturity.interest,
        totalPaid: maturity.totalDue,
        paidAt: new Date().toISOString(),
        paymentMethod: paymentMethod === 'upi' ? 'UPI Instant Pay' : paymentMethod === 'netbanking' ? 'Net Banking Direct' : 'Bank RTGS/NEFT',
      };

      setRepaymentReceipt(receipt);
      setPaymentStep('success');
      onRepaymentSuccess?.();
    } catch (err) {
      console.error('Repayment error:', err);
    } finally {
      setIsProcessing(false);
      hideGlobalLoader();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start sm:items-center justify-center">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-auto animate-in zoom-in-95 duration-150 relative">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shadow-xs shrink-0">
              <Calendar className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-[#0B3326] font-heading">
                Loan Deadlines & Repayment
              </h3>
              <p className="text-xs text-[#566861]">
                {isFarmer
                  ? 'Track your working capital due dates and settle loan balances with financial institutions.'
                  : 'Track your 30-day trade credit repayment maturities and settle institutional loans.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: LOAN LIST & DEADLINE SCHEDULE */}
        {paymentStep === 'list' && (
          <div className="space-y-6">
            
            {/* Top Stat Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#566861] tracking-wider block">
                  Active Loan Balance
                </span>
                <span className="text-xl font-extrabold text-[#0B3326] font-heading block">
                  ₹{totalActiveLiability.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-[#566861]">
                  {activeLoans.length} active institutional credit {activeLoans.length === 1 ? 'line' : 'lines'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#566861] tracking-wider block">
                  Repayment Mechanism
                </span>
                <span className="text-sm font-bold text-emerald-700 block flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  Auto-Escrow Settlement
                </span>
                <span className="text-[11px] text-[#566861]">
                  Auto-deducts on delivery or pay early
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#566861] tracking-wider block">
                  Cleared / Repaid
                </span>
                <span className="text-xl font-extrabold text-emerald-600 font-heading block">
                  {repaidLoans.length}
                </span>
                <span className="text-[11px] text-[#566861]">
                  100% good credit standing
                </span>
              </div>
            </div>

            {/* Explanatory Banner for Farmers/Retailers */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-3 text-xs text-emerald-950">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Two Flexible Ways to Repay:</strong>
                <span>
                  <strong>1. Auto Settlement (Default):</strong> When your trade delivery is completed, the loan is automatically deducted from the escrow payout.
                  <br />
                  <strong>2. Direct Pre-Payment:</strong> Or click <em>"Repay to Institution"</em> below anytime to clear the balance immediately via UPI or NetBanking.
                </span>
              </div>
            </div>

            {/* Active Loan Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                Active Loan Maturities & Deadlines ({activeLoans.length})
              </h4>

              {activeLoans.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-[#F8FAF8] border border-dashed border-[#E5EDE8] space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
                  <p className="text-sm font-bold text-[#0B3326]">
                    No Outstanding Loans Due!
                  </p>
                  <p className="text-xs text-[#566861] max-w-sm mx-auto">
                    You currently have no active loan liabilities. Need liquidity? You can apply for working capital anytime.
                  </p>
                </div>
              ) : (
                activeLoans.map((loan) => {
                  const maturity = calculateLoanMaturity(loan);
                  return (
                    <div
                      key={loan.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs space-y-3 hover:border-[#10B981]/40 transition-all text-left"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E5EDE8]">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-[#0B3326] text-sm">
                              {loan.requestNumber || `#FIN-${String(loan.id || '').slice(0, 6)}`}
                            </span>
                            {loan.orderNumber && (
                              <Badge variant="dark" size="sm">
                                Order: {loan.orderNumber}
                              </Badge>
                            )}
                            <Badge
                              variant={maturity.isOverdue ? 'amber' : maturity.daysLeft <= 7 ? 'amber' : 'teal'}
                              size="sm"
                            >
                              <Clock className="w-3 h-3 mr-1 inline" />
                              {maturity.isOverdue
                                ? 'Due Today'
                                : `${maturity.daysLeft} Days Remaining`}
                            </Badge>
                          </div>
                          <span className="text-xs text-[#566861] mt-0.5 block">
                            Financier: <strong>Samunnati / NABARD Agri-Finance</strong> • {loan.commodity || 'Produce Working Capital'}
                          </span>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-bold text-[#566861] block">
                            Total Due at Maturity
                          </span>
                          <span className="text-lg font-extrabold text-[#0B3326] font-heading">
                            ₹{maturity.totalDue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Repayment Breakdown Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#F8FAF8] p-3 rounded-xl border border-[#E5EDE8]">
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold">Principal Borrowed</span>
                          <strong className="text-[#14211D]">₹{maturity.principal.toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold">Interest & Service</span>
                          <strong className="text-emerald-700">₹{maturity.interest.toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold">Deadline / Due Date</span>
                          <strong className="text-[#0B3326]">{maturity.dueDateFormatted}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold">Repayment Cycle</span>
                          <strong className="text-[#14211D]">{loan.repaymentLabel || `${maturity.tenureDays} Days Net`}</strong>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <span className="text-[11px] text-[#566861] flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                          Lien is auto-cleared immediately upon repayment
                        </span>

                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => handleStartRepay(loan)}
                          icon={CreditCard}
                          iconPosition="left"
                          className="w-full sm:w-auto font-bold text-xs py-2 px-4 shadow-sm cursor-pointer justify-center"
                        >
                          Repay to Institution Now
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Repaid / Settled History */}
            {repaidLoans.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E5EDE8]">
                <h4 className="text-xs font-bold text-[#566861] uppercase tracking-wider">
                  Cleared / Repaid Loans ({repaidLoans.length})
                </h4>
                <div className="space-y-2">
                  {repaidLoans.map((loan) => (
                    <div
                      key={loan.id}
                      className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold text-[#0B3326]">
                            {loan.requestNumber || `#FIN-${String(loan.id || '').slice(0, 6)}`}
                          </span>
                          <span className="text-[#566861] ml-2">
                            ₹{Number(loan.approvedAmount || loan.requestedAmount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                      <Badge variant="emerald" size="sm">
                        ✓ Settled & Lien Cleared
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* STEP 2: INSTANT REPAYMENT CHECKOUT */}
        {paymentStep === 'pay' && selectedLoan && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EDE8]">
                <span className="text-xs font-bold text-[#0B3326]">
                  Repayment for Loan: {selectedLoan.requestNumber || selectedLoan.orderNumber}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  Total Due: ₹{calculateLoanMaturity(selectedLoan).totalDue.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-[#566861]">
                Beneficiary Institution: <strong>Samunnati Agri-Finance Desk / NABARD Escrow Liquidity Vault</strong>
              </p>
            </div>

            {/* Select Repayment Mode */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                Choose Repayment Method
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-[#10B981] bg-[#F2FBF6] ring-2 ring-[#10B981]/20'
                      : 'border-[#E5EDE8] bg-white hover:bg-[#F8FAF8]'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-[#10B981] mb-1" />
                  <span className="font-bold text-xs text-[#0B3326] block">UPI / QR Pay</span>
                  <span className="text-[10px] text-[#566861]">Google Pay, PhonePe, Paytm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('netbanking')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    paymentMethod === 'netbanking'
                      ? 'border-[#10B981] bg-[#F2FBF6] ring-2 ring-[#10B981]/20'
                      : 'border-[#E5EDE8] bg-white hover:bg-[#F8FAF8]'
                  }`}
                >
                  <Landmark className="w-5 h-5 text-[#10B981] mb-1" />
                  <span className="font-bold text-xs text-[#0B3326] block">Net Banking</span>
                  <span className="text-[10px] text-[#566861]">SBI, HDFC, ICICI, Canara</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-[#10B981] bg-[#F2FBF6] ring-2 ring-[#10B981]/20'
                      : 'border-[#E5EDE8] bg-white hover:bg-[#F8FAF8]'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-[#10B981] mb-1" />
                  <span className="font-bold text-xs text-[#0B3326] block">Virtual Account</span>
                  <span className="text-[10px] text-[#566861]">RTGS / NEFT Direct</span>
                </button>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-white/80">Principal Loan</span>
                <span className="font-mono">₹{calculateLoanMaturity(selectedLoan).principal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-white/80">Accrued Interest (1.2%/mo)</span>
                <span className="font-mono text-[#34D399]">₹{calculateLoanMaturity(selectedLoan).interest.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold pt-0.5">
                <span className="text-white font-heading">Total Repayment Amount</span>
                <span className="font-mono text-lg text-[#34D399]">
                  ₹{calculateLoanMaturity(selectedLoan).totalDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setPaymentStep('list')}
                disabled={isProcessing}
                className="text-xs font-bold py-2.5 px-4 cursor-pointer"
              >
                ← Back to Loans
              </Button>

              <Button
                variant="accent"
                size="md"
                onClick={handleConfirmPayment}
                disabled={isProcessing}
                className="flex-1 font-bold text-xs py-2.5 px-5 shadow-md cursor-pointer justify-center"
              >
                {isProcessing ? 'Transmitting Repayment...' : `Authorize ₹${calculateLoanMaturity(selectedLoan).totalDue.toLocaleString('en-IN')} Repayment`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: REPAYMENT SUCCESS CERTIFICATE */}
        {paymentStep === 'success' && repaymentReceipt && (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-[#0B3326] font-heading">
                Loan Settled & Lien Cleared!
              </h3>
              <p className="text-xs text-[#566861] max-w-md mx-auto">
                Your full balance of <strong>₹{repaymentReceipt.totalPaid.toLocaleString('en-IN')}</strong> has been settled with {repaymentReceipt.institutionName}. Official clearance receipt issued.
              </p>
            </div>

            {/* Certificate Card */}
            <div className="p-5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3 text-left text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EDE8]">
                <span className="text-[#566861]">Settlement Txn ID:</span>
                <span className="font-bold text-[#0B3326]">{repaymentReceipt.txnId}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EDE8]">
                <span className="text-[#566861]">Loan Ref Number:</span>
                <span className="font-bold text-[#0B3326]">{repaymentReceipt.loanNumber}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#E5EDE8]">
                <span className="text-[#566861]">Settlement Method:</span>
                <span className="font-bold text-[#0B3326]">{repaymentReceipt.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between font-sans">
                <span className="text-[#566861] font-bold">Total Amount Settled:</span>
                <span className="text-base font-extrabold text-emerald-700">
                  ₹{repaymentReceipt.totalPaid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => window.print()}
                icon={Printer}
                iconPosition="left"
                className="w-full sm:w-auto font-bold text-xs py-2.5 px-4 cursor-pointer"
              >
                Print Clearance Receipt
              </Button>

              <Button
                variant="accent"
                size="md"
                onClick={() => {
                  setPaymentStep('list');
                  onClose();
                }}
                className="w-full sm:w-auto font-bold text-xs py-2.5 px-6 shadow-md cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
