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
  getDisbursements
} from '../../utils/financing';
import { getTimeGreeting } from '../../utils/greeting';
import { getResolvedUserKycStatus, fetchCurrentProfile } from '../../utils/auth';

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
      const [all, computedStats, allDisb] = await Promise.all([
        getFinancingRequests(),
        getFinancingStats(),
        getDisbursements(),
      ]);
      setRequests(Array.isArray(all) ? all : []);
      setStats(computedStats);
      setPool(getLiquidityPool());
      setDisbursements(Array.isArray(allDisb) ? allDisb : []);
    } catch (err) {
      console.error('Error loading financier data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdated = () => {
      loadData();
    };

    window.addEventListener('agrolnk_financing_updated', handleUpdated);
    window.addEventListener('agrolnk_orders_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);

    return () => {
      window.removeEventListener('agrolnk_financing_updated', handleUpdated);
      window.removeEventListener('agrolnk_orders_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, []);

  const safeRequests = Array.isArray(requests) ? requests : [];
  const pendingRequests = safeRequests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review'
  );
  const activeLoans = safeRequests.filter((r) => r.status === 'approved' || r.status === 'disbursed');
  const repaidLoans = safeRequests.filter((r) => r.status === 'repaid' || r.status === 'settled');

  const totalPool = pool?.totalCommitted || 10000000;
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
  const liquidPct = totalPool > 0 ? ((availablePool / totalPool) * 100).toFixed(1) : 100;

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* 1. Executive Terminal Welcome Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-[#061B14] via-[#0B3326] to-[#0F4A37] text-white border border-[#14624A] shadow-md">
          <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#0F4A37] text-[11px] sm:text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Landmark className="w-3.5 h-3.5" />
              <span className="sm:hidden">Institutional Desk</span>
              <span className="hidden sm:inline">Institutional Capital & Trade Credit Terminal</span>
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-heading tracking-tight">
              {getTimeGreeting(user.name).fullGreeting} {getTimeGreeting().emoji}
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-[#DCFCE7]/85 leading-relaxed font-normal">
              Direct underwriting, real-time escrow liens, and automated settlement of agricultural invoices and certified warehouse storage receipts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={Building2}
              iconPosition="left"
              onClick={() => onNavigate('financier-collateral-vault')}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer font-semibold text-xs py-2 px-3 sm:px-4"
            >
              <span className="sm:hidden">Vault</span>
              <span className="hidden sm:inline">Collateral Vault</span>
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={Plus}
              iconPosition="left"
              onClick={() => setIsAddLiquidityOpen(true)}
              className="font-bold text-xs shadow-md cursor-pointer py-2 px-3 sm:px-4"
            >
              <span className="sm:hidden">+ Deploy</span>
              <span className="hidden sm:inline">Deploy Capital</span>
            </Button>
          </div>
        </div>

        {/* Financier KYC / Institutional Accreditation Alert Banner */}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold">
                    {currentKycStatus === 'pending'
                      ? 'KYC Verification Under Review'
                      : currentKycStatus === 'rejected'
                      ? 'KYC Documents Rejected'
                      : 'Institutional KYC Verification Required'}
                  </span>
                  <Badge variant={currentKycStatus === 'pending' ? 'amber' : currentKycStatus === 'rejected' ? 'red' : 'dark'} size="sm">
                    {currentKycStatus === 'pending' ? 'Reviewing' : currentKycStatus === 'rejected' ? 'Rejected' : 'Action Required'}
                  </Badge>
                </div>
                <p className="text-xs text-[#566861]">
                  {currentKycStatus === 'pending'
                    ? 'Documents are under review. Trade credit underwriting will activate once approved.'
                    : currentKycStatus === 'rejected'
                    ? 'Please review and re-submit your institutional accreditation documents.'
                    : 'Complete accreditation verification to underwrite trade credit and deploy capital.'}
                </p>
              </div>
            </div>

            <Button
              variant={currentKycStatus === 'pending' ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleOpenKycAction}
              className="shrink-0 cursor-pointer shadow-xs whitespace-nowrap text-xs font-semibold py-1.5 px-3"
            >
              {currentKycStatus === 'pending' ? 'View' : currentKycStatus === 'rejected' ? 'Re-submit Proof' : 'Verify Now'}
            </Button>
          </div>
        )}

        {/* 2. Four Core Institutional Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Available Lending Pool */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold truncate">
                <span className="sm:hidden">Available Pool</span>
                <span className="hidden sm:inline">Available Liquidity Pool</span>
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center shrink-0">
                <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{availablePool.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span className="truncate hidden sm:inline">Committed: ₹{totalPool.toLocaleString('en-IN')}</span>
              <span className="text-[#10B981] font-bold">{liquidPct}% Available</span>
            </div>
          </Card>

          {/* Active Capital Deployed */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold truncate">
                <span className="sm:hidden">Active Deployed</span>
                <span className="hidden sm:inline">Active Loans Deployed</span>
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalDeployed.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span className="truncate hidden sm:inline">{activeLoans.length} Live Facilities</span>
              <span className="text-[#D97706] font-bold">100% Escrow Lien</span>
            </div>
          </Card>

          {/* Realized Interest Yield & Recovered Capital */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold truncate">
                <span className="sm:hidden">Yield Earned</span>
                <span className="hidden sm:inline">Realized Yield & Returns</span>
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#F2FBF6] text-[#10B981] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#10B981] font-heading">
              +₹{realizedYield.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span className="truncate">Recovered: <b>₹{recoveredPrincipal.toLocaleString('en-IN')}</b></span>
              <span className="text-[#10B981] font-bold">{repaidLoans.length} Cleared</span>
            </div>
          </Card>

          {/* Default Rate / Escrow Security */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold truncate">
                <span className="sm:hidden">NPA Default</span>
                <span className="hidden sm:inline">Historical Default / NPA</span>
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              0.00%
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span className="hidden sm:inline">100% Escrow Collateral</span>
              <span className="text-[#10B981] font-bold">Zero Loss</span>
            </div>
          </Card>

        </div>

        {/* 3. Quick Action Operations Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('financier-underwriting')}
            className="p-4 rounded-2xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-[#0B3326] block">Underwriting Desk</span>
                <span className="text-xs text-[#566861]">{pendingRequests.length} pending review</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#566861] group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('financier-portfolio')}
            className="p-4 rounded-2xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center group-hover:scale-105 transition-transform">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-[#0B3326] block">Active Portfolio</span>
                <span className="text-xs text-[#566861]">{activeLoans.length} active live loans</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#566861] group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('financier-disbursements')}
            className="p-4 rounded-2xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-[#0B3326] block">Disbursements & Ledger</span>
                <span className="text-xs text-[#566861]">Bank UTRs & yield history</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#566861] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 4. Main Two Column Section: Live Applications & Risk/Portfolio Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (7 Cols): High-Priority Underwriting Applications */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  High-Priority Loan Applications
                </h2>
                <p className="text-xs text-[#566861]">
                  Verified trade agreements ready for credit assessment & liquidity deployment
                </p>
              </div>
              <button
                onClick={() => onNavigate('financier-underwriting')}
                className="text-xs font-bold text-[#10B981] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({pendingRequests.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingRequests.length === 0 ? (
              <Card className="p-8 bg-white border border-[#E5EDE8] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
                <h4 className="text-sm font-bold text-[#0B3326]">Underwriting Queue Clear</h4>
                <p className="text-xs text-[#566861]">
                  All current trade credit and working capital requests have been processed.
                </p>
              </Card>
            ) : (
              <div className="space-y-3.5">
                {pendingRequests.map((req) => {
                  const ltv = Number(((req.requestedAmount / req.transactionValue) * 100).toFixed(1));

                  return (
                    <Card
                      key={req.id}
                      hoverEffect
                      className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#0B3326] font-bold text-xs flex items-center justify-center">
                            {req.applicantRole === 'farmer' ? '🌾' : '🛒'}
                          </div>
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-[#14211D] block">
                              {req.applicantName}
                            </span>
                            <span className="text-[11px] text-[#566861]">
                              {req.applicantLocation} • Score: <b className="text-[#10B981]">{req.creditScore || 780}</b>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="emerald" size="sm">
                            {req.riskRating || 'Tier 1 Prime'}
                          </Badge>
                          <Badge variant="amber" size="sm">
                            {req.status === 'under_review' ? 'Under Review' : 'Pending'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
                        <div>
                          <span className="text-[10px] text-[#566861] block">Requested</span>
                          <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                            ₹{req.requestedAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block">LTV Ratio</span>
                          <span className="font-bold text-[#10B981] text-xs sm:text-sm">
                            {ltv}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block">Collateral Value</span>
                          <span className="font-bold text-[#14211D] text-xs sm:text-sm">
                            ₹{req.transactionValue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-[#566861] flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>Lien: Order {req.orderNumber}</span>
                        </span>

                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => setSelectedRequestForReview(req)}
                          className="font-bold text-xs cursor-pointer"
                        >
                          Underwrite & Structure
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column (5 Cols): Portfolio Allocation & Maturity Pipeline */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  Portfolio Analytics
                </h2>
                <p className="text-xs text-[#566861]">
                  Live capital allocation & upcoming maturity settlements
                </p>
              </div>
              <button
                onClick={() => onNavigate('financier-portfolio')}
                className="text-xs font-bold text-[#10B981] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Portfolio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Risk & Segment Distribution */}
            <Card className="p-5 bg-white border border-[#E5EDE8] space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#0B3326] font-heading">
                Capital Deployment Breakdown
              </h3>

              {activeLoans.length === 0 ? (
                <div className="p-5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-center space-y-1.5">
                  <p className="text-xs font-bold text-[#0B3326]">No Active Loan Deployments</p>
                  <p className="text-[11px] text-[#566861]">
                    When trade applications are underwritten and approved, facility allocations will update here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#14211D]">Farmer Working Capital</span>
                      <span className="text-[#10B981]">
                        ₹{activeLoans.filter((l) => l.applicantRole === 'farmer').reduce((s, l) => s + (l.approvedAmount || l.requestedAmount || 0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E5EDE8] overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] rounded-full"
                        style={{
                          width: `${totalDeployed > 0 ? ((activeLoans.filter((l) => l.applicantRole === 'farmer').reduce((s, l) => s + (l.approvedAmount || l.requestedAmount || 0), 0) / totalDeployed) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#14211D]">Buyer Invoice Discounting</span>
                      <span className="text-[#0B3326]">
                        ₹{activeLoans.filter((l) => l.applicantRole === 'buyer').reduce((s, l) => s + (l.approvedAmount || l.requestedAmount || 0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E5EDE8] overflow-hidden">
                      <div
                        className="h-full bg-[#0B3326] rounded-full"
                        style={{
                          width: `${totalDeployed > 0 ? ((activeLoans.filter((l) => l.applicantRole === 'buyer').reduce((s, l) => s + (l.approvedAmount || l.requestedAmount || 0), 0) / totalDeployed) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between text-xs text-[#566861]">
                <span>Risk Distribution:</span>
                <span className="font-bold text-[#10B981]">100% Escrow Lien Protected</span>
              </div>
            </Card>

            {/* Upcoming Repayment Maturities */}
            <Card className="p-5 bg-white border border-[#E5EDE8] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B3326] font-heading">
                  Upcoming Maturities (30 Days)
                </h3>
                <span className="text-[11px] font-semibold text-[#10B981] bg-[#EBF5F0] px-2 py-0.5 rounded-full">
                  Auto-Settlement
                </span>
              </div>

              {disbursements.length === 0 ? (
                <div className="p-5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-center space-y-1">
                  <p className="text-xs font-bold text-[#0B3326]">No Pending Maturities</p>
                  <p className="text-[11px] text-[#566861]">
                    All active facility settlements will appear in real-time as loans are disbursed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {disbursements.slice(0, 3).map((disb) => (
                    <div
                      key={disb.id}
                      className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#14211D] block">
                          {disb.applicantName}
                        </span>
                        <span className="text-[11px] text-[#566861]">
                          Maturity: {disb.maturityDate ? new Date(disb.maturityDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '30 Days'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-[#0B3326] block">
                          ₹{Number(disb.expectedReturn || disb.amount || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#10B981] font-semibold">
                          {disb.interestRate || 0.85}% / mo
                        </span>
                      </div>
                    </div>
                  ))}
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
