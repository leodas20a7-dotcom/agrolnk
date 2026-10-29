import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/farmer/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import VerificationRequiredModal from '../../components/verification/VerificationRequiredModal';
import DocumentViewerModal from '../../components/admin/DocumentViewerModal';
import Modal from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';
import {
  ShoppingBag,
  Package,
  Building2,
  Compass,
  ShieldCheck,
  CreditCard,
  Plus,
  Clock,
  Download,
  Trash2,
  AlertTriangle,
  Gavel
} from 'lucide-react';
import { getBuyerOrders, getFarmerOrders } from '../../utils/orders';
import { getFarmerListings, exportListingsToExcel, deleteListing, checkListingBookings } from '../../utils/listings';
import { getBuyerDeliveries } from '../../utils/deliveries';
import { getBuyerFinancingRequests } from '../../utils/financing';
import { getResolvedUserKycStatus, fetchCurrentProfile, getCurrentUser } from '../../utils/auth';
import { getTimeGreeting } from '../../utils/greeting';

export default function FoodProcessorDashboard({ currentUser, onNavigate, navState }) {
  const activeSession = getCurrentUser();
  const user = (currentUser && (currentUser.id || currentUser.email))
    ? currentUser
    : (activeSession || { name: 'Food Processor', id: '', role: 'food_processor' });

  const [activeTab, setActiveTab] = useState('procurement'); // 'procurement' | 'sales' | 'facility'
  const [inboundOrders, setInboundOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [inboundDeliveries, setInboundDeliveries] = useState([]);
  const [financingRequests, setFinancingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // KYC Verification state
  const [currentKycStatus, setCurrentKycStatus] = useState(() => getResolvedUserKycStatus(user));
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [inspectingDoc, setInspectingDoc] = useState(null);

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
      } catch {}
      if (user.documents && user.documents.length > 0) {
        setInspectingDoc(user.documents[0]);
        return;
      }
    }
    setIsVerificationModalOpen(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [inbound, outbound, listings, deliveries, fin] = await Promise.all([
        getBuyerOrders(user.id, user),
        getFarmerOrders(user.id, user),
        getFarmerListings(user.id),
        getBuyerDeliveries(user.id),
        getBuyerFinancingRequests(user.id),
      ]);

      setInboundOrders(inbound || []);
      setSalesOrders(outbound || []);
      setMyListings(listings || []);
      setInboundDeliveries(deliveries || []);
      setFinancingRequests(fin || []);
    } catch (err) {
      console.error('Error loading Food Processor dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const [productToDelete, setProductToDelete] = useState(null);
  const [blockedDeleteInfo, setBlockedDeleteInfo] = useState(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const handleExportToExcel = () => {
    try {
      if (!myListings || myListings.length === 0) {
        toast.info('No products listed to export.');
        return;
      }
      const filename = exportListingsToExcel(
        myListings,
        `AgroLnk_FoodProcessor_Products_${user.name ? user.name.replace(/\s+/g, '_') : 'Processor'}`
      );
      toast.success(`Successfully exported ${myListings.length} products to ${filename}!`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export products to Excel.');
    }
  };

  const handleDeleteProductClick = async (lot) => {
    try {
      const check = await checkListingBookings(lot.id);
      if (check.isBooked) {
        setBlockedDeleteInfo({
          lot,
          buyerName: check.buyerName,
          orderCount: check.orderCount,
        });
      } else {
        setProductToDelete(lot);
      }
    } catch (err) {
      console.error('Error checking lot booking status:', err);
      setProductToDelete(lot);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      await deleteListing(productToDelete.id, user.id);
      toast.success(`"${productToDelete.commodity}" listing removed successfully.`);
      setProductToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error(err.message || 'Failed to delete product.');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleKycUpdated = async () => {
      const status = getResolvedUserKycStatus(user);
      setCurrentKycStatus(status);
      try {
        const profile = await fetchCurrentProfile();
        if (profile?.kycStatus) {
          setCurrentKycStatus(profile.kycStatus);
        }
      } catch {}
    };

    window.addEventListener('agrolnk_kyc_updated', handleKycUpdated);
    window.addEventListener('agrolnk_orders_updated', loadData);
    window.addEventListener('agrolnk_deliveries_updated', loadData);

    return () => {
      window.removeEventListener('agrolnk_kyc_updated', handleKycUpdated);
      window.removeEventListener('agrolnk_orders_updated', loadData);
      window.removeEventListener('agrolnk_deliveries_updated', loadData);
    };
  }, [user.id, user.email]);

  // Derived KPIs
  const totalProcuredAmount = inboundOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const totalRawQtyKg = inboundOrders.reduce((sum, o) => {
    const qty = Number(o.quantity) || 0;
    if (o.unit === 'MT') return sum + qty * 1000;
    if (o.unit === 'Quintal') return sum + qty * 100;
    return sum + qty;
  }, 0);
  const totalRawQtyMT = Math.round((totalRawQtyKg / 1000) * 10) / 10;

  const totalSalesAmount = salesOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const activeListingsCount = myListings.filter(l => l.status === 'active').length;
  const processedProductsCount = myListings.filter(l => l.productType === 'processed').length;

  const activeInboundDeliveriesCount = inboundDeliveries.filter(
    d => d.status === 'in_transit' || d.status === 'dispatched' || d.status === 'assigned'
  ).length;

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  return (
    <DashboardLayout
      currentUser={user}
      onNavigate={onNavigate}
      currentPage="food-processor-dashboard"
    >
      <div className="space-y-8 text-left">
        {/* Top Professional Marketplace Welcome Card */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Building2 className="w-3.5 h-3.5" /> Food Processing & Milling Terminal
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              {getTimeGreeting(user.name || 'Food Processor').fullGreeting} {getTimeGreeting().emoji}
            </h1>
            <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed font-normal">
              Buy raw crops directly from farmers and sell your milled, processed food products to retailers.
            </p>
          </div>

          {/* Primary Action Buttons: 3 Clear Pillars */}
          <div className="shrink-0 flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Button
              variant="white"
              size="md"
              icon={Compass}
              iconPosition="left"
              onClick={() => onNavigate('buyer-marketplace')}
              className="py-2.5 px-4 font-bold text-xs !bg-white !text-[#0B3326] hover:!bg-[#EBF5F0] cursor-pointer shadow-sm border border-white"
            >
              Buy Raw Crops
            </Button>
            <Button
              variant="white"
              size="md"
              icon={Gavel}
              iconPosition="left"
              onClick={() => onNavigate('farmer-my-auctions')}
              className="py-2.5 px-4 font-bold text-xs !bg-[#0F4A37] !text-white hover:!bg-[#14624A] cursor-pointer shadow-sm border border-[#14624A]"
            >
              Live Auctions
            </Button>
            <Button
              variant="accent"
              size="md"
              icon={Plus}
              iconPosition="left"
              onClick={() => onNavigate('farmer-create-listing')}
              className="py-2.5 px-4 font-bold shadow-md shadow-[#10B981]/20 text-xs cursor-pointer"
            >
              Sell Processed Goods
            </Button>
          </div>
        </div>

        {/* KYC / FSSAI Compliance Alert Banner */}
        {!isVerified && (
          <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            currentKycStatus === 'pending'
              ? 'bg-amber-50/80 border-amber-200/80 text-amber-950'
              : currentKycStatus === 'rejected'
              ? 'bg-red-50/80 border-red-200/80 text-red-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                currentKycStatus === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : currentKycStatus === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-[#0B3326]'
              }`}>
                {currentKycStatus === 'pending' ? <Clock className="w-4 h-4 text-amber-600" /> : <ShieldCheck className="w-4 h-4 text-[#10B981]" />}
              </div>
              <div>
                <p className="text-xs font-bold text-[#0B3326]">
                  {currentKycStatus === 'pending'
                    ? 'Compliance Verification Under Review'
                    : 'FSSAI License & KYC Verification Pending'}
                </p>
                <p className="text-[11px] text-[#566861] mt-0.5">
                  {currentKycStatus === 'pending'
                    ? 'Our compliance desk is reviewing your business & FSSAI certificates. Full enterprise trade facilities will activate shortly.'
                    : 'Upload your business registration and FSSAI certificate to unlock unrestricted procurement contracts and sales.'}
                </p>
              </div>
            </div>
            <Button
              variant={currentKycStatus === 'pending' ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleOpenKycAction}
              className="shrink-0 cursor-pointer shadow-xs whitespace-nowrap text-xs font-semibold py-1.5 px-3"
            >
              {currentKycStatus === 'pending' ? 'View Submitted Docs' : 'Verify Facility Now'}
            </Button>
          </div>
        )}

        {/* Three Clean Operational Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div
            onClick={() => {
              setActiveTab('procurement');
            }}
            className="cursor-pointer transition-transform hover:-translate-y-0.5"
          >
            <StatCard
              label="Raw Crop Purchases"
              value={totalRawQtyMT > 0 ? `${totalRawQtyMT} MT` : `${inboundOrders.length} Purchases`}
              subtext={`${inboundOrders.length} contracts (${formatCurrency(totalProcuredAmount)}) • ${activeInboundDeliveriesCount} in transit`}
              icon={Compass}
              iconColor="#0B3326"
              iconBg="#F2FBF6"
            />
          </div>

          <div
            onClick={() => {
              setActiveTab('sales');
            }}
            className="cursor-pointer transition-transform hover:-translate-y-0.5"
          >
            <StatCard
              label="Finished Goods & Sales"
              value={formatCurrency(totalSalesAmount)}
              subtext={`${salesOrders.length} retailer orders • ${activeListingsCount} active products`}
              icon={Package}
              iconColor="#10B981"
              iconBg="#EBF5F0"
            />
          </div>

          <div
            onClick={() => onNavigate('buyer-financing')}
            className="cursor-pointer transition-transform hover:-translate-y-0.5"
          >
            <StatCard
              label="Working Capital & Godown"
              value={financingRequests.length > 0 ? `${financingRequests.length} Facility Active` : "Credit Available"}
              subtext="Apply for seasonal crop procurement advance"
              icon={CreditCard}
              iconColor="#1E40AF"
              iconBg="#EFF6FF"
            />
          </div>
        </div>

        {/* Operational Workspace with Unified Tabs */}
        <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
          {/* Tab Navigation Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EDE8]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('procurement')}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'procurement'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'bg-[#F8FAF8] text-[#566861] hover:bg-[#EBF5F0] hover:text-[#0B3326]'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Raw Crop Purchases ({inboundOrders.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sales')}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'sales'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'bg-[#F8FAF8] text-[#566861] hover:bg-[#EBF5F0] hover:text-[#0B3326]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Products & Retail Sales ({myListings.length} Stock / {salesOrders.length} Orders)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('facility')}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'facility'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'bg-[#F8FAF8] text-[#566861] hover:bg-[#EBF5F0] hover:text-[#0B3326]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Mill Profile & Licenses
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              className="text-xs font-semibold py-1.5 px-3 self-start sm:self-auto"
            >
              Refresh Data
            </Button>
          </div>

          {/* TAB 1: Raw Crop Purchases (Buying from Farmers) */}
          {activeTab === 'procurement' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#0B3326] font-heading">
                    Raw Crop Purchase Contracts
                  </h3>
                  <p className="text-xs text-[#566861] mt-0.5">
                    Crops bought directly from verified farmers and FPOs with digital escrow payment protection.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('buyer-marketplace')}
                  icon={Compass}
                  iconPosition="left"
                  className="text-xs font-bold shrink-0"
                >
                  Find Available Crops
                </Button>
              </div>

              {inboundOrders.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-[#E5EDE8] rounded-2xl bg-[#F8FAF8]">
                  <Compass className="w-12 h-12 text-[#10B981]/50 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#0B3326]">No Raw Crop Purchases Yet</h4>
                  <p className="text-xs text-[#566861] max-w-md mx-auto mt-1 mb-4">
                    Source wheat, paddy, mustard, pulses, and oilseeds directly from verified farmers at transparent rates.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onNavigate('buyer-marketplace')}
                    className="text-xs font-bold"
                  >
                    Browse Farmers' Produce Marketplace
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#E5EDE8] rounded-2xl">
                  <table className="min-w-full divide-y divide-[#E5EDE8] text-left text-xs">
                    <thead className="bg-[#F8FAF8] font-bold text-[#566861] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Crop / Lot</th>
                        <th className="py-3 px-4">Farmer / Producer</th>
                        <th className="py-3 px-4">Quantity</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Escrow Status</th>
                        <th className="py-3 px-4">Truck / Dispatch</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EDE8] bg-white">
                      {inboundOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-[#F8FAF8]/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#0B3326]">{order.commodity}</div>
                            <div className="text-[11px] text-[#566861]">#{order.orderNumber || order.id?.slice(0, 8)}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#14211D]">{order.farmerName || 'Verified Producer'}</div>
                            <div className="text-[11px] text-[#566861]">{order.state || 'Direct Farm'}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#14211D]">
                            {order.quantity} {order.unit || 'kg'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#10B981]">
                            {formatCurrency(order.totalAmount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={order.escrowStatus === 'released' ? 'emerald' : order.escrowStatus === 'funded' ? 'blue' : 'amber'}
                              size="sm"
                            >
                              {order.escrowStatus === 'released' ? 'Released to Farmer' : order.escrowStatus === 'funded' ? 'Protected in Escrow' : 'Payment Pending'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#566861] capitalize">
                            {order.status?.replace('_', ' ') || 'Order Placed'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onNavigate('buyer-orders')}
                              className="text-xs font-semibold py-1 px-2.5 h-auto"
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Processed Goods Catalog & Retailer Orders (Sell Side) */}
          {activeTab === 'sales' && (
            <div className="space-y-8">
              {/* Product Stock Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0B3326] font-heading">
                      Milled & Finished Goods Stock
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Flour, milled rice, mustard oil, processed pulses, and packaged foods ready for retailers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {myListings.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleExportToExcel}
                        icon={Download}
                        iconPosition="left"
                        className="text-xs font-semibold shrink-0 cursor-pointer"
                        title="Safely backup all products to Excel spreadsheet"
                      >
                        Export Excel ({myListings.length})
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigate('farmer-create-listing')}
                      icon={Plus}
                      iconPosition="left"
                      className="text-xs font-bold shrink-0"
                    >
                      Add Product to Sell
                    </Button>
                  </div>
                </div>

                {myListings.length === 0 ? (
                  <div className="text-center py-10 px-4 border-2 border-dashed border-[#E5EDE8] rounded-2xl bg-[#F8FAF8]">
                    <Package className="w-12 h-12 text-[#10B981]/50 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-[#0B3326]">No Products Listed for Sale Yet</h4>
                    <p className="text-xs text-[#566861] max-w-md mx-auto mt-1 mb-4">
                      List your milled flour, edible oils, polished grain, or packaged goods to start receiving wholesale orders.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigate('farmer-create-listing')}
                      className="text-xs font-bold"
                    >
                      List First Product
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myListings.map((lot) => (
                      <div
                        key={lot.id}
                        className="p-4 rounded-2xl border border-[#E5EDE8] bg-white hover:border-[#10B981] transition-all shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                              lot.productType === 'processed'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {lot.productType === 'processed' ? 'Processed / Milled' : 'Raw Crop Lot'}
                            </span>
                            <h4 className="font-bold text-[#0B3326] text-sm">{lot.commodity}</h4>
                            <p className="text-[11px] text-[#566861]">Variety: {lot.variety || 'Standard'} • Grade {lot.grade || 'A'}</p>
                          </div>
                          <Badge variant={lot.status === 'active' ? 'emerald' : 'dark'} size="sm">
                            {lot.status}
                          </Badge>
                        </div>

                        <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[#566861]">In Stock:</span>{' '}
                            <span className="font-bold text-[#0B3326]">{lot.quantity} {lot.unit}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#10B981] text-sm">₹{lot.price}</span>
                            <span className="text-[#566861]">/{lot.priceUnit || lot.unit}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteProductClick(lot)}
                            title="Delete product listing"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onNavigate('farmer-create-listing', { editListing: lot })}
                              className="text-xs py-1 px-2.5 h-auto font-semibold"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => onNavigate('farmer-my-listings')}
                              className="text-xs py-1 px-2.5 h-auto font-bold"
                            >
                              Manage Stock
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Retailer Orders Section */}
              <div className="pt-6 border-t border-[#E5EDE8] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0B3326] font-heading">
                      Retailer & Buyer Orders Received
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Customer orders placed for your processed products.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('farmer-orders')}
                    className="text-xs font-semibold"
                  >
                    View All Orders
                  </Button>
                </div>

                {salesOrders.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#E5EDE8] rounded-2xl bg-[#F8FAF8]">
                    <ShoppingBag className="w-8 h-8 text-[#566861]/40 mx-auto mb-2" />
                    <p className="text-xs text-[#566861]">No retailer orders received yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#E5EDE8] rounded-2xl">
                    <table className="min-w-full divide-y divide-[#E5EDE8] text-left text-xs">
                      <thead className="bg-[#F8FAF8] font-bold text-[#566861] uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Retailer / Buyer</th>
                          <th className="py-3 px-4">Quantity</th>
                          <th className="py-3 px-4">Total Amount</th>
                          <th className="py-3 px-4">Escrow Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EDE8] bg-white">
                        {salesOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-[#F8FAF8]/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#0B3326]">{ord.commodity}</div>
                              <div className="text-[11px] text-[#566861]">#{ord.orderNumber || ord.id?.slice(0, 8)}</div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#14211D]">
                              {ord.buyerName || 'Retail Customer'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#14211D]">
                              {ord.quantity} {ord.unit}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#10B981]">
                              {formatCurrency(ord.totalAmount)}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant={ord.escrowStatus === 'released' || ord.status === 'completed' || ord.adminVerificationStatus === 'approved' ? 'emerald' : 'blue'} size="sm">
                                {ord.escrowStatus === 'released' || ord.status === 'completed' || ord.adminVerificationStatus === 'approved' ? 'Settled to Bank' : (ord.escrowStatus || 'Escrow Funded')}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onNavigate('farmer-orders')}
                                className="text-xs font-semibold py-1 px-2.5 h-auto"
                              >
                                Dispatch Order
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Mill Facility & Licenses */}
          {activeTab === 'facility' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Facility Profile Card */}
                <div className="p-6 rounded-2xl border border-[#E5EDE8] bg-[#F8FAF8] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0B3326] text-sm">Mill & Enterprise Profile</h4>
                      <p className="text-xs text-[#566861]">Business registration and regulatory status</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex items-center justify-between py-2 border-b border-[#E5EDE8]">
                      <span className="text-[#566861]">Business / Mill Name</span>
                      <span className="font-bold text-[#0B3326]">{user.companyName || user.name || 'Agro Mills Facility'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5EDE8]">
                      <span className="text-[#566861]">Account Type</span>
                      <span className="font-bold text-[#10B981]">Food Processor (Procure & Sell)</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5EDE8]">
                      <span className="text-[#566861]">FSSAI / GST Number</span>
                      <span className="font-bold text-[#14211D]">{user.fssaiNumber || user.gstNumber || 'Provided during onboarding'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5EDE8]">
                      <span className="text-[#566861]">Mill Location</span>
                      <span className="font-bold text-[#14211D]">{user.state || 'India'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#566861]">Compliance Verification</span>
                      <Badge variant={isVerified ? 'emerald' : 'amber'} size="sm">
                        {currentKycStatus}
                      </Badge>
                    </div>
                  </div>

                  {!isVerified && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenKycAction}
                      className="w-full text-xs font-bold"
                    >
                      {currentKycStatus === 'pending' ? 'View Submitted Documents' : 'Submit FSSAI / KYC Documents'}
                    </Button>
                  )}
                </div>

                {/* Working Capital & Trade Credit Card */}
                <div className="p-6 rounded-2xl border border-[#E5EDE8] bg-[#F8FAF8] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-[#1E40AF]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0B3326] text-sm">Seasonal Working Capital</h4>
                      <p className="text-xs text-[#566861]">Harvest season bulk procurement credit lines</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#566861] leading-relaxed">
                    Access institutional trade credit and godown warehouse receipt financing to purchase raw crops during peak harvest season and repay after milling.
                  </p>

                  <div className="p-3.5 rounded-xl bg-white border border-[#E5EDE8] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#566861]">Active Applications:</span>
                      <span className="font-bold text-[#0B3326]">{financingRequests.length} Facility</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#566861]">Interest Rates:</span>
                      <span className="font-bold text-[#10B981]">From 1.2% / month</span>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('buyer-financing')}
                    className="w-full text-xs font-bold border-[#10B981]/40 text-[#0B3326] hover:bg-[#EBF5F0]"
                  >
                    Apply for Working Capital Advance
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Verification Modals */}
      <VerificationRequiredModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        role="buyer"
        onSubmitted={() => {
          setIsVerificationModalOpen(false);
          setCurrentKycStatus('pending');
        }}
      />

      {inspectingDoc && (
        <DocumentViewerModal
          isOpen={Boolean(inspectingDoc)}
          onClose={() => setInspectingDoc(null)}
          docUrl={inspectingDoc.file_url || inspectingDoc.fileUrl || inspectingDoc.url}
          docName={inspectingDoc.doc_name || inspectingDoc.docName || inspectingDoc.type || 'KYC Document'}
        />
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <Modal
          isOpen={Boolean(productToDelete)}
          onClose={() => setProductToDelete(null)}
          title="Delete Product Listing"
          subtitle={`Are you sure you want to remove "${productToDelete.commodity}"?`}
          icon={Trash2}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
          maxWidth="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDeleteProduct}
                disabled={isDeletingProduct}
                icon={Trash2}
              >
                {isDeletingProduct ? 'Deleting...' : 'Delete Product'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-left">
            <p className="text-xs text-[#566861] leading-relaxed">
              This will permanently remove this finished product lot from the marketplace catalog. Retailers will no longer be able to place new purchase orders against this lot.
            </p>
            <div className="p-3 bg-[#F8FAF8] rounded-xl border border-[#E5EDE8] text-xs space-y-1">
              <div><span className="text-[#566861]">Commodity:</span> <strong className="text-[#0B3326]">{productToDelete.commodity}</strong></div>
              <div><span className="text-[#566861]">In Stock:</span> <strong className="text-[#0B3326]">{productToDelete.quantity} {productToDelete.unit}</strong></div>
              <div><span className="text-[#566861]">Listed Price:</span> <strong className="text-[#10B981]">₹{productToDelete.price}/{productToDelete.priceUnit || productToDelete.unit}</strong></div>
            </div>
          </div>
        </Modal>
      )}

      {/* Blocked Delete Modal (Protected by Active Escrow Orders) */}
      {blockedDeleteInfo && (
        <Modal
          isOpen={Boolean(blockedDeleteInfo)}
          onClose={() => setBlockedDeleteInfo(null)}
          title="Deletion Protected by Escrow"
          subtitle="This produce lot cannot be deleted while active purchase agreements exist."
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          maxWidth="max-w-md"
          footer={
            <div className="flex justify-end w-full">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setBlockedDeleteInfo(null)}
              >
                Understood
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-left">
            <p className="text-xs text-[#566861] leading-relaxed">
              <strong>{blockedDeleteInfo.lot?.commodity}</strong> has {blockedDeleteInfo.orderCount || 1} active order contract(s) tied to buyer escrow locks. To protect transaction integrity, active exchange contracts must be settled or cancelled before deleting the listing.
            </p>
            {blockedDeleteInfo.buyerName && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span>Active buyer counterparty: <strong>{blockedDeleteInfo.buyerName}</strong></span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
