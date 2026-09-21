import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import AlertModal from '../../components/ui/AlertModal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import ReceiptDetailModal from '../../components/warehouse/ReceiptDetailModal';
import WarehouseSetupModal from '../../components/warehouse/WarehouseSetupModal';
import WarehouseInwardModal from '../../components/warehouse/WarehouseInwardModal';
import WarehouseBatchRow from '../../components/warehouse/WarehouseBatchRow';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import {
  Building2,
  Package,
  CheckCircle2,
  ShieldCheck,
  Award,
  Layers,
  ThermometerSnowflake,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  AlertCircle,
  Globe,
  Settings,
  Zap,
  ExternalLink,
  Search,
  Filter,
  Truck,
  RotateCcw,
  CheckCircle,
  FileSpreadsheet,
  Eye,
  Check,
  LogOut,
  X,
  RefreshCw,
  Sparkles,
  Send,
  Bell,
  Receipt,
} from 'lucide-react';
import {
  getWarehouseOperatorStats,
  getWarehouseInventory,
  getWarehouseById,
  getWarehouseReceipts,
  getWarehouseProfile,
  getWarehouseOperatorProfile,
  dispatchProduceFromWarehouse,
  calculateMonthlyRentDeadline,
  calculateStorageRentalDues,
  recordWarehouseRentPayment,
} from '../../utils/warehouses';
import { getResolvedUserKycStatus, fetchCurrentProfile, getCurrentUser } from '../../utils/auth';
import { supabase } from '../../lib/supabase';
import { sendNotification } from '../../utils/notifications';

