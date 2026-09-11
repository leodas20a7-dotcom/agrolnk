import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  ShieldCheck,
  Landmark,
  TrendingUp,
  UserCheck,
  Users,
  Building2,
  Truck,
  ArrowRight,
  DollarSign,
  Scale,
  Lock,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { getAdminMetrics } from '../../utils/admin';
import { formatINR } from '../../utils/commission';
import DemoEscrowLiveModal from '../../components/escrow/DemoEscrowLiveModal';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function AdminDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Platform Admin',
    role: 'admin',
    email: 'admin@agrolnk.com',
  };

  const [metrics, setMetrics] = useState({
    totalGMV: 1540000,
    totalOrdersCount: 18,
    completedOrdersCount: 12,
    totalCommissionsEarned: 7700,
    buyerCommissions: 3850,
    sellerCommissions: 3850,
    totalEscrowLocked: 420000,
    activeEscrowOrdersCount: 6,
    pendingKYCCount: 2,
    verifiedKYCCount: 3,
    totalKYCUsers: 5,
    totalFinancingDeployed: 285000,
    activeDeliveriesCount: 4,
    storedWarehouseTonnes: 12.5,
  });
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    showGlobalLoader('Opening Executive Command Center...', 'Aggregating live platform metrics & escrow locks...');

    const fetchMetrics = () => {
      return getAdminMetrics()
        .then((data) => {
          if (isMounted && data) setMetrics(data);
        })
        .finally(() => {
          hideGlobalLoader();
        });
    };

    fetchMetrics();
    window.addEventListener('agrolnk_kyc_updated', fetchMetrics);
    window.addEventListener('storage', fetchMetrics);

    return () => {
      isMounted = false;
      hideGlobalLoader();
      window.removeEventListener('agrolnk_kyc_updated', fetchMetrics);
      window.removeEventListener('storage', fetchMetrics);
    };
  }, []);

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-6 text-left max-w-7xl mx-auto">
        
        {/* Simple & Clean Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-7 rounded-2xl bg-[#0B3326] text-white shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
                Platform Admin
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold font-heading">
              Admin Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#DCFCE7]/80 mt-1">
              Monitor user verifications, escrow deposits, and 0.50% platform revenue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Zap}
              iconPosition="left"
              onClick={() => setIsEscrowModalOpen(true)}
              className="font-semibold text-xs bg-[#10B981] hover:bg-[#059669] text-white cursor-pointer shadow-sm"
            >
              ⚡ Live Escrow API
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={UserCheck}
              iconPosition="left"
              onClick={() => onNavigate('admin-verification')}
              className="font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            >
              KYC Queue ({metrics.pendingKYCCount})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Landmark}
              iconPosition="left"
              onClick={() => onNavigate('admin-escrow')}
              className="font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            >
              Escrow Ledger
            </Button>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total GMV */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-2">
              <span className="font-medium">Total Trade Value</span>
              <div className="p-1.5 rounded-lg bg-[#EBF5F0] text-[#10B981]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0B3326]">
              {formatINR(metrics.totalGMV)}
            </div>
            <div className="text-[11px] text-[#566861] mt-1">
              {metrics.totalOrdersCount} orders processed
            </div>
          </div>

          {/* Platform Revenue */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-2">
              <span className="font-medium">Platform Revenue (0.50%)</span>
              <div className="p-1.5 rounded-lg bg-[#EBF5F0] text-[#10B981]">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#10B981]">
              {formatINR(metrics.totalCommissionsEarned)}
            </div>
            <div className="text-[11px] text-[#566861] mt-1">
              0.25% Buyer + 0.25% Seller fee
            </div>
          </div>

          {/* Escrow Locked */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#3B82F6]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-2">
              <span className="font-medium">Active Escrow</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {formatINR(metrics.totalEscrowLocked)}
            </div>
            <div className="text-[11px] text-[#566861] mt-1">
              {metrics.activeEscrowOrdersCount} orders in transit/inspection
            </div>
          </div>

          {/* Pending KYC */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-2">
              <span className="font-medium">Pending KYC</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {metrics.pendingKYCCount} Users
            </div>
            <div className="text-[11px] text-[#566861] mt-1">
              Awaiting identity approval
            </div>
          </div>

        </div>

        {/* 3 Direct Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <button
            type="button"
            onClick={() => onNavigate('admin-verification')}
            className="p-5 rounded-2xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:shadow-sm transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#566861] group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-bold text-[#0B3326]">
              User KYC Verification
            </h3>
            <p className="text-xs text-[#566861] mt-1">
              Approve pending farmers, buyers, transporters, and warehouses.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('admin-escrow')}
            className="p-5 rounded-2xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:shadow-sm transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#566861] group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-bold text-[#0B3326]">
              Escrow & Fee Split Ledger
            </h3>
            <p className="text-xs text-[#566861] mt-1">
              View live trade escrows and 0.50% platform earnings.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('admin-disputes')}
            className="p-5 rounded-2xl bg-white border border-[#E5EDE8] hover:border-amber-400 hover:shadow-sm transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#566861] group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-bold text-[#0B3326]">
              Inspection Disputes
            </h3>
            <p className="text-xs text-[#566861] mt-1">
              Arbitrate quality and moisture discrepancies before escrow release.
            </p>
          </button>

        </div>

        {/* Ecosystem Overview Table / Clean Matrix */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5EDE8]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0B3326]">
                Platform Stakeholders
              </h2>
              <p className="text-xs text-[#566861]">
                Active participants registered on AgroLnk
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
              <div className="text-xs font-semibold text-[#566861]">Farmers</div>
              <div className="text-lg font-bold text-[#0B3326] mt-0.5">Active</div>
              <div className="text-[10px] text-[#10B981] font-medium mt-0.5">Direct Sellers</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
              <div className="text-xs font-semibold text-[#566861]">Buyers</div>
              <div className="text-lg font-bold text-[#0B3326] mt-0.5">Active</div>
              <div className="text-[10px] text-[#10B981] font-medium mt-0.5">Wholesalers</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
              <div className="text-xs font-semibold text-[#566861]">Financiers</div>
              <div className="text-lg font-bold text-[#0B3326] mt-0.5">Institutions</div>
              <div className="text-[10px] text-amber-600 font-medium mt-0.5">Trade Credit</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
              <div className="text-xs font-semibold text-[#566861]">Transporters</div>
              <div className="text-lg font-bold text-[#0B3326] mt-0.5">Carriers</div>
              <div className="text-[10px] text-[#566861] font-medium mt-0.5">Fleet Logistics</div>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] col-span-2 sm:col-span-1">
              <div className="text-xs font-semibold text-[#566861]">Warehouses</div>
              <div className="text-lg font-bold text-[#0B3326] mt-0.5">WDRA</div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Certified Storage</div>
            </div>
          </div>
        </div>

        {/* Live Escrow Gateway & API Console Modal */}
        <DemoEscrowLiveModal
          isOpen={isEscrowModalOpen}
          onClose={() => setIsEscrowModalOpen(false)}
        />

      </div>
    </DashboardLayout>
  );
}
