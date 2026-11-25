import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DeliveryCard from '../../components/delivery/DeliveryCard';
import DeliveryRow from '../../components/delivery/DeliveryRow';
import DeliveryDetailModal from '../../components/delivery/DeliveryDetailModal';
import TransportQuoteModal from '../../components/delivery/TransportQuoteModal';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import TransporterKycBanner from '../../components/transporter/TransporterKycBanner';
import { useTransporterDesk } from '../../hooks/useTransporterDesk';
import {
  Truck,
  Search,
  MapPin,
  AlertCircle,
  Compass,
  Navigation
} from 'lucide-react';

export default function TransporterLoads({ currentUser, onNavigate, navState, pageMode = 'loads' }) {
  const isTripsPage = pageMode === 'trips';
  const defaultTab = isTripsPage ? 'active' : 'available';
  const activeRoutePage = isTripsPage ? 'transporter-trips' : 'transporter-loads';

  const user = currentUser || {
    id: '',
    name: 'Transporter',
    email: '',
    role: 'transporter',
  };

  const {
    fleetVehicles,
    currentKycStatus,
    setCurrentKycStatus,
    isVerified,
    inspectingDoc,
    setInspectingDoc,
    isVerificationModalOpen,
    setIsVerificationModalOpen,
    handleOpenKycAction,
    availableJobs,
    myQuotedDeliveries,
    activeTrips,
    completedTrips,
    loadData,
  } = useTransporterDesk(user);

  const [activeTab, setActiveTab] = useState(navState?.initialTab || defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [viewMode, setViewMode] = useState('row');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [quotingDelivery, setQuotingDelivery] = useState(null);

  useEffect(() => {
    setActiveTab(navState?.initialTab || defaultTab);
    setCurrentPage(1);
  }, [navState?.initialTab, defaultTab]);

  const availableStates = useMemo(() => {
    const states = new Set();
    [...availableJobs, ...myQuotedDeliveries, ...activeTrips, ...completedTrips].forEach((d) => {
      if (d.pickupLocation?.state) states.add(d.pickupLocation.state);
      if (d.deliveryLocation?.state) states.add(d.deliveryLocation.state);
    });
    return Array.from(states).sort();
  }, [availableJobs, myQuotedDeliveries, activeTrips, completedTrips]);

  const tabs = isTripsPage
    ? [
        { id: 'active', label: 'Active Trips', count: activeTrips.length },
        { id: 'completed', label: 'Completed Trips', count: completedTrips.length },
      ]
    : [
        { id: 'available', label: 'Available Loads', count: availableJobs.length },
        { id: 'quoted', label: 'My Submitted Bids', count: myQuotedDeliveries.length },
      ];

  const baseList = useMemo(() => {
    if (activeTab === 'quoted') return myQuotedDeliveries;
    if (activeTab === 'active') return activeTrips;
    if (activeTab === 'completed') return completedTrips;
    return availableJobs;
  }, [activeTab, availableJobs, myQuotedDeliveries, activeTrips, completedTrips]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return baseList.filter((d) => {
      const pState = d.pickupLocation?.state || '';
      const dState = d.deliveryLocation?.state || '';
      if (stateFilter !== 'all' && pState !== stateFilter && dState !== stateFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        d.deliveryNumber,
        d.orderNumber,
        d.commodity,
        d.farmerName,
        d.buyerName,
        d.pickupLocation?.district,
        d.pickupLocation?.state,
        d.pickupLocation?.address,
        d.deliveryLocation?.district,
        d.deliveryLocation?.state,
        d.deliveryLocation?.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [baseList, searchQuery, stateFilter]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedDeliveries = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleStartQuote = (delivery) => {
    if (!isVerified) {
      setIsVerificationModalOpen(true);
      return;
    }
    setQuotingDelivery(delivery);
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPage={activeRoutePage}>
      <div className="space-y-6 text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#0B3326] text-[11px] font-bold mb-1.5">
              {isTripsPage ? (
                <Navigation className="w-3.5 h-3.5 text-[#10B981]" />
              ) : (
                <Compass className="w-3.5 h-3.5 text-[#10B981]" />
              )}
              <span>{isTripsPage ? 'Assigned & Completed Dispatch' : 'Freight Marketplace & Bidding'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading tracking-tight">
              {isTripsPage ? 'My Trips' : 'Freight Load Board'}
            </h1>
            <p className="text-xs sm:text-sm text-[#566861] mt-0.5">
              {isTripsPage
                ? 'Manage active pickup & delivery milestones and review completed haulage trips.'
                : 'Browse farmgate dispatch routes and compare your active freight bids.'}
            </p>
          </div>

          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5">
            {fleetVehicles.length === 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('transporter-fleet')}
                className="text-xs font-bold cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 mr-1.5 text-[#10B981]" />
                Add Truck ({fleetVehicles.length})
              </Button>
            ) : <span className="sm:hidden" />}
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        </div>

        {/* Shared KYC Banner */}
        <TransporterKycBanner
          user={user}
          currentKycStatus={currentKycStatus}
          onOpenKycAction={handleOpenKycAction}
          isVerificationModalOpen={isVerificationModalOpen}
          onCloseVerificationModal={() => setIsVerificationModalOpen(false)}
          onVerificationSuccess={() => {
            setIsVerificationModalOpen(false);
            setCurrentKycStatus('pending');
          }}
          inspectingDoc={inspectingDoc}
          onCloseInspectingDoc={() => setInspectingDoc(null)}
        />

        {/* Search & State Filter Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5EDE8] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search commodity, district, route, or manifest ID..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#F8FAF8] border border-[#E5EDE8] px-3 py-2 rounded-xl sm:w-52">
            <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-[#0B3326] focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Route States</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-[#10B981] text-white' : 'bg-[#F8FAF8] text-[#566861]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loads List */}
        {paginatedDeliveries.length > 0 ? (
          <div className="space-y-5">
            {!isVerified && activeTab === 'available' && (
              <div className="p-3.5 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#92400E]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span>
                    <strong>Verification Pending:</strong> Quoting and trip acceptance unlock once Admin approves your KYC documents.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="accent"
                  onClick={handleOpenKycAction}
                  className="shrink-0 text-xs font-bold py-1.5 px-3 bg-[#D97706] hover:bg-[#B45309] text-white"
                >
                  View KYC
                </Button>
              </div>
            )}

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {paginatedDeliveries.map((item) => (
                  <DeliveryCard
                    key={item.id}
                    delivery={item}
                    viewerRole="transporter"
                    currentUserId={user.id}
                    isVerified={isVerified}
                    onView={(d) => setSelectedDelivery(d)}
                    onAccept={(d) => handleStartQuote(d)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedDeliveries.map((item) => (
                  <DeliveryRow
                    key={item.id}
                    delivery={item}
                    viewerRole="transporter"
                    currentUserId={user.id}
                    isVerified={isVerified}
                    onView={(d) => setSelectedDelivery(d)}
                    onAccept={(d) => handleStartQuote(d)}
                  />
                ))}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredList.length}
              pageSize={pageSize}
            />
          </div>
        ) : (
          <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center mx-auto">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading">
              No matching freight loads found
            </h3>
            <p className="text-xs text-[#566861] max-w-sm mx-auto">
              {searchQuery || stateFilter !== 'all'
                ? 'Try clearing your search or route state filter.'
                : 'New dispatch manifests from farmers and buyers appear here automatically.'}
            </p>
            {(searchQuery || stateFilter !== 'all') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStateFilter('all');
                }}
              >
                Reset Filters
              </Button>
            )}
          </Card>
        )}
      </div>

      {quotingDelivery && (
        <TransportQuoteModal
          delivery={quotingDelivery}
          currentUser={user}
          isVerified={isVerified}
          onClose={() => setQuotingDelivery(null)}
          onSuccess={async () => {
            await loadData();
          }}
        />
      )}

      {selectedDelivery && (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          viewerRole="transporter"
          currentUser={user}
          onClose={() => setSelectedDelivery(null)}
          onStatusUpdated={() => loadData()}
          onRequestQuote={(d) => {
            setSelectedDelivery(null);
            handleStartQuote(d);
          }}
        />
      )}
    </DashboardLayout>
  );
}
