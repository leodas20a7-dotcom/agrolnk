import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Sprout,
  Plus,
  Package,
  Gavel,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Tag,
  AlertCircle
} from 'lucide-react';

export default function FarmerDashboard({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi', role: 'farmer' };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Sprout className="w-3.5 h-3.5" /> Producer & FPO Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
              Welcome back, {user.name} 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#DCFCE7]/80">
              Manage your crop listings, monitor live bids, and track guaranteed escrow payouts.
            </p>
          </div>

          <Button
            variant="accent"
            size="md"
            icon={Plus}
            iconPosition="left"
            onClick={() => onNavigate('farmer-create-listing')}
            className="font-bold shadow-xs shrink-0"
          >
            + List Produce
          </Button>
        </div>

        {/* Section: Your Marketplace */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0B3326] font-heading">
              Your Marketplace
            </h2>
            <span className="text-xs font-semibold text-[#566861]">
              Live overview
            </span>
          </div>

          {/* 4 Core Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* My Listings */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">My Listings</span>
                <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                0
              </div>
              <div className="text-[11px] text-[#566861] flex items-center gap-1">
                <span>Fixed-price direct lots</span>
              </div>
            </Card>

            {/* Active Auctions */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">Active Auctions</span>
                <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                  <Gavel className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                0
              </div>
              <div className="text-[11px] text-[#566861] flex items-center gap-1">
                <span>Live competitive bids</span>
              </div>
            </Card>

            {/* Orders */}
            <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#566861]">Orders</span>
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
                0
              </div>
              <div className="text-[11px] text-[#566861] flex items-center gap-1">
                <span>Accepted trade agreements</span>
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
              <div className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                <span>Escrow release on dispatch</span>
              </div>
            </Card>

          </div>
        </div>

        {/* Section: Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Actions Card */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#0B3326] font-heading">
              Quick Actions
            </h3>
            <Card className="p-6 bg-white border border-[#E5EDE8] space-y-3">
              <button
                onClick={() => onNavigate('farmer-create-listing')}
                className="w-full p-3.5 rounded-xl border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] text-left flex items-center justify-between group transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#EBF5F0] flex items-center justify-center text-[#0B3326]">
                    <Tag className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#14211D] block">Create Direct Sale</span>
                    <span className="text-[10px] text-[#566861]">Set fixed reserve price</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#566861] group-hover:text-[#10B981] transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('farmer-create-auction')}
                className="w-full p-3.5 rounded-xl border border-[#E5EDE8] hover:border-[#D97706] hover:bg-[#FEF3C7]/20 text-left flex items-center justify-between group transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
                    <Gavel className="w-4 h-4 text-[#D97706]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#14211D] block">Schedule Auction</span>
                    <span className="text-[10px] text-[#566861]">Time-bound market bidding</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#566861] group-hover:text-[#D97706] transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('farmer-inventory')}
                className="w-full p-3.5 rounded-xl border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] text-left flex items-center justify-between group transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#EBF5F0] flex items-center justify-center text-[#0B3326]">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#14211D] block">Request Lab Assay</span>
                    <span className="text-[10px] text-[#566861]">NABL Quality grading</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#566861] group-hover:text-[#10B981] transition-colors" />
              </button>
            </Card>
          </div>

          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-[#0B3326] font-heading">
              Recent Activity
            </h3>
            <Card className="p-6 bg-white border border-[#E5EDE8] space-y-4">
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
                  <Sprout className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#14211D]">Account Verified</span>
                    <span className="text-[10px] text-[#566861]">Just now</span>
                  </div>
                  <p className="text-xs text-[#566861] mt-0.5">
                    Your AGRAMAZ Farmer profile is active. You can now prepare your first produce batch for market listing.
                  </p>
                </div>
              </div>

              <div className="p-8 text-center border-2 border-dashed border-[#E5EDE8] rounded-2xl space-y-2">
                <p className="text-xs font-bold text-[#0B3326]">No active trade activity yet</p>
                <p className="text-[11px] text-[#566861] max-w-sm mx-auto">
                  When you list crops or buyers bid on your lots, updates will appear here in real-time.
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('farmer-create-listing')}
                  >
                    Create Your First Listing
                  </Button>
                </div>
              </div>
            </Card>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
