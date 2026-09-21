import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import ListingCard from '../../components/farmer/ListingCard';
import ListingRow from '../../components/farmer/ListingRow';
import ProduceDetailModal from '../../components/farmer/ProduceDetailModal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import {
  Package,
  Plus,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Trash2,
  AlertTriangle,
  Lock,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import {
  getFarmerListings,
  getListingDraft,
  clearListingDraft,
  checkListingBookings,
  deleteListing
} from '../../utils/listings';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function MyListings({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Farmer', id: '', role: 'farmer' };
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [blockedDeleteInfo, setBlockedDeleteInfo] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState(null);
  const [savedDraft, setSavedDraft] = useState(() => getListingDraft(user.id));
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('agrolnk_farmer_listings_viewmode') || 'rows';
    } catch {
      return 'rows';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('agrolnk_farmer_listings_viewmode', mode);
    } catch {}
  };

  const ITEMS_PER_PAGE = 6;

  const fetchListings = async (showFlash = false) => {
    try {
      if (showFlash) {
        showGlobalLoader('Loading Harvest Lots...', 'Fetching your active marketplace listings & spot prices...');
      }
      const data = await getFarmerListings(user.id);
      setListings(data || []);
    } catch (err) {
      console.error('Error fetching farmer listings:', err);
    } finally {
      if (showFlash) {
        hideGlobalLoader();
      }
    }
  };

  useEffect(() => {
    fetchListings(true);

    const handleDraftUpdate = () => {
      setSavedDraft(getListingDraft(user.id));
    };

    const handleListingsUpdate = () => {
      fetchListings(false);
    };

    window.addEventListener('agrolnk_listing_draft_updated', handleDraftUpdate);
    window.addEventListener('agrolnk_listings_updated', handleListingsUpdate);
    window.addEventListener('storage', handleListingsUpdate);

    return () => {
      hideGlobalLoader();
      window.removeEventListener('agrolnk_listing_draft_updated', handleDraftUpdate);
      window.removeEventListener('agrolnk_listings_updated', handleListingsUpdate);
      window.removeEventListener('storage', handleListingsUpdate);
    };
  }, [user.id]);

  const handleDeleteClick = async (lot) => {
    if (!lot) return;
    try {
      showGlobalLoader('Checking Booking Status...', 'Auditing marketplace orders and escrow commitments...');
      const check = await checkListingBookings(lot.id);
      hideGlobalLoader();

      if (!check.canDelete) {
        setBlockedDeleteInfo({
          listing: lot,
          reason: check.reason,
          orderNumber: check.orderNumber,
          buyerName: check.buyerName,
        });
      } else {
        setListingToDelete(lot);
      }
    } catch (err) {
      hideGlobalLoader();
      console.error('Error checking listing bookings:', err);
      setListingToDelete(lot);
    }
  };

  const handleConfirmDelete = async () => {
    if (!listingToDelete) return;
    setIsDeleting(true);
    try {
      await deleteListing(listingToDelete.id, user.id);
      setDeleteSuccessMsg(`"${listingToDelete.commodity}" listing was removed successfully.`);
      setTimeout(() => setDeleteSuccessMsg(null), 4000);
      setListingToDelete(null);
      if (selectedListing?.id === listingToDelete.id) {
        setSelectedListing(null);
      }
      await fetchListings(false);
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert(err.message || 'Failed to delete listing.');
    } finally {
      setIsDeleting(false);
    }
  };

  const safeListings = Array.isArray(listings) ? listings : [];

  // Convert local draft into displayable listing if exists
  const localDraftItem = savedDraft?.formData?.commodity ? {
    id: 'draft_local',
    commodity: savedDraft.formData.commodity,
    variety: savedDraft.formData.variety || 'Draft Lot',
    grade: savedDraft.formData.grade || 'A',
    quantity: Number(savedDraft.formData.quantity || 0),
    unit: savedDraft.formData.unit || 'kg',
    price: Number(savedDraft.formData.price || 0),
    totalAmount: Number(savedDraft.formData.quantity || 0) * Number(savedDraft.formData.price || 0),
    state: savedDraft.formData.state || '',
    district: savedDraft.formData.district || '',
    images: savedDraft.formData.images || [],
    status: 'draft',
    isLocalDraft: true,
    rawDraft: savedDraft,
  } : null;

  const allDisplayableListings = localDraftItem 
    ? [localDraftItem, ...safeListings.filter(l => l.id !== 'draft_local')] 
    : safeListings;

  const isListingActive = (l) => (l.status === 'active' || !l.status) && Number(l.quantity) > 0;
  const isListingSold = (l) => l.status === 'sold' || Number(l.quantity) <= 0;

  const tabs = [
    { id: 'all', label: 'All Listings', count: allDisplayableListings.length },
    {
      id: 'active',
      label: 'Active',
      count: allDisplayableListings.filter(isListingActive).length,
    },
    { id: 'sold', label: 'Sold Out', count: allDisplayableListings.filter(isListingSold).length },
    { id: 'drafts', label: 'Drafts', count: allDisplayableListings.filter((l) => l.status === 'draft').length },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const filteredListings = allDisplayableListings.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return isListingActive(item);
    if (activeTab === 'sold') return isListingSold(item);
    if (activeTab === 'drafts') return item.status === 'draft';
    return true;
  });

  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE) || 1;
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

        {/* Top Notification if Unpublished Draft Exists */}
        {savedDraft?.formData?.commodity && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#EBF5F0] via-[#F2FBF6] to-white border border-[#10B981] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-[#0B3326]">
                    You have an unpublished draft: {savedDraft.formData.commodity}
                  </h3>
                  <Badge variant="emerald" size="sm">Draft Saved</Badge>
                </div>
                <p className="text-xs text-[#2D5A47] mt-0.5">
                  {savedDraft.formData.quantity || 0} {savedDraft.formData.unit || 'kg'} • ₹{(Number(savedDraft.formData.quantity || 0) * Number(savedDraft.formData.price || 0)).toLocaleString('en-IN')} • Ready to review and publish to live exchange.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={() => clearListingDraft(user.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#566861] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              >
                Discard
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('farmer-create-listing', { initialData: savedDraft.formData })}
                className="text-xs font-bold py-2 px-4 shadow-xs cursor-pointer"
              >
                Finish & Publish
              </Button>
            </div>
          </div>
        )}

        {/* Delete Success Notification */}
        {deleteSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{deleteSuccessMsg}</span>
            </div>
            <button
              onClick={() => setDeleteSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Tabs & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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

          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={handleSetViewMode}
          />
        </div>

        {/* Listings Content: Row View vs Card Grid */}
        {filteredListings.length > 0 ? (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    onView={(lot) => setSelectedListing(lot)}
                    onEdit={(lot) =>
                      onNavigate('farmer-create-listing', { editListing: lot })
                    }
                    onDelete={(lot) => handleDeleteClick(lot)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedListings.map((item) => (
                  <ListingRow
                    key={item.id}
                    listing={item}
                    onView={(lot) => setSelectedListing(lot)}
                    onEdit={(lot) =>
                      onNavigate('farmer-create-listing', { editListing: lot })
                    }
                    onDelete={(lot) => handleDeleteClick(lot)}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredListings.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
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
          onDelete={(lot) => handleDeleteClick(lot)}
        />

        {/* Delete Confirmation Modal */}
        {listingToDelete && (
          <Modal
            isOpen={!!listingToDelete}
            onClose={() => !isDeleting && setListingToDelete(null)}
            title="Delete Produce Listing"
            subtitle={`Remove lot #${listingToDelete.id} from marketplace`}
            icon={Trash2}
            iconColor="text-rose-600"
            iconBg="bg-rose-50"
            maxWidth="max-w-md"
            footer={
              <div className="flex items-center justify-end w-full gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setListingToDelete(null)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  icon={Trash2}
                  iconPosition="left"
                  className="px-5 py-2 font-bold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Listing'}
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-left">
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-[#0B3326] text-base">
                    {listingToDelete.commodity}
                  </h4>
                  <Badge variant="dark" size="sm">
                    Grade {listingToDelete.grade || 'A'}
                  </Badge>
                </div>
                <div className="text-xs text-[#566861] flex items-center justify-between">
                  <span>
                    {listingToDelete.quantity} {listingToDelete.unit || 'kg'} • {listingToDelete.variety || 'Standard'}
                  </span>
                  <span className="font-bold text-[#0B3326]">
                    ₹{listingToDelete.price}/{listingToDelete.unit || 'kg'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Are you sure you want to delete this listing?</p>
                  <p className="text-[#566861] text-[11px]">
                    This will permanently remove the produce lot from the National Exchange. Buyers will no longer be able to discover or purchase this lot.
                  </p>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Blocked Modal (When active order/booking exists) */}
        {blockedDeleteInfo && (
          <Modal
            isOpen={!!blockedDeleteInfo}
            onClose={() => setBlockedDeleteInfo(null)}
            title="Cannot Delete Booked Produce"
            subtitle="Active order or trade credit in progress"
            icon={Lock}
            iconColor="text-amber-700"
            iconBg="bg-amber-100"
            maxWidth="max-w-md"
            footer={
              <div className="flex items-center justify-end w-full">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setBlockedDeleteInfo(null)}
                  className="px-6 py-2 font-bold"
                >
                  Understood
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-left">
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Trade Protection Lock Active</span>
                </div>
                <p className="text-xs text-[#566861] leading-relaxed">
                  {blockedDeleteInfo.reason ||
                    'A buyer has already confirmed an order or trade credit for this produce lot.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-[#566861] space-y-1">
                <p className="font-semibold text-[#0B3326]">Why is deletion restricted?</p>
                <p className="text-[11px] leading-relaxed">
                  Once a buyer books or places an order, legal escrow funds are locked and transport arrangements are initiated. Booked produce cannot be deleted until the order lifecycle is completed or cancelled.
                </p>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </DashboardLayout>
  );
}
