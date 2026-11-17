import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FleetVehicleCard from '../../components/transporter/FleetVehicleCard';
import AddEditVehicleModal from '../../components/transporter/AddEditVehicleModal';
import Pagination from '../../components/ui/Pagination';
import TransporterKycBanner from '../../components/transporter/TransporterKycBanner';
import { useTransporterDesk } from '../../hooks/useTransporterDesk';
import {
  deleteFleetVehicle,
  setPrimaryVehicle
} from '../../utils/fleet';
import {
  Truck,
  PlusCircle,
  CheckCircle2,
  Package
} from 'lucide-react';

export default function TransporterFleet({ currentUser, onNavigate }) {
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
    currentKycStatus,
    setCurrentKycStatus,
    inspectingDoc,
    setInspectingDoc,
    isVerificationModalOpen,
    setIsVerificationModalOpen,
    handleOpenKycAction,
  } = useTransporterDesk(user);

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.ceil(fleetVehicles.length / pageSize) || 1;
  const paginatedFleet = fleetVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalCapacityMt = useMemo(() => {
    const totalKg = fleetVehicles.reduce((sum, v) => sum + (Number(v.maxCapacityKg) || 0), 0);
    return Math.round((totalKg / 1000) * 10) / 10;
  }, [fleetVehicles]);

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
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPage="transporter-fleet">
      <div className="space-y-6 text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#0B3326] text-[11px] font-bold mb-1.5">
              <Truck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Commercial Fleet &amp; Drivers</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading tracking-tight">
              My Truck Fleet
            </h1>
            <p className="text-xs sm:text-sm text-[#566861] mt-0.5">
              Save your vehicles and assigned drivers for 1-click filling when quoting freight loads.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleAddNewVehicle}
            className="cursor-pointer shadow-xs self-start sm:self-auto font-bold"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Add Truck
          </Button>
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

        {/* Fleet Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 bg-white border border-[#E5EDE8] space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Registered Vehicles</span>
              <Truck className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="text-2xl font-extrabold text-[#0B3326] font-heading">
              {fleetVehicles.length}
            </div>
          </Card>

          <Card className="p-5 bg-white border border-[#E5EDE8] space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Combined Capacity</span>
              <Package className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="text-2xl font-extrabold text-[#0B3326] font-heading">
              {totalCapacityMt > 0 ? `${totalCapacityMt} MT` : '—'}
            </div>
          </Card>

          <Card className="p-5 bg-white border border-[#E5EDE8] space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Primary Dispatch Truck</span>
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="text-lg font-extrabold font-mono text-[#0B3326] truncate">
              {primaryVehicle ? primaryVehicle.vehicleNumber : 'None Set'}
            </div>
          </Card>
        </div>

        {/* Fleet Cards */}
        {fleetVehicles.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedFleet.map((veh) => (
                <FleetVehicleCard
                  key={veh.id}
                  vehicle={veh}
                  onEdit={handleEditVehicle}
                  onDelete={handleDeleteVehicle}
                  onSetPrimary={handleSetPrimary}
                />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={fleetVehicles.length}
              pageSize={pageSize}
            />
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
                Add your trucks and drivers once to assign them with a single click when quoting loads.
              </p>
            </div>
            <div>
              <Button variant="primary" size="md" onClick={handleAddNewVehicle} className="cursor-pointer">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Add Truck
              </Button>
            </div>
          </Card>
        )}
      </div>

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
