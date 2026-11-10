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
  FileSpreadsheet,
  Truck,
  Warehouse,
  ChevronDown
} from 'lucide-react';
import { getOrders, verifyAndLockEscrowDeposit } from '../../utils/orders';
import { getDeliveries, verifyFreightBankDeposit, adminReleaseFreightEscrow } from '../../utils/deliveries';
import { getWarehouseReceipts } from '../../utils/warehouses';
import { getFinancingRequests } from '../../utils/financing';
import { calculateOrderFinancials, calculateFreightFinancials, calculateWarehouseRentFinancials, calculateFinancingFinancials, formatINR } from '../../utils/commission';
import AdminCallVerificationModal from '../../components/admin/AdminCallVerificationModal';
import Pagination from '../../components/ui/Pagination';
import { Zap, PhoneCall, Phone, UserCheck, ShieldAlert, X } from 'lucide-react';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function EscrowCommissionLedger({ currentUser, onNavigate }) {
  const user = currentUser || {};

  const [activeLedgerTab, setActiveLedgerTab] = useState('orders'); // 'orders' | 'freight' | 'warehouse' | 'financing'
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [warehouseReceipts, setWarehouseReceipts] = useState([]);
  const [financingRequests, setFinancingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending_verification' | 'locked' | 'released'
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [orderForVerification, setOrderForVerification] = useState(null);
  const [confirmingDepositOrder, setConfirmingDepositOrder] = useState(null);
  const [confirmingFreightDelivery, setConfirmingFreightDelivery] = useState(null);
  const [releasingFreightDelivery, setReleasingFreightDelivery] = useState(null);
  const [isVerifyingDeposit, setIsVerifyingDeposit] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const loadData = () => {
    Promise.all([getOrders(), getDeliveries(), getWarehouseReceipts(), getFinancingRequests()]).then(([orderList, deliveryList, receiptList, financingList]) => {
      setOrders(orderList || []);
      setDeliveries(deliveryList || []);
      setWarehouseReceipts(receiptList || []);
      setFinancingRequests(financingList || []);
    });
  };

  useEffect(() => {
    let isMounted = true;
    showGlobalLoader('Auditing Escrow & Take-Rate Ledgers...', 'Fetching live escrow vaults and trade commissions...');
    Promise.all([getOrders(), getDeliveries(), getWarehouseReceipts(), getFinancingRequests()])
      .then(([orderList, deliveryList, receiptList, financingList]) => {
        if (isMounted) {
          setOrders(orderList || []);
          setDeliveries(deliveryList || []);
          setWarehouseReceipts(receiptList || []);
          setFinancingRequests(financingList || []);
        }
      })
      .finally(() => {
        hideGlobalLoader();
      });

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('agrolnk_orders_updated', handleUpdate);
    window.addEventListener('agrolnk_order_updated', handleUpdate);
    window.addEventListener('agrolnk_escrow_updated', handleUpdate);
    window.addEventListener('agrolnk_deliveries_updated', handleUpdate);
    window.addEventListener('agrolnk_warehouse_receipt_stored', handleUpdate);
    window.addEventListener('agrolnk_financing_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMounted = false;
      hideGlobalLoader();
      window.removeEventListener('agrolnk_orders_updated', handleUpdate);
      window.removeEventListener('agrolnk_order_updated', handleUpdate);
      window.removeEventListener('agrolnk_escrow_updated', handleUpdate);
      window.removeEventListener('agrolnk_deliveries_updated', handleUpdate);
      window.removeEventListener('agrolnk_warehouse_receipt_stored', handleUpdate);
      window.removeEventListener('agrolnk_financing_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];
  const safeReceipts = Array.isArray(warehouseReceipts) ? warehouseReceipts : [];
  const safeFinancing = Array.isArray(financingRequests) ? financingRequests : [];

  // Trade Financing Records (Direct LSP Sourcing Fee Model - 0.25% fee)
  const financingItems = safeFinancing.map((req) => {
    const loanVal = Number(req.offeredAmount || req.approvedAmount || req.requestedAmount || 50000);
    const fin = calculateFinancingFinancials(loanVal);
    const isDisbursed = req.status === 'disbursed' || req.status === 'repaid';
    return {
      ...req,
      ...fin,
      financingState: isDisbursed ? 'disbursed' : (req.status === 'rejected' ? 'rejected' : 'pending'),
    };
  });

  // Warehouse Rent Storage Records (Direct Commission Model - 0.25% fee)
  const warehouseItems = safeReceipts
    .filter((r) => r.storageFeeMonthly || r.quotedMonthlyRent || r.initialPaymentAmount)
    .map((rcpt) => {
      const rentVal = Number(rcpt.storageFeeMonthly || rcpt.quotedMonthlyRent || 350);
      const fin = calculateWarehouseRentFinancials(rentVal);
      const isPaid = rcpt.initialPaymentStatus === 'paid' || !!rcpt.lastRentPaidAt;
      return {
        ...rcpt,
        ...fin,
        warehousePaymentState: isPaid ? 'settled' : 'pending',
      };
    });

  // Freight Escrow Items
  const freightItems = safeDeliveries
    .filter((d) => d.freightAmount && Number(d.freightAmount) > 0)
    .map((dlv) => {
      const fin = calculateFreightFinancials(dlv.freightAmount);
      const isSettled = dlv.status === 'completed' || dlv.freightEscrowStatus === 'released';
      const isPendingVerification = dlv.freightEscrowStatus === 'pending_bank_check';
      return {
        ...dlv,
        ...fin,
        freightState: isPendingVerification ? 'pending_verification' : (isSettled ? 'released' : (dlv.freightEscrowStatus === 'escrow_locked' ? 'locked' : 'unfunded')),
      };
    });

  const ledgerItems = safeOrders.map((ord) => {
    const fin = calculateOrderFinancials(ord.totalAmount);
    const isSettled = ord.status === 'completed';
    const isPendingVerification = 
      ord.escrowStatus === 'pending' || 
      ord.escrowStatus === 'pending_verification' || 
      ord.status === 'pending' || 
      ord.status === 'payment_verification_pending';

    return {
      ...ord,
      ...fin,
      escrowState: isPendingVerification ? 'pending_verification' : (isSettled ? 'released' : 'locked'),
    };
  });

  const activeItems =
    activeLedgerTab === 'orders'
      ? ledgerItems
      : activeLedgerTab === 'freight'
      ? freightItems
      : activeLedgerTab === 'warehouse'
      ? warehouseItems
      : financingItems;

  const filteredItems = activeItems.filter((item) => {
    if (activeLedgerTab === 'financing') {
      const query = searchQuery.toLowerCase();
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'released' && item.financingState === 'disbursed') ||
        (statusFilter === 'pending_verification' && item.financingState === 'pending');

      return (
        matchesStatus &&
        ((item.requestNumber || '').toLowerCase().includes(query) ||
          (item.applicantName || '').toLowerCase().includes(query) ||
          (item.financierName || '').toLowerCase().includes(query) ||
          (item.commodity || '').toLowerCase().includes(query) ||
          (item.orderNumber || '').toLowerCase().includes(query))
      );
    }

    if (activeLedgerTab === 'warehouse') {
      const query = searchQuery.toLowerCase();
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'released' && item.warehousePaymentState === 'settled') ||
        (statusFilter === 'pending_verification' && item.warehousePaymentState === 'pending');

      return (
        matchesStatus &&
        ((item.receiptNumber || '').toLowerCase().includes(query) ||
          (item.warehouseName || '').toLowerCase().includes(query) ||
          (item.commodity || '').toLowerCase().includes(query) ||
          (item.farmerName || '').toLowerCase().includes(query))
      );
    }

    const stateKey = activeLedgerTab === 'orders' ? item.escrowState : item.freightState;
    const matchesStatus = statusFilter === 'all' || stateKey === statusFilter;

    const query = searchQuery.toLowerCase();
    if (activeLedgerTab === 'orders') {
      return (
        matchesStatus &&
        (item.orderNumber.toLowerCase().includes(query) ||
          item.commodity.toLowerCase().includes(query) ||
          item.farmerName.toLowerCase().includes(query) ||
          item.buyerName.toLowerCase().includes(query))
      );
    } else {
      return (
        matchesStatus &&
        ((item.deliveryNumber || '').toLowerCase().includes(query) ||
          (item.transporterName || '').toLowerCase().includes(query) ||
          (item.commodity || '').toLowerCase().includes(query) ||
          (item.farmerName || '').toLowerCase().includes(query) ||
          (item.orderNumber || '').toLowerCase().includes(query))
      );
    }
  });

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Totals across all 4 Ecosystem Pillars
  const totalTradeGMV = ledgerItems.reduce((sum, item) => sum + item.tradeValue, 0);
  const totalFreightGMV = freightItems.reduce((sum, item) => sum + (item.baseFare || 0), 0);
  const totalWarehouseGMV = warehouseItems.reduce((sum, item) => sum + (item.baseRent || 0), 0);
  const totalFinancingGMV = financingItems.reduce((sum, item) => sum + (item.principal || 0), 0);
  const totalEcosystemGMV = totalTradeGMV + totalFreightGMV + totalWarehouseGMV + totalFinancingGMV;

  const totalAgroLnkTradeRevenue = ledgerItems.reduce((sum, item) => sum + item.totalPlatformCommission, 0);
  const totalAgroLnkFreightRevenue = freightItems.reduce((sum, item) => sum + (item.totalAgroLnkFreightRevenue || 0), 0);
  const totalAgroLnkWarehouseRevenue = warehouseItems.reduce((sum, item) => sum + (item.totalAgroLnkWarehouseRevenue || 0), 0);
  const totalAgroLnkFinancingRevenue = financingItems.reduce((sum, item) => sum + (item.totalAgroLnkFinancingRevenue || 0), 0);
  const totalAgroLnkRevenue = totalAgroLnkTradeRevenue + totalAgroLnkFreightRevenue + totalAgroLnkWarehouseRevenue + totalAgroLnkFinancingRevenue;

  const totalEscrowLocked =
    ledgerItems.filter((item) => item.escrowState === 'locked').reduce((sum, item) => sum + item.totalBuyerPayable, 0) +
    freightItems.filter((item) => item.freightState === 'locked').reduce((sum, item) => sum + item.totalFreightDeposit, 0);

  const totalSettledToSellers = ledgerItems
    .filter((item) => item.escrowState === 'released')
    .reduce((sum, item) => sum + item.netSellerReceivable, 0) +
    freightItems
      .filter((item) => item.freightState === 'released')
      .reduce((sum, item) => sum + (item.netTransporterPayout || 0), 0) +
    warehouseItems
      .filter((item) => item.warehousePaymentState === 'settled')
      .reduce((sum, item) => sum + (item.netWarehousePayout || 0), 0);

  const handleExportCSV = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-5 sm:space-y-8 text-left pb-24 sm:pb-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('admin-dashboard')}
              title="Return to Dashboard"
              aria-label="Back to Operations Dashboard"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs hover:bg-[#F8FAF8] text-[#0B3326] flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-5 h-5 text-[#0B3326]" />
            </button>
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0B3326] font-heading tracking-tight">
                Escrow & 0.50% Commission Ledger
              </h1>
              <p className="text-xs sm:text-sm text-[#566861] hidden sm:block">
                Audited transaction fee breakdown (0.25% Buyer + 0.25% Seller) and live escrow vault balances.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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

        {/* 4 Multi-Pillar Revenue Summary Cards (2x2 grid on mobile for instant glance) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Total Ecosystem Gross Volume */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-1 sm:mb-2">
              <span className="font-medium text-[11px] sm:text-xs truncate">Total Ecosystem GMV</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-[#EBF5F0] text-[#10B981] shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-[#0B3326] truncate">
              {formatINR(totalEcosystemGMV)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861] mt-0.5 sm:mt-1 truncate">
              Trades, Freight, Storage &amp; Credit
            </div>
          </div>

          {/* Total Platform Revenue */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-1 sm:mb-2">
              <span className="font-medium text-[11px] sm:text-xs truncate">Platform Revenue</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-[#EBF5F0] text-[#10B981] shrink-0">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-[#10B981] truncate">
              {formatINR(totalAgroLnkRevenue)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861] mt-0.5 sm:mt-1 truncate">
              Produce, Transport &amp; Storage
            </div>
          </div>

          {/* Active Escrow Locked */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-1 sm:mb-2">
              <span className="font-medium text-[11px] sm:text-xs truncate">Active Escrow Locked</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-blue-700 truncate">
              {formatINR(totalEscrowLocked)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861] mt-0.5 sm:mt-1 truncate">
              Produce &amp; Freight Escrow
            </div>
          </div>

          {/* Net Partner Settlements */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-emerald-400 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#566861] mb-1 sm:mb-2">
              <span className="font-medium text-[11px] sm:text-xs truncate">Net Disbursed</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-emerald-700 truncate">
              {formatINR(totalSettledToSellers)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861] mt-0.5 sm:mt-1 truncate">
              Sellers &amp; Carriers
            </div>
          </div>

        </div>

        {/* Section: Pending Admin Call Verification & Escrow Clearance Queue */}
        <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-[#FEF3C7]/90 via-[#F2FBF6] to-white border border-[#FDE68A] shadow-sm space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-start sm:items-center gap-2.5 text-[#92400E]">
              <PhoneCall className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <h3 className="text-sm sm:text-base font-bold font-heading text-[#92400E]">
                  Admin Supervised Escrow: Buyer Call &amp; Payout Clearance Desk
                </h3>
                <p className="hidden sm:block text-xs text-[#566861] mt-0.5">
                  Call buyer post-delivery to confirm produce satisfaction, then 1-click release funds to farmer bank account with instant UTR.
                </p>
              </div>
            </div>
            <div className="self-start sm:self-center shrink-0">
              <Badge variant="amber" size="sm">
                <span className="sm:hidden">Supervised</span>
                <span className="hidden sm:inline">Supervised Tripartite Model</span>
              </Badge>
            </div>
          </div>

          {/* Quick Cards of Pending / Active Escrow Consignments */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

        {/* Vault Switcher: Produce Trades vs. Logistics Freight vs. Warehouse Storage (2x2 grid on mobile, horizontal tabs on desktop) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-4 border-b border-[#E5EDE8] pb-2 sm:pb-1 gap-2">
          <button
            onClick={() => {
              setActiveLedgerTab('orders');
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`p-2.5 sm:p-0 sm:pb-3 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all cursor-pointer rounded-xl sm:rounded-none sm:border-b-2 ${
              activeLedgerTab === 'orders'
                ? 'bg-[#0B3326] text-white sm:bg-transparent sm:text-[#0B3326] sm:border-[#0B3326] shadow-xs sm:shadow-none'
                : 'bg-white text-[#566861] hover:text-[#0B3326] border border-[#E5EDE8] sm:border-transparent sm:bg-transparent'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Produce ({ledgerItems.length})</span>
              <span className="hidden sm:inline">Produce Trade Vault ({ledgerItems.length})</span>
            </span>
          </button>

          <button
            onClick={() => {
              setActiveLedgerTab('freight');
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`p-2.5 sm:p-0 sm:pb-3 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all cursor-pointer rounded-xl sm:rounded-none sm:border-b-2 ${
              activeLedgerTab === 'freight'
                ? 'bg-[#0B3326] text-white sm:bg-transparent sm:text-[#0B3326] sm:border-[#0B3326] shadow-xs sm:shadow-none'
                : 'bg-white text-[#566861] hover:text-[#0B3326] border border-[#E5EDE8] sm:border-transparent sm:bg-transparent'
            }`}
          >
            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Freight ({freightItems.length})</span>
              <span className="hidden sm:inline">Logistics &amp; Freight ({freightItems.length})</span>
            </span>
            {freightItems.filter((f) => f.freightState === 'pending_verification').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {freightItems.filter((f) => f.freightState === 'pending_verification').length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveLedgerTab('warehouse');
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`p-2.5 sm:p-0 sm:pb-3 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all cursor-pointer rounded-xl sm:rounded-none sm:border-b-2 ${
              activeLedgerTab === 'warehouse'
                ? 'bg-[#0B3326] text-white sm:bg-transparent sm:text-[#0B3326] sm:border-[#0B3326] shadow-xs sm:shadow-none'
                : 'bg-white text-[#566861] hover:text-[#0B3326] border border-[#E5EDE8] sm:border-transparent sm:bg-transparent'
            }`}
          >
            <Warehouse className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Warehouse ({warehouseItems.length})</span>
              <span className="hidden sm:inline">Warehouse Storage ({warehouseItems.length})</span>
            </span>
          </button>

          <button
            onClick={() => {
              setActiveLedgerTab('financing');
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`p-2.5 sm:p-0 sm:pb-3 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all cursor-pointer rounded-xl sm:rounded-none sm:border-b-2 ${
              activeLedgerTab === 'financing'
                ? 'bg-[#0B3326] text-white sm:bg-transparent sm:text-[#0B3326] sm:border-[#0B3326] shadow-xs sm:shadow-none'
                : 'bg-white text-[#566861] hover:text-[#0B3326] border border-[#E5EDE8] sm:border-transparent sm:bg-transparent'
            }`}
          >
            <Landmark className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Credit ({financingItems.length})</span>
              <span className="hidden sm:inline">Trade Financing ({financingItems.length})</span>
            </span>
          </button>
        </div>

        {/* Filter Controls Bar: Desktop Pills + Right Search vs. Mobile Side-by-Side Search + Right Dropdown */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          
          {/* Desktop Filter Pills (Hidden on mobile) */}
          <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { id: 'all', label: 'All Transactions' },
              ...(activeLedgerTab === 'orders' || activeLedgerTab === 'freight'
                ? [
                    {
                      id: 'pending_verification',
                      label: `Pending Bank UTR (${
                        activeLedgerTab === 'orders'
                          ? ledgerItems.filter((i) => i.escrowState === 'pending_verification').length
                          : freightItems.filter((i) => i.freightState === 'pending_verification').length
                      })`,
                      highlight: true,
                    },
                    { id: 'locked', label: 'Locked Escrow' },
                  ]
                : []),
              {
                id: 'released',
                label:
                  activeLedgerTab === 'warehouse'
                    ? 'Settled Online'
                    : activeLedgerTab === 'financing'
                    ? 'Disbursed Directly'
                    : 'Settled (Released)',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : tab.highlight && ledgerItems.filter(i => i.escrowState === 'pending_verification').length > 0
                    ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                    : 'bg-white text-[#566861] hover:bg-[#F2FBF6] border border-[#E5EDE8]'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile Single Row: Search Bar (Left) + Right-Side Status Filter Dropdown */}
          <div className="flex sm:hidden items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search order #, commodity..."
                className="w-full pl-8 pr-2.5 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs text-[#14211D] focus:ring-2 focus:ring-[#10B981] focus:outline-none placeholder:text-[#8D9B95]"
              />
            </div>

            <div className="relative shrink-0 max-w-[155px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full appearance-none pl-2.5 pr-7 py-2 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-[#10B981] focus:outline-none cursor-pointer truncate shadow-2xs ${
                  statusFilter !== 'all'
                    ? 'bg-[#0B3326] text-white border-[#0B3326]'
                    : 'bg-white text-[#0B3326] border-[#E5EDE8]'
                }`}
              >
                {[
                  { id: 'all', label: 'All Status' },
                  ...(activeLedgerTab === 'orders' || activeLedgerTab === 'freight'
                    ? [
                        {
                          id: 'pending_verification',
                          label: `Pending UTR (${
                            activeLedgerTab === 'orders'
                              ? ledgerItems.filter((i) => i.escrowState === 'pending_verification').length
                              : freightItems.filter((i) => i.freightState === 'pending_verification').length
                          })`,
                        },
                        { id: 'locked', label: 'Locked Escrow' },
                      ]
                    : []),
                  {
                    id: 'released',
                    label:
                      activeLedgerTab === 'warehouse'
                        ? 'Settled'
                        : activeLedgerTab === 'financing'
                        ? 'Disbursed'
                        : 'Settled',
                  },
                ].map((opt) => (
                  <option key={opt.id} value={opt.id} className="text-[#14211D] bg-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${statusFilter !== 'all' ? 'text-white' : 'text-[#566861]'}`} />
            </div>
          </div>

          {/* Desktop Search Bar (Hidden on mobile) */}
          <div className="hidden sm:block relative w-72">
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
            {paginatedItems.length === 0 ? (
              <div className="py-12 text-center text-[#566861] space-y-2">
                <ShieldCheck className="w-8 h-8 text-[#10B981] mx-auto opacity-50" />
                <p className="font-semibold text-sm text-[#0B3326]">No Transactions Found</p>
                <p className="text-xs">No records match the selected vault and filter criteria.</p>
              </div>
            ) : (
              <>
                {/* Desktop Full Data Tables (Hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto">
                  {activeLedgerTab === 'orders' ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8FAF8] border-b border-[#E5EDE8] text-[#566861] uppercase tracking-wider font-semibold text-[10px]">
                          <th className="py-3.5 px-4">Order ID &amp; Commodity</th>
                          <th className="py-3.5 px-4">Gross Trade Value</th>
                          <th className="py-3.5 px-4 text-[#1E40AF]">Buyer Paid (+0.25%)</th>
                          <th className="py-3.5 px-4 text-[#10B981]">Seller Received (-0.25%)</th>
                          <th className="py-3.5 px-4 text-[#0B3326]">AgroLnk Fee (0.50%)</th>
                          <th className="py-3.5 px-4">Escrow Status</th>
                          <th className="py-3.5 px-4 text-center">Admin Verification &amp; Payout</th>
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
                              {item.escrowState === 'pending_verification' ? (
                                <div className="space-y-1">
                                  <Badge variant="amber" size="sm" dot={true}>
                                    Bank UTR Pending
                                  </Badge>
                                  {item.bankUtr && (
                                    <span className="font-mono text-[10px] text-amber-950 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block truncate max-w-[140px]">
                                      UTR: {item.bankUtr}
                                    </span>
                                  )}
                                </div>
                              ) : item.escrowState === 'released' ? (
                                <Badge variant="emerald" size="sm">
                                  Settled (Released)
                                </Badge>
                              ) : (
                                <Badge variant="teal" size="sm" dot={true}>
                                  Locked in Escrow
                                </Badge>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {item.escrowState === 'pending_verification' ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={ShieldCheck}
                                  iconPosition="left"
                                  onClick={() => setConfirmingDepositOrder(item)}
                                  className="text-xs font-bold py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
                                >
                                  Verify Deposit
                                </Button>
                              ) : item.escrowState === 'released' ? (
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
                                  Call Buyer &amp; Release
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : activeLedgerTab === 'freight' ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8FAF8] border-b border-[#E5EDE8] text-[#566861] uppercase tracking-wider font-semibold text-[10px]">
                          <th className="py-3.5 px-4">Delivery # &amp; Order</th>
                          <th className="py-3.5 px-4">Transporter Carrier</th>
                          <th className="py-3.5 px-4">Base Freight Quote</th>
                          <th className="py-3.5 px-4 text-[#1E40AF]">Consignor Deposited (+0.25%)</th>
                          <th className="py-3.5 px-4 text-[#10B981]">Transporter Payout (-0.25%)</th>
                          <th className="py-3.5 px-4 text-[#0B3326]">AgroLnk Fee (0.50%)</th>
                          <th className="py-3.5 px-4">Freight Escrow Status</th>
                          <th className="py-3.5 px-4 text-center">Admin Verification &amp; Release</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EDE8]">
                        {paginatedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#F8FAF8]/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#0B3326] block">{item.deliveryNumber}</span>
                              <span className="text-[11px] text-[#566861]">
                                Order: {item.orderNumber} • {item.commodity}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#14211D] block">{item.transporterName || 'Unassigned'}</span>
                              <span className="text-[11px] text-[#566861]">
                                {item.vehicleType || 'Commercial'} {item.vehicleNumber ? `• ${item.vehicleNumber}` : ''}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-[#14211D]">
                              {formatINR(item.baseFare)}
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-[#1E40AF]">
                              {formatINR(item.totalFreightDeposit)}
                              <span className="block text-[10px] text-[#566861]">
                                Fee: +{formatINR(item.consignorFee)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-[#10B981]">
                              {formatINR(item.netTransporterPayout)}
                              <span className="block text-[10px] text-[#566861]">
                                Fee: -{formatINR(item.transporterFee)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-extrabold text-[#0B3326]">
                              {formatINR(item.totalAgroLnkFreightRevenue)}
                            </td>

                            <td className="py-3.5 px-4">
                              {item.freightState === 'pending_verification' ? (
                                <div className="space-y-1">
                                  <Badge variant="amber" size="sm" dot={true}>
                                    Bank UTR Pending
                                  </Badge>
                                  {item.freightBankUtr && (
                                    <span className="font-mono text-[10px] text-amber-950 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block truncate max-w-[140px]">
                                      UTR: {item.freightBankUtr}
                                    </span>
                                  )}
                                </div>
                              ) : item.freightState === 'released' ? (
                                <Badge variant="emerald" size="sm">
                                  Disbursed to Carrier
                                </Badge>
                              ) : item.freightState === 'locked' ? (
                                <Badge variant="teal" size="sm" dot={true}>
                                  Locked in Escrow
                                </Badge>
                              ) : (
                                <Badge variant="gray" size="sm">
                                  Unfunded
                                </Badge>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {item.freightState === 'pending_verification' ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={ShieldCheck}
                                  iconPosition="left"
                                  onClick={() => setConfirmingFreightDelivery(item)}
                                  className="text-xs font-bold py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
                                >
                                  Verify Freight
                                </Button>
                              ) : item.freightState === 'released' ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed
                                  </span>
                                  {item.freightDisbursalUtr && (
                                    <span className="font-mono text-[10px] text-[#566861] block">
                                      Ref: {item.freightDisbursalUtr}
                                    </span>
                                  )}
                                </div>
                              ) : item.freightState === 'locked' ? (
                                <Button
                                  variant="accent"
                                  size="sm"
                                  icon={CheckCircle2}
                                  iconPosition="left"
                                  onClick={() => setReleasingFreightDelivery(item)}
                                  className="text-xs font-bold py-1.5 px-3 cursor-pointer"
                                >
                                  Release Fare
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-xs italic">Awaiting Consignor</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : activeLedgerTab === 'warehouse' ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8FAF8] border-b border-[#E5EDE8] text-[#566861] uppercase tracking-wider font-semibold text-[10px]">
                          <th className="py-3.5 px-4">Receipt # &amp; Commodity</th>
                          <th className="py-3.5 px-4">Warehouse Facility</th>
                          <th className="py-3.5 px-4">Monthly Storage Rent</th>
                          <th className="py-3.5 px-4 text-[#1E40AF]">Depositor Paid (+0.25%)</th>
                          <th className="py-3.5 px-4 text-[#10B981]">Warehouse Settled (-0.25%)</th>
                          <th className="py-3.5 px-4 text-[#0B3326]">AgroLnk Fee (0.50%)</th>
                          <th className="py-3.5 px-4">Settlement Status</th>
                          <th className="py-3.5 px-4 text-center">Settlement Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EDE8]">
                        {paginatedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#F8FAF8]/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#0B3326] block">{item.receiptNumber}</span>
                              <span className="text-[11px] text-[#566861]">
                                {item.commodity} ({item.totalQuantity} {item.unit}) • {item.farmerName}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#14211D] block">{item.warehouseName || 'Accredited Warehouse'}</span>
                              <span className="text-[11px] text-[#566861]">
                                Chamber: {item.chamber || 'Standard Cold Store'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-[#14211D]">
                              {formatINR(item.baseRent)}
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-[#1E40AF]">
                              {formatINR(item.totalRentDeposit)}
                              <span className="block text-[10px] text-[#566861]">
                                Fee: +{formatINR(item.depositorFee)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-[#10B981]">
                              {formatINR(item.netWarehousePayout)}
                              <span className="block text-[10px] text-[#566861]">
                                Fee: -{formatINR(item.warehouseFee)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-extrabold text-[#0B3326]">
                              {formatINR(item.totalAgroLnkWarehouseRevenue)}
                            </td>

                            <td className="py-3.5 px-4">
                              {item.warehousePaymentState === 'settled' ? (
                                <Badge variant="emerald" size="sm">
                                  Direct Settled
                                </Badge>
                              ) : (
                                <Badge variant="gray" size="sm">
                                  Pending Due
                                </Badge>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Razorpay Direct
                                </span>
                                <span className="text-[10px] text-[#566861] block">
                                  No Escrow Hold
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* activeLedgerTab === 'financing' */
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8FAF8] border-b border-[#E5EDE8] text-[#566861] uppercase tracking-wider font-semibold text-[10px]">
                          <th className="py-3.5 px-4">Credit Request # &amp; Commodity</th>
                          <th className="py-3.5 px-4">Borrower &amp; Financier</th>
                          <th className="py-3.5 px-4">Sanctioned Principal</th>
                          <th className="py-3.5 px-4 text-[#1E40AF]">AgroLnk 0.25% Sourcing Fee</th>
                          <th className="py-3.5 px-4 text-[#10B981]">Net Disbursed to Borrower</th>
                          <th className="py-3.5 px-4">Disbursal Status</th>
                          <th className="py-3.5 px-4 text-center">LSP Regulatory Model</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EDE8]">
                        {paginatedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#F8FAF8]/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#0B3326] block">{item.requestNumber}</span>
                              <span className="text-[11px] text-[#566861]">
                                {item.commodity} • {item.purposeLabel || 'Trade Credit'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#14211D] block">{item.applicantName}</span>
                              <span className="text-[11px] text-purple-700 font-semibold block">
                                NBFC: {item.financierName || 'Institutional Partner'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-[#14211D]">
                              {formatINR(item.principal)}
                            </td>

                            <td className="py-3.5 px-4 font-extrabold text-[#0B3326]">
                              {formatINR(item.originationFee)}
                              <span className="block text-[10px] text-[#566861]">
                                0.25% Technology Fee
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-[#10B981]">
                              {formatINR(item.netDisbursedToBorrower)}
                            </td>

                            <td className="py-3.5 px-4">
                              {item.financingState === 'disbursed' ? (
                                <div className="space-y-0.5">
                                  <Badge variant="emerald" size="sm">
                                    Disbursed Direct
                                  </Badge>
                                  {item.bankUtr && (
                                    <span className="font-mono text-[10px] text-[#566861] block truncate max-w-[130px]">
                                      UTR: {item.bankUtr}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="amber" size="sm">
                                  {item.status === 'borrower_accepted' ? 'Ready for NBFC Disbursal' : 'Under Evaluation'}
                                </Badge>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> RBI LSP Direct
                                </span>
                                <span className="text-[10px] text-[#566861] block">
                                  Direct RE Account
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Mobile Responsive Cards (Visible only on mobile, Zero horizontal scrolling) */}
                <div className="block md:hidden p-3.5 space-y-3 bg-[#F8FAF8]">
                  {activeLedgerTab === 'orders' ? (
                    paginatedItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-xs text-[#0B3326] block">{item.orderNumber}</span>
                            <span className="text-[11px] text-[#566861]">
                              {item.commodity} • {item.quantity} {item.unit}
                            </span>
                          </div>
                          <div>
                            {item.escrowState === 'pending_verification' ? (
                              <Badge variant="amber" size="sm" dot={true}>
                                UTR Pending
                              </Badge>
                            ) : item.escrowState === 'released' ? (
                              <Badge variant="emerald" size="sm">
                                Settled
                              </Badge>
                            ) : (
                              <Badge variant="teal" size="sm" dot={true}>
                                Locked
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E5EDE8]/60">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#566861] block">Buyer</span>
                            <span className="font-semibold text-[#14211D] truncate block">{item.buyerName || 'Buyer'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#566861] block">Producer (Seller)</span>
                            <span className="font-semibold text-[#14211D] truncate block">{item.farmerName || 'Farmer'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Gross Trade</span>
                            <span className="font-bold text-[#14211D] text-xs">{formatINR(item.tradeValue)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">AgroLnk Fee (0.5%)</span>
                            <span className="font-bold text-[#0B3326] text-xs">{formatINR(item.totalPlatformCommission)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Buyer Paid (+0.25%)</span>
                            <span className="font-bold text-[#1E40AF] text-xs">{formatINR(item.totalBuyerPayable)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Seller Receives</span>
                            <span className="font-bold text-[#10B981] text-xs">{formatINR(item.netSellerReceivable)}</span>
                          </div>
                        </div>

                        {item.bankUtr && (
                          <div className="text-[10px] font-mono text-[#566861] bg-[#F2FBF6] px-2.5 py-1 rounded-lg border border-[#E5EDE8] truncate">
                            Bank UTR: {item.bankUtr}
                          </div>
                        )}

                        <div className="pt-0.5">
                          {item.escrowState === 'pending_verification' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={ShieldCheck}
                              iconPosition="left"
                              onClick={() => setConfirmingDepositOrder(item)}
                              className="w-full justify-center text-xs font-bold py-2 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
                            >
                              Verify Deposit &amp; Lock
                            </Button>
                          ) : item.escrowState === 'released' ? (
                            <div className="py-2 text-center text-xs font-bold text-[#10B981] flex items-center justify-center gap-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Disbursed to Farmer Bank</span>
                            </div>
                          ) : (
                            <Button
                              variant="accent"
                              size="sm"
                              icon={PhoneCall}
                              iconPosition="left"
                              onClick={() => setOrderForVerification(item)}
                              className="w-full justify-center text-xs font-bold py-2 cursor-pointer"
                            >
                              Call Buyer &amp; Release
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : activeLedgerTab === 'freight' ? (
                    paginatedItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-xs text-[#0B3326] block">{item.deliveryNumber}</span>
                            <span className="text-[11px] text-[#566861]">
                              Order: {item.orderNumber} • {item.commodity}
                            </span>
                          </div>
                          <div>
                            {item.freightState === 'pending_verification' ? (
                              <Badge variant="amber" size="sm" dot={true}>
                                UTR Pending
                              </Badge>
                            ) : item.freightState === 'released' ? (
                              <Badge variant="emerald" size="sm">
                                Disbursed
                              </Badge>
                            ) : item.freightState === 'locked' ? (
                              <Badge variant="teal" size="sm" dot={true}>
                                Locked
                              </Badge>
                            ) : (
                              <Badge variant="gray" size="sm">
                                Unfunded
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                          <span className="text-[10px] uppercase font-bold text-[#566861] block">Transporter Carrier</span>
                          <span className="font-bold text-[#14211D] block">{item.transporterName || 'Unassigned'}</span>
                          <span className="text-[11px] text-[#566861] block">
                            {item.vehicleType || 'Commercial'} {item.vehicleNumber ? `• ${item.vehicleNumber}` : ''}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Base Fare</span>
                            <span className="font-bold text-[#14211D]">{formatINR(item.baseFare)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">AgroLnk Fee</span>
                            <span className="font-bold text-[#0B3326]">{formatINR(item.totalAgroLnkFreightRevenue)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Deposited</span>
                            <span className="font-bold text-[#1E40AF]">{formatINR(item.totalFreightDeposit)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Carrier Receives</span>
                            <span className="font-bold text-[#10B981]">{formatINR(item.netTransporterPayout)}</span>
                          </div>
                        </div>

                        <div className="pt-0.5">
                          {item.freightState === 'pending_verification' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={ShieldCheck}
                              iconPosition="left"
                              onClick={() => setConfirmingFreightDelivery(item)}
                              className="w-full justify-center text-xs font-bold py-2 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
                            >
                              Verify Freight Deposit
                            </Button>
                          ) : item.freightState === 'released' ? (
                            <div className="py-2 text-center text-xs font-bold text-[#10B981] flex items-center justify-center gap-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Fare Disbursed to Carrier</span>
                            </div>
                          ) : item.freightState === 'locked' ? (
                            <Button
                              variant="accent"
                              size="sm"
                              icon={CheckCircle2}
                              iconPosition="left"
                              onClick={() => setReleasingFreightDelivery(item)}
                              className="w-full justify-center text-xs font-bold py-2 cursor-pointer"
                            >
                              Release Freight Fare
                            </Button>
                          ) : (
                            <span className="block text-center text-gray-400 text-xs italic py-1">Awaiting Consignor Deposit</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : activeLedgerTab === 'warehouse' ? (
                    paginatedItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-xs text-[#0B3326] block">{item.receiptNumber}</span>
                            <span className="text-[11px] text-[#566861]">
                              {item.commodity} ({item.totalQuantity} {item.unit}) • {item.farmerName}
                            </span>
                          </div>
                          <div>
                            {item.warehousePaymentState === 'settled' ? (
                              <Badge variant="emerald" size="sm">
                                Settled Direct
                              </Badge>
                            ) : (
                              <Badge variant="gray" size="sm">
                                Pending Due
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                          <span className="text-[10px] uppercase font-bold text-[#566861] block">Warehouse Facility</span>
                          <span className="font-bold text-[#14211D] block">{item.warehouseName || 'Accredited Warehouse'}</span>
                          <span className="text-[11px] text-[#566861] block">
                            Chamber: {item.chamber || 'Standard Cold Store'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Monthly Rent</span>
                            <span className="font-bold text-[#14211D]">{formatINR(item.baseRent)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">AgroLnk Fee</span>
                            <span className="font-bold text-[#0B3326]">{formatINR(item.totalAgroLnkWarehouseRevenue)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Depositor Paid</span>
                            <span className="font-bold text-[#1E40AF]">{formatINR(item.totalRentDeposit)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Warehouse Receives</span>
                            <span className="font-bold text-[#10B981]">{formatINR(item.netWarehousePayout)}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between text-xs">
                          <span className="text-[#566861]">Settlement Mode:</span>
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Razorpay Direct
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    /* activeLedgerTab === 'financing' */
                    paginatedItems.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-xs text-[#0B3326] block">{item.requestNumber}</span>
                            <span className="text-[11px] text-[#566861]">
                              {item.commodity} • {item.purposeLabel || 'Trade Credit'}
                            </span>
                          </div>
                          <div>
                            {item.financingState === 'disbursed' ? (
                              <Badge variant="emerald" size="sm">
                                Disbursed
                              </Badge>
                            ) : (
                              <Badge variant="amber" size="sm">
                                {item.status === 'borrower_accepted' ? 'Ready for NBFC' : 'Evaluating'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                          <span className="text-[10px] uppercase font-bold text-[#566861] block">Borrower &amp; Lender</span>
                          <span className="font-bold text-[#14211D] block">{item.applicantName}</span>
                          <span className="text-[11px] text-purple-700 font-semibold block">
                            NBFC: {item.financierName || 'Institutional Partner'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Sanctioned Principal</span>
                            <span className="font-bold text-[#14211D]">{formatINR(item.principal)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">AgroLnk 0.25% Fee</span>
                            <span className="font-bold text-[#0B3326]">{formatINR(item.originationFee)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] text-[#566861] uppercase font-semibold block">Net Disbursed to Borrower</span>
                            <span className="font-bold text-[#10B981]">{formatINR(item.netDisbursedToBorrower)}</span>
                          </div>
                        </div>

                        {item.bankUtr && (
                          <div className="text-[10px] font-mono text-[#566861] bg-[#F2FBF6] px-2.5 py-1 rounded-lg border border-[#E5EDE8] truncate">
                            Bank UTR: {item.bankUtr}
                          </div>
                        )}

                        <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between text-xs">
                          <span className="text-[#566861]">LSP Regulatory:</span>
                          <span className="font-bold text-purple-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> RBI LSP Direct
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
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

        {/* Real-World Bank Statement UTR Verification & Escrow Lock Modal */}
        {confirmingDepositOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-emerald-300 shadow-xl space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm font-bold text-[#0B3326] flex items-center gap-1.5">
                  <Landmark className="w-5 h-5 text-emerald-700" />
                  Verify Bank Statement Deposit
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmingDepositOrder(null)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Order Number:</span>
                  <span className="font-bold text-[#0B3326]">{confirmingDepositOrder.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Buyer Enterprise:</span>
                  <span className="font-semibold text-[#0B3326]">{confirmingDepositOrder.buyerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Producer / Farmer:</span>
                  <span className="font-semibold text-[#0B3326]">{confirmingDepositOrder.farmerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Claimed Bank UTR:</span>
                  <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {confirmingDepositOrder.bankUtr || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#E5EDE8]">
                  <span className="text-xs font-bold text-[#0B3326]">Amount to Confirm:</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {formatINR(confirmingDepositOrder.totalBuyerPayable)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-[11px] text-amber-900 leading-relaxed">
                ⚠️ <strong>Admin Checkpoint:</strong> Please confirm you have opened AgroLnk's corporate NetBanking portal and verified that <strong>{formatINR(confirmingDepositOrder.totalBuyerPayable)}</strong> with reference <strong>{confirmingDepositOrder.bankUtr}</strong> is credited into the bank statement. Confirming this will unlock produce dispatch for the farmer.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDepositOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isVerifyingDeposit}
                  onClick={async () => {
                    setIsVerifyingDeposit(true);
                    try {
                      await verifyAndLockEscrowDeposit(confirmingDepositOrder.id, user?.name || 'AgroLnk Admin');
                      setConfirmingDepositOrder(null);
                      loadData();
                    } catch (e) {
                      console.error('Error locking escrow deposit:', e);
                    } finally {
                      setIsVerifyingDeposit(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isVerifyingDeposit ? 'Confirming...' : 'Yes, Credit Verified — Lock Escrow'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Real-World Freight Bank Statement Check Modal */}
        {confirmingFreightDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-blue-300 shadow-xl space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm font-bold text-[#0B3326] flex items-center gap-1.5">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Verify Freight Bank Statement Deposit
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmingFreightDelivery(null)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Delivery Waybill:</span>
                  <span className="font-bold text-[#0B3326]">{confirmingFreightDelivery.deliveryNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Linked Order:</span>
                  <span className="font-semibold text-[#0B3326]">{confirmingFreightDelivery.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Carrier Assigned:</span>
                  <span className="font-semibold text-[#0B3326]">{confirmingFreightDelivery.transporterName || 'Transporter'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Claimed Bank UTR:</span>
                  <span className="font-mono font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {confirmingFreightDelivery.freightBankUtr || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#E5EDE8]">
                  <span className="text-xs font-bold text-[#0B3326]">Amount to Confirm:</span>
                  <span className="text-base font-extrabold text-blue-700">
                    {formatINR(confirmingFreightDelivery.totalFreightDeposit)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-[11px] text-amber-900 leading-relaxed">
                ⚠️ <strong>Admin Checkpoint:</strong> Verify that <strong>{formatINR(confirmingFreightDelivery.totalFreightDeposit)}</strong> with UTR <strong>{confirmingFreightDelivery.freightBankUtr}</strong> is credited into AgroLnk's corporate bank statement. Confirming this will lock the freight in escrow and authorize driver pickup.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingFreightDelivery(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isVerifyingDeposit}
                  onClick={async () => {
                    setIsVerifyingDeposit(true);
                    try {
                      await verifyFreightBankDeposit(confirmingFreightDelivery.id, user?.name || 'AgroLnk Admin');
                      setConfirmingFreightDelivery(null);
                      loadData();
                    } catch (e) {
                      console.error('Error verifying freight deposit:', e);
                    } finally {
                      setIsVerifyingDeposit(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-200" />
                  <span>{isVerifyingDeposit ? 'Confirming...' : 'Yes, Credit Verified — Lock Freight'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Release Freight to Transporter Modal */}
        {releasingFreightDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-emerald-300 shadow-xl space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm font-bold text-[#0B3326] flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  Release Freight to Transporter Bank Account
                </span>
                <button
                  type="button"
                  onClick={() => setReleasingFreightDelivery(null)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Carrier / Driver:</span>
                  <span className="font-bold text-[#0B3326]">{releasingFreightDelivery.transporterName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Vehicle:</span>
                  <span className="font-semibold text-[#0B3326]">{releasingFreightDelivery.vehicleNumber || 'Commercial'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">Gross Deposited Fare:</span>
                  <span className="font-semibold text-[#14211D]">{formatINR(releasingFreightDelivery.totalFreightDeposit)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#566861]">AgroLnk 0.50% Commission:</span>
                  <span className="font-semibold text-emerald-800">-{formatINR(releasingFreightDelivery.totalAgroLnkFreightRevenue)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#E5EDE8]">
                  <span className="text-xs font-bold text-[#0B3326]">Net Transporter Payout:</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {formatINR(releasingFreightDelivery.netTransporterPayout)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
                ✓ <strong>Delivery Confirmed:</strong> Recipient delivery OTP has been verified. Confirming will disburse net fare to the carrier's registered bank account and complete the freight contract.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReleasingFreightDelivery(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isVerifyingDeposit}
                  onClick={async () => {
                    setIsVerifyingDeposit(true);
                    try {
                      await adminReleaseFreightEscrow({
                        deliveryId: releasingFreightDelivery.id,
                        adminUser: user,
                      });
                      setReleasingFreightDelivery(null);
                      loadData();
                    } catch (e) {
                      console.error('Error releasing freight escrow:', e);
                    } finally {
                      setIsVerifyingDeposit(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isVerifyingDeposit ? 'Releasing...' : 'Confirm & Disburse Payout'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
