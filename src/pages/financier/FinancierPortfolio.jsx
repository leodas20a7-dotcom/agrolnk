import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import {
  PieChart,
  Landmark,
  TrendingUp,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  AlertCircle,
  Lock,
  ArrowUpRight,
  Receipt,
  Users,
  CreditCard
} from 'lucide-react';
import { getFinancingRequests, getDisbursements } from '../../utils/financing';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function FinancierPortfolio({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Financial Institution',
    role: 'financier',
    id: '',
    email: '',
  };

  const [allLoans, setAllLoans] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'repaid' | 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      try {
        showGlobalLoader('Loading Loans & Repayments...', 'Fetching active loans and returned money...');
        const [all, allDisb] = await Promise.all([
          getFinancingRequests(),
          getDisbursements(),
        ]);
        if (isMounted) {
          setAllLoans(all || []);
          setDisbursements(allDisb || []);
        }
      } catch (err) {
        console.error('Error loading financier portfolio:', err);
      } finally {
        hideGlobalLoader();
      }
    };
    loadAll();

    const handleUpdated = () => {
      loadAll();
    };

    window.addEventListener('agrolnk_financing_updated', handleUpdated);
    window.addEventListener('agrolnk_orders_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('agrolnk_financing_updated', handleUpdated);
      window.removeEventListener('agrolnk_orders_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, []);

  const activeLoans = allLoans.filter((r) => r.status === 'approved' || r.status === 'disbursed');
  const repaidLoans = allLoans.filter((r) => r.status === 'repaid' || r.status === 'settled');

  const totalActivePrincipal = activeLoans.reduce(
    (sum, l) => sum + (Number(l.approvedAmount) || Number(l.requestedAmount) || 0),
    0
  );

  const totalRecoveredPrincipal = repaidLoans.reduce(
    (sum, r) => sum + (Number(r.repaymentPrincipal || r.approvedAmount || r.requestedAmount) || 0),
    0
  );

  const totalRealizedYield = repaidLoans.reduce(
    (sum, r) => sum + (Number(r.repaymentInterest) || 0),
    0
  );

  const filteredLoans = allLoans.filter((r) => {
    if (activeTab === 'active') return r.status === 'approved' || r.status === 'disbursed';
    if (activeTab === 'repaid') return r.status === 'repaid' || r.status === 'settled';
    return r.status === 'approved' || r.status === 'disbursed' || r.status === 'repaid' || r.status === 'settled';
  });

  const totalPages = Math.ceil(filteredLoans.length / pageSize) || 1;
  const paginatedLoans = filteredLoans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-6 text-left">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-5 sm:p-7 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <PieChart className="w-3.5 h-3.5" />
              <span>Loans Ledger</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-heading">
              Loans & Repayments
            </h1>
            <p className="text-xs sm:text-sm text-[#DCFCE7]/85">
              Track active loans given out to farmers and retailers, and view returned money with profit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={CreditCard}
              iconPosition="left"
              onClick={() => onNavigate('financier-underwriting')}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer text-xs py-2 px-3 sm:px-4"
            >
              <span>View Loan Requests</span>
            </Button>
          </div>
        </div>

        {/* 3 Overview Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] space-y-1.5 shadow-xs">
            <span className="text-xs font-semibold text-[#566861] block">
              Money Given Out (Active Loans)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalActivePrincipal.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[#10B981] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{activeLoans.length} Loans active right now</span>
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] space-y-1.5 shadow-xs">
            <span className="text-xs font-semibold text-[#566861] block">
              Money Returned (Principal)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalRecoveredPrincipal.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{repaidLoans.length} Loans fully repaid</span>
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] space-y-1.5 shadow-xs">
            <span className="text-xs font-semibold text-[#566861] block">
              Profit Earned (Interest)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-[#10B981] font-heading">
              +₹{totalRealizedYield.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[#10B981] font-bold">
              Direct profit received
            </div>
          </Card>
        </div>

        {/* Tab Selector & Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5EDE8] pb-3">
            <div>
              <h2 className="text-lg font-bold text-[#0B3326] font-heading">
                All Loans & Repayment Records
              </h2>
              <p className="text-xs text-[#566861]">
                Details of borrower names, amounts, due dates, and repayment records
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-xl bg-[#F2FBF6] p-1 border border-[#E5EDE8]">
              <button
                type="button"
                onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                Active Loans ({activeLoans.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('repaid'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'repaid'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                Repaid Loans ({repaidLoans.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                All ({allLoans.length})
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            {paginatedLoans.length === 0 ? (
              <Card className="p-8 bg-white border border-[#E5EDE8] text-center text-xs text-[#566861]">
                No loan records found in this tab.
              </Card>
            ) : (
              paginatedLoans.map((loan) => {
                const isRepaid = loan.status === 'repaid' || loan.status === 'settled';
                const approvedAmt = Number(loan.approvedAmount || loan.requestedAmount || 0);
                const principal = Number(loan.repaymentPrincipal || approvedAmt);
                const interest = Number(loan.repaymentInterest || Math.round(approvedAmt * 0.012));
                const totalPaid = Number(loan.repaymentAmount || (principal + interest));
                const tenor = loan.tenorDays || 30;

                return (
                  <Card
                    key={loan.id}
                    hoverEffect
                    className={`p-6 bg-white border shadow-xs space-y-4 ${
                      isRepaid ? 'border-emerald-200 bg-emerald-50/20' : 'border-[#E5EDE8]'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-[#0B3326]">
                            {loan.requestNumber}
                          </span>
                          <span className="text-xs text-[#566861]">&bull; Order {loan.orderNumber || 'Working Capital'}</span>
                          <Badge variant={isRepaid ? 'emerald' : 'blue'} size="sm">
                            {isRepaid ? 'Repaid & Settled ✓' : 'Active Loan'}
                          </Badge>
                          <Badge variant={loan.applicantRole === 'farmer' ? 'emerald' : 'dark'} size="sm">
                            <span className="capitalize">{loan.applicantRole}</span>
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-[#14211D]">
                          {loan.applicantName}
                        </h3>
                        <span className="text-xs text-[#566861]">
                          Item / Reason: <b>{loan.commodity || loan.purpose || 'Agricultural Trade'}</b> {loan.quantity ? `• ${loan.quantity} ${loan.unit || 'kg'}` : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAF8] p-3 rounded-2xl border border-[#E5EDE8] text-center text-xs">
                        <div>
                          <span className="text-[10px] text-[#566861] block font-medium">Loan Amount</span>
                          <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                            ₹{principal.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold">Profit (Interest)</span>
                          <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">
                            +₹{interest.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-medium">Duration</span>
                          <span className="font-bold text-[#14211D] text-xs sm:text-sm">
                            {tenor} Days
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-bold">
                            {isRepaid ? 'Total Received' : 'Total to Collect'}
                          </span>
                          <span className="font-extrabold text-[#0B3326] text-xs sm:text-sm">
                            ₹{totalPaid.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E5EDE8] flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-[#566861]">
                        <Lock className="w-4 h-4 text-[#10B981]" />
                        <span>Security: <b>{isRepaid ? 'Completed & Cleared' : (loan.collateralType || 'Order Payment Guarantee')}</b></span>
                        {loan.repaymentTransactionId && (
                          <span className="font-mono text-[11px] text-[#0B3326]">&bull; Txn: {loan.repaymentTransactionId}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isRepaid ? (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Repaid via {loan.repaymentMethod ? loan.repaymentMethod.toUpperCase() : 'Razorpay Gateway'}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Repayment Due upon Delivery / Maturity</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {filteredLoans.length > pageSize && (
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
    </DashboardLayout>
  );
}
