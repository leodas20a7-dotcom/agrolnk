import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import FinancingCard from '../../components/financing/FinancingCard';
import FinancingReviewModal from '../../components/financing/FinancingReviewModal';
import FinancingStatusBadge from '../../components/financing/FinancingStatusBadge';
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
  AlertCircle
} from 'lucide-react';
import { getFinancingRequests, getFinancingStats } from '../../utils/financing';
import { getTimeGreeting } from '../../utils/greeting';

export default function FinancierDashboard({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Institutional Partner', role: 'financier' };

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    pendingRequests: 0,
    activeFunding: 0,
    totalFunded: 0,
    completed: 0,
  });
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'active' | 'completed' | 'all'
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);

  const loadFinancingData = () => {
    const all = getFinancingRequests();
    setRequests(all);
    const computedStats = getFinancingStats();
    setStats(computedStats);
  };

  useEffect(() => {
    loadFinancingData();
  }, []);

  const tabs = [
    {
      id: 'pending',
      label: 'Funding Requests',
      count: requests.filter((r) => r.status === 'pending' || r.status === 'under_review').length,
    },
    {
      id: 'active',
      label: 'Active Funding',
      count: requests.filter((r) => r.status === 'approved').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: stats.completed || 34,
    },
    {
      id: 'all',
      label: 'All Applications',
      count: requests.length,
    },
  ];

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'pending') return r.status === 'pending' || r.status === 'under_review';
    if (activeTab === 'active') return r.status === 'approved';
    if (activeTab === 'completed') return r.status === 'completed';
    return true;
  });

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Landmark className="w-3.5 h-3.5" /> Trade Credit & NBFC Underwriting Desk
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
              {getTimeGreeting(user.name).fullGreeting} {getTimeGreeting().emoji}
            </h1>
            <p className="text-xs sm:text-sm text-[#DCFCE7]/80">
              Deploy capital into verified agricultural invoices backed by AGRAMAZ escrow and digital produce receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="md">
              Institutional Escrow Active
            </Badge>
          </div>
        </div>

        {/* Section: 4 Core Metric Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0B3326] font-heading">
              Financing Overview
            </h2>
            <span className="text-xs font-semibold text-[#566861]">
              Live capital deployment
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Pending Requests */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">Pending Requests</span>
                <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                {stats.pendingRequests}
              </div>
              <div className="text-[11px] text-[#566861]">
                Verified orders awaiting underwriting
              </div>
            </Card>

            {/* Active Funding */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">Active Funding</span>
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                {stats.activeFunding}
              </div>
              <div className="text-[11px] text-[#566861]">
                Active trade credit facilities
              </div>
            </Card>

            {/* Total Funded */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">Total Funded</span>
                <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                ₹{(stats.totalFunded / 100000).toFixed(1)}L
              </div>
              <div className="text-[11px] text-[#10B981] font-semibold">
                100% Escrow protected
              </div>
            </Card>

            {/* Completed */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">Completed</span>
                <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                {stats.completed}
              </div>
              <div className="text-[11px] text-[#566861]">
                Fully settled agreements
              </div>
            </Card>

          </div>
        </div>

        {/* Section: Funding Pipeline & Applications */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0B3326] font-heading">
              Funding Requests Pipeline
            </h2>
            <span className="text-xs text-[#566861]">
              Select any request to inspect collateral & review terms
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#10B981] text-white'
                        : 'bg-[#F8FAF8] text-[#566861]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Application Cards Grid */}
          {filteredRequests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredRequests.map((request) => (
                <FinancingCard
                  key={request.id}
                  request={request}
                  viewerRole="financier"
                  onView={(item) => setSelectedRequestForReview(item)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6 text-[#10B981]" />
              </div>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                No {activeTab} funding requests
              </h3>
              <p className="text-xs text-[#566861] max-w-sm mx-auto">
                When farmers or buyers submit liquidity requests for their verified orders, they will appear here for underwriting review.
              </p>
            </Card>
          )}
        </div>

        {/* Section: Risk & Collateral Infrastructure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E5EDE8]">
          <Card className="p-6 bg-white border border-[#E5EDE8] space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B3326] font-heading">
                  Underwriting & Risk Protection
                </h3>
                <span className="text-xs text-[#566861]">Institutional grade collateral</span>
              </div>
            </div>

            <p className="text-xs text-[#566861] leading-relaxed">
              Every loan application is backed by certified electronic Negotiable Warehouse Receipts (e-NWR) and direct buyer escrow lock, eliminating default exposure.
            </p>

            <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between text-xs font-semibold text-[#0B3326]">
              <span>Current Platform Default Rate</span>
              <span className="text-[#10B981] font-bold">0.00% (Zero Loss)</span>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-[#E5EDE8] space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B3326] font-heading">
                  Automated Settlement Engine
                </h3>
                <span className="text-xs text-[#566861]">Instant repayment upon delivery</span>
              </div>
            </div>

            <p className="text-xs text-[#566861] leading-relaxed">
              When buyer delivery is marked complete via GPS geo-fence and weight confirmation, principal plus accrued interest is automatically returned to your account.
            </p>

            <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between text-xs font-semibold text-[#0B3326]">
              <span>Avg Trade Turnaround Cycle</span>
              <span className="text-[#0B3326] font-bold">14.2 Days</span>
            </div>
          </Card>
        </div>

      </div>

      {/* Financier Review Modal */}
      {selectedRequestForReview && (
        <FinancingReviewModal
          request={selectedRequestForReview}
          viewerRole="financier"
          onClose={() => setSelectedRequestForReview(null)}
          onStatusUpdated={() => loadFinancingData()}
        />
      )}
    </DashboardLayout>
  );
}
