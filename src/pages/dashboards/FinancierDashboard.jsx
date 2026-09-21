import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import InstitutionalUnderwriteModal from '../../components/financing/InstitutionalUnderwriteModal';
import AddLiquidityModal from '../../components/financing/AddLiquidityModal';
import VerificationRequiredModal from '../../components/verification/VerificationRequiredModal';
import DocumentViewerModal from '../../components/admin/DocumentViewerModal';
import {
  Landmark,
  Clock,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  FileText,
  ArrowUpRight,
  Filter,
  DollarSign,
  AlertCircle,
  Plus,
  PieChart,
  Receipt,
  Building2,
  Calendar,
  ArrowRight,
  SlidersHorizontal,
  Lock,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import {
  getFinancingRequests,
  getFinancingStats,
  getLiquidityPool,
  loadFinancierLiquidityPool,
  getDisbursements,
  isFinancierMatch
} from '../../utils/financing';
import { getTimeGreeting } from '../../utils/greeting';
import { getResolvedUserKycStatus, fetchCurrentProfile } from '../../utils/auth';
import { subscribeToCrossTabSync } from '../../utils/syncChannel';

export default function FinancierDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Financial Institution',
    role: 'financier',
    id: '',
    email: '',
  };

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [pool, setPool] = useState(null);
  const [disbursements, setDisbursements] = useState([]);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);
  const [isAddLiquidityOpen, setIsAddLiquidityOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [inspectingDoc, setInspectingDoc] = useState(null);

  const [currentKycStatus, setCurrentKycStatus] = useState(() => getResolvedUserKycStatus(user));

  const isVerified = currentKycStatus === 'verified';

  const handleOpenKycAction = () => {
    if (currentKycStatus === 'pending') {
      try {
        const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
        const registry = storedRaw ? JSON.parse(storedRaw) : [];
        const found = registry.find((u) => u.id === user.id || u.email === user.email);
        if (found?.documents && found.documents.length > 0) {
          setInspectingDoc(found.documents[0]);
          return;
        }
      } catch { }
      if (user.documents && user.documents.length > 0) {
        setInspectingDoc(user.documents[0]);
        return;
      }
    }
    setIsVerificationModalOpen(true);
  };

  useEffect(() => {
    const syncKyc = async () => {
      const status = getResolvedUserKycStatus(user);
      setCurrentKycStatus(status);
      try {
        const profile = await fetchCurrentProfile();
        if (profile?.kycStatus) {
          setCurrentKycStatus(profile.kycStatus);
        }
      } catch {}
    };

    syncKyc();

    window.addEventListener('agrolnk_kyc_updated', syncKyc);
    window.addEventListener('storage', syncKyc);
    window.addEventListener('agrolnk_user_profile_updated', syncKyc);
    return () => {
      window.removeEventListener('agrolnk_kyc_updated', syncKyc);
      window.removeEventListener('storage', syncKyc);
      window.removeEventListener('agrolnk_user_profile_updated', syncKyc);
    };
  }, [user.id, user.email]);

  const loadData = async () => {
    try {
      const fid = user.id || user.email || 'default';
      const [all, computedStats, allDisb, currentPool] = await Promise.all([
        getFinancingRequests(),
        getFinancingStats(user),
        getDisbursements(user),
        loadFinancierLiquidityPool(user),
      ]);
      setRequests(Array.isArray(all) ? all : []);
      setStats(computedStats);
      setPool(currentPool || getLiquidityPool(fid));
      setDisbursements(Array.isArray(allDisb) ? allDisb : []);
    } catch (err) {
      console.error('Error loading financier data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdated = (payload) => {
      const item = payload?.data || payload?.detail;
      if (item && item.id) {
        setRequests((prev) =>
          prev.map((r) => (r.id === item.id || r.requestNumber === item.requestNumber ? { ...r, ...item } : r))
        );
      }
      loadData();
    };

    const unsubscribeCrossTab = subscribeToCrossTabSync((msg) => {
      if (msg.domain === 'financing' || msg.domain === 'orders') {
        handleUpdated(msg);
      }
    });

    window.addEventListener('agrolnk_financing_updated', handleUpdated);
    window.addEventListener('agrolnk_orders_updated', handleUpdated);
    window.addEventListener('agrolnk_liquidity_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);

    return () => {
      unsubscribeCrossTab();
      window.removeEventListener('agrolnk_financing_updated', handleUpdated);
      window.removeEventListener('agrolnk_orders_updated', handleUpdated);
      window.removeEventListener('agrolnk_liquidity_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [user.id, user.email]);

  const safeRequests = Array.isArray(requests) ? requests : [];
  
  // Only display pending loan requests from KYC-verified borrowers to financial institutions
  const pendingRequests = safeRequests.filter(
    (r) => (r.status === 'pending' || r.status === 'under_review') && r.applicantKycStatus === 'verified'
  );

  // Active, accepted, and repaid loans scoped strictly to this specific financial institution
  const readyToDisburseLoans = safeRequests.filter(
    (r) => r.status === 'borrower_accepted' && isFinancierMatch(r, user)
  );

  const activeLoans = safeRequests.filter(
    (r) => (r.status === 'approved' || r.status === 'disbursed') && isFinancierMatch(r, user)
  );

  const repaidLoans = safeRequests.filter(
    (r) => (r.status === 'repaid' || r.status === 'settled') && isFinancierMatch(r, user)
  );

  const totalPool = Number(pool?.totalCommitted) || 0;
  const totalDeployed = activeLoans.reduce(
    (sum, l) => sum + (Number(l.approvedAmount) || Number(l.requestedAmount) || 0),
    0
  );
  const recoveredPrincipal = stats?.recoveredPrincipal !== undefined 
    ? stats.recoveredPrincipal 
    : repaidLoans.reduce((sum, r) => sum + (Number(r.repaymentPrincipal || r.approvedAmount || r.requestedAmount) || 0), 0);
  
  const realizedYield = stats?.realizedInterestYield !== undefined
    ? stats.realizedInterestYield
    : repaidLoans.reduce((sum, r) => sum + (Number(r.repaymentInterest) || 0), 0);

  const availablePool = Math.max(0, totalPool - totalDeployed + recoveredPrincipal);
  const liquidPct = totalPool > 0 ? ((availablePool / totalPool) * 100).toFixed(1) : '0.0';

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* 1. Header with Simple Clean Text */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-[#061B14] via-[#0B3326] to-[#0F4A37] text-white border border-[#14624A] shadow-md">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0F4A37] text-[11px] sm:text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Landmark className="w-3.5 h-3.5" />
              <span>Lending & Finance Hub</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold font-heading tracking-tight">
              {getTimeGreeting(user.name).fullGreeting} {getTimeGreeting().emoji}
            </h1>
            <p className="text-xs sm:text-sm text-[#DCFCE7]/85 leading-relaxed">
              Overview of money given out, pending loan approvals, and money returned with profit.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="accent"
              size="sm"
              icon={Plus}
              iconPosition="left"
              onClick={() => setIsAddLiquidityOpen(true)}
              className="font-bold text-xs shadow-md cursor-pointer py-2.5 px-4"
            >
              Add Lending Balance
            </Button>
          </div>
        </div>

        {/* KYC Alert if not verified */}
        {!isVerified && (
          <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            currentKycStatus === 'pending'
              ? 'bg-amber-50/80 border-amber-200/80 text-amber-950'
              : currentKycStatus === 'rejected'
              ? 'bg-red-50/80 border-red-200/80 text-red-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                currentKycStatus === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : currentKycStatus === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-[#0B3326]'
              }`}>
                {currentKycStatus === 'pending' ? (
                  <Clock className="w-4 h-4" />
                ) : currentKycStatus === 'rejected' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                )}
              </div>
              <div className="space-y-0.5">
                <span className="text-xs sm:text-sm font-bold block">
                  {currentKycStatus === 'pending'
                    ? 'Verification Under Review'
                    : currentKycStatus === 'rejected'
                    ? 'Documents Need Correction'
                    : 'Account Verification Required'}
                </span>
                <p className="text-xs text-[#566861]">
                  {currentKycStatus === 'pending'
                    ? 'Your documents are being checked. Loan approvals will activate once approved.'
                    : 'Please submit your proof of identity / business registration to approve loans.'}
                </p>
              </div>
            </div>

            <Button
              variant={currentKycStatus === 'pending' ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleOpenKycAction}
              className="shrink-0 cursor-pointer shadow-xs whitespace-nowrap text-xs font-semibold py-1.5 px-3"
            >
              {currentKycStatus === 'pending' ? 'View' : 'Verify Now'}
            </Button>
          </div>
        )}

        {/* Ready to Disburse Banner */}
        {readyToDisburseLoans.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-[#0B3326] to-[#0F4A37] text-white border-2 border-emerald-500/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-400/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/30 text-[11px] font-bold text-emerald-300">
                  ACTION REQUIRED &bull; READY TO DISBURSE
                </div>
                <h3 className="text-base font-bold text-white">
                  {readyToDisburseLoans.length} Borrower(s) Confirmed Loan Terms!
                </h3>
                <p className="text-xs text-emerald-200/90 leading-relaxed max-w-2xl">
                  Borrower confirmed your quoted interest & repayment schedule. Complete Escrow disbursement via Razorpay Route to activate financing.
                </p>
              </div>
            </div>

            <Button
              variant="accent"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => setSelectedRequestForReview(readyToDisburseLoans[0])}
              className="shrink-0 font-extrabold text-xs py-2.5 px-5 shadow-md cursor-pointer whitespace-nowrap"
            >
              Disburse ₹{Number(readyToDisburseLoans[0].offeredAmount || readyToDisburseLoans[0].approvedAmount || readyToDisburseLoans[0].requestedAmount || 0).toLocaleString('en-IN')} Now
            </Button>
          </div>
        )}

        {/* 2. Four Core Simple Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Available Lending Balance */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold">Available Balance</span>
              <div className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{availablePool.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span>Ready to lend</span>
              <span className="text-[#10B981] font-bold">{liquidPct}% Available</span>
            </div>
          </Card>

          {/* Money Given Out (Active Loans) */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold">Loans Given Out</span>
              <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalDeployed.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span>{activeLoans.length} active loans</span>
              <span className="text-[#D97706] font-bold">100% Escrow Secured</span>
            </div>
          </Card>

          {/* Money Returned & Profit Earned */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold">Profit Earned (+₹)</span>
              <div className="w-7 h-7 rounded-lg bg-[#F2FBF6] text-[#10B981] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#10B981] font-heading">
              +₹{realizedYield.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span className="truncate">₹{recoveredPrincipal.toLocaleString('en-IN')} returned</span>
              <span className="text-[#10B981] font-bold">{repaidLoans.length} Cleared</span>
            </div>
          </Card>

          {/* Overdue / Unpaid Rate */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold">Overdue / Unpaid</span>
              <div className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              0.00%
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span>Trade Escrow Backed</span>
              <span className="text-[#10B981] font-bold">Safe Return</span>
            </div>
          </Card>

        </div>

        {/* 3. Two Clear Quick Navigation Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('financier-underwriting')}
            className="p-5 rounded-2xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-[#0B3326] block">Loan Requests & Approvals</span>
                <span className="text-xs text-[#566861]">{pendingRequests.length} requests waiting for approval</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#566861] group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('financier-portfolio')}
            className="p-5 rounded-2xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center group-hover:scale-105 transition-transform">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-[#0B3326] block">Loans & Repayments Ledger</span>
                <span className="text-xs text-[#566861]">{activeLoans.length} active loans &bull; {repaidLoans.length} cleared with profit</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#566861] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 4. Two Clean Columns: Pending Requests & Upcoming Returns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (7 Cols): New Loan Requests waiting for review */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  New Loan Requests ({pendingRequests.length})
                </h2>
                <p className="text-xs text-[#566861]">
                  Farmers and retailers asking for working capital or trade credit
                </p>
              </div>
              {pendingRequests.length > 0 && (
                <button
                  onClick={() => onNavigate('financier-underwriting')}
                  className="text-xs font-bold text-[#10B981] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <Card className="p-8 bg-white border border-[#E5EDE8] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
                <h4 className="text-sm font-bold text-[#0B3326]">All Requests Cleared</h4>
                <p className="text-xs text-[#566861]">
                  There are no pending loan applications right now.
                </p>
              </Card>
            ) : (
              <div className="space-y-3.5">
                {pendingRequests.slice(0, 3).map((req) => (
                  <Card
                    key={req.id}
                    hoverEffect
                    className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#0B3326] font-bold text-xs flex items-center justify-center">
                          {req.applicantRole === 'farmer' ? '🌾' : '🛒'}
                        </div>
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-[#14211D] block">
                            {req.applicantName} ({req.applicantRole === 'farmer' ? 'Farmer' : 'Retail Buyer'})
                          </span>
                          <span className="text-[11px] text-[#566861]">
                            Purpose: <b>{req.purposeLabel || 'Working Capital'}</b> &bull; Crop: {req.commodity}
                          </span>
                        </div>
                      </div>

                      <Badge variant="amber" size="sm">
                        Waiting Approval
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
                      <div>
                        <span className="text-[10px] text-[#566861] block">Amount Needed</span>
                        <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                          ₹{Number(req.requestedAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#566861] block">Profit Return</span>
                        <span className="font-bold text-[#10B981] text-xs sm:text-sm">
                          1.2% / month
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-[#566861] block">Security</span>
                        <span className="font-bold text-[#14211D] text-xs sm:text-sm">
                          Escrow Lien
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#566861]">
                        Ref: {req.requestNumber}
                      </span>

                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => setSelectedRequestForReview(req)}
                        className="font-bold text-xs cursor-pointer py-1.5 px-3"
                      >
                        Review & Approve
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Column (5 Cols): Upcoming Returns & Repayment Deadlines */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  Active Loans Due ({activeLoans.length})
                </h2>
                <p className="text-xs text-[#566861]">
                  Upcoming repayment dates and expected returns
                </p>
              </div>
              {activeLoans.length > 0 && (
                <button
                  onClick={() => onNavigate('financier-portfolio')}
                  className="text-xs font-bold text-[#10B981] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <Card className="p-5 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
              {activeLoans.length === 0 ? (
                <div className="p-5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-center space-y-1.5">
                  <p className="text-xs font-bold text-[#0B3326]">No Active Loans</p>
                  <p className="text-[11px] text-[#566861]">
                    When you approve loan applications, their return schedules and due dates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeLoans.slice(0, 4).map((loan) => {
                    const principal = Number(loan.approvedAmount || loan.requestedAmount || 0);
                    const estInterest = Math.round(principal * 0.012);
                    const totalDue = principal + estInterest;

                    return (
                      <div
                        key={loan.id}
                        className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-[#14211D] block">
                            {loan.applicantName} ({loan.applicantRole === 'farmer' ? 'Farmer' : 'Buyer'})
                          </span>
                          <span className="text-[11px] text-[#566861]">
                            {loan.repaymentLabel || '30 Days Net'} &bull; Ref: {loan.requestNumber}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-[#0B3326] block">
                            ₹{totalDue.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-[#10B981] font-semibold">
                            +₹{estInterest.toLocaleString('en-IN')} Profit
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

          </div>

        </div>

        {/* 5. Live Repayment Settlements & Realized Yield Ledger */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading flex items-center gap-2">
                <span>Recent Repayment Settlements & Realized Yields</span>
                <Badge variant="emerald" size="sm">
                  {repaidLoans.length} Settled
                </Badge>
              </h2>
              <p className="text-xs text-[#566861]">
                Real-time ledger of returned principal capital, earned interest yields, and released legal liens
              </p>
            </div>
            <button
              onClick={() => onNavigate('financier-disbursements')}
              className="text-xs font-bold text-[#10B981] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {repaidLoans.length === 0 ? (
            <Card className="p-8 bg-white border border-[#E5EDE8] text-center space-y-2">
              <Landmark className="w-8 h-8 text-[#566861] mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-[#0B3326]">No Repayments Recorded Yet</h4>
              <p className="text-xs text-[#566861]">
                When farmers or buyers settle their loan facilities or 30-day net credit balances via Razorpay or UPI, their returned principal and realized interest earnings will appear here instantly.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {repaidLoans.slice(0, 4).map((loan) => {
                const principal = Number(loan.repaymentPrincipal || loan.approvedAmount || loan.requestedAmount || 0);
                const interest = Number(loan.repaymentInterest || (Number(loan.repaymentAmount || 0) - principal) || 0);
                const totalPaid = Number(loan.repaymentAmount || (principal + interest) || 0);

                return (
                  <Card
                    key={loan.id}
                    hoverEffect
                    className="p-4 sm:p-5 bg-white border border-emerald-100 hover:border-emerald-300 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#0B3326]">
                              {loan.requestNumber}
                            </span>
                            <Badge variant="dark" size="sm">
                              {loan.orderNumber || 'Working Capital'}
                            </Badge>
                            <Badge variant={loan.applicantRole === 'farmer' ? 'emerald' : 'blue'} size="sm">
                              <span className="capitalize">{loan.applicantRole}</span>
                            </Badge>
                          </div>
                          <p className="text-xs text-[#566861]">
                            Borrower: <strong className="text-[#14211D]">{loan.applicantName}</strong> &bull; Settled via {loan.repaymentMethod ? loan.repaymentMethod.toUpperCase() : 'Razorpay Gateway'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-[#F8FAF8] p-2.5 sm:p-3 rounded-xl border border-[#E5EDE8] text-center text-xs">
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold">Principal Recovered</span>
                          <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                            ₹{principal.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold">Interest Yield Realized</span>
                          <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">
                            +₹{interest.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold">Total Recovered</span>
                          <span className="font-extrabold text-[#0B3326] text-xs sm:text-sm">
                            ₹{totalPaid.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E5EDE8]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#566861]">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Escrow Lien Cleared &bull; Txn Ref: <b className="font-mono text-[#14211D]">{loan.repaymentTransactionId || loan.paymentId || 'TXN-SETTLED'}</b></span>
                      </div>
                      <span className="text-emerald-800 font-medium">
                        Settled on {loan.repaidAt ? new Date(loan.repaidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Underwriting Modal */}
      {selectedRequestForReview && (
        <InstitutionalUnderwriteModal
          isOpen={Boolean(selectedRequestForReview)}
          onClose={() => setSelectedRequestForReview(null)}
          request={selectedRequestForReview}
          currentUser={user}
          onUpdated={loadData}
        />
      )}

      {/* Add Liquidity Modal */}
      {isAddLiquidityOpen && (
        <AddLiquidityModal
          isOpen={isAddLiquidityOpen}
          onClose={() => setIsAddLiquidityOpen(false)}
          onAdded={loadData}
          currentUser={user}
        />
      )}

      {/* Verification Required Modal */}
      {isVerificationModalOpen && (
        <VerificationRequiredModal
          isOpen={isVerificationModalOpen}
          currentUser={user}
          actionName="underwrite credit lines and deploy trade liquidity"
          onClose={() => setIsVerificationModalOpen(false)}
          onSuccess={() => {
            setIsVerificationModalOpen(false);
            setCurrentKycStatus('pending');
          }}
        />
      )}

      {/* Document Inspection Modal */}
      {inspectingDoc && (
        <DocumentViewerModal
          isOpen={!!inspectingDoc}
          onClose={() => setInspectingDoc(null)}
          document={inspectingDoc}
          user={user}
        />
      )}
    </DashboardLayout>
  );
}

function PercentIcon(props) {
  return (
    <span className="font-bold text-xs" {...props}>
      %
    </span>
  );
}
