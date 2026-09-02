import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/farmer/StatCard';
import ListingCard from '../../components/farmer/ListingCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import {
  Sprout,
  Plus,
  Package,
  Gavel,
  ShoppingBag,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Landmark,
  Truck,
  Building2,
  Award
} from 'lucide-react';
import { getFarmerListings } from '../../utils/listings';
import { getFarmerOrders } from '../../utils/orders';
import { getFarmerAuctions } from '../../utils/auctions';
import { getFarmerFinancingRequests } from '../../utils/financing';
import { getFarmerDeliveries } from '../../utils/deliveries';
import { getFarmerInventory } from '../../utils/warehouses';
import { getTimeGreeting } from '../../utils/greeting';

export default function FarmerDashboard({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [financingRequests, setFinancingRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      try {
        const [listingData, orderData, auctionData, financingData, deliveryData, invData] = await Promise.all([
          getFarmerListings(user.id),
          getFarmerOrders(user.id),
          getFarmerAuctions(user.id),
          getFarmerFinancingRequests(user.id),
          getFarmerDeliveries(user.id),
          getFarmerInventory(user.id),
        ]);

        if (isMounted) {
          setListings(listingData || []);
          setOrders(orderData || []);
          setAuctions(auctionData || []);
          setFinancingRequests(financingData || []);
          setDeliveries(deliveryData || []);
          setInventory(invData || []);
        }
      } catch (err) {
        console.error('Failed to load farmer dashboard data:', err);
      }
    };

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const safeListings = Array.isArray(listings) ? listings : [];
  const safeAuctions = Array.isArray(auctions) ? auctions : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const directCount = safeListings.filter((l) => l.saleType === 'direct').length;
  const liveAuctionsCount = safeAuctions.filter((a) => a.status === 'live').length;
  const pendingOrdersCount = safeOrders.filter((o) => o.status === 'pending').length;
  const totalStoredKg = safeInventory.reduce((sum, i) => sum + (Number(i.totalQuantity) || 0), 0);

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Professional Marketplace Welcome Card */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Sprout className="w-3.5 h-3.5" /> Producer Trading Desk
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              {getTimeGreeting(user.name).fullGreeting} {getTimeGreeting().emoji}
            </h1>
            <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed font-normal">
              Manage live exchange listings, deposit harvest into certified cold storage, arrange freight, and secure liquidity.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="shrink-0 flex flex-wrap gap-2.5 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              icon={Building2}
              iconPosition="left"
              onClick={() => onNavigate('farmer-inventory')}
              className="py-3 px-4 font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              Warehouse ({inventory.length})
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={Truck}
              iconPosition="left"
              onClick={() => onNavigate('farmer-deliveries')}
              className="py-3 px-4 font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              Deliveries ({deliveries.length})
            </Button>
            <Button
              variant="accent"
              size="md"
              icon={Plus}
              iconPosition="left"
              onClick={() => onNavigate('farmer-create-listing')}
              className="py-3 px-5 font-bold shadow-md shadow-[#10B981]/20 text-xs cursor-pointer"
            >
              List Produce
            </Button>
          </div>
        </div>

        {/* Four Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div
            onClick={() => onNavigate('farmer-my-listings')}
            className="cursor-pointer"
          >
            <StatCard
              label="Active Listings"
              value={directCount}
              subtext="Fixed-price direct lots"
              icon={Package}
              iconColor="#10B981"
              iconBg="#EBF5F0"
            />
          </div>

          <div
            onClick={() => onNavigate('farmer-inventory')}
            className="cursor-pointer"
          >
            <StatCard
              label="Stored Inventory"
              value={`${(totalStoredKg / 1000).toFixed(1)} T`}
              subtext={`${inventory.length} active e-NWR receipts`}
              icon={Building2}
              iconColor="#0B3326"
              iconBg="#F2FBF6"
            />
          </div>

          <div
            onClick={() => onNavigate('farmer-orders')}
            className="cursor-pointer"
          >
            <StatCard
              label="Orders"
              value={orders.length}
              subtext={
                pendingOrdersCount > 0
                  ? `${pendingOrdersCount} pending confirmation`
                  : 'All trade agreements active'
              }
              icon={ShoppingBag}
              iconColor="#1E40AF"
              iconBg="#EFF6FF"
            />
          </div>

          <div
            onClick={() => onNavigate('farmer-financing')}
            className="cursor-pointer"
          >
            <StatCard
              label="Financing Desk"
              value={`₹${(financingRequests.reduce((sum, r) => sum + (Number(r.approvedAmount) || Number(r.requestedAmount) || 0), 0) / 1000).toFixed(0)}k`}
              subtext="Transaction liquidity"
              icon={Landmark}
              iconColor="#D97706"
              iconBg="#FEF3C7"
            />
          </div>
        </div>

        {/* Certified Warehouse & e-NWR Callout Card */}
        <Card className="p-6 bg-gradient-to-r from-[#EBF5F0] via-[#F2FBF6] to-white border border-[#10B981]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0B3326] text-[#34D399] flex items-center justify-center shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider block">
                WDRA Certified Storage & e-NWR Electronic Title
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-[#0B3326] font-heading">
                  Sell or Auction Directly from Certified Cold Storage
                </span>
              </div>
              <p className="text-xs text-[#566861] mt-0.5">
                Preserve produce freshness, reduce distress sales, and access 80% LTV bank advances on stored inventory.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigate('farmer-inventory')}
            icon={ArrowRight}
            iconPosition="right"
            className="text-xs font-bold shrink-0"
          >
            Warehouse Vault
          </Button>
        </Card>

        {/* Section: Your Listings */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Your Listings
              </h2>
              <p className="text-xs text-[#566861] mt-0.5">
                Manage your active commodity lots on the live exchange
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate('farmer-my-listings')}
                icon={ArrowRight}
                iconPosition="right"
                className="text-xs font-semibold"
              >
                View All Listings ({listings.length})
              </Button>
            </div>
          </div>

          {/* Listings Grid */}
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.slice(0, 6).map((item) => (
                <ListingCard
                  key={item.id}
                  listing={item}
                  onView={() => onNavigate('farmer-my-listings')}
                  onEdit={() => onNavigate('farmer-create-listing', { editListing: item })}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
                <Package className="w-6 h-6 text-[#10B981]" />
              </div>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                No produce listed yet
              </h3>
              <p className="text-xs text-[#566861] max-w-sm mx-auto">
                Start by creating your first produce listing with target price and location.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onNavigate('farmer-create-listing')}
                  icon={Plus}
                >
                  List Produce Now
                </Button>
              </div>
            </Card>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
