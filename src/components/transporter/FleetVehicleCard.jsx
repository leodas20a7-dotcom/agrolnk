import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import {
  Truck,
  User,
  Phone,
  Weight,
  Star,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export default function FleetVehicleCard({
  vehicle,
  onEdit,
  onDelete,
  onSetPrimary,
}) {
  const isPrimary = Boolean(vehicle.isPrimary);

  return (
    <Card
      hoverEffect
      className={`p-5 bg-white border transition-all text-left flex flex-col justify-between space-y-4 ${
        isPrimary
          ? 'border-[#10B981] shadow-md ring-1 ring-[#10B981]/20'
          : 'border-[#E5EDE8] shadow-xs'
      }`}
    >
      <div className="space-y-3.5">
        {/* Top: License Plate & Primary / Status Badge */}
        <div className="flex items-start justify-between gap-2">
          {/* Indian Vehicle Plate styling */}
          <div className="inline-flex items-center rounded-lg border-2 border-slate-800 bg-[#F8FAFC] shadow-2xs overflow-hidden">
            <div className="bg-[#1E3A8A] text-white font-mono font-extrabold text-[9px] px-1.5 py-1 flex flex-col items-center justify-center leading-none">
              <span>IND</span>
            </div>
            <div className="px-2.5 py-1 font-mono font-extrabold text-sm sm:text-base text-slate-900 tracking-wider">
              {vehicle.vehicleNumber}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isPrimary && (
              <Badge variant="emerald" size="sm">
                <Star className="w-3 h-3 fill-emerald-600 text-emerald-600 mr-1" />
                Primary Truck
              </Badge>
            )}
            <Badge
              variant={vehicle.status === 'on_trip' ? 'blue' : 'emerald'}
              size="sm"
            >
              {vehicle.status === 'on_trip' ? 'On Trip' : 'Available'}
            </Badge>
          </div>
        </div>

        {/* Vehicle Category & Capacity */}
        <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
              <Truck className="w-4 h-4 text-[#10B981]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#14211D] block">
                {vehicle.vehicleType || 'Commercial Freight Carrier'}
              </span>
              <span className="text-[11px] text-[#566861]">
                Payload Capacity: <strong className="text-[#0B3326]">{vehicle.capacityDisplay || '5.0 MT'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Driver Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-[#E5EDE8] space-y-0.5">
            <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold flex items-center gap-1">
              <User className="w-3 h-3 text-[#10B981]" /> Assigned Driver
            </span>
            <span className="font-bold text-[#14211D] truncate block">
              {vehicle.driverName || 'Not Assigned'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-[#E5EDE8] space-y-0.5">
            <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#10B981]" /> Driver Phone
            </span>
            <span className="font-mono font-semibold text-[#14211D] truncate block">
              {vehicle.driverPhone ? `+91 ${vehicle.driverPhone}` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between gap-2">
        {!isPrimary ? (
          <button
            type="button"
            onClick={() => onSetPrimary(vehicle.id)}
            className="text-xs font-semibold text-[#10B981] hover:text-[#0B3326] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Star className="w-3.5 h-3.5" /> Make Primary
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-[#0B3326] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> Active Dispatch Truck
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(vehicle)}
            className="p-1.5 rounded-lg text-[#566861] hover:text-[#0B3326] hover:bg-[#F2FBF6] transition-colors cursor-pointer"
            title="Edit vehicle details"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(vehicle.id)}
            className="p-1.5 rounded-lg text-[#566861] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Delete vehicle from fleet"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
