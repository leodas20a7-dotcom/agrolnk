import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import InventoryCard from '../../components/warehouse/InventoryCard';
import InventoryRow from '../../components/warehouse/InventoryRow';
import WarehouseCard from '../../components/warehouse/WarehouseCard';
import DepositProduceModal from '../../components/warehouse/DepositProduceModal';
import ListFromInventoryModal from '../../components/warehouse/ListFromInventoryModal';
import ReceiptDetailModal from '../../components/warehouse/ReceiptDetailModal';
import PayStorageRentModal from '../../components/warehouse/PayStorageRentModal';
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
  ThermometerSnowflake,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';
import {
  getFarmerInventory,
  getWarehouses,
  getWarehouseNotifications
} from '../../utils/warehouses';

export default function FarmerInventory({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };
  
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'warehouses'
  const [inventoryList, setInventoryList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [warehousesPage, setWarehousesPage] = useState(1);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('agrolnk_farmer_inventory_viewmode') || 'rows';
    } catch {
      return 'rows';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('agrolnk_farmer_inventory_viewmode', mode);
    } catch {}
  };

  const [notifications, setNotifications] = useState([]);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const ITEMS_PER_PAGE = 6;
  
  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedWarehouseForDeposit, setSelectedWarehouseForDeposit] = useState(null);
  const [selectedInventoryForDetail, setSelectedInventoryForDetail] = useState(null);
  const [selectedInventoryForList, setSelectedInventoryForList] = useState(null);
  const [selectedInventoryForRent, setSelectedInventoryForRent] = useState(null);
  const [inventoryForFinancing, setInventoryForFinancing] = useState(null);

  const loadData = async () => {
    try {
      const [inv, whs] = await Promise.all([
        getFarmerInventory(user.id),
        getWarehouses(),
      ]);
      setInventoryList(inv || []);
      setWarehousesList(whs || []);
      setNotifications(getWarehouseNotifications(user.id, 'farmer'));
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

  const handleRentSuccess = () => {
    loadData();
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
              <Award className="w-3.5 h-3.5" /> Certified Storage & Warehouse Receipts
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              Warehouse Storage & Receipts
            </h1>
            <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed font-normal">
              Store your harvested crops safely in certified cold storages & warehouses, get digital storage receipts, and sell or take loans directly from storage.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 flex flex-wrap gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="py-3 px-4 rounded-2xl font-semibold text-xs border border-[#34D399]/40 bg-[#0F4A37] text-[#34D399] hover:bg-[#14624A] transition-all flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>How Storage & Rent Works</span>
              {showHowItWorks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <Button
              variant="secondary"
              size="md"
              icon={Landmark}
              iconPosition="left"
              onClick={() => onNavigate('farmer-financing')}
              className="py-3 px-4 font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              Storage Crop Loan
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

        {/* How Storage & Rent Works Explanatory Section */}
        {showHowItWorks && (
          <div className="p-6 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#10B981]" />
                <h3 className="text-base font-extrabold text-[#0B3326] font-heading">
                  Simple Guide: How Warehouse Storage & Rent Payments Work
                </h3>
              </div>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="text-xs text-[#566861] hover:text-[#0B3326] font-semibold cursor-pointer"
              >
                Close Guide
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#0B3326] text-[#34D399] flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="text-sm font-bold text-[#0B3326]">Deposit & Get Storage Receipt</h4>
                <p className="text-xs text-[#566861] leading-relaxed">
                  Deliver your harvest to any certified warehouse. You instantly get a digital storage receipt showing your exact crop quantity, grade, and government insurance.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F2FBF6] border border-[#10B981]/20 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#10B981] text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="text-sm font-bold text-[#0B3326]">Auto-Deduct Rent on Sale (Zero Cash)</h4>
                <p className="text-xs text-[#566861] leading-relaxed">
                  You do not need upfront cash! When you sell produce to a buyer on Agrolnk, the warehouse storage rent is automatically deducted from the buyer's payment.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#0B3326] text-[#34D399] flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="text-sm font-bold text-[#0B3326]">Hold & Pay Online Anytime</h4>
                <p className="text-xs text-[#566861] leading-relaxed">
                  Want to wait for better commodity prices? You can easily pay monthly rent via UPI/Card to extend your storage validity by 30, 60, or 90 days.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications & Reminders Banner */}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#92400E]">
                      {notif.title}
                    </h4>
                    <p className="text-xs text-[#B45309]">
                      {notif.message}
                    </p>
                  </div>
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    const item = inventoryList.find((r) => r.id === notif.receiptId);
                    if (item) setSelectedInventoryForRent(item);
                  }}
                  className="text-xs font-bold shrink-0"
                >
                  Pay Rent Online (₹{notif.amountDue})
                </Button>
              </div>
            ))}
          </div>
        )}

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
              <span className="text-xs font-semibold text-[#566861]">Active Storage Receipts</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {inventoryList.length}
            </div>
            <div className="text-[11px] text-[#566861]">
              Verified Storage Titles
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
              80% Loan against stored produce
            </div>
          </Card>

        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              setInventoryPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <span>My Stored Produce & Receipts</span>
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
            onClick={() => {
              setActiveTab('warehouses');
              setWarehousesPage(1);
            }}
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

        {/* Content Section: My Stored Produce */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                  Stored Commodity Batches ({inventoryList.length})
                </h2>
                <p className="text-xs text-[#566861]">
                  Directly list for sale or auction without moving produce from storage
                </p>
              </div>

              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={handleSetViewMode}
              />
            </div>

            {inventoryList.length > 0 ? (
              <div className="space-y-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedInventory.map((item) => (
                      <InventoryCard
                        key={item.id}
                        inventory={item}
                        onView={(inv) => setSelectedInventoryForDetail(inv)}
                        onList={(inv) => setSelectedInventoryForList(inv)}
                        onPayRent={(inv) => setSelectedInventoryForRent(inv)}
                        onRequestFinancing={() => onNavigate('farmer-financing')}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedInventory.map((item) => (
                      <InventoryRow
                        key={item.id}
                        inventory={item}
                        onView={(inv) => setSelectedInventoryForDetail(inv)}
                        onList={(inv) => setSelectedInventoryForList(inv)}
                        onPayRent={(inv) => setSelectedInventoryForRent(inv)}
                        onRequestFinancing={() => onNavigate('farmer-financing')}
                      />
                    ))}
                  </div>
                )}

                <Pagination
                  currentPage={inventoryPage}
                  totalPages={totalInventoryPages}
                  totalItems={inventoryList.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setInventoryPage}
                />
              </div>
            ) : (
              <Card className="p-8 sm:p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-5 bg-gradient-to-b from-white to-[#F8FAF8]">
                <div className="w-16 h-16 rounded-3xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto shadow-xs">
                  <Building2 className="w-8 h-8 text-[#10B981]" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                    No Produce in Warehouse Storage Yet
                  </h3>
                  <p className="text-xs text-[#566861] leading-relaxed">
                    Deposit your harvest in certified warehouses to prevent post-harvest spoilage, obtain verified digital receipts, and sell directly to buyers with zero transport hassle.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left pt-2">
                  <div className="p-3 rounded-2xl bg-white border border-[#E5EDE8]">
                    <span className="text-[11px] font-bold text-[#0B3326] block">✓ WDRA Insured</span>
                    <span className="text-[10px] text-[#566861]">100% safe storage</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-[#E5EDE8]">
                    <span className="text-[11px] font-bold text-[#0B3326] block">✓ Auto-Deduct Rent</span>
                    <span className="text-[10px] text-[#566861]">Zero upfront cash</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-[#E5EDE8]">
                    <span className="text-[11px] font-bold text-[#0B3326] block">✓ Direct Trade</span>
                    <span className="text-[10px] text-[#566861]">Sell from storage</span>
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => setShowDepositModal(true)}
                    icon={Plus}
                    className="text-xs font-bold px-6 py-2.5 shadow-md shadow-[#10B981]/20 cursor-pointer"
                  >
                    Deposit Produce Now
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setActiveTab('warehouses');
                      setWarehousesPage(1);
                    }}
                    icon={Building2}
                    className="text-xs font-bold px-5 py-2.5 cursor-pointer"
                  >
                    Explore Certified Warehouses
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

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {paginatedWarehouses.map((wh) => (
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

              <Pagination
                currentPage={warehousesPage}
                totalPages={totalWarehousesPages}
                totalItems={warehousesList.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setWarehousesPage}
              />
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
          onPayRent={(inv) => setSelectedInventoryForRent(inv)}
          onRequestFinancing={() => onNavigate('farmer-financing')}
        />
      )}

      {/* Storage Rent Payment Modal */}
      {selectedInventoryForRent && (
        <PayStorageRentModal
          inventory={selectedInventoryForRent}
          currentUser={user}
          isOpen={Boolean(selectedInventoryForRent)}
          onClose={() => setSelectedInventoryForRent(null)}
          onSuccess={handleRentSuccess}
        />
      )}
    </DashboardLayout>
  );
}

