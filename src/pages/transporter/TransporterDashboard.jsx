import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DeliveryCard from '../../components/delivery/DeliveryCard';
import DeliveryDetailModal from '../../components/delivery/DeliveryDetailModal';
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
  AlertCircle
} from 'lucide-react';
import {
  getDeliveries,
  getAvailableTransportJobs,
  getTransporterDeliveries,
  getTransporterStats,
  acceptDeliveryJob
} from '../../utils/deliveries';
import { getTimeGreeting } from '../../utils/greeting';

export default function TransporterDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    id: 'usr_transporter_04',
    name: 'Vetri Logistics & Transport',
    role: 'transporter',
    vehicleType: '14ft Eicher Truck (4 Tonne)',
    vehicleNumber: 'TN 28 AB 4092',
    phone: '+91 94433 77889',
  };

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'active' | 'completed' | 'all'
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({
    availableJobs: 0,
    activeDeliveries: 0,
    completedTrips: 0,
    totalTonnes: 0,
  });
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const loadData = async () => {
    try {
      const [all, computedStats] = await Promise.all([
        getDeliveries(),
        getTransporterStats(user.id),
      ]);
      setDeliveries(all || []);
      setStats(computedStats);
    } catch (err) {
      console.error('Error loading transporter data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];

  const availableJobs = safeDeliveries.filter((d) => d.status === 'transport_requested');
  const myDeliveries = safeDeliveries.filter((d) => d.transporterId === user.id || (d.status !== 'transport_requested' && !d.transporterId));
  const activeTrips = myDeliveries.filter((d) => d.status === 'assigned' || d.status === 'picked_up' || d.status === 'in_transit');
  const completedTrips = myDeliveries.filter((d) => d.status === 'delivered' || d.status === 'completed');

  const tabs = [
    { id: 'available', label: 'Available Freight Jobs', count: availableJobs.length },
    { id: 'active', label: 'My Active Trips', count: activeTrips.length },
    { id: 'completed', label: 'Completed Deliveries', count: completedTrips.length },
    { id: 'all', label: 'All Manifests', count: safeDeliveries.length },
  ];

  const getFilteredList = () => {
    if (activeTab === 'available') return availableJobs;
    if (activeTab === 'active') return activeTrips;
    if (activeTab === 'completed') return completedTrips;
    return deliveries;
  };

  const filteredDeliveries = getFilteredList();

  const handleAcceptJobDirect = (delivery) => {
    acceptDeliveryJob(delivery.id, user);
    loadData();
    setActiveTab('active');
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

          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-xs text-right shrink-0">
            <span className="text-white/80 block">Active Vehicle</span>
            <span className="font-bold text-[#34D399] block text-sm">
              {user.vehicleNumber || 'TN 28 AB 4092'}
            </span>
            <span className="text-[11px] text-white/70 block">
              {user.vehicleType || '14ft Eicher Truck'}
            </span>
          </div>
        </div>

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

        {/* Deliveries & Jobs Management */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Logistics Dispatch Hub
              </h2>
              <p className="text-xs text-[#566861]">
                Accept new delivery jobs and manage live trip milestones
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
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

          {/* Grid of Delivery Cards */}
          {filteredDeliveries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredDeliveries.map((item) => (
                <DeliveryCard
                  key={item.id}
                  delivery={item}
                  viewerRole="transporter"
                  onView={(d) => setSelectedDelivery(d)}
                  onAccept={(d) => handleAcceptJobDirect(d)}
                />
              ))}
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
          )}
        </div>

      </div>

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
    </DashboardLayout>
  );
}
