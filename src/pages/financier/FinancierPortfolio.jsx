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
  Receipt
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
        showGlobalLoader('Loading Credit Portfolio...', 'Calculating live repayment schedules & interest yields...');
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
      <div className="space-y-8 text-left">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-5 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#0F4A37] text-[11px] sm:text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <PieChart className="w-3.5 h-3.5" />
              <span className="sm:hidden">Live Portfolio</span>
              <span className="hidden sm:inline">Live Credit Portfolio & Performance</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold font-heading">
              Active & Matured Portfolio
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-[#DCFCE7]/85">
              Live loan facilities backed by agricultural escrow liens and electronic warehouse receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={Receipt}
              iconPosition="left"
              onClick={() => onNavigate('financier-disbursements')}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer py-2 px-3 sm:px-4"
            >
              <span className="sm:hidden">Ledger</span>
              <span className="hidden sm:inline">Disbursement Ledger</span>
            </Button>
          </div>
        </div>

        {/* 3 Overview Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Active Principal Deployed
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalActivePrincipal.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{activeLoans.length} Live Escrow Facilities</span>
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Recovered Principal Capital
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalRecoveredPrincipal.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{repaidLoans.length} Loans Fully Cleared</span>
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Realized Interest Returns
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#10B981] font-heading">
              +₹{totalRealizedYield.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-bold">
              Avg Yield: 1.20% / mo (Realized)
            </div>
          </Card>
        </div>

        {/* Tab Selector & Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5EDE8] pb-3">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Loan Facilities & Settlements
              </h2>
              <p className="text-xs text-[#566861]">
                Real-time tracking of borrower agreements, maturity dates, and repayment returns
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
                Active ({activeLoans.length})
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
                Repaid & Realized ({repaidLoans.length})
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
                No records found in this category.
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
                            {isRepaid ? 'Repaid & Yield Realized ✓' : 'Active Facility'}
                          </Badge>
                          <Badge variant={loan.applicantRole === 'farmer' ? 'emerald' : 'dark'} size="sm">
                            <span className="capitalize">{loan.applicantRole}</span>
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-[#14211D]">
                          {loan.applicantName}
                        </h3>
                        <span className="text-xs text-[#566861]">
                          Commodity: <b>{loan.commodity} ({loan.grade || 'Grade A'})</b> &bull; {loan.quantity} {loan.unit || 'kg'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAF8] p-3.5 rounded-2xl border border-[#E5EDE8] text-center text-xs">
                        <div>
                          <span className="text-[10px] text-[#566861] block">Principal</span>
                          <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                            ₹{principal.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold">Interest Yield</span>
                          <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">
                            +₹{interest.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block">Tenor</span>
                          <span className="font-bold text-[#14211D] text-xs sm:text-sm">
                            {tenor} Days
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-bold">
                            {isRepaid ? 'Total Settled' : 'Est. Return'}
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
                        <span>Collateral: <b>{isRepaid ? 'Lien Released' : (loan.collateralType || 'Escrow Lien Locked')}</b></span>
                        {loan.repaymentTransactionId && (
                          <span className="font-mono text-[11px] text-[#0B3326]">&bull; Txn: {loan.repaymentTransactionId}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isRepaid ? (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Settled via {loan.repaymentMethod ? loan.repaymentMethod.toUpperCase() : 'Razorpay Gateway'}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Auto Escrow Deduction Scheduled</span>
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
