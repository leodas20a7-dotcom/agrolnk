import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/farmer/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import VerificationRequiredModal from '../../components/verification/VerificationRequiredModal';
import DocumentViewerModal from '../../components/admin/DocumentViewerModal';
import {
  ShoppingBag,
  Package,
  TrendingUp,
  Truck,
  Building2,
  Compass,
  Tag,
  Gavel,
  ShieldCheck,
  CreditCard,
  Plus,
  ArrowRight,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Warehouse,
  Boxes,
  Layers,
  Award,
  Sparkles,
  Settings
} from 'lucide-react';
import { getBuyerOrders, getFarmerOrders } from '../../utils/orders';
import { getFarmerListings } from '../../utils/listings';
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
              Unified terminal for agricultural raw produce procurement, mill inventory management, and outbound processed food sales.
            </p>
          </div>

          {/* Primary Action Buttons - horizontally aligned like in FarmerDashboard and BuyerDashboard */}
          <div className="shrink-0 flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <Button
              variant="white"
              size="md"
              icon={Compass}
              iconPosition="left"
              onClick={() => onNavigate('buyer-marketplace')}
              className="py-2.5 px-4 font-bold text-xs !bg-white !text-[#0B3326] hover:!bg-[#EBF5F0] cursor-pointer shadow-sm border border-white"
            >
              Source Produce
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={FileText}
              iconPosition="left"
              onClick={() => onNavigate('buyer-demands')}
              className="py-2.5 px-3.5 font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              Demands ({inboundOrders.length})
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={Truck}
              iconPosition="left"
              onClick={() => onNavigate('buyer-deliveries')}
              className="py-2.5 px-3.5 font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              Shipments ({inboundDeliveries.length})
            </Button>
            <Button
              variant="accent"
              size="md"
              icon={Plus}
              iconPosition="left"
              onClick={() => onNavigate('farmer-create-listing')}
              className="py-2.5 px-4 font-bold shadow-md shadow-[#10B981]/20 text-xs cursor-pointer"
            >
              List Produce / Output
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

        {/* Four Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div
            onClick={() => onNavigate('farmer-my-listings')}
            className="cursor-pointer"
          >
            <StatCard
              label="Active Catalog"
              value={`${activeListingsCount} Lots`}
              subtext={`${processedProductsCount} Processed • ${myListings.length - processedProductsCount} Raw`}
              icon={Package}
              iconColor="#10B981"
              iconBg="#EBF5F0"
            />
          </div>

          <div
            onClick={() => onNavigate('buyer-orders')}
            className="cursor-pointer"
          >
            <StatCard
              label="Raw Material Sourced"
              value={totalRawQtyMT > 0 ? `${totalRawQtyMT} MT` : `${inboundOrders.length} Lots`}
              subtext={`${formatCurrency(totalProcuredAmount)} in contracts`}
              icon={Compass}
              iconColor="#0B3326"
              iconBg="#F2FBF6"
            />
          </div>

          <div
            onClick={() => onNavigate('buyer-deliveries')}
            className="cursor-pointer"
          >
            <StatCard
              label="Inbound Freight"
              value={`${activeInboundDeliveriesCount} Active`}
              subtext={`${inboundDeliveries.length} total consignments`}
              icon={Truck}
              iconColor="#1E40AF"
              iconBg="#EFF6FF"
            />
          </div>

          <div
            onClick={() => onNavigate('farmer-orders')}
            className="cursor-pointer"
          >
            <StatCard
              label="Sales Revenue"
              value={formatCurrency(totalSalesAmount)}
              subtext={`${salesOrders.length} customer sales contracts`}
              icon={ShoppingBag}
              iconColor="#D97706"
              iconBg="#FEF3C7"
            />
          </div>
        </div>

        {/* Trade Credit & Working Capital Banner */}
        <Card className="p-6 bg-gradient-to-r from-[#EBF5F0] via-[#F2FBF6] to-white border border-[#10B981]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0B3326] text-[#34D399] flex items-center justify-center shadow-xs shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider block">
                Agri-Processor Working Capital Facility
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                  Seasonal Procurement Credit & Storage Advances
                </span>
              </div>
              <p className="text-xs text-[#566861] mt-0.5">
                Procure bulk commodity lots at peak harvest with NBFC institutional credit and warehouse deposit receipt financing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('buyer-financing')}
              icon={ArrowRight}
              iconPosition="right"
              className="text-xs font-bold shrink-0"
            >
              Trade Credit Vault
            </Button>
          </div>
        </Card>

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
                Raw Procurement ({inboundOrders.length})
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
                Product Catalog & Sales ({myListings.length} / {salesOrders.length})
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
                Facility & Working Capital
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              className="text-xs font-semibold py-1.5 px-3 self-start sm:self-auto"
            >
              Refresh Live Data
            </Button>
          </div>

          {/* TAB 1: Procurement (Inbound Buy Side) */}
          {activeTab === 'procurement' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#0B3326] font-heading">
                    Raw Material Procurement Contracts
                  </h3>
                  <p className="text-xs text-[#566861] mt-0.5">
                    Direct farm purchases, cooperative lots, and auction purchases secured in escrow.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('buyer-demands')}
                    className="text-xs font-semibold"
                  >
                    Post Requirement Tender
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onNavigate('buyer-marketplace')}
                    icon={Compass}
                    iconPosition="left"
                    className="text-xs font-bold"
                  >
                    Browse Produce
                  </Button>
                </div>
              </div>

              {inboundOrders.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-[#E5EDE8] rounded-2xl bg-[#F8FAF8]">
                  <Compass className="w-12 h-12 text-[#10B981]/50 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#0B3326]">No Raw Produce Purchases Yet</h4>
                  <p className="text-xs text-[#566861] max-w-md mx-auto mt-1 mb-4">
                    Source certified raw commodities directly from verified farmers and FPOs with digital escrow security.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onNavigate('buyer-marketplace')}
                    className="text-xs font-bold"
                  >
                    Explore Raw Produce Marketplace
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#E5EDE8] rounded-2xl">
                  <table className="min-w-full divide-y divide-[#E5EDE8] text-left text-xs">
                    <thead className="bg-[#F8FAF8] font-bold text-[#566861] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Order / Produce</th>
                        <th className="py-3 px-4">Supplier / Producer</th>
                        <th className="py-3 px-4">Quantity</th>
                        <th className="py-3 px-4">Contract Value</th>
                        <th className="py-3 px-4">Escrow Status</th>
                        <th className="py-3 px-4">Logistics</th>
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
                              {order.escrowStatus === 'released' ? 'Released' : order.escrowStatus === 'funded' ? 'In Escrow' : 'Pending Deposit'}
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
                              View Contract
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

          {/* TAB 2: Catalog & Sales Orders (Sell Side) */}
          {activeTab === 'sales' && (
            <div className="space-y-8">
              {/* Product Catalog Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0B3326] font-heading">
                      Active Product Catalog
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Processed products (flour, milled rice, edible oils, pulses) and raw commodity surplus.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onNavigate('farmer-create-listing')}
                    icon={Plus}
                    iconPosition="left"
                    className="text-xs font-bold"
                  >
                    List New Product
                  </Button>
                </div>

                {myListings.length === 0 ? (
                  <div className="text-center py-10 px-4 border-2 border-dashed border-[#E5EDE8] rounded-2xl bg-[#F8FAF8]">
                    <Package className="w-12 h-12 text-[#10B981]/50 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-[#0B3326]">No Product Listings Yet</h4>
                    <p className="text-xs text-[#566861] max-w-md mx-auto mt-1 mb-4">
                      Create your first listing to sell milled goods, packaged food products, or raw lots directly to wholesale buyers.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigate('farmer-create-listing')}
                      className="text-xs font-bold"
                    >
                      Create Product Listing
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
                              {lot.productType === 'processed' ? 'Processed Food' : 'Raw Commodity'}
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
                            <span className="text-[#566861]">Available Stock:</span>{' '}
                            <span className="font-bold text-[#0B3326]">{lot.quantity} {lot.unit}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#10B981] text-sm">₹{lot.price}</span>
                            <span className="text-[#566861]">/{lot.priceUnit || lot.unit}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
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
                            Manage
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Sales Orders Section */}
              <div className="pt-6 border-t border-[#E5EDE8] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0B3326] font-heading">
                      Customer Orders Received
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Wholesale purchase agreements from buyers and retailers for your products.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('farmer-orders')}
                    className="text-xs font-semibold"
                  >
                    View All Sales Orders
                  </Button>
                </div>

                {salesOrders.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#E5EDE8] rounded-2xl bg-[#F8FAF8]">
                    <ShoppingBag className="w-8 h-8 text-[#566861]/40 mx-auto mb-2" />
                    <p className="text-xs text-[#566861]">No customer sales orders received yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#E5EDE8] rounded-2xl">
                    <table className="min-w-full divide-y divide-[#E5EDE8] text-left text-xs">
                      <thead className="bg-[#F8FAF8] font-bold text-[#566861] uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Order / Product</th>
                          <th className="py-3 px-4">Buyer Customer</th>
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
                              {ord.buyerName || 'Buyer Customer'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#14211D]">
                              {ord.quantity} {ord.unit}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#10B981]">
                              {formatCurrency(ord.totalAmount)}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant="emerald" size="sm">
                                {ord.escrowStatus || 'funded'}
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

          {/* TAB 3: Milling & Facility & Working Capital */}
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
                      <h4 className="font-bold text-[#0B3326] text-sm">Processing & Milling Specifications</h4>
                      <p className="text-xs text-[#566861]">Facility regulatory compliance and capacity</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex items-center justify-between py-2 border-b border-[#E5EDE8]">
                      <span className="text-[#566861]">Enterprise Name</span>
                      <span className="font-bold text-[#0B3326]">{user.companyName || user.name || 'Agro Mills Facility'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5EDE8]">
                      <span className="text-[#566861]">Account Role</span>
                      <span className="font-bold text-[#10B981] capitalize">Food Processor (Dual Procurement & Sales)</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5EDE8]">
                      <span className="text-[#566861]">FSSAI / Business License</span>
                      <span className="font-bold text-[#14211D]">{user.fssaiNumber || user.gstNumber || 'Provided during onboarding'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5EDE8]">
                      <span className="text-[#566861]">Facility Location</span>
                      <span className="font-bold text-[#14211D]">{user.state || 'India'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#566861]">KYC Status</span>
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
                      <h4 className="font-bold text-[#0B3326] text-sm">Trade Credit & Working Capital</h4>
                      <p className="text-xs text-[#566861]">Procurement financing & invoice discounting</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#566861] leading-relaxed">
                    Food processors can leverage NBFC & banking partner credit lines to procure large volume commodities during harvest season and repay post milling.
                  </p>

                  <div className="p-3.5 rounded-xl bg-white border border-[#E5EDE8] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#566861]">Active Credit Facilities:</span>
                      <span className="font-bold text-[#0B3326]">{financingRequests.length} Applications</span>
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
                    Apply for Procurement Trade Credit
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
    </DashboardLayout>
  );
}