export default function WarehouseDashboard({ currentUser, onNavigate }) {
  const user = currentUser || getCurrentUser() || {
    id: '',
    name: 'Warehouse Operator',
    email: '',
    role: 'warehouse',
  };

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'dispatched' | 'chambers' | 'requests'
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [viewMode, setViewMode] = useState('row'); // 'grid' | 'row'
  const [currentPage, setCurrentPage] = useState(1);
  const [dispatchedPage, setDispatchedPage] = useState(1);
  const pageSize = 6;
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [confirmDispatchLot, setConfirmDispatchLot] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState('');
  const [inwardModalReceipt, setInwardModalReceipt] = useState(null);
  const [inwardModalMode, setInwardModalMode] = useState('quote'); // 'quote' | 'inward'
  const [selectedLotForRentNotice, setSelectedLotForRentNotice] = useState(null);
  const [rentDueAmount, setRentDueAmount] = useState('');
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Filter States
  const [rentFilter, setRentFilter] = useState('all'); // 'all' | 'pending' | 'settled'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'available' | 'listed' | 'all'
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [chamberFilter, setChamberFilter] = useState('all');

  const loadData = async (showFlash = false) => {
    if (showFlash) {
      showGlobalLoader('Connecting to WDRA Certified Hubs...', 'Loading live telemetry, storage lots & e-NWR registries...');
    }
    try {
      const activeUser = currentUser || getCurrentUser() || user;
      const storedProfile = (await getWarehouseOperatorProfile(activeUser.id || activeUser.email)) || getWarehouseProfile(activeUser.id, activeUser.email);
      setProfile(storedProfile);

      // Auto-open setup if new warehouse user hasn't configured their facility
      if (!storedProfile || !storedProfile.setupCompleted) {
        setIsSetupModalOpen(true);
      }

      const [computedStats, inv] = await Promise.all([
        getWarehouseOperatorStats(activeUser, storedProfile),
        getWarehouseInventory(activeUser, storedProfile),
      ]);
      setStats(computedStats);
      const safeInv = Array.isArray(inv) ? inv : [];
      setInventory(safeInv);
      const pendingReqs = safeInv.filter((r) => !r.status || r.status === 'quote_requested' || r.status === 'deposit_requested' || r.status === 'pending');
      const storedCount = safeInv.filter((r) => r.status === 'stored' || r.status === 'partially_listed' || r.status === 'listed').length;
      if (pendingReqs.length > 0 && storedCount === 0) {
        setActiveTab('requests');
      }
    } catch (err) {
      console.error('Error loading warehouse data:', err);
    } finally {
      if (showFlash) {
        hideGlobalLoader();
      }
    }
  };

  useEffect(() => {
    loadData(true);

    const handleInstantUpdate = () => {
      loadData(false);
    };

    // 1. Listen to all local custom events for instant zero-latency UI sync
    window.addEventListener('agrolnk_kyc_updated', handleInstantUpdate);
    window.addEventListener('agrolnk_user_profile_updated', handleInstantUpdate);
    window.addEventListener('agrolnk_warehouse_profile_updated', handleInstantUpdate);
    window.addEventListener('agrolnk_warehouse_receipt_created', handleInstantUpdate);
    window.addEventListener('agrolnk_warehouse_quote_updated', handleInstantUpdate);
    window.addEventListener('agrolnk_warehouse_receipt_stored', handleInstantUpdate);
    window.addEventListener('agrolnk_warehouse_receipt_deleted', handleInstantUpdate);
    window.addEventListener('storage', handleInstantUpdate);

    // 2. Listen to live Supabase Realtime changes across tabs & devices
    const channel = supabase
      .channel(`wh_dashboard_realtime_${user.id || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_receipts' }, () => {
        loadData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadData(false);
      })
      .subscribe();

    return () => {
      window.removeEventListener('agrolnk_kyc_updated', handleInstantUpdate);
      window.removeEventListener('agrolnk_user_profile_updated', handleInstantUpdate);
      window.removeEventListener('agrolnk_warehouse_profile_updated', handleInstantUpdate);
      window.removeEventListener('agrolnk_warehouse_receipt_created', handleInstantUpdate);
      window.removeEventListener('agrolnk_warehouse_quote_updated', handleInstantUpdate);
      window.removeEventListener('agrolnk_warehouse_receipt_stored', handleInstantUpdate);
      window.removeEventListener('agrolnk_warehouse_receipt_deleted', handleInstantUpdate);
      window.removeEventListener('storage', handleInstantUpdate);
      supabase.removeChannel(channel);
      hideGlobalLoader();
    };
  }, [user.id, user.email]);

  // Segregate Active In-Storage vs Requests vs In-Transit vs Dispatched Lots
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const quoteRequests = safeInventory.filter((r) => !r.status || r.status === 'quote_requested' || r.status === 'deposit_requested' || r.status === 'waiting_for_quote' || r.status === 'pending' || r.status === 'requested');
  const quotedPendingFarmer = safeInventory.filter((r) => r.status === 'quote_provided' || r.status === 'quoted');
  const inTransitLots = safeInventory.filter((r) => r.status === 'in_transit' || r.status === 'transit');
  const activeLots = safeInventory.filter((r) => r.status === 'stored' || r.status === 'partially_listed' || r.status === 'listed' || r.status === 'active');
  const dispatchedLots = safeInventory.filter((r) => r.status === 'dispatched' || r.status === 'released' || r.status === 'fulfilled');
  const totalInwardPending = quoteRequests.length + inTransitLots.length;

  const totalStoredTonnes = Number((activeLots.reduce((sum, r) => sum + (Number(r.totalQuantity) || 0), 0) / 1000).toFixed(1));
  const isSetupCompleted = Boolean(profile?.setupCompleted && Number(profile?.totalCapacityTonnes) > 0);
  const totalCapacityTonnes = isSetupCompleted ? Number(profile.totalCapacityTonnes) : 0;
  const occupancyPercent = totalCapacityTonnes > 0 ? Number(((totalStoredTonnes / totalCapacityTonnes) * 100).toFixed(1)) : 0;

  // Enhance active lots with real-time rent deadlines & delay calculations
  const activeLotsWithDeadlines = activeLots.map((item) => {
    const deadline = calculateMonthlyRentDeadline(item) || {
      status: 'paid',
      label: 'Current',
      monthlyAmount: Number(item.storageFeeMonthly || item.quotedMonthlyRent || 0),
      dailyRate: Math.round(Number(item.storageFeeMonthly || item.quotedMonthlyRent || 0) / 30) || 12,
      accruedDue: 0,
      totalDue: 0,
      overduePenalty: 0,
      daysOverdue: 0,
    };
    const isPendingRent = deadline.status === 'due_soon' || deadline.status === 'overdue' || Number(deadline.totalDue) > 0;
    const isOverdue = deadline.status === 'overdue';
    return {
      ...item,
      rentDeadline: deadline,
      isPendingRent,
      isOverdue,
    };
  });

  const totalPendingDue = activeLotsWithDeadlines.reduce((sum, r) => sum + Number(r.rentDeadline?.totalDue || 0), 0);
  const pendingLotsCount = activeLotsWithDeadlines.filter((r) => r.isPendingRent).length;
  const overdueLotsCount = activeLotsWithDeadlines.filter((r) => r.isOverdue).length;
  const settledLotsCount = activeLotsWithDeadlines.filter((r) => !r.isPendingRent).length;
  const totalSettledRevenue = activeLotsWithDeadlines
    .filter((r) => !r.isPendingRent)
    .reduce((sum, r) => sum + Number(r.storageFeeMonthly || r.quotedMonthlyRent || 0), 0);

  const userKycStatus = getResolvedUserKycStatus(user);
  const isKycVerified = userKycStatus === 'verified' || profile?.verificationStatus === 'verified' || profile?.kycStatus === 'verified';
  const profileKycStatus = isKycVerified ? 'verified' : (profile?.verificationStatus || profile?.kycStatus || userKycStatus || 'pending');
  const isModificationPending = isKycVerified && Boolean(profile?.hasPendingReview && profile?.verificationStatus === 'modification_pending');
  const isKycPending = !isKycVerified && (profileKycStatus === 'pending' || Boolean(profile?.hasPendingReview));
  const isKycRejected = !isKycVerified && (profileKycStatus === 'rejected' || userKycStatus === 'rejected');

  const warehouseName = isSetupCompleted
    ? (profile?.companyName || profile?.warehouseName || 'Agri Storage Hub')
    : (user.companyName || profile?.companyName || profile?.warehouseName || (user.name ? `${user.name} Agri Logistics` : 'Agri Storage Terminal'));
  
  const wdraCode = isSetupCompleted && profile?.wdraCode
    ? profile.wdraCode
    : 'Pending Facility Setup & KYC Submission';

  const facilityAddress = isSetupCompleted && profile?.address 
    ? `${profile.address}${profile.district ? `, ${profile.district}` : ''}${profile.pincode ? ` - ${profile.pincode}` : ''}`
    : user.district
    ? `${user.district}${user.state ? `, ${user.state}` : ''} (Address not verified)`
    : 'Facility Location Pending Configuration';

  // Dynamic chambers list from user's configured storage types
  const chambersList = isSetupCompleted && profile?.storageTypes && profile.storageTypes.length > 0
    ? profile.storageTypes.map((st, i) => {
        const matchingLots = activeLots.filter((r) => (r.chamber || '').toLowerCase().includes(st.name.toLowerCase()) || i === 0);
        const storedInChamberT = Number((matchingLots.reduce((s, r) => s + (Number(r.totalQuantity) || 0), 0) / 1000).toFixed(1));
        const pct = st.capacity > 0 ? Math.min(100, Math.round((storedInChamberT / st.capacity) * 100)) : 0;
        return {
          name: st.name,
          temp: st.temp || 'Controlled',
          capacity: `${Number(st.capacity).toLocaleString('en-IN')} T`,
          occupied: `${storedInChamberT} T`,
          pct,
          commodities: matchingLots.map(r => r.commodity).filter(Boolean).slice(0, 2).join(', ') || 'Available for Inbound Lots',
        };
      })
    : [];

  // Unique commodities and chambers for filter dropdowns
  const availableCommodities = Array.from(new Set(safeInventory.map((r) => r.commodity).filter(Boolean)));
  const availableChambers = Array.from(new Set(safeInventory.map((r) => r.chamber).filter(Boolean)));

  // Filtered Stored Lots for the Active view (supports 1-click rentFilter + search)
  const filteredStoredLots = activeLotsWithDeadlines.filter((item) => {
    // 1. Rent Status Filter (All, Pending Dues, or Settled)
    if (rentFilter === 'pending' && !item.isPendingRent) return false;
    if (rentFilter === 'settled' && item.isPendingRent) return false;

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.receiptNumber?.toLowerCase().includes(q) ||
        item.farmerName?.toLowerCase().includes(q) ||
        item.commodity?.toLowerCase().includes(q) ||
        item.chamber?.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 3. Trade Status Filter
    if (statusFilter === 'available') {
      if (Number(item.availableQuantity) <= 0) return false;
    } else if (statusFilter === 'listed') {
      if (Number(item.lockedQuantity) <= 0 && item.status !== 'listed') return false;
    }

    // 4. Commodity Filter
    if (commodityFilter !== 'all' && item.commodity !== commodityFilter) {
      return false;
    }

    // 5. Chamber Filter
    if (chamberFilter !== 'all' && item.chamber !== chamberFilter) {
      return false;
    }

    return true;
  });

  // Filtered Dispatched Lots
  const filteredDispatchedLots = dispatchedLots.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.receiptNumber?.toLowerCase().includes(q) ||
      item.farmerName?.toLowerCase().includes(q) ||
      item.commodity?.toLowerCase().includes(q)
    );
  });

  // Pagination for Active In-Storage Lots
  const totalPages = Math.ceil(filteredStoredLots.length / pageSize) || 1;
  const paginatedStoredLots = filteredStoredLots.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Pagination for Dispatched Archive Lots
  const totalDispatchedPages = Math.ceil(filteredDispatchedLots.length / pageSize) || 1;
  const paginatedDispatchedLots = filteredDispatchedLots.slice(
    (dispatchedPage - 1) * pageSize,
    dispatchedPage * pageSize
  );

  const handleOpenDispatchConfirm = (item) => {
    setConfirmDispatchLot(item);
  };

  const handleExecuteDispatch = async () => {
    if (!confirmDispatchLot) return;
    setIsDispatching(true);
    try {
      await dispatchProduceFromWarehouse(confirmDispatchLot.id);
      setFeedbackToast(`✓ Outbound Gate Pass issued. Lot #${confirmDispatchLot.receiptNumber} moved to Dispatched History.`);
      setTimeout(() => setFeedbackToast(''), 4000);
      setConfirmDispatchLot(null);
      await loadData();
    } catch (err) {
      console.error('Failed to dispatch lot:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleOpenRentStatusModal = (item) => {
    setSelectedLotForRentNotice(item);
    const deadline = calculateMonthlyRentDeadline(item);
    setRentDueAmount(deadline?.totalDue || deadline?.monthlyAmount || item.storageFeeMonthly || item.quotedMonthlyRent || 700);
  };

  const handleSendPaymentReminder = async () => {
    if (!selectedLotForRentNotice) return;
    const cleanReceiptNum = selectedLotForRentNotice.receiptNumber?.replace(/^#+/, '') || 'eNWR';
    const farmerName = selectedLotForRentNotice.farmerName || 'Farmer';
    const farmerId = selectedLotForRentNotice.farmerId || selectedLotForRentNotice.farmer_id;
    const dueAmt = Number(rentDueAmount || 700).toLocaleString('en-IN');
    setIsSendingReminder(true);

    try {
      await sendNotification({
        recipientId: farmerId,
        recipientRole: 'farmer',
        title: 'Storage Rent Due Alert',
        message: `Dear ${farmerName}, your monthly warehouse storage fee of ₹${dueAmt} for Lot #${cleanReceiptNum} is due. Please log in to your Agrolnk Inventory and settle online via Razorpay.`,
        type: 'warning',
        link: '/farmer/inventory',
        actionPayload: {
          receiptId: selectedLotForRentNotice.id,
          amount: Number(rentDueAmount || 700),
        },
      });

      setFeedbackToast(`✓ In-platform rent payment notice sent to ${farmerName}!`);
      setTimeout(() => setFeedbackToast(''), 4500);
      setSelectedLotForRentNotice(null);
    } catch (err) {
      console.error('Error sending reminder:', err);
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Setup Required Prompt Banner if not completed */}
        {!isSetupCompleted && (
          <div className="p-4 sm:p-6 rounded-3xl bg-[#FEF3C7] border-2 border-[#F59E0B]/50 text-[#92400E] shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#D97706] text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm sm:text-base text-[#92400E]">
                    Facility Hidden from Farmers — Facility Setup & KYC Required
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-[#EF4444] text-white text-[10px] font-extrabold uppercase tracking-wide">
                    Offline
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#78350F] leading-relaxed max-w-3xl">
                  Without entering your company name, total storage capacity in tonnes, chamber types, and KYC compliance documents, your warehouse is <strong>hidden from all farmers and buyers</strong> across Agrolnk and cannot receive produce deposits or issue storage receipts.
                </p>
              </div>
            </div>
            <Button
              variant="accent"
              size="md"
              icon={ShieldCheck}
              iconPosition="left"
              onClick={() => setIsSetupModalOpen(true)}
              className="font-extrabold text-xs sm:text-sm py-3 px-5 shadow-md shrink-0 cursor-pointer w-full lg:w-auto"
            >
              Complete Facility Setup & KYC Now
            </Button>
          </div>
        )}

        {/* Pending Modification Review Banner (If active warehouse submitted revisions) */}
        {isModificationPending && (
          <div className="p-4 sm:p-5 rounded-3xl bg-[#EFF6FF] border-2 border-[#3B82F6]/40 text-[#1E40AF] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-0.5 text-left">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-[#1E3A8A]">
                    Facility Revision Under Review by Agrolnk Compliance
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-[10px] font-extrabold uppercase border border-[#BFDBFE]">
                    Pending Approval
                  </span>
                </div>
                <p className="text-xs text-[#1E40AF]/90 leading-relaxed">
                  Your requested facility updates (Requested Capacity: <strong>{profile?.pendingChanges?.totalCapacityTonnes || totalCapacityTonnes} Tonnes</strong>, WDRA accreditation files) are awaiting Admin verification. Your active verified capacity (<strong>{totalCapacityTonnes} Tonnes</strong>) remains live across the marketplace.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={Eye}
              iconPosition="left"
              onClick={() => setIsSetupModalOpen(true)}
              className="font-bold text-xs py-2 px-3.5 shrink-0 cursor-pointer border-[#93C5FD] bg-white text-[#1E40AF] hover:bg-[#DBEAFE]"
            >
              View Revision
            </Button>
          </div>
        )}

        {/* Initial Setup Done but KYC Pending Review Banner */}
        {isSetupCompleted && isKycPending && !isModificationPending && (
          <div className="p-4 sm:p-5 rounded-3xl bg-[#FEF3C7] border-2 border-[#F59E0B]/50 text-[#92400E] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D97706] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-0.5 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-[#92400E]">
                    Facility Under Compliance & WDRA Verification
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-[#FDE68A] text-[#92400E] text-[10px] font-extrabold uppercase border border-[#FCD34D]">
                    Hidden From Marketplace
                  </span>
                </div>
                <p className="text-xs text-[#78350F] leading-relaxed">
                  Your facility details, capacity (<strong>{totalCapacityTonnes} Tonnes</strong>), and WDRA accreditation documents are under Administrative Review. <strong>Your warehouse will remain hidden from farmers and buyers until approved.</strong>
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={Eye}
              iconPosition="left"
              onClick={() => setIsSetupModalOpen(true)}
              className="font-bold text-xs py-2 px-3.5 shrink-0 cursor-pointer border-[#FCD34D] bg-white text-[#92400E] hover:bg-[#FEF3C7]"
            >
              Review Details
            </Button>
          </div>
        )}

        {/* Top Header Banner */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-2xl text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
                <Building2 className="w-3.5 h-3.5" /> Warehouse Storage & Facility Hub
              </div>
              {isModificationPending ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D97706]/20 text-[#FCD34D] text-[11px] font-bold border border-[#D97706]/40">
                  <Clock className="w-3 h-3" /> Live (Revision Under Review)
                </span>
              ) : isKycVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#34D399] text-[11px] font-bold border border-[#10B981]/30">
                  <CheckCircle2 className="w-3 h-3" /> Live & WDRA Verified
                </span>
              ) : isKycRejected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EF4444]/20 text-[#FCA5A5] text-[11px] font-bold border border-[#EF4444]/40">
                  <AlertCircle className="w-3 h-3" /> KYC Rejected (Resubmission Required)
                </span>
              ) : isKycPending ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D97706]/20 text-[#FCD34D] text-[11px] font-bold border border-[#D97706]/40">
                  <Clock className="w-3 h-3" /> Under Admin KYC Review (Hidden from Farmers)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EF4444]/20 text-[#FCA5A5] text-[11px] font-bold border border-[#EF4444]/40">
                  <AlertCircle className="w-3 h-3" /> Offline & Hidden (Setup Pending)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              {warehouseName}
            </h1>

            <p className="text-xs sm:text-sm text-[#DCFCE7]/90 leading-relaxed">
              WDRA License: <strong>{wdraCode}</strong> • {facilityAddress}
            </p>

            {/* Active Quoted Storage Fee Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-[#34D399]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Active Storage Fee: <strong className="text-white">₹{profile?.monthlyRatePerTonne || 350}</strong> / Tonne / month (₹{((profile?.monthlyRatePerTonne || 350) / 1000).toFixed(2)}/kg)
              </span>
            </div>

            {profile?.websiteUrl && isSetupCompleted && (
              <div className="pt-0.5">
                <a
                  href={profile.websiteUrl.startsWith('http') ? profile.websiteUrl : `https://${profile.websiteUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#34D399] hover:underline font-semibold"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{profile.websiteUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-col items-stretch sm:items-end justify-between w-full lg:w-auto gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-xs text-left sm:text-right shrink-0">
              <span className="text-white/80 block text-[11px]">Accredited Capacity</span>
              <span className="font-bold text-[#34D399] block text-base sm:text-lg font-heading">
                {totalCapacityTonnes > 0 ? `${totalCapacityTonnes.toLocaleString('en-IN')} Tonnes` : '0 Tonnes (Setup Required)'}
              </span>
              <span className="text-[10px] text-white/70 block">
                {isSetupCompleted && profile?.storageTypes?.length ? `${profile.storageTypes.length} Storage Chamber Types` : 'Setup Pending'}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={FileCheck2}
              iconPosition="left"
              onClick={() => setIsSetupModalOpen(true)}
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white text-xs font-bold py-2.5 px-3.5 cursor-pointer w-full sm:w-auto justify-center"
            >
              {isSetupCompleted ? 'Edit Facility, Rates & KYC' : 'Complete Setup & Go Live'}
            </Button>
          </div>
        </div>

        {/* 4 Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Accredited Capacity</span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {occupancyPercent}%
            </div>
            <div className="text-[11px] text-[#566861]">
              {totalStoredTonnes} T occupied / {totalCapacityTonnes > 0 ? `${totalCapacityTonnes} T` : '0 T'}
            </div>
          </Card>

          <Card hoverEffect className={`p-6 bg-white border space-y-3 shadow-xs ${
            totalPendingDue > 0 ? 'border-amber-300/80 bg-amber-50/20' : 'border-[#E5EDE8]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Pending Rent Dues</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                totalPendingDue > 0 ? 'bg-amber-100 text-amber-800' : 'bg-[#EFF6FF] text-[#1E40AF]'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-3xl font-extrabold font-heading ${
              totalPendingDue > 0 ? 'text-amber-700' : 'text-[#0B3326]'
            }`}>
              ₹{totalPendingDue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-semibold flex items-center gap-1.5 flex-wrap">
              <span className={pendingLotsCount > 0 ? 'text-amber-700' : 'text-[#566861]'}>
                {pendingLotsCount} {pendingLotsCount === 1 ? 'Lot' : 'Lots'} Pending
              </span>
              {overdueLotsCount > 0 && (
                <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.2 rounded-md border border-red-200 text-[10px]">
                  {overdueLotsCount} Overdue
                </span>
              )}
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Settled Rent Collections</span>
              <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#10B981] font-heading">
              ₹{totalSettledRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#10B981] font-semibold">
              {settledLotsCount} of {activeLots.length} Accounts in Good Standing
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Inbound Gate Activity</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {totalInwardPending}
            </div>
            <div className="text-[11px] text-[#566861]">
              {quoteRequests.length} Quotes • {inTransitLots.length} In Transit
            </div>
          </Card>

        </div>

        {/* Tab Switcher - 4 Clear Workspaces */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#34D399]" />
            <span>Gate Inbound & Quotes</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'requests'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861]'
              }`}
            >
              {totalInwardPending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Stored Produce & Rent Collection</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'inventory'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861]'
              }`}
            >
              {activeLots.length}
            </span>
            {pendingLotsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                {pendingLotsCount} Dues
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dispatched')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'dispatched'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Gate Outbound (Dispatched)</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'dispatched'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861]'
              }`}
            >
              {dispatchedLots.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chambers')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'chambers'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <ThermometerSnowflake className="w-4 h-4" />
            <span>Storage Chambers</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'chambers'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861]'
              }`}
            >
              {chambersList.length}
            </span>
          </button>
        </div>

        {/* Content Section 0: Incoming Deposit Requests & Inward Pipeline */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* 1. Pending Quote Requests */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0B3326] font-heading flex items-center gap-2">
                    <span>1. Incoming Deposit Quote Requests</span>
                    <Badge variant="yellow" size="sm">{quoteRequests.length} Waiting for Quote</Badge>
                  </h2>
                  <p className="text-xs text-[#566861]">
                    Farmers requesting storage space. Review lot details, quote your monthly fee, and assign chamber.
                  </p>
                </div>
              </div>

              {quoteRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quoteRequests.map((req) => (
                    <Card key={req.id} hoverEffect className="p-5 bg-white border border-amber-200/80 rounded-2xl shadow-xs space-y-3 text-left">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {req.receiptNumber}
                          </span>
                          <h3 className="text-base font-bold text-[#0B3326] mt-1">
                            {req.commodity} ({req.variety || 'Standard'})
                          </h3>
                          <span className="text-xs text-[#566861]">
                            Depositor: <strong>{req.farmerName}</strong> • {req.farmerPhone}
                          </span>
                        </div>
                        <Badge variant="dark" size="sm">
                          Grade {req.grade || 'A'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold uppercase">Volume</span>
                          <strong className="text-[#0B3326]">{Number(req.totalQuantity || 0).toLocaleString('en-IN')} {req.unit || 'kg'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold uppercase">Est. Value</span>
                          <strong className="text-[#10B981]">₹{Number(req.estimatedValue || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#566861] block font-semibold uppercase">Duration</span>
                          <strong className="text-[#14211D]">{req.storageDays || 60} Days</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#E5EDE8]">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setInwardModalReceipt(req);
                            setInwardModalMode('quote');
                          }}
                          icon={Sparkles}
                          iconPosition="left"
                          className="w-full justify-center text-xs font-bold py-2 bg-[#0B3326] text-white cursor-pointer shadow-xs"
                        >
                          Set Price Quote & Assign Chamber
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-dashed border-[#E5EDE8] text-center text-xs text-[#566861]">
                  No pending quote requests right now. New requests submitted by farmers will appear here.
                </div>
              )}
            </div>

            {/* 2. Quoted Lots Waiting for Farmer Acceptance */}
            {quotedPendingFarmer.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-bold text-[#0B3326] font-heading flex items-center gap-2">
                  <span>2. Quotes Sent to Farmers (Awaiting Farmer Dispatch)</span>
                  <Badge variant="blue" size="sm">{quotedPendingFarmer.length} Pending</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quotedPendingFarmer.map((req) => (
                    <div key={req.id} className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 text-left space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-[#0B3326]">{req.receiptNumber} • {req.commodity}</span>
                          <span className="text-[#566861] block">Depositor: {req.farmerName}</span>
                        </div>
                        <span className="font-extrabold text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                          Quoted: ₹{req.quotedMonthlyRent}/mo
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-[#566861]">
                        <span>Volume: <strong>{req.totalQuantity} {req.unit}</strong></span>
                        <span>Assigned: <strong>{req.chamber}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. In-Transit Lots (Farmer Accepted Quote & Dispatched) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0B3326] font-heading flex items-center gap-2">
                    <span>3. Lots In Transit / Awaiting Gate Arrival</span>
                    <Badge variant="purple" size="sm">{inTransitLots.length} In Transit</Badge>
                  </h2>
                  <p className="text-xs text-[#566861]">
                    Farmers accepted your quote and dispatched goods. When the truck arrives at your gate, record weighbridge reading to issue official e-NWR.
                  </p>
                </div>
              </div>

              {inTransitLots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inTransitLots.map((req) => (
                    <Card key={req.id} hoverEffect className="p-5 bg-white border border-purple-200/80 rounded-2xl shadow-xs space-y-3 text-left">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1 w-fit">
                            <Truck className="w-3.5 h-3.5" />
                            In Transit • {req.receiptNumber}
                          </span>
                          <h3 className="text-base font-bold text-[#0B3326] mt-1">
                            {req.commodity} ({req.variety || 'Standard'})
                          </h3>
                          <span className="text-xs text-[#566861]">
                            Depositor: <strong>{req.farmerName}</strong> • {req.farmerPhone}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#566861] uppercase block font-semibold">Agreed Fee</span>
                          <span className="font-extrabold text-sm text-[#10B981]">₹{req.quotedMonthlyRent}/mo</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200/60 text-xs flex items-center justify-between">
                        <span>Expected Volume: <strong>{req.totalQuantity} {req.unit}</strong></span>
                        <span>Reserved Chamber: <strong>{req.chamber}</strong></span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#E5EDE8]">
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => {
                            setInwardModalReceipt(req);
                            setInwardModalMode('inward');
                          }}
                          icon={CheckCircle2}
                          iconPosition="left"
                          className="w-full justify-center text-xs font-bold py-2 shadow-xs cursor-pointer"
                        >
                          Confirm Gate Arrival & Issue Official e-NWR
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-dashed border-[#E5EDE8] text-center text-xs text-[#566861]">
                  No dispatched lots currently in transit.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Section 1: Active In-Chamber Stored e-NWRs */}
        {activeTab === 'inventory' && (
          <div className="space-y-5">
            
            {/* Header & Filter Controls Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#0B3326] font-heading">
                    Active Deposited Produce Batches
                  </h2>
                  <p className="text-xs text-[#566861]">
                    Manage stored produce lots, track rental billing deadlines, and collect pending dues online or at counter
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="emerald" size="sm">
                    {filteredStoredLots.length} Batches Showing
                  </Badge>
                  <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                </div>
              </div>

              {/* Quick 1-Click Status Toggles: All vs Pending Dues vs Settled */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8] pt-1">
                <button
                  type="button"
                  onClick={() => { setRentFilter('all'); setCurrentPage(1); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    rentFilter === 'all'
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : 'bg-[#F8FAF8] text-[#566861] hover:bg-[#E5EDE8] border border-[#E5EDE8]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Stored Lots</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    rentFilter === 'all' ? 'bg-[#10B981] text-white' : 'bg-white text-[#566861] border border-[#E5EDE8]'
                  }`}>
                    {activeLotsWithDeadlines.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setRentFilter('pending'); setCurrentPage(1); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    rentFilter === 'pending'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending Dues & Delays</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    rentFilter === 'pending' ? 'bg-white text-amber-800' : 'bg-amber-200 text-amber-950'
                  }`}>
                    {pendingLotsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setRentFilter('settled'); setCurrentPage(1); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    rentFilter === 'settled'
                      ? 'bg-[#10B981] text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Settled / Up to Date</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    rentFilter === 'settled' ? 'bg-[#0B3326] text-white' : 'bg-emerald-200 text-emerald-950'
                  }`}>
                    {settledLotsCount}
                  </span>
                </button>
              </div>

              {/* Interactive Search & Dropdown Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search receipt #, depositor, crop..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-[#14211D] focus:outline-hidden focus:border-[#10B981] focus:bg-white transition-all"
                  />
                </div>

                {/* Status Filter */}
                <SearchableSelect
                  options={[
                    { value: 'active', label: 'All Active in Storage' },
                    { value: 'available', label: 'Available to Trade (>0 kg)' },
                    { value: 'listed', label: '100% Listed on Trade Floor' },
                    { value: 'all', label: 'All Records' },
                  ]}
                  value={statusFilter}
                  onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
                  placeholder="Storage Status"
                  searchPlaceholder="Search status..."
                  buttonClassName="bg-[#F8FAF8] py-2 text-xs"
                />

                {/* Commodity Filter */}
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'All Commodities' },
                    ...availableCommodities.map((c) => ({ value: c, label: c })),
                  ]}
                  value={commodityFilter}
                  onChange={(val) => { setCommodityFilter(val); setCurrentPage(1); }}
                  placeholder="Commodity"
                  searchPlaceholder="Search crop..."
                  buttonClassName="bg-[#F8FAF8] py-2 text-xs"
                />

                {/* Chamber Filter */}
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'All Chambers' },
                    ...availableChambers.map((ch) => ({ value: ch, label: ch })),
                  ]}
                  value={chamberFilter}
                  onChange={(val) => { setChamberFilter(val); setCurrentPage(1); }}
                  placeholder="Chamber"
                  searchPlaceholder="Search chamber..."
                  buttonClassName="bg-[#F8FAF8] py-2 text-xs"
                />

              </div>
            </div>

            {/* Inventory List / Grid Content */}
            {filteredStoredLots.length > 0 ? (
              <div className="space-y-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedStoredLots.map((item) => (
                      <Card key={item.id} className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between hover:border-[#10B981]/50 transition-all">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="emerald" size="sm">
                              {item.receiptNumber}
                            </Badge>
                            <span className="text-xs text-[#566861]">
                              Depositor: <strong>{item.farmerName}</strong>
                            </span>
                          </div>

                          <div>
                            <h4 className="text-base font-bold text-[#14211D]">
                              {item.commodity} ({item.totalQuantity} {item.unit})
                            </h4>
                            <span className="text-xs text-[#566861]">
                              {item.chamber} • Grade {item.grade}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[#566861]">Available to Trade:</span>
                              <span className={`font-bold ${item.availableQuantity > 0 ? 'text-[#10B981]' : 'text-[#566861]'}`}>
                                {item.availableQuantity} {item.unit}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#566861]">Storage Rent:</span>
                              <span className="font-bold text-[#0B3326]">
                                ₹{Number(item.storageFeeMonthly || item.quotedMonthlyRent || 0).toLocaleString('en-IN')}/mo
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-[#E5EDE8]">
                              <span className="text-[#566861]">Rent Status:</span>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                item.rentDeadline?.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : item.rentDeadline?.status === 'due_soon'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-red-50 text-red-800 border-red-200'
                              }`}>
                                {item.rentDeadline?.label || 'Settled'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between gap-2 flex-wrap">
                          <Button
                            variant={item.isPendingRent ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => handleOpenCounterPayment(item)}
                            className={`text-xs font-bold py-1.5 px-3 cursor-pointer ${
                              item.isPendingRent
                                ? 'bg-[#0B3326] text-white hover:bg-[#14624A] shadow-xs'
                                : 'border-[#E5EDE8] text-[#0B3326] hover:bg-[#F2FBF6]'
                            }`}
                          >
                            {item.isPendingRent
                              ? `Collect Rent (₹${item.rentDeadline?.totalDue || item.storageFeeMonthly || 700})`
                              : 'Settle / Extend'}
                          </Button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.availableQuantity === 0 && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenDispatchConfirm(item)}
                                className="text-[11px] font-semibold py-1.5 px-2 text-[#D97706] hover:text-[#B45309] border-[#FDE68A] bg-[#FEF3C7]/40 cursor-pointer"
                                title="Issue gate pass & clear lot"
                              >
                                Mark Dispatched
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedReceipt(item)}
                              icon={ArrowRight}
                              iconPosition="right"
                              className="text-xs font-bold py-1.5 px-2.5 cursor-pointer"
                            >
                              e-NWR
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedStoredLots.map((item) => (
                      <WarehouseBatchRow
                        key={item.id}
                        item={item}
                        isDispatched={false}
                        onView={(b) => setSelectedReceipt(b)}
                        onDispatch={(b) => handleOpenDispatchConfirm(b)}
                        onViewRentStatus={(b) => handleOpenRentStatusModal(b)}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredStoredLots.length}
                  pageSize={pageSize}
                />
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#E5EDE8] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F8FAF8] text-[#566861] flex items-center justify-center mx-auto">
                  <Filter className="w-6 h-6 text-[#566861]" />
                </div>
                <h4 className="font-bold text-base text-[#0B3326]">No Active Batches Found</h4>
                <p className="text-xs text-[#566861] max-w-sm mx-auto">
                  No batches matched your current filter criteria. Try clearing search keywords or choosing "All Active in Storage".
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('active');
                    setCommodityFilter('all');
                    setChamberFilter('all');
                    setCurrentPage(1);
                  }}
                  icon={RotateCcw}
                  iconPosition="left"
                  className="text-xs font-bold"
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Content Section 2: Dispatched & Gate Pass Records Archive */}
        {activeTab === 'dispatched' && (
          <div className="space-y-5">
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#0B3326] font-heading">
                  Dispatched & Gate Pass Outbound Archive
                </h2>
                <p className="text-xs text-[#566861]">
                  Permanently archived warehouse receipts that have completed dispatch & gate exit
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="emerald" size="sm">
                  {filteredDispatchedLots.length} Dispatched Lots
                </Badge>
                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              </div>
            </div>

            {filteredDispatchedLots.length > 0 ? (
              <div className="space-y-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedDispatchedLots.map((item) => (
                      <Card key={item.id} className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between opacity-95">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] font-extrabold text-[10px] uppercase">
                              ✓ Gate Exit Verified
                            </span>
                            <span className="text-xs text-[#566861]">
                              {item.receiptNumber}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-base font-bold text-[#14211D]">
                              {item.commodity} ({item.totalQuantity} {item.unit})
                            </h4>
                            <span className="text-xs text-[#566861]">
                              Depositor: <strong>{item.farmerName}</strong> • {item.chamber}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[#566861]">Dispatch Quantity:</span>
                              <span className="font-bold text-[#0B3326]">{item.totalQuantity} {item.unit}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#566861]">Storage Status:</span>
                              <span className="font-bold text-[#10B981]">Released / Outbound Completed</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between">
                          <span className="text-[11px] text-[#566861]">
                            {new Date(item.updatedAt || item.depositedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedReceipt(item)}
                            icon={ArrowRight}
                            iconPosition="right"
                            className="text-xs font-bold py-1.5"
                          >
                            Audit Receipt
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedDispatchedLots.map((item) => (
                      <WarehouseBatchRow
                        key={item.id}
                        item={item}
                        isDispatched={true}
                        onView={(b) => setSelectedReceipt(b)}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                <Pagination
                  currentPage={dispatchedPage}
                  totalPages={totalDispatchedPages}
                  onPageChange={setDispatchedPage}
                  totalItems={filteredDispatchedLots.length}
                  pageSize={pageSize}
                />
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#E5EDE8] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F8FAF8] text-[#566861] flex items-center justify-center mx-auto">
                  <Truck className="w-6 h-6 text-[#566861]" />
                </div>
                <h4 className="font-bold text-base text-[#0B3326]">No Dispatched Batches in Archive</h4>
                <p className="text-xs text-[#566861] max-w-sm mx-auto">
                  When produce batches are completely released and dispatched from the warehouse gate, they will automatically be archived here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Content Section 3: Chambers Telemetry */}
        {activeTab === 'chambers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  Storage Chambers & Atmosphere Cells
                </h2>
                <p className="text-xs text-[#566861]">
                  Live temperature control and storage utilization monitoring
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {chambersList.map((ch, idx) => (
                <Card key={idx} className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                        <ThermometerSnowflake className="w-4 h-4 text-[#10B981]" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-[#0B3326]">
                          {ch.name}
                        </h4>
                        <span className="text-xs text-[#10B981] font-semibold">
                          Target: {ch.temp}
                        </span>
                      </div>
                    </div>

                    <Badge variant={ch.pct > 80 ? 'amber' : 'emerald'} size="sm">
                      {ch.pct}% Full
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full bg-[#E5EDE8] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ch.pct > 80 ? 'bg-[#D97706]' : 'bg-[#10B981]'}`}
                        style={{ width: `${ch.pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#566861]">
                      <span>Occupied: {ch.occupied}</span>
                      <span>Capacity: {ch.capacity}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between text-xs">
                    <span className="text-[#566861]">Active Lots:</span>
                    <span className="font-bold text-[#14211D]">{ch.commodities}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Farmer Rent Due & Notice Desk Modal */}
      {selectedLotForRentNotice && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLotForRentNotice(null);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E5EDE8] bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B3326] font-heading">
                    Storage Rent Status & Dues
                  </h3>
                  <span className="text-xs text-[#566861]">
                    Lot {selectedLotForRentNotice.receiptNumber?.replace(/^#+/, '#')} • Farmer: <strong>{selectedLotForRentNotice.farmerName || 'Farmer'}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLotForRentNotice(null)}
                className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Lot & Due Summary Card */}
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#566861] tracking-wider block">
                      Stored Produce Lot
                    </span>
                    <span className="text-sm font-extrabold text-[#0B3326]">
                      {selectedLotForRentNotice.commodity} ({selectedLotForRentNotice.totalQuantity} {selectedLotForRentNotice.unit || 'kg'})
                    </span>
                    <span className="text-[11px] text-[#566861] block">
                      Chamber: {selectedLotForRentNotice.chamber || 'Standard Bay'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#566861] tracking-wider block">
                      Monthly Tariff
                    </span>
                    <span className="text-sm font-extrabold text-[#0B3326]">
                      ₹{Number(selectedLotForRentNotice.storageFeeMonthly || selectedLotForRentNotice.quotedMonthlyRent || 0).toLocaleString('en-IN')} / mo
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#E5EDE8] flex items-center justify-between text-xs">
                  <span className="text-[#566861] font-medium">Rent Status:</span>
                  <Badge variant={selectedLotForRentNotice.isPendingRent ? 'amber' : 'emerald'} size="sm">
                    {selectedLotForRentNotice.isPendingRent
                      ? `₹${Number(rentDueAmount || 0).toLocaleString('en-IN')} Due from Farmer`
                      : 'Settled via Razorpay'}
                  </Badge>
                </div>
              </div>

              {/* Status Explanation Banner */}
              {selectedLotForRentNotice.isPendingRent ? (
                <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2 text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold text-xs">Pending Online Settlement</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Farmer <strong>{selectedLotForRentNotice.farmerName}</strong> has an outstanding storage rent of <strong>₹{Number(rentDueAmount || 0).toLocaleString('en-IN')}</strong>. Farmers pay directly through their Agrolnk dashboard via Razorpay.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F2FBF6] border border-[#10B981]/30 space-y-2 text-[#0B3326]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span className="font-bold text-xs">Rent Fully Settled</span>
                  </div>
                  <p className="text-[11px] text-[#566861] leading-relaxed">
                    Storage rent is up to date. The farmer settled this payment online on the platform via Razorpay. The e-NWR validity is active.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedLotForRentNotice(null)}
                >
                  Close
                </Button>

                {selectedLotForRentNotice.isPendingRent && (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    loading={isSendingReminder}
                    onClick={handleSendPaymentReminder}
                    icon={Bell}
                    iconPosition="left"
                    className="font-bold text-xs bg-[#0B3326] hover:bg-[#14624A] text-white shadow-xs cursor-pointer"
                  >
                    Send In-Platform Rent Reminder
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle className="w-5 h-5 text-[#34D399] shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{feedbackToast}</span>
        </div>
      )}

      {/* Dispatch Confirmation Overlay Modal */}
      {confirmDispatchLot && (
        <AlertModal
          isOpen={Boolean(confirmDispatchLot)}
          onClose={() => setConfirmDispatchLot(null)}
          title="Confirm Gate Exit & Outbound Dispatch"
          type="dispatch"
          message={`Generate Outbound Gate Pass & dispatch ${confirmDispatchLot.receiptNumber?.startsWith('#') ? confirmDispatchLot.receiptNumber : '#' + confirmDispatchLot.receiptNumber}?`}
          description={`Commodity: ${confirmDispatchLot.commodity} (${confirmDispatchLot.totalQuantity} ${confirmDispatchLot.unit}) • Depositor: ${confirmDispatchLot.farmerName}. Once dispatched, this batch will be permanently recorded in your Dispatched History and excluded from active chamber capacity counts.`}
          confirmText="Issue Gate Pass & Dispatch"
          cancelText="Cancel"
          showCancel={true}
          isProcessing={isDispatching}
          onConfirm={handleExecuteDispatch}
          onCancel={() => setConfirmDispatchLot(null)}
        />
      )}

      {/* e-NWR Inspection Modal */}
      {selectedReceipt && (
        <ReceiptDetailModal
          inventory={selectedReceipt}
          currentUser={user}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Warehouse Facility Setup & KYC Modal */}
      <WarehouseSetupModal
        isOpen={isSetupModalOpen}
        currentUser={user}
        onClose={() => setIsSetupModalOpen(false)}
        onProfileSaved={(saved) => {
          setProfile(saved);
        }}
      />

      {/* Inward Quote & Gate Arrival Verification Modal */}
      {inwardModalReceipt && (
        <WarehouseInwardModal
          receipt={inwardModalReceipt}
          mode={inwardModalMode}
          isOpen={Boolean(inwardModalReceipt)}
          onClose={() => setInwardModalReceipt(null)}
          onSuccess={() => {
            loadData(false);
            setFeedbackToast(
              inwardModalMode === 'quote'
                ? 'Storage price quote sent to farmer successfully!'
                : 'Gate inward verified & official e-NWR issued!'
            );
            setTimeout(() => setFeedbackToast(''), 4000);
            setInwardModalReceipt(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
