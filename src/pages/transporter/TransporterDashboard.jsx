import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DeliveryCard from '../../components/delivery/DeliveryCard';
import DeliveryRow from '../../components/delivery/DeliveryRow';
import DeliveryDetailModal from '../../components/delivery/DeliveryDetailModal';
import TransportQuoteModal from '../../components/delivery/TransportQuoteModal';
import AddEditVehicleModal from '../../components/transporter/AddEditVehicleModal';
import FleetVehicleCard from '../../components/transporter/FleetVehicleCard';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import TransporterKycBanner from '../../components/transporter/TransporterKycBanner';
import { useTransporterDesk } from '../../hooks/useTransporterDesk';
import {
  Truck,
  CheckCircle2,
  Navigation,
  Clock,
  ArrowRight,
  PlusCircle,
  Settings2,
  Package,
  Compass
} from 'lucide-react';
import {
  deleteFleetVehicle,
  setPrimaryVehicle
} from '../../utils/fleet';
import { getTimeGreeting } from '../../utils/greeting';

export default function TransporterDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    id: '',
    name: 'Transporter',
    email: '',
    role: 'transporter',
  };

  const {
    fleetVehicles,
    setFleetVehicles,
    primaryVehicle,
    stats,
    currentKycStatus,
    setCurrentKycStatus,
    isVerified,
    inspectingDoc,
    setInspectingDoc,
    isVerificationModalOpen,
    setIsVerificationModalOpen,
    handleOpenKycAction,
    availableJobs,
    activeTrips,
    completedTrips,
    loadData,
  } = useTransporterDesk(user);

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'active' | 'completed' | 'fleet'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [viewMode, setViewMode] = useState('row');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [quotingDelivery, setQuotingDelivery] = useState(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const tabs = [
    { id: 'available', label: 'Available Freight Jobs', count: availableJobs.length },
    { id: 'active', label: 'My Active Trips', count: activeTrips.length },
    { id: 'completed', label: 'Completed Deliveries', count: completedTrips.length },
    { id: 'fleet', label: 'My Vehicle Fleet', count: fleetVehicles.length },
  ];

  const getFilteredList = () => {
    if (activeTab === 'active') return activeTrips;
    if (activeTab === 'completed') return completedTrips;
    return availableJobs;
  };

  const filteredDeliveries = getFilteredList();
  const totalPages = Math.ceil(filteredDeliveries.length / pageSize) || 1;
  const paginatedDeliveries = filteredDeliveries.slice(
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

  const handleDeleteVehicle = async (vehicleId) => {
    if (window.confirm('Are you sure you want to remove this vehicle from your fleet?')) {
      try {
        const updated = await deleteFleetVehicle(user.id, user.email, vehicleId);
        setFleetVehicles(updated);
      } catch (err) {
        console.error('Failed to delete vehicle:', err);
      }
    }
  };

  const handleSetPrimary = async (vehicleId) => {
    try {
      const updated = await setPrimaryVehicle(user.id, user.email, vehicleId);
      setFleetVehicles(updated);
    } catch (err) {
      console.error('Failed to set primary vehicle:', err);
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPage="transporter-dashboard">
      <div className="space-y-5 sm:space-y-8 text-left">

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-[11px] sm:text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Truck className="w-3.5 h-3.5 shrink-0" /> Agri Freight &amp; Transport Terminal
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              {getTimeGreeting(user.name).fullGreeting} {getTimeGreeting().emoji}
            </h1>
            <p className="text-xs sm:text-sm text-[#DCFCE7]/90 leading-relaxed">
              Find verified farmgate freight loads, manage trucks &amp; drivers, and track delivery milestones.
            </p>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1.5 w-full sm:w-auto">
              <Button
                variant="accent"
                size="sm"
                onClick={() => onNavigate('transporter-loads')}
                className="font-bold text-xs cursor-pointer justify-center w-full sm:w-auto"
              >
                <Compass className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span className="truncate">Load Board ({availableJobs.length})</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate('transporter-trips')}
                className="font-bold text-xs cursor-pointer justify-center w-full sm:w-auto bg-white/15 hover:bg-white/25 text-white border border-white/20"
              >
                <Navigation className="w-3.5 h-3.5 mr-1.5 text-[#34D399] shrink-0" />
                <span className="truncate">My Trips ({activeTrips.length})</span>
              </Button>
            </div>
          </div>

          <div className="w-full sm:w-auto sm:min-w-[210px] p-3.5 rounded-2xl bg-white/10 border border-white/20 text-xs flex flex-row sm:flex-col items-center sm:items-end justify-between text-left sm:text-right gap-3 sm:gap-1.5 shrink-0">
            <div className="min-w-0">
              <span className="text-white/80 block text-[11px]">Active Dispatch Vehicle</span>
              <span className="font-bold text-[#34D399] block text-sm font-mono tracking-wider truncate">
                {primaryVehicle ? primaryVehicle.vehicleNumber : (user.vehicleNumber || (isVerified ? 'No Truck Registered' : 'KYC Pending'))}
              </span>
              <span className="text-[11px] text-white/70 block truncate">
                {primaryVehicle ? `${primaryVehicle.driverName || 'Driver'} • ${primaryVehicle.vehicleType?.split('(')[0] || ''}` : 'Add a truck for 1-click quoting'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('transporter-fleet')}
              className="shrink-0 sm:mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Manage Fleet ({fleetVehicles.length})</span>
            </button>
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

        {/* 4 Core Metric Cards (2x2 Grid on Mobile, Clickable Shortcuts) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <Card
            hoverEffect
            onClick={() => onNavigate('transporter-loads', { initialTab: 'available' })}
            className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-2 sm:space-y-3 shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-[#566861] truncate">Available Jobs</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats.availableJobs}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861] flex items-center justify-between gap-1">
              <span className="truncate">Open for bids</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            </div>
          </Card>

          <Card
            hoverEffect
            onClick={() => onNavigate('transporter-trips', { initialTab: 'active' })}
            className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-2 sm:space-y-3 shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-[#566861] truncate">Active Trips</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center shrink-0">
                <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats.activeDeliveries}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861] flex items-center justify-between gap-1">
              <span className="truncate">In transit</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            </div>
          </Card>

          <Card
            hoverEffect
            onClick={() => onNavigate('transporter-trips', { initialTab: 'completed' })}
            className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-2 sm:space-y-3 shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-[#566861] truncate">Completed</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats.completedTrips}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861] flex items-center justify-between gap-1">
              <span className="truncate">Delivered</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            </div>
          </Card>

          <Card
            hoverEffect
            onClick={() => onNavigate('transporter-trips', { initialTab: 'completed' })}
            className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-2 sm:space-y-3 shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-[#566861] truncate">Tonnage</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center shrink-0">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats.totalTonnes || 0} T
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861] truncate">
              Verified weight
            </div>
          </Card>
        </div>

        {/* Quick Overview Dispatch Hub */}
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0B3326] font-heading">
                {activeTab === 'fleet' ? 'Fleet & Asset Dispatch Center' : 'Logistics Dispatch Hub'}
              </h2>
              <p className="text-xs text-[#566861]">
                {activeTab === 'fleet'
                  ? 'Manage registered commercial trucks, capacities, and assigned drivers'
                  : 'Quick preview of open freight loads & active dispatches'}
              </p>
            </div>

            {activeTab === 'fleet' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingVehicle(null);
                  setIsVehicleModalOpen(true);
                }}
                className="cursor-pointer shadow-xs self-start sm:self-auto"
              >
                ✛ Add Truck
              </Button>
            ) : (
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('transporter-loads')}
                  className="text-xs font-bold cursor-pointer"
                >
                  Full Load Board →
                </Button>
                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${isActive
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#F8FAF8] text-[#566861]'
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {activeTab === 'fleet' ? (
            fleetVehicles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {fleetVehicles.map((veh) => (
                  <FleetVehicleCard
                    key={veh.id}
                    vehicle={veh}
                    onEdit={(v) => {
                      setEditingVehicle(v);
                      setIsVehicleModalOpen(true);
                    }}
                    onDelete={handleDeleteVehicle}
                    onSetPrimary={handleSetPrimary}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto shadow-xs">
                  <Truck className="w-7 h-7 text-[#10B981]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0B3326] font-heading">
                    No Vehicles in Fleet Yet
                  </h3>
                  <p className="text-xs text-[#566861] max-w-sm mx-auto">
                    Add your trucks and drivers once to assign them with a single click when submitting freight quotes.
                  </p>
                </div>
                <div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setEditingVehicle(null);
                      setIsVehicleModalOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    ✛ Add Truck
                  </Button>
                </div>
              </Card>
            )
          ) : filteredDeliveries.length > 0 ? (
            <div className="space-y-6">
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
                totalItems={filteredDeliveries.length}
                pageSize={pageSize}
              />
            </div>
          ) : (
            <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center mx-auto shadow-2xs">
                <Truck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B3326] font-heading">
                  {activeTab === 'available'
                    ? 'No available freight jobs right now'
                    : `No ${activeTab} delivery trips found`}
                </h3>
                <p className="text-xs text-[#566861] max-w-sm mx-auto">
                  {activeTab === 'available'
                    ? 'When farmers dispatch agricultural lots to buyers, freight manifests will appear here for quoting and instant dispatch.'
                    : activeTab === 'active'
                    ? 'You have no active trips currently en route. Check open jobs to quote on cargo bookings.'
                    : 'Completed haulage trips and delivery receipts will be logged here.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                {activeTab !== 'available' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActiveTab('available');
                      setCurrentPage(1);
                    }}
                    className="font-bold gap-2 shadow-xs"
                  >
                    <Truck className="w-4 h-4" />
                    Check Available Freight Jobs
                  </Button>
                ) : null}
                <Button
                  variant={activeTab === 'available' ? 'accent' : 'secondary'}
                  size="sm"
                  onClick={() => onNavigate('transporter-fleet')}
                  className={`gap-2 ${activeTab === 'available' ? 'font-bold shadow-xs' : ''}`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Manage Truck Fleet
                </Button>
              </div>
            </Card>
          )}
        </div>
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
        />
      )}

      {isVehicleModalOpen && (
        <AddEditVehicleModal
          isOpen={isVehicleModalOpen}
          currentUser={user}
          vehicle={editingVehicle}
          onClose={() => {
            setIsVehicleModalOpen(false);
            setEditingVehicle(null);
          }}
          onSuccess={(updatedFleet) => {
            setFleetVehicles(updatedFleet);
          }}
        />
      )}
    </DashboardLayout>
  );
}
