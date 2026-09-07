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
  AlertTriangle,
  Users,
  Building2,
  Truck,
  FileText,
  Lock,
  ArrowRight,
  CreditCard,
  Scale,
  DollarSign,
  PackageCheck
} from 'lucide-react';
import { getAdminMetrics } from '../../utils/admin';
import { formatINR } from '../../utils/commission';

export default function AdminDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'AgroLnk Operations Board',
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

  useEffect(() => {
    let isMounted = true;
    getAdminMetrics().then((data) => {
      if (isMounted && data) setMetrics(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Admin Command Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <ShieldCheck className="w-3.5 h-3.5" /> AgroLnk Platform Operations & Governance
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              Executive Command Center
            </h1>
            <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed font-normal">
              Oversee multi-stakeholder KYC verification, monitor live 0.50% platform commission revenue, arbitrate inspections, and manage secure escrow releases.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              size="md"
              icon={UserCheck}
              iconPosition="left"
              onClick={() => onNavigate('admin-verification')}
              className="py-2.5 px-4 font-bold shadow-xs text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              KYC Queue ({metrics.pendingKYCCount})
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={Landmark}
              iconPosition="left"
              onClick={() => onNavigate('admin-escrow')}
              className="py-2.5 px-4 font-bold shadow-xs text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              Escrow Ledger
            </Button>
          </div>
        </div>

        {/* 4 Core Financial & Operational Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Total Platform GMV */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Total Platform GMV</span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              {formatINR(metrics.totalGMV)}
            </div>
            <div className="text-[11px] text-[#566861]">
              Across {metrics.totalOrdersCount} exchange transactions
            </div>
          </Card>

          {/* Platform Revenue (0.50% Commission) */}
          <Card hoverEffect className="p-6 bg-[#0B3326] text-white border border-[#14624A] space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#34D399]">AgroLnk Fee Revenue (0.50%)</span>
              <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[#34D399]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
              {formatINR(metrics.totalCommissionsEarned)}
            </div>
            <div className="text-[11px] text-[#DCFCE7]/80">
              Buyer 0.25% ({formatINR(metrics.buyerCommissions)}) + Seller 0.25% ({formatINR(metrics.sellerCommissions)})
            </div>
          </Card>

          {/* Escrow in Vault */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Escrow Locked in Vault</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <Lock className="w-4 h-4 text-[#3B82F6]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1E40AF] font-heading">
              {formatINR(metrics.totalEscrowLocked)}
            </div>
            <div className="text-[11px] text-[#566861]">
              {metrics.activeEscrowOrdersCount} orders awaiting delivery & inspection
            </div>
          </Card>

          {/* Pending KYC Approvals */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Pending KYC Verification</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#D97706] font-heading">
              {metrics.pendingKYCCount} Users
            </div>
            <div className="text-[11px] text-[#566861]">
              Awaiting identity & license approval
            </div>
          </Card>

        </div>

        {/* 5-Stakeholder Platform Network Matrix */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Multi-Stakeholder Ecosystem Status
              </h2>
              <p className="text-xs text-[#566861]">
                Real-time operational network across all 5 independent partner categories
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Farmers / Sellers */}
            <Card hoverEffect className="p-4 bg-white border border-[#E5EDE8] space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider">Producers</span>
                <Badge variant="emerald" size="sm">Active</Badge>
              </div>
              <div className="text-lg font-bold text-[#0B3326]">Farmers & FPOs</div>
              <p className="text-[11px] text-[#566861]">
                Direct farmgate lots & instant 85% advance payouts.
              </p>
            </Card>

            {/* Buyers */}
            <Card hoverEffect className="p-4 bg-white border border-[#E5EDE8] space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider">Buyers</span>
                <Badge variant="emerald" size="sm">Active</Badge>
              </div>
              <div className="text-lg font-bold text-[#0B3326]">Wholesale Buyers</div>
              <p className="text-[11px] text-[#566861]">
                Spot Escrow & 30-day BNPL institutional credit.
              </p>
            </Card>

            {/* Financial Institutions */}
            <Card hoverEffect className="p-4 bg-white border border-[#E5EDE8] space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider">Financiers</span>
                <Badge variant="accent" size="sm">₹1.00 Cr Pool</Badge>
              </div>
              <div className="text-lg font-bold text-[#0B3326]">Credit Desks</div>
              <p className="text-[11px] text-[#566861]">
                Self-managed risk policies, LTV underwriting & APR returns.
              </p>
            </Card>

            {/* Transporters */}
            <Card hoverEffect className="p-4 bg-white border border-[#E5EDE8] space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider">Logistics</span>
                <Badge variant="dark" size="sm">{metrics.activeDeliveriesCount} Active</Badge>
              </div>
              <div className="text-lg font-bold text-[#0B3326]">Freight Carriers</div>
              <p className="text-[11px] text-[#566861]">
                Self-priced corridor freight & live GPS telemetry.
              </p>
            </Card>

            {/* Warehouses */}
            <Card hoverEffect className="p-4 bg-white border border-[#E5EDE8] space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider">Storage</span>
                <Badge variant="emerald" size="sm">WDRA</Badge>
              </div>
              <div className="text-lg font-bold text-[#0B3326]">Cold Storage Hubs</div>
              <p className="text-[11px] text-[#566861]">
                e-NWR electronic title issuance & NABL lab assays.
              </p>
            </Card>

          </div>
        </div>

        {/* Quick Action Navigation Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          <Card
            hoverEffect
            onClick={() => onNavigate('admin-verification')}
            className="p-6 bg-white border border-[#E5EDE8] space-y-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading flex items-center justify-between">
              <span>KYC Verification Queue</span>
              <ArrowRight className="w-4 h-4 text-[#10B981] group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-[#566861]">
              Review government IDs, GSTIN registrations, and WDRA warehouse certifications.
            </p>
          </Card>

          <Card
            hoverEffect
            onClick={() => onNavigate('admin-escrow')}
            className="p-6 bg-white border border-[#E5EDE8] space-y-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading flex items-center justify-between">
              <span>Escrow & Commission Ledger</span>
              <ArrowRight className="w-4 h-4 text-[#10B981] group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-[#566861]">
              Inspect 0.25% buyer + 0.25% seller platform take-rate ledger and releases.
            </p>
          </Card>

          <Card
            hoverEffect
            onClick={() => onNavigate('admin-disputes')}
            className="p-6 bg-white border border-[#E5EDE8] space-y-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading flex items-center justify-between">
              <span>Inspection Disputes Desk</span>
              <ArrowRight className="w-4 h-4 text-[#D97706] group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-[#566861]">
              Arbitrate quality discrepancies, weigh lab assay reports, and execute settlements.
            </p>
          </Card>

        </div>

      </div>
    </DashboardLayout>
  );
}
