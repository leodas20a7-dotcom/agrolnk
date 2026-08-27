import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  ShoppingBag,
  Gavel,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Search
} from 'lucide-react';

export default function BuyerDashboard({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Buyer Partner', role: 'buyer' };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <ShoppingBag className="w-3.5 h-3.5" /> Buyer & Procurement Desk
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
              Welcome back, {user.name} 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#DCFCE7]/80">
              Discover lab-assayed commodity lots, place dynamic bids, and manage bulk procurement contracts.
            </p>
          </div>

          <Button
            variant="accent"
            size="md"
            icon={Compass}
            iconPosition="left"
            onClick={() => onNavigate('landing')}
            className="font-bold shadow-xs shrink-0"
          >
            Explore Marketplace
          </Button>
        </div>

        {/* Section: Marketplace */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0B3326] font-heading">
              Marketplace
            </h2>
            <span className="text-xs font-semibold text-[#566861]">
              Procurement metrics
            </span>
          </div>

          {/* 4 Core Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Available Produce */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">Available Produce</span>
                <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                142
              </div>
              <div className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                <span>Verified lots ready for trade</span>
              </div>
            </Card>

            {/* Active Bids */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">Active Bids</span>
                <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                  <Gavel className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                0
              </div>
              <div className="text-[11px] text-[#566861] flex items-center gap-1">
                <span>Live auction submissions</span>
              </div>
            </Card>

            {/* My Orders */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">My Orders</span>
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                0
              </div>
              <div className="text-[11px] text-[#566861] flex items-center gap-1">
                <span>Direct procurement deals</span>
              </div>
            </Card>

            {/* Pending Payments */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">Pending Payments</span>
                <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                ₹0
              </div>
              <div className="text-[11px] text-[#566861] flex items-center gap-1">
                <span>Awaiting invoice clearance</span>
              </div>
            </Card>

          </div>
        </div>

        {/* Section: Live Market Lots Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0B3326] font-heading">
              Featured Verified Lots (Live Preview)
            </h3>
            <span className="text-xs font-semibold text-[#10B981]">
              NABL Assayed Lots
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Item 1 */}
            <Card hoverEffect className="p-5 bg-white border border-[#E5EDE8] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌾</span>
                  <div>
                    <h4 className="text-sm font-bold text-[#14211D]">Sharbati Premium Wheat</h4>
                    <span className="text-[10px] text-[#566861] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#10B981]" /> Sehore FPO, MP
                    </span>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">Grade A+</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#566861] block">Lot Size</span>
                  <span className="font-bold text-[#14211D]">45.0 MT</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#566861] block">Direct Price</span>
                  <span className="font-bold text-[#0B3326]">₹2,850/Qtl</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center text-xs font-semibold"
                onClick={() => onNavigate('marketplace')}
              >
                View Lot Assay
              </Button>
            </Card>

            {/* Item 2 */}
            <Card hoverEffect className="p-5 bg-white border border-[#E5EDE8] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍚</span>
                  <div>
                    <h4 className="text-sm font-bold text-[#14211D]">Sona Masoori Raw Rice</h4>
                    <span className="text-[10px] text-[#566861] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#10B981]" /> Raichur FPO, KA
                    </span>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">Grade A</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#566861] block">Lot Size</span>
                  <span className="font-bold text-[#14211D]">60.0 MT</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#566861] block">Direct Price</span>
                  <span className="font-bold text-[#0B3326]">₹3,420/Qtl</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center text-xs font-semibold"
                onClick={() => onNavigate('marketplace')}
              >
                View Lot Assay
              </Button>
            </Card>

            {/* Item 3 */}
            <Card hoverEffect className="p-5 bg-white border border-[#E5EDE8] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌽</span>
                  <div>
                    <h4 className="text-sm font-bold text-[#14211D]">Yellow Maize (Feed Grade)</h4>
                    <span className="text-[10px] text-[#566861] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#10B981]" /> Davanagere, KA
                    </span>
                  </div>
                </div>
                <Badge variant="amber" size="sm" dot={true}>Auction</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#566861] block">Lot Size</span>
                  <span className="font-bold text-[#14211D]">100.0 MT</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#566861] block">Current Bid</span>
                  <span className="font-bold text-[#D97706]">₹2,140/Qtl</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center text-xs font-semibold"
                onClick={() => onNavigate('live-auctions')}
              >
                Enter Auction Bid
              </Button>
            </Card>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
