import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import InstitutionalUnderwriteModal from '../../components/financing/InstitutionalUnderwriteModal';
import AddLiquidityModal from '../../components/financing/AddLiquidityModal';
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
  ChevronRight
} from 'lucide-react';
import {
  getFinancingRequests,
  getFinancingStats,
  getLiquidityPool,
  getDisbursements
} from '../../utils/financing';
import { getTimeGreeting } from '../../utils/greeting';

export default function FinancierDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Kisan Capital Partners',
    role: 'financier',
    email: 'financier@agrolnk.com',
  };

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [pool, setPool] = useState(null);
  const [disbursements, setDisbursements] = useState([]);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);
  const [isAddLiquidityOpen, setIsAddLiquidityOpen] = useState(false);

  const loadData = () => {
    const all = getFinancingRequests();
    setRequests(all);
    const computedStats = getFinancingStats();
    setStats(computedStats);
    setPool(getLiquidityPool());
    setDisbursements(getDisbursements());
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingRequests = requests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review'
  );
  const activeLoans = requests.filter((r) => r.status === 'approved');

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
              Direct underwriting, real-time escrow liens, and automated settlement of agricultural invoices and e-NWR warehouse receipts.
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
              ₹{(pool?.availableLiquidity || 7544000).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span className="truncate hidden sm:inline">Total: ₹{(pool?.totalCommitted || 10000000).toLocaleString('en-IN')}</span>
              <span className="text-[#10B981] font-bold">75.4% Liquid</span>
            </div>
          </Card>

          {/* Active Capital Deployed */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold truncate">
                <span className="sm:hidden">Deployed</span>
                <span className="hidden sm:inline">Active Capital Deployed</span>
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#0B3326] font-heading">
              ₹{(pool?.allocatedDeployed || 2456000).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span className="truncate hidden sm:inline">{activeLoans.length + 2} Live Facilities</span>
              <span className="text-[#D97706] font-bold">100% Escrow</span>
            </div>
          </Card>

          {/* Weighted Average Yield / IRR */}
          <Card hoverEffect className="p-4 sm:p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#566861]">
              <span className="font-semibold truncate">
                <span className="sm:hidden">Avg Yield (IRR)</span>
                <span className="hidden sm:inline">Weighted Average Yield (IRR)</span>
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center shrink-0">
                <PercentIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#10B981] font-heading">
              {stats?.avgActiveYield || 11.4}% <span className="text-[10px] sm:text-xs text-[#566861] font-normal">p.a.</span>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#566861] pt-1 border-t border-[#E5EDE8]/60">
              <span className="hidden sm:inline">Net fee</span>
              <span className="text-[#10B981] font-bold">+1.8% vs MIBOR</span>
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
              <span className="hidden sm:inline">34 Settlements</span>
              <span className="text-[#10B981] font-bold">100% On-Time</span>
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
          <div className="lg:col-span-5 space-y-6">
            
            {/* Risk & Segment Distribution */}
            <Card className="p-6 bg-white border border-[#E5EDE8] space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#0B3326] font-heading uppercase tracking-wider">
                Capital Deployment Breakdown
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#14211D]">Farmer Working Capital</span>
                    <span className="text-[#10B981]">55% (₹13.5 Lakhs)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E5EDE8] overflow-hidden">
                    <div className="h-full bg-[#10B981] rounded-full" style={{ width: '55%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#14211D]">Buyer Invoice Discounting</span>
                    <span className="text-[#0B3326]">30% (₹7.3 Lakhs)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E5EDE8] overflow-hidden">
                    <div className="h-full bg-[#0B3326] rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#14211D]">WDRA e-NWR Vault Loans</span>
                    <span className="text-[#D97706]">15% (₹3.7 Lakhs)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E5EDE8] overflow-hidden">
                    <div className="h-full bg-[#D97706] rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between text-xs text-[#566861]">
                <span>Risk Distribution:</span>
                <span className="font-bold text-[#10B981]">100% Tier 1 / Low Risk</span>
              </div>
            </Card>

            {/* Upcoming Repayment Maturities */}
            <Card className="p-6 bg-white border border-[#E5EDE8] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B3326] font-heading uppercase tracking-wider">
                  Upcoming Maturities (30 Days)
                </h3>
                <span className="text-[11px] font-semibold text-[#10B981] bg-[#EBF5F0] px-2 py-0.5 rounded-full">
                  Auto-Deduct Active
                </span>
              </div>

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
                        Maturity: {new Date(disb.maturityDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-[#0B3326] block">
                        ₹{disb.expectedReturn.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#10B981] font-semibold">
                        {disb.interestRate}% APR
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>

        </div>

      </div>

      {/* Underwriting Modal */}
      {selectedRequestForReview && (
        <InstitutionalUnderwriteModal
          isOpen={Boolean(selectedRequestForReview)}
          onClose={() => setSelectedRequestForReview(null)}
          request={selectedRequestForReview}
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
