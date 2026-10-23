import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import Pagination from '../../components/ui/Pagination';
import SubmitOfferModal from '../../components/demands/SubmitOfferModal';
import DemandDetailModal from '../../components/demands/DemandDetailModal';
import {
  ShoppingBag,
  TrendingDown,
  MapPin,
  Calendar,
  Sparkles,
  Search,
  Filter,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  Send,
  Zap,
  Eye,
  FileText
} from 'lucide-react';
import { getBuyerDemands, placeDemandBid } from '../../utils/demands';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import { useToast } from '../../context/ToastContext';

export default function FarmerDemands({ currentUser, onNavigate }) {
  const user = currentUser || { id: 'farmer_demo_1', name: 'Farmer Partner', role: 'farmer' };
  const toast = useToast();

  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('all'); // 'all' | 'direct_offers' | 'reverse_auction'
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  // View Mode: 'grid' | 'rows'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('agrolnk_farmer_demands_viewmode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('agrolnk_farmer_demands_viewmode', mode);
    } catch {}
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Modals
  const [selectedDemandForOffer, setSelectedDemandForOffer] = useState(null);
  const [inspectingDemand, setInspectingDemand] = useState(null);

  const fetchDemands = async () => {
    try {
      const data = await getBuyerDemands({ status: 'open' });
      setDemands(data || []);
    } catch (err) {
      console.error('Error fetching buyer requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [modeFilter, stateFilter, searchQuery]);

  const handleQuickReverseBid = async (demand) => {
    const currentLow = Number(demand.current_lowest_bid || demand.target_price);
    const step = Number(demand.bid_step) || 25;
    const nextValidBid = currentLow - step;

    if (!window.confirm(`Submit competitive reverse offer of ₹${nextValidBid}/${demand.unit} for ${demand.commodity}?`)) {
      return;
    }

    try {
      showGlobalLoader('Submitting Bid...', 'Broadcasting reverse price offer to buyer...');
      await placeDemandBid(demand.id, user.id, user.name, nextValidBid);
      toast.success(`You are now leading with quote ₹${nextValidBid}/${demand.unit}!`);
      await fetchDemands();
    } catch (err) {
      toast.error(err.message || 'Bid submission failed');
    } finally {
      hideGlobalLoader();
    }
  };

  const filteredDemands = demands.filter((d) => {
    if (modeFilter !== 'all' && d.procurement_mode !== modeFilter) return false;
    if (stateFilter !== 'all' && d.delivery_state !== stateFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (d.commodity || '').toLowerCase().includes(q);
      const matchVariety = (d.variety || '').toLowerCase().includes(q);
      const matchCity = (d.delivery_district || '').toLowerCase().includes(q);
      const matchBuyer = (d.buyer_name || '').toLowerCase().includes(q);
      if (!matchName && !matchVariety && !matchCity && !matchBuyer) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredDemands.length / ITEMS_PER_PAGE) || 1;
  const paginatedDemands = filteredDemands.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const uniqueStates = Array.from(
    new Set(demands.map((d) => d.delivery_state).filter(Boolean))
  );

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPage="farmer-demands">
      <div className="max-w-7xl mx-auto space-y-6 pb-28 sm:pb-36">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 to-green-950 p-6 sm:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <ShoppingBag className="w-3.5 h-3.5" />
              Direct Buyer Demands
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Buyer Procurement Requests
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Wholesalers and millers actively looking for produce. Fulfill their target price instantly or submit your supply quotation.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl px-5 py-3.5 text-right">
              <span className="text-[11px] text-emerald-300 block font-semibold uppercase tracking-wider">
                Open Requests
              </span>
              <span className="text-2xl font-black text-white">{demands.length} Orders</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto shrink-0">
            <button
              onClick={() => setModeFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                modeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Requests ({demands.length})
            </button>
            <button
              onClick={() => setModeFilter('direct_offers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                modeFilter === 'direct_offers'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              Fixed Budget Demands
            </button>
            <button
              onClick={() => setModeFilter('reverse_auction')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                modeFilter === 'reverse_auction'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
              Live Reverse Bidding
            </button>
          </div>

          {/* Search, State, ViewMode & Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search produce or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {uniqueStates.length > 0 && (
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-semibold cursor-pointer"
              >
                <option value="all">All States</option>
                {uniqueStates.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            {/* Grid / Rows Toggle Switch */}
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={handleSetViewMode}
              gridLabel="Cards"
              rowsLabel="Rows"
            />

            <button
              onClick={fetchDemands}
              title="Refresh Requests"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Section */}
        {filteredDemands.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Open Buyer Requests Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are no requirements matching your current filters. Try resetting the filters or check back shortly.
            </p>
          </div>
        ) : viewMode === 'rows' ? (
          /* ================= ROWS / LIST VIEW ================= */
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
            {paginatedDemands.map((demand) => {
              const isReverse = demand.procurement_mode === 'reverse_auction';
              const currentLow = Number(demand.current_lowest_bid || demand.target_price);
              const step = Number(demand.bid_step) || 25;
              const nextBid = currentLow - step;
              const isLeading = demand.leading_bidder_id === user.id;

              return (
                <div
                  key={demand.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors grid grid-cols-2 lg:grid-cols-[minmax(0,1fr)_120px_150px_140px_140px] items-center gap-4 lg:gap-5"
                >
                  {/* Col 1: Commodity & Buyer Requirements */}
                  <div className="space-y-1.5 col-span-2 lg:col-span-1 min-w-0 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {demand.demand_number}
                      </span>
                      {isReverse ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Live Reverse Tender
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Fixed Budget
                        </span>
                      )}
                      {demand.variety && demand.variety !== 'None' && (
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {demand.variety}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">Grade {demand.grade || 'A'}</span>
                    </div>

                    <h3
                      onClick={() => setInspectingDemand(demand)}
                      className="text-base font-bold text-slate-900 hover:text-emerald-700 cursor-pointer transition-colors truncate"
                    >
                      {demand.commodity}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="truncate">Buyer: <strong className="text-slate-700">{demand.buyer_name || 'Verified Buyer'}</strong></span>
                      <span className="flex items-center gap-1 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {demand.delivery_district ? `${demand.delivery_district}, ${demand.delivery_state}` : 'India'}
                      </span>
                    </div>
                  </div>

                  {/* Col 2: Required Qty */}
                  <div className="col-span-1 lg:col-span-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Required Qty</p>
                    <p className="text-base font-extrabold text-slate-800 mt-0.5">
                      {demand.quantity?.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-500">{demand.unit}</span>
                    </p>
                  </div>

                  {/* Col 3: Target Price / Lowest Offer */}
                  <div className="col-span-1 lg:col-span-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {isReverse ? 'Lowest Offer' : 'Target Price'}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span
                        className={`text-lg font-black ${
                          isReverse ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        ₹{currentLow?.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">/{demand.unit}</span>
                    </div>
                  </div>

                  {/* Col 4: Secondary Action Button (Identical 140px width) */}
                  <div className="col-span-1 lg:col-span-1">
                    <button
                      type="button"
                      onClick={() => setInspectingDemand(demand)}
                      className={`w-full h-10 px-2.5 rounded-xl border border-slate-200/90 bg-white font-bold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer focus:outline-none active:scale-[0.98] ${
                        isReverse
                          ? 'hover:bg-amber-50/60 active:bg-amber-100 text-slate-700 hover:text-amber-800 hover:border-amber-300 focus:ring-2 focus:ring-amber-500/20'
                          : 'hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-emerald-800 hover:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20'
                      }`}
                    >
                      <Eye className="w-4 h-4 shrink-0 text-slate-500" />
                      <span className="whitespace-nowrap">Details</span>
                    </button>
                  </div>

                  {/* Col 5: Primary Action Button (Identical 140px width) */}
                  <div className="col-span-1 lg:col-span-1">
                    {isReverse ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDemandForOffer(demand)}
                        className="w-full h-10 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/30 active:scale-[0.98]"
                      >
                        <TrendingDown className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Place Bid</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedDemandForOffer(demand)}
                        className="w-full h-10 px-2.5 rounded-xl bg-[#0B3326] hover:bg-[#10B981] active:bg-[#059669] text-white font-bold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 active:scale-[0.98]"
                      >
                        <Send className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Send Offer</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= CRISPY CARDS / GRID VIEW ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedDemands.map((demand) => {
              const isReverse = demand.procurement_mode === 'reverse_auction';
              const currentLow = Number(demand.current_lowest_bid || demand.target_price);
              const step = Number(demand.bid_step) || 25;
              const nextBid = currentLow - step;
              const isLeading = demand.leading_bidder_id === user.id;

              return (
                <div
                  key={demand.id}
                  className={`bg-white rounded-3xl border transition-all duration-200 hover:shadow-xl flex flex-col h-full overflow-hidden relative group ${
                    isReverse
                      ? 'border-amber-200/90 hover:border-amber-400'
                      : 'border-slate-200/90 hover:border-emerald-500'
                  }`}
                >
                  {/* Subtle Colored Top Edge Accent */}
                  <div
                    className={`h-1.5 w-full shrink-0 ${
                      isReverse
                        ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                        : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    }`}
                  />

                  {/* Card Main Body: Flexible to ensure footer alignment across all cards */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      {/* Header badge & number */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          {demand.demand_number}
                        </span>
                        {isReverse ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Live Reverse Tender
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Fixed Budget
                          </span>
                        )}
                      </div>

                      {/* Commodity Title */}
                      <div>
                        <h3
                          onClick={() => setInspectingDemand(demand)}
                          className="text-xl font-black text-slate-900 leading-tight group-hover:text-emerald-700 cursor-pointer transition-colors"
                        >
                          {demand.commodity}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {demand.variety && demand.variety !== 'None' ? `${demand.variety} • ` : ''}
                          Grade <strong className="text-slate-700">{demand.grade || 'A'}</strong>
                        </p>
                      </div>

                      {/* Buyer & Destination Box */}
                      <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Buyer</span>
                          <span className="font-bold text-slate-800">{demand.buyer_name || 'Verified Buyer'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Delivery Destination</span>
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {demand.delivery_district ? `${demand.delivery_district}, ${demand.delivery_state}` : 'India'}
                          </span>
                        </div>
                      </div>

                      {/* Volume & Price Metrics */}
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            Required Qty
                          </p>
                          <p className="text-base font-black text-slate-800 mt-0.5">
                            {demand.quantity?.toLocaleString()}{' '}
                            <span className="text-xs font-semibold text-slate-500">{demand.unit}</span>
                          </p>
                        </div>

                        <div
                          className={`rounded-2xl p-3.5 border ${
                            isReverse
                              ? 'bg-amber-50/70 border-amber-200'
                              : 'bg-emerald-50/70 border-emerald-200'
                          }`}
                        >
                          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            {isReverse ? 'Lowest Offer' : 'Target Price'}
                          </p>
                          <p
                            className={`text-base font-black mt-0.5 ${
                              isReverse ? 'text-amber-700' : 'text-emerald-700'
                            }`}
                          >
                            ₹{currentLow?.toLocaleString()}
                            <span className="text-xs font-semibold text-slate-500">/{demand.unit}</span>
                          </p>
                        </div>
                      </div>

                      {/* Reverse Auction specific notes */}
                      {isReverse && (
                        <div className="text-xs flex items-center justify-between px-1 text-slate-600 font-medium">
                          <span>Bid Decrement: <strong>-₹{step}</strong></span>
                          {isLeading ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              You are Leading!
                            </span>
                          ) : demand.leading_bidder_name ? (
                            <span className="text-slate-500 text-[11px]">
                              Leader: {demand.leading_bidder_name}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Description pushed to flexible spacer */}
                    {demand.description && (
                      <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed mt-auto pt-2">
                        "{demand.description}"
                      </p>
                    )}
                  </div>

                  {/* Card Action Footer: Standardized sleek 40-42px height, 40:60 ratio, aligned baseline */}
                  <div className="p-3 sm:p-3.5 bg-slate-50/90 border-t border-slate-100 mt-auto shrink-0 flex items-center gap-2.5 sm:gap-3 w-full">
                    {isReverse ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setInspectingDemand(demand)}
                          className="basis-[40%] w-[40%] h-10 sm:h-[42px] px-2.5 sm:px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-amber-50/60 active:bg-amber-100 text-slate-700 hover:text-amber-800 hover:border-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          <Eye className="w-4 h-4 shrink-0 text-slate-500" />
                          <span className="truncate">Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDemandForOffer(demand)}
                          className="basis-[60%] w-[60%] flex-1 h-10 sm:h-[42px] px-3 sm:px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <TrendingDown className="w-4 h-4 shrink-0" />
                          <span className="truncate">Place Bid</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setInspectingDemand(demand)}
                          className="basis-[40%] w-[40%] h-10 sm:h-[42px] px-2.5 sm:px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-emerald-800 hover:border-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          <Eye className="w-4 h-4 shrink-0 text-slate-500" />
                          <span className="truncate">Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDemandForOffer(demand)}
                          className="basis-[60%] w-[60%] flex-1 h-10 sm:h-[42px] px-3 sm:px-4 rounded-xl bg-[#0B3326] hover:bg-[#10B981] active:bg-[#059669] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4 shrink-0" />
                          <span className="truncate">Send Offer</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredDemands.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={(p) => setCurrentPage(p)}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs"
        />

        {/* Detailed Product & Buyer Specs Overlay Modal */}
        <DemandDetailModal
          isOpen={!!inspectingDemand}
          onClose={() => setInspectingDemand(null)}
          demand={inspectingDemand}
          currentUser={user}
          onOpenOfferModal={(demand) => {
            setSelectedDemandForOffer(demand);
          }}
          onQuickBid={(demand) => {
            handleQuickReverseBid(demand);
          }}
        />

        {/* Submit Offer Modal */}
        <SubmitOfferModal
          isOpen={!!selectedDemandForOffer}
          onClose={() => setSelectedDemandForOffer(null)}
          demand={selectedDemandForOffer}
          currentUser={user}
          onSubmitted={async () => {
            await fetchDemands();
            toast.success('Supply quotation submitted to buyer!');
          }}
        />
      </div>
    </DashboardLayout>
  );
}
