import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Building2,
  ShieldCheck,
  Lock,
  Thermometer,
  FileCheck,
  Search,
  ArrowUpRight,
  Landmark,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { getInventory, getWarehouses } from '../../utils/warehouses';

export default function CollateralVault({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Kisan Capital Partners',
    role: 'financier',
    email: 'financier@agrolnk.com',
  };

  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadVault = async () => {
      try {
        const [inv, wh] = await Promise.all([
          getInventory(),
          Promise.resolve(getWarehouses()),
        ]);
        if (isMounted) {
          setInventory(Array.isArray(inv) ? inv : []);
          setWarehouses(Array.isArray(wh) ? wh : []);
        }
      } catch (err) {
        console.error('Error loading collateral vault:', err);
      }
    };
    loadVault();
    return () => {
      isMounted = false;
    };
  }, []);

  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const filteredInventory = safeInventory.filter((item) => {
    return (
      item?.commodity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item?.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item?.farmerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item?.warehouseName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalVaultValue = safeInventory.reduce(
    (sum, item) => sum + (Number(item?.estimatedValue) || 0),
    0
  );

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-5 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#0F4A37] text-[11px] sm:text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Building2 className="w-3.5 h-3.5" />
              <span className="sm:hidden">WDRA Vault</span>
              <span className="hidden sm:inline">WDRA Certified Vault & Physical Collateral Registry</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold font-heading">
              Collateral Vault & e-NWRs
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-[#DCFCE7]/85">
              Inspect electronic Negotiable Warehouse Receipts (e-NWR), lab assay parameters, and registered liens.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm">
              <span className="sm:hidden">WDRA</span>
              <span className="hidden sm:inline">WDRA Accredited</span>
            </Badge>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Total Pledged Vault Value
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalVaultValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-semibold">
              Across {inventory.length} certified e-NWRs
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              WDRA Accredited Hubs
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              {warehouses.length || 4} Hubs
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861]">
              Live telemetry & chamber logs
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              NABL Quality Assurance
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#10B981] font-heading">
              100%
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-semibold">
              Lab assayed moisture & purity
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5EDE8] shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by receipt number (#eNWR), commodity, farmer, or warehouse hub..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>
        </div>

        {/* Collateral Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredInventory.map((item) => (
            <Card
              key={item.id}
              hoverEffect
              className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-[#0B3326] block">
                      {item.receiptNumber}
                    </span>
                    <span className="text-xs text-[#566861]">
                      Owner: <b>{item.farmerName}</b>
                    </span>
                  </div>
                  <Badge variant="emerald" size="sm">
                    WDRA Certified
                  </Badge>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#566861]">Commodity:</span>
                    <span className="font-bold text-[#14211D]">
                      {item.commodity} ({item.variety})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#566861]">Quantity Stored:</span>
                    <span className="font-bold text-[#0B3326]">
                      {item.totalQuantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#E5EDE8]">
                    <span className="text-[#566861]">Assayed Valuation:</span>
                    <span className="font-extrabold text-[#0B3326]">
                      ₹{item.estimatedValue?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Lab Assay Metrics */}
                {item.assayedQuality && (
                  <div className="p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/20 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#0B3326] text-[11px]">
                      <FileCheck className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>{item.assayedQuality.assayStatus || 'NABL Certified Grade A'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-[#566861] pt-1">
                      <span>Moisture: <b>{item.assayedQuality.moisture || '11.5%'}</b></span>
                      <span>Purity: <b>{item.assayedQuality.purity || '99.4%'}</b></span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-[#566861] space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{item.warehouseName}</span>
                  </div>
                  <span className="block text-[11px] pl-4">{item.chamber}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between text-xs">
                <span className="text-[#10B981] font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Institutional Lien Ready</span>
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate('financier-underwriting')}
                  className="font-bold text-xs"
                >
                  Offer Advance
                </Button>
              </div>
            </Card>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
}
