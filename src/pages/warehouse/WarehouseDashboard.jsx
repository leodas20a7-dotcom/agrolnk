import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ReceiptDetailModal from '../../components/warehouse/ReceiptDetailModal';
import {
  Building2,
  Package,
  CheckCircle2,
  ShieldCheck,
  Award,
  Layers,
  ThermometerSnowflake,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { getWarehouseOperatorStats, getWarehouseInventory, getWarehouseById } from '../../utils/warehouses';

export default function WarehouseDashboard({ currentUser, onNavigate }) {
  const user = currentUser || {
    id: 'usr_warehouse_05',
    name: 'Salem Agri Cold Storage Hub',
    role: 'warehouse',
  };

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'chambers' | 'releases'
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadData = async () => {
    try {
      const [computedStats, inv] = await Promise.all([
        getWarehouseOperatorStats('wh_salem_01'),
        getWarehouseReceipts(),
      ]);
      setStats(computedStats);
      setInventory(inv || []);
    } catch (err) {
      console.error('Error loading warehouse data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const warehouse = stats?.warehouse || getWarehouseById('wh_salem_01');

  const chambersList = [
    { name: 'Chamber A1 (Dry Storage)', temp: 'Ambient (24°C)', capacity: '1,200 T', occupied: '950 T', pct: 79, commodities: 'Turmeric, Grains' },
    { name: 'Chamber B2 (Cold Cell)', temp: '4°C - 8°C', capacity: '1,500 T', occupied: '1,100 T', pct: 73, commodities: 'Potatoes, Carrots' },
    { name: 'Chamber B4 (Ultra Cold)', temp: '2°C - 4°C', capacity: '1,300 T', occupied: '1,050 T', pct: 81, commodities: 'Hybrid Tomatoes, Fruits' },
    { name: 'Chamber C1 (CA Controlled)', temp: '0°C - 2°C (CA)', capacity: '1,000 T', occupied: '600 T', pct: 60, commodities: 'Export Apples, Grapes' },
  ];

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Building2 className="w-3.5 h-3.5" /> Warehouse Management & e-NWR Terminal
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              {warehouse.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#DCFCE7]/90 leading-relaxed">
              WDRA License: <strong>{warehouse.wdraCode}</strong> • {warehouse.facilityType} • {warehouse.address}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-xs text-right shrink-0">
            <span className="text-white/80 block">Accredited Capacity</span>
            <span className="font-bold text-[#34D399] block text-base font-heading">
              {warehouse.totalCapacityTonnes} Tonnes
            </span>
            <span className="text-[11px] text-white/70 block">
              Multi-Chamber Cold Chain
            </span>
          </div>
        </div>

        {/* 4 Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Capacity Utilization</span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {warehouse.occupancyPercent}%
            </div>
            <div className="text-[11px] text-[#566861]">
              {warehouse.occupiedTonnes} T occupied / {warehouse.totalCapacityTonnes} T
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Active e-NWR Titles</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats?.activeReceipts ?? 0}
            </div>
            <div className="text-[11px] text-[#566861]">
              Legally certified warehouse receipts
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Stored Commodity Value</span>
              <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats?.totalValuation ?? '₹0'}
            </div>
            <div className="text-[11px] text-[#10B981] font-semibold">
              100% Comprehensive Transit Insured
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Pending Release Orders</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {stats?.releaseOrders ?? 0}
            </div>
            <div className="text-[11px] text-[#566861]">
              Awaiting transporter bay loading
            </div>
          </Card>

        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <span>Stored e-NWR Inventory Records</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'inventory'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861]'
              }`}
            >
              {inventory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chambers')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'chambers'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <span>Chamber & Storage Cell Telemetry</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'chambers'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861]'
              }`}
            >
              {chambersList.length}
            </span>
          </button>
        </div>

        {/* Content Section: Stored e-NWRs */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  Inbound Deposited Produce Batches
                </h2>
                <p className="text-xs text-[#566861]">
                  e-NWR electronic receipts issued under this WDRA warehouse license
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.map((item) => (
                <Card key={item.id} className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="emerald" size="sm">
                        {item.receiptNumber}
                      </Badge>
                      <span className="text-xs text-[#566861]">
                        Depositor: <strong>{item.farmerName}</strong>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-[#14211D]">
                        {item.commodity} ({item.totalQuantity} {item.unit})
                      </h4>
                      <span className="text-xs text-[#566861]">
                        {item.chamber} • Grade {item.grade}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#566861]">Available to Trade:</span>
                        <span className="font-bold text-[#10B981]">{item.availableQuantity} {item.unit}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#566861]">Locked / Listed:</span>
                        <span className="font-bold text-[#D97706]">{item.lockedQuantity || 0} {item.unit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between">
                    <span className="text-xs text-[#566861]">
                      Assay: {item.assayedQuality?.moisture || 'Standard'}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedReceipt(item)}
                      icon={ArrowRight}
                      iconPosition="right"
                      className="text-xs font-bold py-1.5"
                    >
                      Audit e-NWR
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Content Section: Chambers Telemetry */}
        {activeTab === 'chambers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  Storage Chambers & Atmosphere Cells
                </h2>
                <p className="text-xs text-[#566861]">
                  Live temperature control and storage utilization monitoring
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {chambersList.map((ch, idx) => (
                <Card key={idx} className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                        <ThermometerSnowflake className="w-4 h-4 text-[#10B981]" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-[#0B3326]">
                          {ch.name}
                        </h4>
                        <span className="text-xs text-[#10B981] font-semibold">
                          Target: {ch.temp}
                        </span>
                      </div>
                    </div>

                    <Badge variant={ch.pct > 80 ? 'amber' : 'emerald'} size="sm">
                      {ch.pct}% Full
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full bg-[#E5EDE8] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ch.pct > 80 ? 'bg-[#D97706]' : 'bg-[#10B981]'}`}
                        style={{ width: `${ch.pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#566861]">
                      <span>Occupied: {ch.occupied}</span>
                      <span>Capacity: {ch.capacity}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between text-xs">
                    <span className="text-[#566861]">Active Lots:</span>
                    <span className="font-bold text-[#14211D]">{ch.commodities}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* e-NWR Inspection Modal */}
      {selectedReceipt && (
        <ReceiptDetailModal
          inventory={selectedReceipt}
          currentUser={user}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </DashboardLayout>
  );
}
