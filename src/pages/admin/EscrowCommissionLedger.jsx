import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Landmark,
  ArrowLeft,
  Search,
  Filter,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Download,
  Lock,
  CheckCircle2,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { getOrders } from '../../utils/orders';
import { calculateOrderFinancials, formatINR } from '../../utils/commission';
import DemoEscrowLiveModal from '../../components/escrow/DemoEscrowLiveModal';
import { Zap } from 'lucide-react';

export default function EscrowCommissionLedger({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'AgroLnk Operations Board',
    role: 'admin',
    email: 'admin@agrolnk.com',
  };

  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'locked' | 'released'
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getOrders().then((data) => {
      if (isMounted) setOrders(data || []);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const safeOrders = Array.isArray(orders) ? orders : [];

  const ledgerItems = safeOrders.map((ord) => {
    const fin = calculateOrderFinancials(ord.totalAmount);
    const isSettled = ord.status === 'completed';
    return {
      ...ord,
      ...fin,
      escrowState: isSettled ? 'released' : 'locked',
    };
  });

  const filteredItems = ledgerItems.filter((item) => {
    const matchesStatus =
      statusFilter === 'all' || item.escrowState === statusFilter;

    const matchesSearch =
      item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.buyerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Totals
  const totalGMV = ledgerItems.reduce((sum, item) => sum + item.tradeValue, 0);
  const totalAgroLnkRevenue = ledgerItems.reduce((sum, item) => sum + item.totalPlatformCommission, 0);
  const totalEscrowLocked = ledgerItems
    .filter((item) => item.escrowState === 'locked')
    .reduce((sum, item) => sum + item.totalBuyerPayable, 0);
  const totalSettledToSellers = ledgerItems
    .filter((item) => item.escrowState === 'released')
    .reduce((sum, item) => sum + item.netSellerReceivable, 0);

  const handleExportCSV = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('admin-dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Operations Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              Escrow & 0.50% Commission Ledger
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Audited transaction fee breakdown (0.25% Buyer + 0.25% Seller) and live escrow vault balances.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="md"
              icon={Zap}
              iconPosition="left"
              onClick={() => setIsEscrowModalOpen(true)}
              className="text-xs font-bold cursor-pointer bg-[#0B3326] text-white hover:bg-[#0A261D]"
            >
              ⚡ Live Escrow Gateway & API
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={Download}
              iconPosition="left"
              onClick={handleExportCSV}
              className="text-xs font-bold cursor-pointer"
            >
              {downloadSuccess ? 'Ledger Exported (CSV) ✓' : 'Export Audit Ledger'}
            </Button>
          </div>
        </div>

        {/* 4 Revenue Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total GMV */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-2">
              <span className="font-medium">Total Settled Volume</span>
              <div className="p-1.5 rounded-lg bg-[#EBF5F0] text-[#10B981]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0B3326]">
              {formatINR(totalGMV)}
            </div>
            <div className="text-[11px] text-[#566861] mt-1">
              Across {ledgerItems.length} transactions
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
              {formatINR(totalAgroLnkRevenue)}
            </div>
            <div className="text-[11px] text-[#566861] mt-1">
              0.25% Buyer + 0.25% Seller fee
            </div>
          </div>

          {/* Active Escrow */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-2">
              <span className="font-medium">Active Escrow Locked</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {formatINR(totalEscrowLocked)}
            </div>
            <div className="text-[11px] text-[#566861] mt-1">
              Protected in trust account
            </div>
          </div>

          {/* Net Disbursements */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-emerald-400 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-2">
              <span className="font-medium">Net Seller Payouts</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {formatINR(totalSettledToSellers)}
            </div>
            <div className="text-[11px] text-[#566861] mt-1">
              Released post-inspection
            </div>
          </div>

        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {['all', 'locked', 'released'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'bg-white text-[#566861] hover:bg-[#F2FBF6] border border-[#E5EDE8]'
                }`}
              >
                {st === 'all' ? 'All Transactions' : `Escrow ${st}`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, commodity, buyer..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs text-[#14211D] focus:ring-2 focus:ring-[#10B981] focus:outline-none"
            />
          </div>
        </div>

        {/* Full Ledger Table */}
        <div className="bg-white rounded-3xl border border-[#E5EDE8] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAF8] border-b border-[#E5EDE8] text-[#566861] uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3.5 px-4">Order ID & Commodity</th>
                  <th className="py-3.5 px-4">Gross Trade Value</th>
                  <th className="py-3.5 px-4 text-[#1E40AF]">Buyer Paid (+0.25%)</th>
                  <th className="py-3.5 px-4 text-[#10B981]">Seller Received (-0.25%)</th>
                  <th className="py-3.5 px-4 text-[#0B3326]">AgroLnk Fee (0.50%)</th>
                  <th className="py-3.5 px-4">Escrow Status</th>
                  <th className="py-3.5 px-4 text-right">Counterparties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EDE8]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAF8]/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#0B3326] block">{item.orderNumber}</span>
                      <span className="text-[11px] text-[#566861]">
                        {item.commodity} • {item.quantity} {item.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#14211D]">
                      {formatINR(item.tradeValue)}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[#1E40AF]">
                      {formatINR(item.totalBuyerPayable)}
                      <span className="block text-[10px] text-[#566861]">
                        Fee: +{formatINR(item.buyerFee)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[#10B981]">
                      {formatINR(item.netSellerReceivable)}
                      <span className="block text-[10px] text-[#566861]">
                        Fee: -{formatINR(item.sellerFee)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-extrabold text-[#0B3326]">
                      {formatINR(item.totalPlatformCommission)}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={item.escrowState === 'released' ? 'emerald' : 'amber'}
                        size="sm"
                        dot={item.escrowState === 'locked'}
                      >
                        <span className="capitalize">{item.escrowState}</span>
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right text-[11px]">
                      <span className="font-medium text-[#14211D] block">{item.buyerName}</span>
                      <span className="text-[#566861]">Seller: {item.farmerName}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Demo Live Escrow Gateway API & Simulator Modal */}
        <DemoEscrowLiveModal
          isOpen={isEscrowModalOpen}
          onClose={() => setIsEscrowModalOpen(false)}
        />

      </div>
    </DashboardLayout>
  );
}
