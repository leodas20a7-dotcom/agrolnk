import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import InventoryCard from '../../components/warehouse/InventoryCard';
import WarehouseCard from '../../components/warehouse/WarehouseCard';
import DepositProduceModal from '../../components/warehouse/DepositProduceModal';
import ListFromInventoryModal from '../../components/warehouse/ListFromInventoryModal';
import ReceiptDetailModal from '../../components/warehouse/ReceiptDetailModal';
import FinancingRequestModal from '../../components/financing/FinancingRequestModal';
import {
  Building2,
  Package,
  Plus,
  Landmark,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  ThermometerSnowflake
} from 'lucide-react';
import { getFarmerInventory, getWarehouses } from '../../utils/warehouses';

export default function FarmerInventory({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };
  
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'warehouses'
  const [inventoryList, setInventoryList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);
  
  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedWarehouseForDeposit, setSelectedWarehouseForDeposit] = useState(null);
  const [selectedInventoryForDetail, setSelectedInventoryForDetail] = useState(null);
  const [selectedInventoryForList, setSelectedInventoryForList] = useState(null);
  const [inventoryForFinancing, setInventoryForFinancing] = useState(null);

  const loadData = async () => {
    try {
      const [inv, whs] = await Promise.all([
        getFarmerInventory(user.id),
        getWarehouses(),
      ]);
      setInventoryList(inv || []);
      setWarehousesList(whs || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const totalKg = inventoryList.reduce((sum, i) => sum + (Number(i.totalQuantity) || 0), 0);
  const availableKg = inventoryList.reduce((sum, i) => sum + (Number(i.availableQuantity) || 0), 0);
  const totalValuation = inventoryList.reduce((sum, i) => sum + (Number(i.estimatedValue) || 0), 0);

  const handleDepositSuccess = (newReceipt) => {
    loadData();
    setSelectedInventoryForDetail(newReceipt);
  };

  const handleListSuccess = (result, type) => {
    loadData();
    if (type === 'auction') {
      onNavigate('farmer-my-auctions');
    } else {
      onNavigate('farmer-my-listings');
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header Banner */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Award className="w-3.5 h-3.5" /> Certified Storage & e-NWR Vault
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              Warehouse & Inventory
            </h1>
            <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed font-normal">
              Store your produce in WDRA certified warehouses, receive electronic Negotiable Warehouse Receipts (e-NWR), and sell or finance directly from storage.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 flex flex-wrap gap-2.5 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              icon={Landmark}
              iconPosition="left"
              onClick={() => onNavigate('farmer-financing')}
              className="py-3 px-4 font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              e-NWR Financing
            </Button>
            <Button
              variant="accent"
              size="md"
              icon={Plus}
              iconPosition="left"
              onClick={() => setShowDepositModal(true)}
              className="py-3 px-5 font-bold shadow-md shadow-[#10B981]/20 text-xs cursor-pointer"
            >
              Deposit Produce
            </Button>
          </div>
        </div>

        {/* 4 Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Total Stored Produce</span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {totalKg.toLocaleString('en-IN')} kg
            </div>
            <div className="text-[11px] text-[#10B981] font-semibold">
              {availableKg.toLocaleString('en-IN')} kg available to sell
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Total Stored Valuation</span>
              <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalValuation.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#566861]">
              100% WDRA Insured Assets
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Active e-NWR Receipts</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {inventoryList.length}
            </div>
            <div className="text-[11px] text-[#566861]">
              Electronic Titles of Ownership
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Borrowing Power</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{Math.round(totalValuation * 0.8).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#566861]">
              80% Loan-to-Value against e-NWR
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
            <span>My Stored e-NWR Inventory</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'inventory'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861]'
              }`}
            >
              {inventoryList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('warehouses')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'warehouses'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <span>Certified Warehouses & Cold Chains</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'warehouses'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861]'
              }`}
            >
              {warehousesList.length}
            </span>
          </button>
        </div>

        {/* Content Section: My Stored e-NWRs */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  Stored Commodity Batches ({inventoryList.length})
                </h2>
                <p className="text-xs text-[#566861]">
                  Directly list for sale or auction without moving produce from storage
                </p>
              </div>
            </div>

            {inventoryList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventoryList.map((item) => (
                  <InventoryCard
                    key={item.id}
                    inventory={item}
                    onView={(inv) => setSelectedInventoryForDetail(inv)}
                    onList={(inv) => setSelectedInventoryForList(inv)}
                    onRequestFinancing={() => onNavigate('farmer-financing')}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6 text-[#10B981]" />
                </div>
                <h3 className="text-base font-bold text-[#0B3326] font-heading">
                  No warehouse inventory stored yet
                </h3>
                <p className="text-xs text-[#566861] max-w-sm mx-auto">
                  Deposit your harvest into a certified warehouse to preserve shelf life and trade electronically.
                </p>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setShowDepositModal(true)}
                    icon={Plus}
                  >
                    Deposit Produce Now
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Content Section: Certified Warehouses */}
        {activeTab === 'warehouses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  Certified Storage Facilities ({warehousesList.length})
                </h2>
                <p className="text-xs text-[#566861]">
                  WDRA accredited cold chain hubs, hermetic grain silos, and atmospheric vaults
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {warehousesList.map((wh) => (
                <WarehouseCard
                  key={wh.id}
                  warehouse={wh}
                  onDeposit={(selected) => {
                    setSelectedWarehouseForDeposit(selected);
                    setShowDepositModal(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Deposit Produce Modal */}
      {showDepositModal && (
        <DepositProduceModal
          preselectedWarehouse={selectedWarehouseForDeposit}
          currentUser={user}
          onClose={() => {
            setShowDepositModal(false);
            setSelectedWarehouseForDeposit(null);
          }}
          onSuccess={handleDepositSuccess}
        />
      )}

      {/* Sell from Inventory Modal */}
      {selectedInventoryForList && (
        <ListFromInventoryModal
          inventory={selectedInventoryForList}
          currentUser={user}
          onClose={() => setSelectedInventoryForList(null)}
          onSuccess={handleListSuccess}
        />
      )}

      {/* e-NWR Inspection Detail Modal */}
      {selectedInventoryForDetail && (
        <ReceiptDetailModal
          inventory={selectedInventoryForDetail}
          currentUser={user}
          onClose={() => setSelectedInventoryForDetail(null)}
          onList={(inv) => setSelectedInventoryForList(inv)}
          onRequestFinancing={() => onNavigate('farmer-financing')}
        />
      )}
    </DashboardLayout>
  );
}
