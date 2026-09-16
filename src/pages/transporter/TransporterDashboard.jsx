import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DeliveryCard from '../../components/delivery/DeliveryCard';
import DeliveryRow from '../../components/delivery/DeliveryRow';
import DeliveryDetailModal from '../../components/delivery/DeliveryDetailModal';
import TransportQuoteModal from '../../components/delivery/TransportQuoteModal';
import VerificationRequiredModal from '../../components/verification/VerificationRequiredModal';
import DocumentViewerModal from '../../components/admin/DocumentViewerModal';
import AddEditVehicleModal from '../../components/transporter/AddEditVehicleModal';
import FleetVehicleCard from '../../components/transporter/FleetVehicleCard';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import {
  Truck,
  Package,
  CheckCircle2,
  Navigation,
  Clock,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileCheck,
  ArrowRight,
  PlusCircle,
  Settings2
} from 'lucide-react';
import {
  getDeliveries,
  getAvailableTransportJobs,
  getTransporterDeliveries,
  getTransporterStats,
  acceptDeliveryJob
} from '../../utils/deliveries';
import {
  getTransporterFleet,
  deleteFleetVehicle,
  setPrimaryVehicle
} from '../../utils/fleet';
import { getTimeGreeting } from '../../utils/greeting';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import { getResolvedUserKycStatus, fetchCurrentProfile } from '../../utils/auth';

