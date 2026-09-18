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
  MessageSquare
} from 'lucide-react';
import { openDirectChat } from '../../utils/chat';

export default function WarehouseCard({ warehouse, onDeposit }) {
  if (!warehouse) return null;

  const isCold = Boolean(
    warehouse.facilityType?.toLowerCase()?.includes('cold') ||
    warehouse.name?.toLowerCase()?.includes('cold')
  );

  const occupancyPercent = Number(warehouse.occupancyPercent ?? warehouse.occupancyPct ?? 0);
  const occupiedTonnes = Number(warehouse.occupiedTonnes ?? 0);
  const totalCapacityTonnes = Number(warehouse.totalCapacityTonnes || warehouse.capacity || 2000);
  const monthlyRatePerTonne = Number(warehouse.monthlyRatePerTonne || 350);

  const handleChat = () => {
    openDirectChat({
      partnerId: warehouse.id || warehouse.name?.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      partnerName: warehouse.name || 'Warehouse Operator',
      partnerRole: 'Warehouse Operator',
      facilityName: warehouse.name || 'Warehouse',
      initialMessage: `Hello, I am inquiring about storage capacity availability and deposit rates at ${warehouse.name || 'your warehouse'}.`,
    });
  };

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
                {warehouse.name || 'Certified Storage Hub'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider">
                  {warehouse.wdraCode || 'WDRA Certified'}
                </span>
                <span className="text-xs text-[#566861]">
                  • {warehouse.district || 'District'}, {warehouse.state || 'State'}
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
              {warehouse.facilityType || 'WDRA Accredited Agri Storage'}
            </span>
          </div>

          {/* Occupancy Progress */}
          <div className="space-y-1.5 pt-2 border-t border-[#E5EDE8]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#566861] font-medium">Current Storage Capacity</span>
              <span className="font-extrabold text-[#0B3326]">
                {occupancyPercent}% Occupied
              </span>
            </div>

            <div className="w-full bg-[#E5EDE8] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  occupancyPercent > 80 ? 'bg-[#D97706]' : 'bg-[#10B981]'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, occupancyPercent))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#566861]">
              <span>Stored: {occupiedTonnes} T</span>
              <span>Total: {totalCapacityTonnes} Tonnes</span>
            </div>
          </div>

          {/* Storage Pricing */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E5EDE8] text-xs">
            <span className="text-[#566861]">Storage Rental Rate:</span>
            <span className="font-extrabold text-[#0B3326] font-heading text-sm">
              ₹{monthlyRatePerTonne} / Tonne / month
            </span>
          </div>
        </div>

        {/* Available Chambers */}
        <div className="space-y-1 text-xs">
          <span className="text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
            Chambers & Storage Cells
          </span>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {(Array.isArray(warehouse.chambers) && warehouse.chambers.length > 0 ? warehouse.chambers : ['Dry Storage', 'Cold Cell']).map((chamber, i) => (
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

      {/* Action Footer: Direct Chat & Deposit Buttons */}
      <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleChat}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EBF5F0] hover:bg-[#D1FAE5] text-[#0B3326] border border-[#10B981]/30 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
          title={`Chat directly with ${warehouse.name}`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#10B981] group-hover:scale-110 transition-transform" />
          <span>Chat with Warehouse</span>
        </button>

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
