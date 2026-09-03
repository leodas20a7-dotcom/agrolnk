import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  Building2,
  MapPin,
  ShieldCheck,
  ThermometerSnowflake,
  Layers,
  ArrowRight,
  Phone
} from 'lucide-react';

export default function WarehouseCard({ warehouse, onDeposit }) {
  const isCold = warehouse.facilityType?.toLowerCase().includes('cold');

  return (
    <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 text-left flex flex-col justify-between">
      <div className="space-y-4">
        
        {/* Header: Warehouse Name & WDRA Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shrink-0">
              {isCold ? (
                <ThermometerSnowflake className="w-5 h-5 text-[#34D399]" />
              ) : (
                <Building2 className="w-5 h-5 text-[#34D399]" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                {warehouse.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider">
                  {warehouse.wdraCode}
                </span>
                <span className="text-xs text-[#566861]">
                  • {warehouse.district}, {warehouse.state}
                </span>
              </div>
            </div>
          </div>

          <Badge variant="emerald" size="sm">
            WDRA Certified
          </Badge>
        </div>

        {/* Facility & Capacity Specs */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#566861] font-medium">Facility Type:</span>
            <span className="font-bold text-[#14211D] text-right truncate max-w-[200px]">
              {warehouse.facilityType}
            </span>
          </div>

          {/* Occupancy Progress */}
          <div className="space-y-1.5 pt-2 border-t border-[#E5EDE8]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#566861] font-medium">Current Storage Capacity</span>
              <span className="font-extrabold text-[#0B3326]">
                {warehouse.occupancyPercent}% Occupied
              </span>
            </div>

            <div className="w-full bg-[#E5EDE8] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  warehouse.occupancyPercent > 80 ? 'bg-[#D97706]' : 'bg-[#10B981]'
                }`}
                style={{ width: `${warehouse.occupancyPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#566861]">
              <span>Stored: {warehouse.occupiedTonnes} T</span>
              <span>Total: {warehouse.totalCapacityTonnes} Tonnes</span>
            </div>
          </div>

          {/* Storage Pricing */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E5EDE8] text-xs">
            <span className="text-[#566861]">Storage Rental Rate:</span>
            <span className="font-extrabold text-[#0B3326] font-heading text-sm">
              ₹{warehouse.monthlyRatePerTonne} / Tonne / month
            </span>
          </div>
        </div>

        {/* Available Chambers */}
        <div className="space-y-1 text-xs">
          <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
            Chambers & Storage Cells
          </span>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {(warehouse.chambers || ['Dry Storage', 'Cold Cell']).map((chamber, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-[#EBF5F0] text-[#0B3326] text-[11px] font-semibold border border-[#10B981]/20"
              >
                {chamber}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#566861]">
          <Phone className="w-3.5 h-3.5 text-[#10B981]" />
          <span>{warehouse.operatorContact}</span>
        </div>

        {onDeposit && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => onDeposit(warehouse)}
            icon={ArrowRight}
            iconPosition="right"
            className="text-xs font-bold py-2 shadow-xs cursor-pointer"
          >
            Deposit Produce
          </Button>
        )}
      </div>
    </Card>
  );
}