export default function TransporterDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Kisan Logistics Fleet',
    role: 'transporter',
    id: 'usr_trans_01',
    email: 'logistics@agrolnk.com',
  };

  const [deliveries, setDeliveries] = useState([]);
  const [fleetVehicles, setFleetVehicles] = useState([]);
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'active' | 'completed' | 'fleet' | 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [viewMode, setViewMode] = useState('row');
  const [stats, setStats] = useState({
    totalEarnings: 0,
    activeDeliveries: 0,
    completedTrips: 0,
    totalTonnes: 0,
  });
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [quotingDelivery, setQuotingDelivery] = useState(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [inspectingDoc, setInspectingDoc] = useState(null);

  // Dynamic KYC Status state
  const [currentKycStatus, setCurrentKycStatus] = useState(() => getResolvedUserKycStatus(user));

  const isVerified = currentKycStatus === 'verified';

  const handleOpenKycAction = () => {
    if (currentKycStatus === 'pending') {
      try {
        const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
        const registry = storedRaw ? JSON.parse(storedRaw) : [];
        const found = registry.find((u) => u.id === user.id || u.email === user.email);
        if (found?.documents && found.documents.length > 0) {
          setInspectingDoc(found.documents[0]);
          return;
        }
      } catch { }
      if (user.documents && user.documents.length > 0) {
        setInspectingDoc(user.documents[0]);
        return;
      }
    }
    setIsVerificationModalOpen(true);
  };

  useEffect(() => {
    const syncKyc = async () => {
      const status = getResolvedUserKycStatus(user);
      setCurrentKycStatus(status);
      try {
        const profile = await fetchCurrentProfile();
        if (profile?.kycStatus) {
          setCurrentKycStatus(profile.kycStatus);
        }
      } catch { }
    };

    syncKyc();

    const handleFleetUpdate = (e) => {
      if (e?.detail?.fleet) {
        setFleetVehicles(e.detail.fleet);
      } else {
        getTransporterFleet(user.id, user.email).then(setFleetVehicles);
      }
    };

    window.addEventListener('agrolnk_kyc_updated', syncKyc);
    window.addEventListener('storage', syncKyc);
    window.addEventListener('agrolnk_user_profile_updated', syncKyc);
    window.addEventListener('agrolnk_fleet_updated', handleFleetUpdate);
    return () => {
      window.removeEventListener('agrolnk_kyc_updated', syncKyc);
      window.removeEventListener('storage', syncKyc);
      window.removeEventListener('agrolnk_user_profile_updated', syncKyc);
      window.removeEventListener('agrolnk_fleet_updated', handleFleetUpdate);
    };
  }, [user.id, user.email]);

  const loadData = async (showFlash = false) => {
    if (showFlash) {
      showGlobalLoader('Loading Freight Corridors & Fleet Telemetry...', 'Fetching available dispatch loads & fleet assets...');
    }
    try {
      const [all, computedStats, fleet] = await Promise.all([
        getDeliveries(),
        getTransporterStats(user.id),
        getTransporterFleet(user.id, user.email),
      ]);
      setDeliveries(all || []);
      setStats(computedStats);
      setFleetVehicles(fleet || []);
    } catch (err) {
      console.error('Error loading transporter data:', err);
    } finally {
      if (showFlash) {
        hideGlobalLoader();
      }
    }
  };

  useEffect(() => {
    loadData(true);
    return () => {
      hideGlobalLoader();
    };
  }, [user.id]);

  const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];

  const availableJobs = safeDeliveries.filter(
    (d) => d.status === 'transport_requested' || (d.status === 'price_offered' && d.transporterId === user.id)
  );
  // Strictly match this transporter's ID so unassigned demo orders are not falsely attributed
  const myDeliveries = safeDeliveries.filter((d) => d.transporterId === user.id);
  const activeTrips = myDeliveries.filter((d) => d.status === 'assigned' || d.status === 'picked_up' || d.status === 'in_transit');
  const completedTrips = myDeliveries.filter((d) => d.status === 'delivered' || d.status === 'completed');

  const primaryVehicle =
    fleetVehicles.find((v) => v.isPrimary) || fleetVehicles[0] || null;

  const tabs = [
    { id: 'available', label: 'Available Freight Jobs', count: availableJobs.length },
    { id: 'active', label: 'My Active Trips', count: activeTrips.length },
    { id: 'completed', label: 'Completed Deliveries', count: completedTrips.length },
    { id: 'fleet', label: 'My Vehicle Fleet', count: fleetVehicles.length },
  ];

  const getFilteredList = () => {
    if (activeTab === 'available') return availableJobs;
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

  const handleAddNewVehicle = () => {
    setEditingVehicle(null);
    setIsVehicleModalOpen(true);
  };

  const handleEditVehicle = (veh) => {
    setEditingVehicle(veh);
    setIsVehicleModalOpen(true);
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
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Truck className="w-3.5 h-3.5" /> Agri Freight & Transport Terminal
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              {getTimeGreeting(user.name).fullGreeting} {getTimeGreeting().emoji}
            </h1>
            <p className="text-xs sm:text-sm text-[#DCFCE7]/90 leading-relaxed">
              Find verified farmgate freight loads, accept delivery routes, and receive guaranteed escrow freight settlements.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-xs text-right shrink-0 flex flex-col justify-between items-end gap-1.5 min-w-[190px]">
            <div>
              <span className="text-white/80 block text-[11px]">Active Dispatch Vehicle</span>
              <span className="font-bold text-[#34D399] block text-sm font-mono tracking-wider">
                {primaryVehicle ? primaryVehicle.vehicleNumber : (user.vehicleNumber || (isVerified ? 'No Truck Registered' : 'KYC Pending'))}
              </span>
              <span className="text-[11px] text-white/70 block">
                {primaryVehicle ? primaryVehicle.vehicleType : (user.vehicleType || 'Click Manage to Add Truck')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('fleet');
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#34D399] hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
            >
              <Settings2 className="w-3 h-3" /> Manage Fleet ({fleetVehicles.length})
            </button>
          </div>
        </div>

        {/* Transporter KYC / Driving License Verification Alert Banner */}
        {!isVerified && (
          <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            currentKycStatus === 'pending'
              ? 'bg-amber-50/80 border-amber-200/80 text-amber-950'
              : currentKycStatus === 'rejected'
              ? 'bg-red-50/80 border-red-200/80 text-red-950'
              : 'bg-purple-50/70 border-purple-200 text-purple-950'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                currentKycStatus === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : currentKycStatus === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-purple-100 text-[#0B3326]'
              }`}>
                {currentKycStatus === 'pending' ? (
                  <Clock className="w-4 h-4" />
                ) : currentKycStatus === 'rejected' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold">
                    {currentKycStatus === 'pending'
                      ? 'KYC Verification Under Review'
                      : currentKycStatus === 'rejected'
                      ? 'KYC Documents Rejected'
                      : 'KYC Verification Required'}
                  </span>
                  <Badge variant={currentKycStatus === 'pending' ? 'amber' : currentKycStatus === 'rejected' ? 'red' : 'purple'} size="sm">
                    {currentKycStatus === 'pending' ? 'Reviewing' : currentKycStatus === 'rejected' ? 'Rejected' : 'Action Required'}
                  </Badge>
                </div>
                <p className="text-xs text-[#566861]">
                  {currentKycStatus === 'pending'
                    ? 'Documents are under review. Freight quoting and dispatch loads will activate once approved.'
                    : currentKycStatus === 'rejected'
                    ? 'Please review and re-submit your driving credentials.'
                    : 'Complete driver & vehicle verification to unlock corridor loads and payouts.'}
                </p>
              </div>
            </div>

            <Button
              variant={currentKycStatus === 'pending' ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleOpenKycAction}
              className="shrink-0 cursor-pointer shadow-xs whitespace-nowrap text-xs font-semibold py-1.5 px-3"
            >
              {currentKycStatus === 'pending' ? 'View' : currentKycStatus === 'rejected' ? 'Re-submit Proof' : 'Verify Now'}
            </Button>
          </div>
        )}

        {/* 4 Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Available Jobs */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Available Jobs</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats.availableJobs}
            </div>
            <div className="text-[11px] text-[#566861]">
              Awaiting transporter assignment
            </div>
          </Card>

          {/* Active Deliveries */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Active Trips</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats.activeDeliveries}
            </div>
            <div className="text-[11px] text-[#566861]">
              Currently assigned or in transit
            </div>
          </Card>

          {/* Completed Trips */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Completed Trips</span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats.completedTrips}
            </div>
            <div className="text-[11px] text-[#10B981] font-semibold">
              100% Escrow Freight Paid
            </div>
          </Card>

          {/* Total Tonnes Moved */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Produce Transported</span>
              <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center">
                <Package className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats.totalTonnes} T
            </div>
            <div className="text-[11px] text-[#566861]">
              Verified agricultural tonnage
            </div>
          </Card>

        </div>

        {/* Deliveries & Fleet Management Hub */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                {activeTab === 'fleet' ? 'Fleet & Asset Dispatch Center' : 'Logistics Dispatch Hub'}
              </h2>
              <p className="text-xs text-[#566861]">
                {activeTab === 'fleet'
                  ? 'Manage registered commercial trucks, capacities, and assigned drivers'
                  : 'Accept new delivery jobs and manage live trip milestones'}
              </p>
            </div>

            {activeTab === 'fleet' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddNewVehicle}
                className="cursor-pointer shadow-xs"
              >
                ✛ Add Truck
              </Button>
            ) : (
              <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
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

          {/* Active Tab Content */}
          {activeTab === 'fleet' ? (
            /* FLEET MANAGEMENT TAB CONTENT */
            fleetVehicles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {fleetVehicles.map((veh) => (
                  <FleetVehicleCard
                    key={veh.id}
                    vehicle={veh}
                    onEdit={handleEditVehicle}
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
                    onClick={handleAddNewVehicle}
                    className="cursor-pointer"
                  >
                    ✛ Add Truck
                  </Button>
                </div>
              </Card>
            )
          ) : (
            /* DELIVERIES TABS CONTENT */
            filteredDeliveries.length > 0 ? (
              <div className="space-y-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {paginatedDeliveries.map((item) => (
                      <DeliveryCard
                        key={item.id}
                        delivery={item}
                        viewerRole="transporter"
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
                        onView={(d) => setSelectedDelivery(d)}
                        onAccept={(d) => handleStartQuote(d)}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredDeliveries.length}
                  pageSize={pageSize}
                />
              </div>
            ) : (
              <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
                  <Truck className="w-6 h-6 text-[#10B981]" />
                </div>
                <h3 className="text-base font-bold text-[#0B3326] font-heading">
                  No {activeTab} delivery manifests found
                </h3>
                <p className="text-xs text-[#566861] max-w-sm mx-auto">
                  When farmers arrange transport for confirmed orders, new freight jobs will appear here for bidding and acceptance.
                </p>
              </Card>
            )
          )}
        </div>

      </div>

      {/* Transporter Quote Submission Modal */}
      {quotingDelivery && (
        <TransportQuoteModal
          delivery={quotingDelivery}
          currentUser={user}
          onClose={() => setQuotingDelivery(null)}
          onSuccess={async () => {
            await loadData();
          }}
        />
      )}

      {/* Delivery Inspection & Action Modal */}
      {selectedDelivery && (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          viewerRole="transporter"
          currentUser={user}
          onClose={() => setSelectedDelivery(null)}
          onStatusUpdated={() => loadData()}
        />
      )}

      {/* Transporter KYC Verification Modal */}
      {isVerificationModalOpen && (
        <VerificationRequiredModal
          isOpen={isVerificationModalOpen}
          currentUser={user}
          actionName="submit freight quotes and accept dispatch loads"
          onClose={() => setIsVerificationModalOpen(false)}
          onSuccess={() => {
            setIsVerificationModalOpen(false);
            setCurrentKycStatus('pending');
          }}
        />
      )}

      {/* Fleet Vehicle Add / Edit Modal */}
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

      {/* Document Inspection Modal */}
      {inspectingDoc && (
        <DocumentViewerModal
          isOpen={!!inspectingDoc}
          onClose={() => setInspectingDoc(null)}
          document={inspectingDoc}
          user={user}
        />
      )}
    </DashboardLayout>
  );
}
