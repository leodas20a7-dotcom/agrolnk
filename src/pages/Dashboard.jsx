import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Sprout, TrendingUp, Package, ShieldCheck, Plus, ArrowUpRight, Clock } from 'lucide-react';

export default function Dashboard({ onNavigate, navState }) {
  const role = navState?.role || 'farmer';
  const user = navState?.user || { fullName: 'Ramesh Patel' };

  return (
    <DashboardLayout userRole={role} onLogout={() => onNavigate('landing')}>
      <div className="space-y-8">
        
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0B3326] to-[#0F4A37] text-white">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-heading">
              Welcome back, {user.fullName || 'Partner'}!
            </h1>
            <p className="text-xs text-[#DCFCE7]/80">
              Here is your AGRAMAZ {role} exchange overview and market activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="accent" size="md">Phase 1 Connected</Badge>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-white border border-[#E5EDE8] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#566861]">
              <span>Active Listings</span>
              <Package className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="text-2xl font-bold text-[#0B3326] font-heading">03</div>
            <div className="text-[11px] text-[#10B981] font-semibold">2 Direct • 1 Live Auction</div>
          </Card>

          <Card className="p-5 bg-white border border-[#E5EDE8] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#566861]">
              <span>Settled Volume</span>
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="text-2xl font-bold text-[#0B3326] font-heading">₹4,28,000</div>
            <div className="text-[11px] text-[#566861]">Last 30 days</div>
          </Card>

          <Card className="p-5 bg-white border border-[#E5EDE8] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#566861]">
              <span>Escrow Balance</span>
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="text-2xl font-bold text-[#0B3326] font-heading">₹1,15,500</div>
            <div className="text-[11px] text-[#10B981] font-semibold">Protected in bank vault</div>
          </Card>

          <Card className="p-5 bg-white border border-[#E5EDE8] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#566861]">
              <span>Pending Dispatches</span>
              <Clock className="w-4 h-4 text-[#D97706]" />
            </div>
            <div className="text-2xl font-bold text-[#0B3326] font-heading">01</div>
            <div className="text-[11px] text-[#D97706] font-semibold">Pickup scheduled today</div>
          </Card>
        </div>

        {/* Next Phase Notice */}
        <Card className="p-8 bg-white border border-[#E5EDE8] text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
            <Sprout className="w-6 h-6 text-[#10B981]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0B3326] font-heading">
              Phase 1 Foundation Ready
            </h3>
            <p className="text-xs text-[#566861] mt-1 max-w-md mx-auto leading-relaxed">
              The landing page, design tokens, and authentication architecture are now established. In Phase 2, we will integrate Supabase live tables and expand the dedicated {role} module!
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('landing')}
            >
              Return to Landing Page
            </Button>
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
