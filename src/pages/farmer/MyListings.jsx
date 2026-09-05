import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import ListingCard from '../../components/farmer/ListingCard';
import ProduceDetailModal from '../../components/farmer/ProduceDetailModal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import {
  Package,
  Plus,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { getFarmerListings } from '../../utils/listings';

export default function MyListings({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi Vel', role: 'farmer' };
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchListings = async () => {
      try {
        const data = await getFarmerListings(user.id);
        if (isMounted) setListings(data || []);
      } catch (err) {
        console.error('Error fetching farmer listings:', err);
      }
    };
    fetchListings();
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const safeListings = Array.isArray(listings) ? listings : [];

  const isListingActive = (l) => (l.status === 'active' || !l.status) && Number(l.quantity) > 0;
  const isListingSold = (l) => l.status === 'sold' || Number(l.quantity) <= 0;

  const tabs = [
    { id: 'all', label: 'All Listings', count: safeListings.length },
    {
      id: 'active',
      label: 'Active',
      count: safeListings.filter(isListingActive).length,
    },
    { id: 'sold', label: 'Sold Out', count: safeListings.filter(isListingSold).length },
    { id: 'drafts', label: 'Drafts', count: safeListings.filter((l) => l.status === 'draft').length },
  ];

  const filteredListings = safeListings.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return isListingActive(item);
    if (activeTab === 'sold') return isListingSold(item);
    if (activeTab === 'drafts') return item.status === 'draft';
    return true;
  });

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('farmer-dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              My Listings
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Manage and track your agricultural produce lots listed on the exchange.
            </p>
          </div>

          <Button
            variant="accent"
            size="md"
            icon={Plus}
            iconPosition="left"
            onClick={() => onNavigate('farmer-create-listing')}
            className="font-bold py-2.5 px-5 shadow-xs shrink-0 cursor-pointer"
          >
            List New Produce
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#F8FAF8] text-[#566861]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Listings Grid */}
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                onView={(lot) => setSelectedListing(lot)}
                onEdit={(lot) =>
                  onNavigate('farmer-create-listing', { editListing: lot })
                }
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
              <Package className="w-6 h-6 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading">
              No {activeTab} listings found
            </h3>
            <p className="text-xs text-[#566861] max-w-sm mx-auto">
              {activeTab === 'all'
                ? 'You have not created any produce listings yet.'
                : `There are currently no listings under "${activeTab}".`}
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => onNavigate('farmer-create-listing')}
                icon={Plus}
              >
                List New Produce
              </Button>
            </div>
          </Card>
        )}

        {/* Produce Lot Details Modal Overlay */}
        <ProduceDetailModal
          listing={selectedListing}
          isOpen={!!selectedListing}
          onClose={() => setSelectedListing(null)}
          onEdit={(lot) =>
            onNavigate('farmer-create-listing', { editListing: lot })
          }
        />

      </div>
    </DashboardLayout>
  );
}
