import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ReceiptDetailModal from '../../components/warehouse/ReceiptDetailModal';
import WarehouseSetupModal from '../../components/warehouse/WarehouseSetupModal';
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
  FileSpreadsheet
} from 'lucide-react';
import {
  getWarehouseOperatorStats,
  getWarehouseInventory,
  getWarehouseById,
  getWarehouseReceipts,
  getWarehouseProfile,
  dispatchProduceFromWarehouse,
} from '../../utils/warehouses';

export default function WarehouseDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    id: 'usr_warehouse_05',
    name: 'Sundar',
    email: 'sundar@gmail.com',
    role: 'warehouse',
  };

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'dispatched' | 'chambers'
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'available' | 'listed' | 'all'
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [chamberFilter, setChamberFilter] = useState('all');

  const loadData = async () => {
    try {
      const storedProfile = getWarehouseProfile(user.id, user.email);
      setProfile(storedProfile);

      // Auto-open setup if new warehouse user hasn't configured their facility
      if (!storedProfile || !storedProfile.setupCompleted) {
        setIsSetupModalOpen(true);
      }

      const [computedStats, inv] = await Promise.all([
        getWarehouseOperatorStats(user.id || 'wh_salem_01'),
        getWarehouseReceipts(),
      ]);
      setStats(computedStats);
      setInventory(inv || []);
    } catch (err) {
      console.error('Error loading warehouse data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id, user.email]);

  const safeInventory = Array.isArray(inventory) ? inventory : [];
  
  // Segregate Active In-Storage vs Dispatched Lots
  const activeLots = safeInventory.filter((r) => r.status !== 'dispatched' && r.status !== 'released');
  const dispatchedLots = safeInventory.filter((r) => r.status === 'dispatched' || r.status === 'released');

  const totalStoredTonnes = Number((activeLots.reduce((sum, r) => sum + (Number(r.totalQuantity) || 0), 0) / 1000).toFixed(1));
  const isSetupCompleted = Boolean(profile?.setupCompleted && Number(profile?.totalCapacityTonnes) > 0);
  const totalCapacityTonnes = isSetupCompleted ? Number(profile.totalCapacityTonnes) : 0;
  const occupancyPercent = totalCapacityTonnes > 0 ? Number(((totalStoredTonnes / totalCapacityTonnes) * 100).toFixed(1)) : 0;

  const warehouseName = isSetupCompleted
    ? (profile?.companyName || profile?.warehouseName || 'Agri Storage Hub')
    : (user.companyName || profile?.companyName || profile?.warehouseName || (user.name ? `${user.name} Agri Logistics` : 'Agri Storage Terminal'));
  
  const wdraCode = isSetupCompleted && profile?.wdraCode
    ? profile.wdraCode
    : 'Pending Facility Setup & KYC Submission';

  const facilityAddress = isSetupCompleted && profile?.address 
    ? `${profile.address}, ${profile.district || 'Salem'} - ${profile.pincode || '636004'}`
    : `${user.district || 'Salem'}, ${user.state || 'Tamil Nadu'} (Address not verified)`;

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

  // Filtered Stored Lots for the Active view
  const filteredStoredLots = activeLots.filter((item) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.receiptNumber?.toLowerCase().includes(q) ||
        item.farmerName?.toLowerCase().includes(q) ||
        item.commodity?.toLowerCase().includes(q) ||
        item.chamber?.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 2. Status Filter
    if (statusFilter === 'available') {
      if (Number(item.availableQuantity) <= 0) return false;
    } else if (statusFilter === 'listed') {
      if (Number(item.lockedQuantity) <= 0 && item.status !== 'listed') return false;
    }

    // 3. Commodity Filter
    if (commodityFilter !== 'all' && item.commodity !== commodityFilter) {
      return false;
    }

    // 4. Chamber Filter
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

  const handleDispatchLot = async (item) => {
    if (window.confirm(`Issue Gate Pass & mark #${item.receiptNumber} (${item.commodity} ${item.totalQuantity} ${item.unit}) as dispatched?`)) {
      try {
        await dispatchProduceFromWarehouse(item.id);
        await loadData();
      } catch (err) {
        console.error('Failed to dispatch lot:', err);
      }
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
                  Without entering your company name, total storage capacity in tonnes, chamber types, and KYC compliance documents, your warehouse is <strong>hidden from all farmers and buyers</strong> across Agrolnk and cannot receive produce deposits or issue e-NWRs.
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

        {/* Top Header Banner */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-2xl text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
                <Building2 className="w-3.5 h-3.5" /> Warehouse Management & e-NWR Terminal
              </div>
              {isSetupCompleted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#34D399] text-[11px] font-bold border border-[#10B981]/30">
                  <CheckCircle2 className="w-3 h-3" /> Live & Visible to Farmers
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

            {profile?.websiteUrl && isSetupCompleted && (
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
            )}
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full lg:w-auto gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
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
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white text-xs font-bold py-2 px-3.5 cursor-pointer shrink-0"
            >
              {isSetupCompleted ? 'Edit Facility & KYC' : 'Complete Setup & Go Live'}
            </Button>
          </div>
        </div>

        {/* 4 Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Capacity Utilization</span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {occupancyPercent}%
            </div>
            <div className="text-[11px] text-[#566861]">
              {totalStoredTonnes} T occupied / {totalCapacityTonnes > 0 ? totalCapacityTonnes : '0'} T
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">In-Storage e-NWR Titles</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {activeLots.length}
            </div>
            <div className="text-[11px] text-[#566861]">
              Active batches stored in chambers
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Stored Commodity Value</span>
              <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats?.totalValuation ?? '₹0'}
            </div>
            <div className="text-[11px] text-[#10B981] font-semibold">
              100% Comprehensive Transit Insured
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Dispatched Outbound Lots</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {dispatchedLots.length}
            </div>
            <div className="text-[11px] text-[#566861]">
              Fulfilled & released from gate
            </div>
          </Card>

        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
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
            <span>Active In-Chamber Stock</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'inventory'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861]'
              }`}
            >
              {activeLots.length}
            </span>
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
            <span>Dispatched & Gate Passes</span>
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
            <span>Chamber & Storage Cell Telemetry</span>
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
                    Batches currently in storage under this WDRA license (Dispatched lots are moved to the Dispatched tab)
                  </p>
                </div>
                <Badge variant="emerald" size="sm">
                  {filteredStoredLots.length} Batches Showing
                </Badge>
              </div>

              {/* Interactive Search & Dropdown Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#E5EDE8]">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search receipt #, depositor, crop..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-[#14211D] focus:outline-hidden focus:border-[#10B981] focus:bg-white transition-all"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-[#14211D] focus:outline-hidden focus:border-[#10B981] focus:bg-white cursor-pointer font-medium"
                >
                  <option value="active">All Active in Storage</option>
                  <option value="available">Available to Trade ({'>'}0 kg)</option>
                  <option value="listed">100% Listed on Trade Floor</option>
                  <option value="all">All Records</option>
                </select>

                {/* Commodity Filter */}
                <select
                  value={commodityFilter}
                  onChange={(e) => setCommodityFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-[#14211D] focus:outline-hidden focus:border-[#10B981] focus:bg-white cursor-pointer font-medium"
                >
                  <option value="all">All Commodities</option>
                  {availableCommodities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Chamber Filter */}
                <select
                  value={chamberFilter}
                  onChange={(e) => setChamberFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-[#14211D] focus:outline-hidden focus:border-[#10B981] focus:bg-white cursor-pointer font-medium"
                >
                  <option value="all">All Chambers</option>
                  {availableChambers.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>

              </div>
            </div>

            {/* Inventory Cards Grid */}
            {filteredStoredLots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStoredLots.map((item) => (
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

                      <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#566861]">Available to Trade:</span>
                          <span className={`font-bold ${item.availableQuantity > 0 ? 'text-[#10B981]' : 'text-[#566861]'}`}>
                            {item.availableQuantity} {item.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#566861]">Locked / Listed:</span>
                          <span className={`font-bold ${item.lockedQuantity > 0 ? 'text-[#D97706]' : 'text-[#566861]'}`}>
                            {item.lockedQuantity || 0} {item.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between gap-2">
                      <span className="text-xs text-[#566861] truncate">
                        Assay: {item.assayedQuality?.moisture || 'Standard'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.availableQuantity === 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDispatchLot(item)}
                            className="text-[11px] font-semibold py-1.5 px-2 text-[#D97706] hover:text-[#B45309] border-[#FDE68A] bg-[#FEF3C7]/40"
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
                          className="text-xs font-bold py-1.5 px-3"
                        >
                          Audit e-NWR
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
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
              <Badge variant="emerald" size="sm">
                {filteredDispatchedLots.length} Dispatched Lots
              </Badge>
            </div>

            {filteredDispatchedLots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDispatchedLots.map((item) => (
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
    </DashboardLayout>
  );
}
