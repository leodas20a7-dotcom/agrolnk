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
import AdminCallVerificationModal from '../../components/admin/AdminCallVerificationModal';
import Pagination from '../../components/ui/Pagination';
import { Zap, PhoneCall, Phone, UserCheck, ShieldAlert } from 'lucide-react';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function EscrowCommissionLedger({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'AgroLnk Operations Board',
    role: 'admin',
    email: 'admin@agrolnk.com',
  };

  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending_call' | 'locked' | 'released'
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [orderForVerification, setOrderForVerification] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const loadData = () => {
    getOrders().then((data) => {
      setOrders(data || []);
    });
  };

  useEffect(() => {
    let isMounted = true;
    showGlobalLoader('Auditing Escrow & Take-Rate Ledgers...', 'Fetching live escrow vaults and trade commissions...');
    getOrders()
      .then((data) => {
        if (isMounted) setOrders(data || []);
      })
      .finally(() => {
        hideGlobalLoader();
      });

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('agrolnk_order_updated', handleUpdate);
    window.addEventListener('agrolnk_escrow_updated', handleUpdate);

    return () => {
      isMounted = false;
      hideGlobalLoader();
      window.removeEventListener('agrolnk_order_updated', handleUpdate);
      window.removeEventListener('agrolnk_escrow_updated', handleUpdate);
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

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              Escrow & 0.50% Commission Ledger
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Audited transaction fee breakdown (0.25% Buyer + 0.25% Seller) and live escrow vault balances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              icon={Zap}
              iconPosition="left"
              onClick={() => setIsEscrowModalOpen(true)}
              className="text-xs font-bold cursor-pointer bg-[#0B3326] text-white hover:bg-[#0A261D] w-full sm:w-auto justify-center py-2.5 px-4"
            >
              ⚡ Live Escrow Gateway & API
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              iconPosition="left"
              onClick={handleExportCSV}
              className="text-xs font-bold cursor-pointer w-full sm:w-auto justify-center py-2.5 px-4"
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

        {/* Section: Pending Admin Call Verification & Escrow Clearance Queue */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#FEF3C7]/90 via-[#F2FBF6] to-white border border-[#FDE68A] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-[#92400E]">
              <PhoneCall className="w-5 h-5" />
              <div>
                <h3 className="text-base font-bold font-heading text-[#92400E]">
                  Admin Supervised Escrow: Buyer Call & Payout Clearance Desk
                </h3>
                <p className="text-xs text-[#566861] mt-0.5">
                  Call buyer post-delivery to confirm produce satisfaction, then 1-click release funds to farmer bank account with instant UTR.
                </p>
              </div>
            </div>
            <Badge variant="amber" size="md">
              Supervised Tripartite Model
            </Badge>
          </div>

          {/* Quick Cards of Pending / Active Escrow Consignments */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ledgerItems.filter(i => i.escrowState === 'locked' || i.status === 'delivered').slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981] transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0B3326]">{item.orderNumber}</span>
                  <Badge variant={item.status === 'delivered' ? 'amber' : 'blue'} size="sm">
                    {item.status === 'delivered' ? 'Arrived (Call Buyer)' : 'Locked in Escrow'}
                  </Badge>
                </div>

                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-[#14211D]">{item.commodity} ({item.quantity} {item.unit})</div>
                  <div className="text-[#566861]">Buyer: <strong>{item.buyerName}</strong></div>
                  <div className="text-[#566861]">Producer: <strong>{item.farmerName}</strong></div>
                </div>

                <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#10B981]">
                    {formatINR(item.netSellerReceivable)}
                  </span>
                  <Button
                    variant="accent"
                    size="sm"
                    icon={PhoneCall}
                    iconPosition="left"
                    onClick={() => setOrderForVerification(item)}
                    className="text-xs font-bold py-1.5 px-3 cursor-pointer"
                  >
                    Call & Release
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {['all', 'locked', 'released'].map((st) => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search order #, commodity, buyer..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs text-[#14211D] focus:ring-2 focus:ring-[#10B981] focus:outline-none"
            />
          </div>
        </div>

        {/* Full Ledger Table */}
        <div className="space-y-6">
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
                    <th className="py-3.5 px-4 text-center">Admin Verification & Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EDE8]">
                  {paginatedItems.map((item) => (
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
                          <span className="capitalize">{item.escrowState === 'released' ? 'Settled (Released)' : 'Locked in Escrow'}</span>
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.escrowState === 'released' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed
                            </span>
                            {item.bankUtr && (
                              <span className="font-mono text-[10px] text-[#566861] block">
                                UTR: {item.bankUtr}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Button
                            variant="accent"
                            size="sm"
                            icon={PhoneCall}
                            iconPosition="left"
                            onClick={() => setOrderForVerification(item)}
                            className="text-xs font-bold py-1.5 px-3 cursor-pointer"
                          >
                            Call Buyer & Release
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredItems.length}
            pageSize={pageSize}
          />
        </div>

        {/* Admin Call Verification & Escrow Release Modal */}
        <AdminCallVerificationModal
          isOpen={!!orderForVerification}
          onClose={() => setOrderForVerification(null)}
          order={orderForVerification}
          adminUser={user}
          onSuccess={() => {
            loadData();
          }}
        />

        {/* Demo Live Escrow Gateway API & Simulator Modal */}
        <DemoEscrowLiveModal
          isOpen={isEscrowModalOpen}
          onClose={() => setIsEscrowModalOpen(false)}
        />

      </div>
    </DashboardLayout>
  );
}
