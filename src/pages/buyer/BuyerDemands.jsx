import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PostDemandModal from '../../components/demands/PostDemandModal';
import {
  Plus,
  Compass,
  FileText,
  Clock,
  TrendingDown,
  CheckCircle2,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  Eye,
  Zap,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
  X
} from 'lucide-react';
import {
  getBuyerDemands,
  getDemandOffers,
  acceptDemandOffer,
  convertDemandToLiveAuction
} from '../../utils/demands';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import { useToast } from '../../context/ToastContext';

export default function BuyerDemands({ currentUser, onNavigate }) {
  const user = currentUser || { id: 'buyer_demo_1', name: 'Buyer', role: 'buyer' };
  const toast = useToast();

  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('all'); // 'all' | 'direct_offers' | 'reverse_auction'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedDemandOffers, setSelectedDemandOffers] = useState(null);
  const [offersList, setOffersList] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);

  const fetchDemands = async () => {
    try {
      const data = await getBuyerDemands();
      setDemands(data || []);
    } catch (err) {
      console.error('Error fetching buyer demands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
  }, []);

  const openOffersDrawer = async (demand) => {
    setSelectedDemandOffers(demand);
    setLoadingOffers(true);
    try {
      const list = await getDemandOffers(demand.id);
      setOffersList(list || []);
    } catch (err) {
      console.error('Failed to load offers:', err);
      setOffersList([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  const closeOffersDrawer = () => {
    setSelectedDemandOffers(null);
    setOffersList([]);
  };

  const handleAcceptOffer = async (offer) => {
    if (!selectedDemandOffers) return;
    if (!window.confirm(`Accept this offer from ${offer.farmer_name} at ₹${offer.offer_price}/${offer.unit} and generate escrow contract?`)) {
      return;
    }

    setActionProcessing(true);
    try {
      showGlobalLoader('Creating Escrow Contract...', 'Drafting procurement agreement and reserving trade escrow...');
      const order = await acceptDemandOffer(selectedDemandOffers.id, offer);
      toast.success(`Offer accepted! Escrow Order ${order.order_number} created.`);
      closeOffersDrawer();
      await fetchDemands();
      if (onNavigate) {
        onNavigate('buyer-orders');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to accept offer');
    } finally {
      hideGlobalLoader();
      setActionProcessing(false);
    }
  };

  const handleConvertToLiveAuction = async (demand) => {
    if (!window.confirm(`Convert "${demand.commodity}" to a 2-Hour Live Reverse Auction tender? Farmers will compete downward for the lowest supply quote.`)) {
      return;
    }

    try {
      showGlobalLoader('Launching Flash Reverse Tender...', 'Notifying verified supplier network...');
      await convertDemandToLiveAuction(demand.id, 2);
      toast.success('Converted to Live Reverse Tender! Active for 2 hours.');
      await fetchDemands();
    } catch (err) {
      toast.error(err.message || 'Failed to convert to live auction');
    } finally {
      hideGlobalLoader();
    }
  };

  // Filter logic
  const filteredDemands = demands.filter((d) => {
    if (modeFilter !== 'all' && d.procurement_mode !== modeFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (d.commodity || '').toLowerCase().includes(q);
      const matchVariety = (d.variety || '').toLowerCase().includes(q);
      const matchLoc = (d.delivery_district || '').toLowerCase().includes(q);
      const matchNum = (d.demand_number || '').toLowerCase().includes(q);
      if (!matchName && !matchVariety && !matchLoc && !matchNum) return false;
    }
    return true;
  });

  const activeCount = demands.filter((d) => d.status === 'open').length;
  const reverseTendersCount = demands.filter((d) => d.procurement_mode === 'reverse_auction' && d.status === 'open').length;
  const directOffersCount = demands.filter((d) => d.procurement_mode === 'direct_offers' && d.status === 'open').length;
  const awardedCount = demands.filter((d) => d.status === 'awarded').length;

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPage="buyer-demands">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 to-teal-950 p-6 sm:p-8 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Hybrid Procurement Desk
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              My Procurement Demands
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-2xl leading-relaxed">
              Post what produce you need. Receive direct offers at your target price, or run live reverse bidding where farmers compete downward.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={Plus}
              iconPosition="left"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-950/40 border-0"
              onClick={() => setIsPostModalOpen(true)}
            >
              Post Buy Requirement
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Demands</p>
              <p className="text-xl font-bold text-slate-800">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Direct Offers Active</p>
              <p className="text-xl font-bold text-slate-800">{directOffersCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Live Reverse Tenders</p>
              <p className="text-xl font-bold text-slate-800">{reverseTendersCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Awarded Orders</p>
              <p className="text-xl font-bold text-slate-800">{awardedCount}</p>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              onClick={() => setModeFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                modeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Modes ({demands.length})
            </button>
            <button
              onClick={() => setModeFilter('direct_offers')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                modeFilter === 'direct_offers'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              Direct Offers
            </button>
            <button
              onClick={() => setModeFilter('reverse_auction')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                modeFilter === 'reverse_auction'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
              Live Reverse Tenders
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search commodity or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="awarded">Awarded</option>
              <option value="closed">Closed</option>
            </select>

            <button
              onClick={fetchDemands}
              title="Refresh"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Demands List */}
        {filteredDemands.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Procurement Demands Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Post your buying requirement with desired volume, target price, and delivery location to start receiving farmer quotes.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              iconPosition="left"
              className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
              onClick={() => setIsPostModalOpen(true)}
            >
              Post First Requirement
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDemands.map((demand) => {
              const isReverse = demand.procurement_mode === 'reverse_auction';
              const isOpen = demand.status === 'open';
              const hasOffers = (demand.total_offers || 0) > 0;
              const currentLow = demand.current_lowest_bid || demand.target_price;

              return (
                <div
                  key={demand.id}
                  className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md p-5 ${
                    isReverse
                      ? 'border-amber-200/80 hover:border-amber-300'
                      : 'border-slate-200/80 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-400">
                          {demand.demand_number}
                        </span>

                        {isReverse ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Live Reverse Tender
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Direct Offers
                          </span>
                        )}

                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                            demand.status === 'awarded'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : demand.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {demand.status === 'awarded' ? 'Awarded (Order Placed)' : demand.status.toUpperCase()}
                        </span>

                        {demand.variety && demand.variety !== 'None' && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {demand.variety}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {demand.commodity}
                        </h3>
                        <span className="text-xs text-slate-500">Grade {demand.grade || 'A'}</span>
                      </div>

                      {/* Location & Delivery */}
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {demand.delivery_district
                              ? `${demand.delivery_district}, ${demand.delivery_state}`
                              : 'Pan-India'}
                          </span>
                        </div>
                        {demand.needed_by_date && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Needed by {demand.needed_by_date}</span>
                          </div>
                        )}
                        {isReverse && demand.bid_step && (
                          <div className="text-amber-700 font-medium">
                            Bid Step: ₹{demand.bid_step}/{demand.unit}
                          </div>
                        )}
                      </div>

                      {demand.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 italic">
                          "{demand.description}"
                        </p>
                      )}
                    </div>

                    {/* Middle: Volume & Target Price */}
                    <div className="flex items-center gap-6 sm:gap-8 border-y lg:border-y-0 lg:border-x border-slate-100 py-3 lg:py-0 lg:px-6">
                      <div>
                        <p className="text-[11px] text-slate-400 uppercase font-semibold">Volume</p>
                        <p className="text-base font-bold text-slate-800">
                          {demand.quantity?.toLocaleString()} <span className="text-xs font-normal text-slate-500">{demand.unit}</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-400 uppercase font-semibold">
                          {isReverse ? 'Leading Offer' : 'Target Budget'}
                        </p>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-lg font-extrabold ${isReverse ? 'text-amber-600' : 'text-emerald-700'}`}>
                            ₹{currentLow?.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500">/{demand.unit}</span>
                        </div>
                        {isReverse && demand.leading_bidder_name && (
                          <p className="text-[11px] text-emerald-600 font-medium">
                            Lead: {demand.leading_bidder_name}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-400 uppercase font-semibold">Offers</p>
                        <p className="text-base font-bold text-slate-800">
                          {demand.total_offers || 0}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold flex items-center gap-1.5 border-slate-300 hover:bg-slate-50"
                        onClick={() => openOffersDrawer(demand)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Offers ({demand.total_offers || 0})
                      </Button>

                      {/* Convert to Live Tender if in Direct mode and still open */}
                      {!isReverse && isOpen && (
                        <button
                          onClick={() => handleConvertToLiveAuction(demand)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline px-2 py-1"
                          title="Transform into competitive downward bidding"
                        >
                          <Zap className="w-3 h-3 text-amber-500" />
                          Launch Live Reverse Tender
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Slide-over / Modal for Viewing Received Offers */}
        {selectedDemandOffers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">
                      Farmer Offers for {selectedDemandOffers.commodity}
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      {selectedDemandOffers.demand_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target: ₹{selectedDemandOffers.target_price}/{selectedDemandOffers.unit} • Volume: {selectedDemandOffers.quantity} {selectedDemandOffers.unit}
                  </p>
                </div>
                <button
                  onClick={closeOffersDrawer}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                {loadingOffers ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Loading incoming quotes...
                  </div>
                ) : offersList.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Users className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No Offers Received Yet</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Farmers browsing the Wanted Produce board can see your requirement and will submit quotes shortly.
                    </p>
                  </div>
                ) : (
                  offersList.map((offer) => {
                    const isAccepted = offer.status === 'accepted';
                    const isDirectMatch = Number(offer.offer_price) <= Number(selectedDemandOffers.target_price);

                    return (
                      <div
                        key={offer.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isAccepted
                            ? 'bg-blue-50/60 border-blue-300'
                            : 'bg-white border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {offer.farmer_name}
                              </span>
                              {isDirectMatch && !isAccepted && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                  Matches Target Price
                                </span>
                              )}
                              {isAccepted && (
                                <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                                  Accepted
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              Offered Volume: <strong className="text-slate-700">{offer.quantity_offered} {offer.unit}</strong>
                            </p>
                            {offer.message && (
                              <p className="text-xs text-slate-600 italic">
                                "{offer.message}"
                              </p>
                            )}
                          </div>

                          <div className="text-right space-y-2">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Quote Price</p>
                              <p className="text-lg font-extrabold text-emerald-700">
                                ₹{offer.offer_price?.toLocaleString()}
                                <span className="text-xs font-normal text-slate-500">/{offer.unit}</span>
                              </p>
                            </div>

                            {selectedDemandOffers.status === 'open' && !isAccepted && (
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={actionProcessing}
                                onClick={() => handleAcceptOffer(offer)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold px-3 py-1.5"
                              >
                                Accept & Order
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <span>Accepting an offer automatically opens an Escrow order contract.</span>
                <Button variant="outline" size="sm" onClick={closeOffersDrawer}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Post Buy Requirement Modal */}
        <PostDemandModal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
          currentUser={user}
          onCreated={async () => {
            await fetchDemands();
            toast.success('Procurement requirement broadcasted successfully!');
          }}
        />
      </div>
    </DashboardLayout>
  );
}
