import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
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
  Zap,
  Package,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  MapPin,
  Tag,
  Layers,
  Check
} from 'lucide-react';
import { getAdminMetrics } from '../../utils/admin';
import { formatINR } from '../../utils/commission';
import { getListings, checkListingBookings, deleteListing, COMMODITY_IMAGES } from '../../utils/listings';
import DemoEscrowLiveModal from '../../components/escrow/DemoEscrowLiveModal';
import ProduceDetailModal from '../../components/farmer/ProduceDetailModal';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function AdminDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Platform Admin',
    role: 'admin',
    email: 'admin@agrolnk.com',
  };

  const [metrics, setMetrics] = useState({
    totalGMV: 0,
    totalOrdersCount: 0,
    completedOrdersCount: 0,
    totalCommissionsEarned: 0,
    buyerCommissions: 0,
    sellerCommissions: 0,
    totalEscrowLocked: 0,
    activeEscrowOrdersCount: 0,
    pendingKYCCount: 0,
    verifiedKYCCount: 0,
    totalKYCUsers: 0,
    totalFinancingDeployed: 0,
    activeDeliveriesCount: 0,
    storedWarehouseTonnes: 0,
  });
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);

  // Marketplace Listings Management State
  const [listings, setListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [blockedDeleteInfo, setBlockedDeleteInfo] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState(null);

  const fetchListingsData = async () => {
    try {
      const data = await getListings();
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch marketplace listings:', err);
    }
  };

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
    fetchListingsData();

    window.addEventListener('agrolnk_kyc_updated', fetchMetrics);
    window.addEventListener('agrolnk_orders_updated', fetchMetrics);
    window.addEventListener('agrolnk_order_updated', fetchMetrics);
    window.addEventListener('agrolnk_financing_updated', fetchMetrics);
    window.addEventListener('agrolnk_listings_updated', fetchListingsData);
    window.addEventListener('storage', fetchMetrics);
    window.addEventListener('storage', fetchListingsData);

    return () => {
      isMounted = false;
      hideGlobalLoader();
      window.removeEventListener('agrolnk_kyc_updated', fetchMetrics);
      window.removeEventListener('agrolnk_orders_updated', fetchMetrics);
      window.removeEventListener('agrolnk_order_updated', fetchMetrics);
      window.removeEventListener('agrolnk_financing_updated', fetchMetrics);
      window.removeEventListener('agrolnk_listings_updated', fetchListingsData);
      window.removeEventListener('storage', fetchMetrics);
      window.removeEventListener('storage', fetchListingsData);
    };
  }, []);

  const handleDeleteClick = async (lot) => {
    if (!lot) return;
    try {
      showGlobalLoader('Auditing Booking Status...', 'Verifying buyer orders and escrow locks before deletion...');
      const check = await checkListingBookings(lot.id);
      hideGlobalLoader();

      if (!check.canDelete) {
        setBlockedDeleteInfo({
          listing: lot,
          reason: check.reason,
          orderNumber: check.orderNumber,
          buyerName: check.buyerName,
        });
      } else {
        setListingToDelete(lot);
      }
    } catch (err) {
      hideGlobalLoader();
      console.error('Error checking listing bookings:', err);
      setListingToDelete(lot);
    }
  };

  const handleConfirmDelete = async () => {
    if (!listingToDelete) return;
    setIsDeleting(true);
    try {
      await deleteListing(listingToDelete.id, user.id);
      setDeleteSuccessMsg(`"${listingToDelete.commodity}" listing was removed successfully from the marketplace.`);
      setTimeout(() => setDeleteSuccessMsg(null), 4000);
      setListingToDelete(null);
      if (selectedListing?.id === listingToDelete.id) {
        setSelectedListing(null);
      }
      await fetchListingsData();
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert(err.message || 'Failed to delete listing.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter listings by search query and category
  const filteredListings = listings.filter((item) => {
    const matchesSearch =
      (item.commodity && item.commodity.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.variety && item.variety.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.farmerName && item.farmerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.district && item.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.id && String(item.id).toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedCategory !== 'all' && item.commodity.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    return true;
  });

  const uniqueCommodities = Array.from(new Set(listings.map((l) => l.commodity).filter(Boolean)));

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
              Monitor user verifications, marketplace produce catalog, and escrow settlements.
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
              📞 Buyer Calls & Escrow ({metrics.activeEscrowOrdersCount})
            </Button>
          </div>
        </div>

        {/* Delete Success Toast Notification */}
        {deleteSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold">{deleteSuccessMsg}</span>
            </div>
            <button
              onClick={() => setDeleteSuccessMsg(null)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

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
              Buyer Call & Escrow Release Desk
            </h3>
            <p className="text-xs text-[#566861] mt-1">
              Verify delivered produce with buyer by phone & 1-click disburse to farmer bank account.
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

        {/* ========================================================================= */}
        {/* MARKETPLACE PRODUCE LISTINGS & MODERATION (WITH SAFE DELETE OPTION)       */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EDE8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0B3326] font-heading flex items-center gap-2">
                  Marketplace Produce Lots
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#10B981] font-bold">
                    {filteredListings.length} Active Lots
                  </span>
                </h2>
                <p className="text-xs text-[#566861]">
                  View, inspect, and moderate listed agricultural produce. Only unbooked items can be safely removed.
                </p>
              </div>
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search commodity or seller..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs focus:outline-none focus:border-[#10B981] focus:bg-white transition-all"
                />
              </div>

              {uniqueCommodities.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-medium text-[#0B3326] focus:outline-none focus:border-[#10B981]"
                >
                  <option value="all">All Commodities ({listings.length})</option>
                  {uniqueCommodities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Listings Table / Cards */}
          {filteredListings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAF8] text-[#566861] font-bold border-b border-[#E5EDE8]">
                    <th className="py-3 px-3">Commodity & Variety</th>
                    <th className="py-3 px-3">Seller / Origin</th>
                    <th className="py-3 px-3">Grade & Quantity</th>
                    <th className="py-3 px-3">Spot Price / Total</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EDE8]">
                  {filteredListings.map((lot) => {
                    const fallbackImg = COMMODITY_IMAGES[lot.commodity] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80';
                    const imgUrl = Array.isArray(lot.images) && lot.images[0] ? lot.images[0] : fallbackImg;
                    const totalVal = Number(lot.quantity || 0) * Number(lot.price || 0);

                    return (
                      <tr key={lot.id} className="hover:bg-[#F8FAF8] transition-colors group">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={imgUrl}
                              alt={lot.commodity}
                              className="w-10 h-10 rounded-xl object-cover border border-[#E5EDE8] shrink-0"
                            />
                            <div>
                              <div className="font-bold text-[#0B3326] text-xs sm:text-sm">
                                {lot.commodity}
                              </div>
                              <div className="text-[11px] text-[#566861]">
                                {lot.variety || 'Standard Quality'} &bull; Lot #{lot.id?.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#0B3326]">
                            {lot.farmerName || 'Registered Producer'}
                          </div>
                          <div className="text-[11px] text-[#566861] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#10B981]" />
                            <span>{lot.district || 'Tamil Nadu'}, {lot.state || 'India'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.5 rounded-md bg-[#EBF5F0] text-[#10B981] font-bold text-[10px]">
                              Grade {lot.grade || 'A'}
                            </span>
                          </div>
                          <div className="font-bold text-[#0B3326]">
                            {Number(lot.quantity || 0).toLocaleString('en-IN')} {lot.unit || 'kg'}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-[#10B981]">
                            ₹{Number(lot.price || 0).toLocaleString('en-IN')}/{lot.unit || 'kg'}
                          </div>
                          <div className="text-[11px] text-[#566861]">
                            Total: {formatINR(totalVal)}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            lot.status === 'sold'
                              ? 'bg-neutral-100 text-neutral-600'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${lot.status === 'sold' ? 'bg-neutral-400' : 'bg-emerald-500'}`} />
                            {lot.status === 'sold' ? 'Sold Out' : 'Active Listing'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedListing(lot)}
                              className="px-2.5 py-1.5 rounded-lg border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] text-[#0B3326] font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="View Full Produce Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteClick(lot)}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 hover:border-rose-300 text-rose-700 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="Delete Produce Lot (Allowed only if unbooked)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-[#566861] space-y-2">
              <Package className="w-8 h-8 text-[#10B981] mx-auto opacity-50" />
              <p className="font-semibold text-sm text-[#0B3326]">No Produce Listings Found</p>
              <p className="text-xs">No marketplace items match the selected filter criteria.</p>
            </div>
          )}
        </div>

        {/* Live Escrow Gateway & API Console Modal */}
        <DemoEscrowLiveModal
          isOpen={isEscrowModalOpen}
          onClose={() => setIsEscrowModalOpen(false)}
        />

        {/* Produce Detail Modal (Admin View & Delete) */}
        {selectedListing && (
          <ProduceDetailModal
            listing={selectedListing}
            isOpen={Boolean(selectedListing)}
            onClose={() => setSelectedListing(null)}
            onDelete={(lot) => {
              setSelectedListing(null);
              handleDeleteClick(lot);
            }}
          />
        )}

        {/* 1. Safe Delete Confirmation Modal (When 0 active bookings) */}
        {listingToDelete && (
          <Modal
            isOpen={Boolean(listingToDelete)}
            onClose={() => !isDeleting && setListingToDelete(null)}
            title="Confirm Produce Removal"
            subtitle="Marketplace Catalog Moderation"
            icon={Trash2}
            iconColor="text-rose-600"
            iconBg="bg-rose-50"
            maxWidth="max-w-md"
            footer={
              <div className="flex items-center justify-end gap-2 w-full">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setListingToDelete(null)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  {isDeleting ? 'Removing...' : 'Delete Listing'}
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-left">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm mb-0.5 text-amber-950">
                    Are you sure you want to delete this listing?
                  </span>
                  This will permanently remove the listed lot for{' '}
                  <strong className="text-amber-950 font-bold">"{listingToDelete.commodity}"</strong>{' '}
                  ({Number(listingToDelete.quantity).toLocaleString()} {listingToDelete.unit || 'kg'} by{' '}
                  {listingToDelete.farmerName || 'Farmer'}) from the AgroLnk national marketplace.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5 text-xs text-[#566861]">
                <div className="flex items-center justify-between">
                  <span>Booking Audit:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    0 Active Orders (Safe to Remove)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Lot Reference:</span>
                  <span className="font-mono text-[#0B3326] font-semibold">#{listingToDelete.id?.slice(0, 10)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Seller Name:</span>
                  <span className="text-[#0B3326] font-semibold">{listingToDelete.farmerName || 'Verified Producer'}</span>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* 2. Blocked Deletion Warning Modal (When produce is actively booked/ordered) */}
        {blockedDeleteInfo && (
          <Modal
            isOpen={Boolean(blockedDeleteInfo)}
            onClose={() => setBlockedDeleteInfo(null)}
            title="Deletion Blocked"
            subtitle="Active Buyer Booking Protection Policy"
            icon={Lock}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            maxWidth="max-w-lg"
            footer={
              <div className="flex items-center justify-end w-full">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setBlockedDeleteInfo(null)}
                  className="px-5 py-2 font-bold bg-[#0B3326] hover:bg-[#144234] text-white"
                >
                  Understood
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-left">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Cannot Delete Booked Produce Lot</span>
                </div>
                <p>
                  This produce lot cannot be removed because a buyer has already committed to purchase it under active contract/escrow.
                </p>
                {blockedDeleteInfo.orderNumber && (
                  <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-xs text-amber-950 font-medium">
                    <div>
                      <strong>Active Order:</strong> #{blockedDeleteInfo.orderNumber}
                    </div>
                    {blockedDeleteInfo.buyerName && (
                      <div>
                        <strong>Buyer:</strong> {blockedDeleteInfo.buyerName}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5 text-xs text-[#566861]">
                <div className="font-bold text-[#0B3326] text-xs">AgroLnk Escrow Protection Rule:</div>
                <p className="text-[11px] leading-relaxed">
                  Once a buyer deposits funds into the AgroLnk Escrow vault, the produce item is locked to guarantee fulfillment, dispatch logistics, and delivery OTP release.
                </p>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </DashboardLayout>
  );
}
