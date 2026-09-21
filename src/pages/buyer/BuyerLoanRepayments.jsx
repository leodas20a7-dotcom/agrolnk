import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import {
  Calendar,
  ArrowLeft,
  Landmark,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Receipt,
  Plus,
  ChevronRight,
  TrendingUp,
  FileText,
  Printer,
  Sparkles,
  X,
  Compass,
  ShoppingBag
} from 'lucide-react';
import { getBuyerFinancingRequests, calculateLoanMaturity, repayFinancingLoan } from '../../utils/financing';
import { initiateRazorpayLoanRepaymentCheckout } from '../../utils/razorpayRouteClient';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function BuyerLoanRepayments({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Buyer', id: '', role: 'buyer' };

  const [requests, setRequests] = useState([]);
  const [selectedLoanForDetail, setSelectedLoanForDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'repaid' | 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [repaymentReceipt, setRepaymentReceipt] = useState(null);

  const pageSize = 6;

  const loadData = async (showFlash = false) => {
    if (showFlash) {
      showGlobalLoader('Loading Trade Credit Schedules...', 'Auditing NBFC credit maturities and repayments...');
    }
    try {
      const data = await getBuyerFinancingRequests(user.id, user);
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading buyer financing requests:', err);
    } finally {
      if (showFlash) hideGlobalLoader();
    }
  };

  useEffect(() => {
    loadData(true);

    const handleUpdated = () => {
      loadData(false);
    };

    window.addEventListener('agrolnk_financing_updated', handleUpdated);
    window.addEventListener('agrolnk_orders_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      hideGlobalLoader();
      window.removeEventListener('agrolnk_financing_updated', handleUpdated);
      window.removeEventListener('agrolnk_orders_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [user.id, user.email, user.name]);

  const safeRequests = Array.isArray(requests) ? requests : [];

  const isSettledStatus = (status) => status === 'repaid' || status === 'settled' || status === 'closed';

  const activeLoans = safeRequests.filter(
    (r) => !isSettledStatus(r.status) && r.status !== 'rejected' && r.status !== 'cancelled'
  );

  const repaidLoans = safeRequests.filter((r) => isSettledStatus(r.status));

  const totalActiveLiability = activeLoans
    .filter((r) => r.status === 'approved' || r.status === 'disbursed' || r.status === 'active')
    .reduce((sum, r) => {
      const mat = calculateLoanMaturity(r);
      return sum + mat.totalDue;
    }, 0);

  const filteredLoans = safeRequests.filter((r) => {
    if (activeTab === 'active') {
      return !isSettledStatus(r.status) && r.status !== 'rejected' && r.status !== 'cancelled';
    }
    if (activeTab === 'repaid') {
      return isSettledStatus(r.status);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLoans.length / pageSize) || 1;
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleConfirmRepayment = async (loan) => {
    if (!loan) return;
    const maturity = calculateLoanMaturity(loan);

    setIsProcessing(true);
    initiateRazorpayLoanRepaymentCheckout({
      request: loan,
      amount: maturity.totalDue,
      currentUser: user,
      onSuccess: async (rzpRes) => {
        showGlobalLoader('Verifying Trade Settlement...', 'Confirming Razorpay transaction & releasing trade credit lien...');
        const txnId = rzpRes.razorpay_payment_id || `PAY_${Date.now()}`;
        await repayFinancingLoan(loan.id || loan.requestNumber, {
          method: 'razorpay',
          txnId,
          amount: maturity.totalDue,
          notes: `Razorpay Online Trade Credit Settlement (Payment ID: ${txnId})`,
        });

        const receipt = {
          txnId,
          loanNumber: loan.requestNumber || `#TC-${String(loan.id || '').slice(0, 6)}`,
          orderNumber: loan.orderNumber || 'Marketplace Purchase',
          borrowerName: user.name || loan.applicantName || 'Wholesale Buyer',
          institutionName: loan.financierName || 'Institutional Credit Desk',
          principalAmount: maturity.principal,
          interestAmount: maturity.interest,
          totalPaid: maturity.totalDue,
          paidAt: new Date().toISOString(),
          paymentMethod: `Razorpay Online (${txnId})`,
        };

        setRepaymentReceipt(receipt);
        await loadData(false);
        setIsProcessing(false);
        hideGlobalLoader();
      },
      onFailure: (err) => {
        console.warn('Razorpay checkout note:', err);
        setIsProcessing(false);
        hideGlobalLoader();
      },
    });
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('buyer-financing')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Trade Credit
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              Trade Credit Deadlines & Repayments
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Track 30-day net repayment deadlines for NBFC-funded produce orders and settle balances directly.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="accent"
              size="md"
              icon={Compass}
              iconPosition="left"
              onClick={() => onNavigate('buyer-marketplace')}
              className="font-bold text-xs py-2.5 px-4 shadow-md cursor-pointer justify-center"
            >
              Browse Marketplace
            </Button>
          </div>
        </div>

        {/* 3 Abstract Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#566861] uppercase tracking-wider">
                Total Credit Due
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalActiveLiability.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#566861]">
              Across {activeLoans.length} active trade credit {activeLoans.length === 1 ? 'order' : 'orders'}
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#566861] uppercase tracking-wider">
                Repayment Cycle
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-base font-extrabold text-emerald-700 font-heading">
              30 Days Net Repayment
            </div>
            <div className="text-[11px] text-[#566861]">
              Zero penalty when paid within tenure
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#566861] uppercase tracking-wider">
                Settled & Cleared
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-heading">
              {repaidLoans.length}
            </div>
            <div className="text-[11px] text-[#10B981] font-semibold">
              100% good credit standing
            </div>
          </Card>

        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between border-b border-[#E5EDE8] pb-1">
          <div className="flex items-center gap-2">
            {[
              { id: 'active', label: 'Active Due Credit', count: activeLoans.length },
              { id: 'repaid', label: 'Cleared & Repaid', count: repaidLoans.length },
              { id: 'all', label: 'All Records', count: safeRequests.length },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : 'text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#E5EDE8] text-[#566861]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Abstract Records List */}
        <div className="space-y-3">
          {paginatedLoans.length === 0 ? (
            <Card className="p-10 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
              <h4 className="text-sm font-bold text-[#0B3326]">No active trade credit due</h4>
              <p className="text-xs text-[#566861]">
                Purchase produce using Trade Credit at checkout to access 30-day financing.
              </p>
            </Card>
          ) : (
            paginatedLoans.map((loan) => {
              const maturity = calculateLoanMaturity(loan);
              const isRepaid = loan.status === 'repaid';
              const isPending = loan.status === 'pending' || loan.status === 'under_review';

              return (
                <div
                  key={loan.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-left"
                >
                  {/* Left: Credit ID & Linked Order */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
                    <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <CreditCard className="w-5 h-5 text-[#10B981]" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-[#0B3326] font-heading">
                          {loan.requestNumber || `#TC-${String(loan.id || '').slice(0, 6)}`}
                        </span>
                        {loan.orderNumber && (
                          <Badge variant="dark" size="sm">
                            {loan.orderNumber}
                          </Badge>
                        )}
                        <Badge
                          variant={isRepaid ? 'emerald' : isPending ? 'blue' : maturity.isOverdue ? 'amber' : 'teal'}
                          size="sm"
                        >
                          {isRepaid
                            ? '✓ Settled'
                            : isPending
                            ? 'Under Review'
                            : `${maturity.daysLeft} Days Remaining`}
                        </Badge>
                      </div>

                      <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#14211D]">
                          {loan.commodity || 'Produce Consignment'}
                        </span>
                        <span>&bull;</span>
                        <span>Samunnati NBFC Credit</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Key Abstract Figures */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 py-2 md:py-0 border-y md:border-y-0 md:border-x md:px-6 border-[#E5EDE8] text-xs">
                    <div>
                      <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">
                        Credit Borrowed
                      </span>
                      <span className="font-extrabold text-sm text-[#0B3326]">
                        ₹{maturity.principal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">
                        Due Date
                      </span>
                      <span className="font-bold text-sm text-[#566861]">
                        {maturity.dueDateFormatted}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">
                        Total Payable
                      </span>
                      <span className="font-extrabold text-base text-[#10B981] font-heading">
                        ₹{maturity.totalDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Right: More Details Button */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedLoanForDetail(loan);
                        setRepaymentReceipt(null);
                      }}
                      icon={ChevronRight}
                      iconPosition="right"
                      className="text-xs font-bold py-2 px-3.5 border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] cursor-pointer"
                    >
                      {isRepaid ? 'View Receipt' : 'More Details & Repay'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredLoans.length}
              pageSize={pageSize}
            />
          )}
        </div>

      </div>

      {/* DETAIL & REPAYMENT DRAWER / MODAL (Only shown when user clicks "More Details") */}
      {selectedLoanForDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start sm:items-center justify-center">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-auto animate-in zoom-in-95 duration-150 relative">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#E5EDE8]">
              <div>
                <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider block">
                  Trade Credit Facility Details
                </span>
                <h3 className="text-lg font-extrabold text-[#0B3326] font-heading">
                  Credit Ref: {selectedLoanForDetail.requestNumber || selectedLoanForDetail.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedLoanForDetail(null);
                  setRepaymentReceipt(null);
                }}
                className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Repayment Receipt is shown */}
            {repaymentReceipt ? (
              <div className="space-y-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-lg font-bold text-[#0B3326]">
                    Trade Credit Cleared & Settled!
                  </h4>
                  <p className="text-xs text-[#566861]">
                    Payment of ₹{repaymentReceipt.totalPaid.toLocaleString('en-IN')} confirmed with NBFC Institution.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2 text-xs font-mono text-left">
                  <div className="flex justify-between">
                    <span className="text-[#566861]">Txn ID:</span>
                    <span className="font-bold text-[#0B3326]">{repaymentReceipt.txnId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#566861]">Paid Via:</span>
                    <span className="font-bold text-[#0B3326]">{repaymentReceipt.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between font-sans pt-1 border-t border-[#E5EDE8]">
                    <span className="font-bold text-[#566861]">Total Settled:</span>
                    <span className="font-extrabold text-emerald-700">₹{repaymentReceipt.totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.print()}
                    icon={Printer}
                    iconPosition="left"
                    className="text-xs font-bold py-2 px-4 cursor-pointer"
                  >
                    Print Clearance Certificate
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => {
                      setSelectedLoanForDetail(null);
                      setRepaymentReceipt(null);
                    }}
                    className="text-xs font-bold py-2 px-5 shadow-sm cursor-pointer"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 4-Item Breakdown */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                  <div>
                    <span className="text-[10px] text-[#566861] uppercase font-bold block">Credit Borrowed</span>
                    <strong className="text-base text-[#14211D]">
                      ₹{calculateLoanMaturity(selectedLoanForDetail).principal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#566861] uppercase font-bold block">Interest & Platform Fee</span>
                    <strong className="text-base text-emerald-700">
                      ₹{calculateLoanMaturity(selectedLoanForDetail).interest.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#566861] uppercase font-bold block">Due Deadline</span>
                    <strong className="text-[#0B3326]">
                      {calculateLoanMaturity(selectedLoanForDetail).dueDateFormatted}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#566861] uppercase font-bold block">Tenure</span>
                    <strong className="text-[#14211D]">
                      {selectedLoanForDetail.repaymentLabel || '30 Days Net'}
                    </strong>
                  </div>
                </div>

                {/* Purpose and Lien Information */}
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                  <span className="font-bold block">
                    Order: {selectedLoanForDetail.orderNumber || 'Produce Procurement'}
                  </span>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Underwritten by <strong>Samunnati / HDFC Institutional Credit Desk</strong>. Repaying on time keeps your trade credit limit active and unlocks higher borrowing caps.
                  </p>
                </div>

                {/* Direct Pay Options (If not already repaid) */}
                {selectedLoanForDetail.status !== 'repaid' && (
                  <div className="space-y-3 pt-2 border-t border-[#E5EDE8]">
                    <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
                      Repay to Financial Institution:
                    </label>

                    <div className="p-3.5 rounded-2xl border-2 border-[#10B981] bg-[#F2FBF6] flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0B3326] text-[#34D399] flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-xs text-[#0B3326] block">
                            Razorpay Secure Gateway
                          </span>
                          <span className="text-[10px] text-[#566861]">
                            Instant institutional trade credit settlement & limit renewal
                          </span>
                        </div>
                      </div>
                      <Badge variant="emerald" size="sm">Online</Badge>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="accent"
                        size="md"
                        onClick={() => handleConfirmRepayment(selectedLoanForDetail)}
                        disabled={isProcessing}
                        className="w-full font-bold text-xs py-3 px-4 shadow-md cursor-pointer justify-center"
                      >
                        {isProcessing
                          ? 'Connecting Gateway...'
                          : `Pay ₹${calculateLoanMaturity(selectedLoanForDetail).totalDue.toLocaleString('en-IN')} with Razorpay`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
