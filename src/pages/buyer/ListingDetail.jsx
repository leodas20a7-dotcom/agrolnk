import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import OrderModal from '../../components/buyer/OrderModal';
import BuyerInspectionModal from '../../components/inspection/BuyerInspectionModal';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Award,
  Truck,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShoppingBag,
  ClipboardCheck,
  Clock,
  Lock,
  Scale,
  AlertCircle,
  FileText
} from 'lucide-react';
import { createOrder } from '../../utils/orders';
import { deductListingQuantity, getListingById, COMMODITY_IMAGES } from '../../utils/listings';
import { getInspectionForOrder, subscribeToInspections } from '../../utils/inspection';
import { getResolvedUserKycStatus } from '../../utils/auth';
import VerificationRequiredModal from '../../components/verification/VerificationRequiredModal';
import ProductMediaSlider from '../../components/ui/ProductMediaSlider';
import { hasSpecificVariety } from '../../data/commodityTaxonomy';
import { toast } from '../../context/ToastContext';

const STORAGE_ACTIVE_LISTING_KEY = 'agrolnk_active_listing_detail';

export default function ListingDetail({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Buyer', id: '', role: 'buyer' };

  const [listing, setListing] = useState(() => {
    if (navState?.listing) {
      try {
        sessionStorage.setItem(STORAGE_ACTIVE_LISTING_KEY, JSON.stringify(navState.listing));
      } catch {}
      return navState.listing;
    }
    try {
      const stored = sessionStorage.getItem(STORAGE_ACTIVE_LISTING_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const [currentKycStatus, setCurrentKycStatus] = useState(() => getResolvedUserKycStatus(user));
  const isVerified = currentKycStatus === 'verified';
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  useEffect(() => {
    const syncKyc = () => {
      setCurrentKycStatus(getResolvedUserKycStatus(user));
    };
    syncKyc();
    window.addEventListener('agrolnk_kyc_updated', syncKyc);
    window.addEventListener('storage', syncKyc);
    return () => {
      window.removeEventListener('agrolnk_kyc_updated', syncKyc);
      window.removeEventListener('storage', syncKyc);
    };
  }, [user.id, user.email]);

  // Sync navState.listing whenever it changes
  useEffect(() => {
    if (navState?.listing) {
      setListing(navState.listing);
      try {
        sessionStorage.setItem(STORAGE_ACTIVE_LISTING_KEY, JSON.stringify(navState.listing));
      } catch {}
    }
  }, [navState?.listing]);

  // If we have a listing ID, refresh its latest details from Supabase
  useEffect(() => {
    if (listing?.id) {
      getListingById(listing.id).then((fresh) => {
        if (fresh) {
          setListing(fresh);
          try {
            sessionStorage.setItem(STORAGE_ACTIVE_LISTING_KEY, JSON.stringify(fresh));
          } catch {}
        }
      });
    }
  }, [listing?.id]);

  const fallbackImg = listing?.commodity && COMMODITY_IMAGES[listing.commodity]
    ? COMMODITY_IMAGES[listing.commodity]
    : 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [autoTriggerInspectionPayment, setAutoTriggerInspectionPayment] = useState(false);
  const [existingInspection, setExistingInspection] = useState(null);
  const estimatedTotal = Number(listing?.quantity || 0) * Number(listing?.price || 0);

  const handleOpenInspectionPayment = () => {
    if (!isVerified) {
      setIsVerificationModalOpen(true);
      return;
    }
    setAutoTriggerInspectionPayment(true);
    setIsInspectionOpen(true);
  };

  const loadInspection = async () => {
    if (listing?.id) {
      const insp = await getInspectionForOrder(listing.id);
      setExistingInspection(insp);
    }
  };

  useEffect(() => {
    if (listing?.id) {
      loadInspection();
    }

    const unsubscribe = subscribeToInspections(() => {
      loadInspection();
    });

    const handleLocalUpdate = () => {
      loadInspection();
    };
    window.addEventListener('agrolnk_inspections_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      unsubscribe?.();
      window.removeEventListener('agrolnk_inspections_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, [listing?.id]);

  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [buyQty, setBuyQty] = useState(1);

  useEffect(() => {
    if (listing?.quantity) {
      const q = Number(listing.quantity);
      setBuyQty(q >= 10 ? 10 : Math.max(1, q));
    }
  }, [listing?.id]);

  const isOwnListing = Boolean(
    user?.id && (
      String(user.id) === String(listing?.farmerId || listing?.farmer_id) ||
      (user.email && listing?.farmerEmail && user.email.toLowerCase() === listing.farmerEmail.toLowerCase())
    )
  );

  const handleOrderConfirmed = async (orderPayload) => {
    if (!listing || isProcessingOrder) return;
    if (isOwnListing) {
      toast.error('You cannot buy your own produce. Self-trading is not permitted on AgroLnk.');
      return;
    }
    setIsProcessingOrder(true);
    try {
      const order = await createOrder({
        ...orderPayload,
        buyerId: user.id || '',
        buyerName: user.name || 'Buyer',
        buyerPhone: user.phone || orderPayload?.buyerPhone || '',
        buyerEmail: user.email || '',
        buyerCompany: user.companyName || user.orgName || orderPayload?.buyerCompany || '',
        buyerAddress: orderPayload?.buyerAddress || user.address || '',
        buyerDistrict: orderPayload?.buyerDistrict || user.district || '',
        buyerState: orderPayload?.buyerState || user.state || '',
        buyerPincode: orderPayload?.buyerPincode || user.pincode || '',
        deliveryLocation: orderPayload?.deliveryLocation || {
          state: orderPayload?.buyerState || user.state || 'Tamil Nadu',
          district: orderPayload?.buyerDistrict || user.district || 'Chennai',
          address: orderPayload?.buyerAddress || user.address || 'Wholesale Market Hub',
          pincode: orderPayload?.buyerPincode || user.pincode || '600001',
          companyName: user.companyName || user.name || 'Buyer Enterprise',
          phone: user.phone || '',
        },
      });

      // Deduct quantity only if not already deducted by createOrder
      const deductQty = orderPayload.quantityInListingUnit ?? orderPayload.quantity;
      if (!order?.atomicDeducted) {
        await deductListingQuantity(listing.id, deductQty);
      }

      toast.success(
        orderPayload.paymentMode === 'escrow_van'
          ? 'Order placed! UTR submitted for admin bank statement check.'
          : 'Order placed successfully! Escrow deposit held in security.'
      );
      setIsModalOpen(false);
      onNavigate('buyer-orders', { newOrder: order });
    } catch (err) {
      console.error('Order creation failed:', err);
      toast.error(err.message || 'Unable to complete order. Please verify lot availability.');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  if (!listing) {
    return (
      <DashboardLayout currentUser={user} onNavigate={onNavigate}>
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center mx-auto shadow-sm">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0B3326] font-heading">
            No Produce Lot Selected
          </h2>
          <p className="text-xs text-[#566861] max-w-md mx-auto">
            Please select an active produce listing from the marketplace to inspect assay reports, pricing, and place procurement orders.
          </p>
          <Button
            variant="primary"
            size="md"
            icon={ArrowLeft}
            iconPosition="left"
            onClick={() => onNavigate('buyer-marketplace')}
            className="cursor-pointer font-bold"
          >
            Explore Marketplace
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="max-w-6xl mx-auto space-y-6 text-left">
        
        {/* Top Back Navigation & Status */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('buyer-marketplace')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              Live Verified Batch
            </span>
          </div>
        </div>

        {/* Master Showcase Canvas (Matching Reference Design) */}
        <div className="bg-white rounded-[32px] border border-[#E5EDE8] shadow-xs p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Product Visual Showcase */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-[28px] overflow-hidden bg-[#F4F7F6] p-2 border border-[#E5EDE8]">
                <ProductMediaSlider
                  media={listing.images || []}
                  commodity={listing.commodity}
                  aspectClassName="h-80 sm:h-[400px]"
                  overlayBadges={
                    <>
                      <Badge variant="dark" size="md" className="font-bold">
                        Grade {listing.grade}
                      </Badge>
                      <Badge variant="accent" size="md">
                        {listing.saleType === 'direct' ? 'DIRECT SALE' : 'LIVE AUCTION'}
                      </Badge>
                    </>
                  }
                  bottomOverlay={
                    <div className="p-3 rounded-2xl bg-[#0B3326]/95 backdrop-blur-xs border border-[#14624A] text-white flex items-center justify-between text-xs shadow-md">
                      <span className="flex items-center gap-1.5 text-[#34D399] font-medium">
                        <ShieldCheck className="w-4 h-4 text-[#10B981]" /> Escrow Secured Agreement
                      </span>
                      <span className="font-bold">Ready for Dispatch</span>
                    </div>
                  }
                />
              </div>
            </div>

            {/* Right Column: Product Narrative, Specs & Order Console */}
            <div className="lg:col-span-6 space-y-5 lg:pl-2">
              
              {/* Breadcrumb Bar */}
              <div className="text-xs text-[#8C98A4] font-medium flex items-center gap-1.5 flex-wrap">
                <span>Home</span>
                <span>/</span>
                <span>Sourcing</span>
                <span>/</span>
                <span>{listing.commodity}</span>
                <span>/</span>
                <span className="text-[#14211D] font-semibold">Lot #{String(listing.id || '').slice(-6).toUpperCase() || 'DIRECT'}</span>
              </div>

              {/* Title & Variety */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight font-heading">
                  {listing.commodity}
                </h1>
                {hasSpecificVariety(listing.variety) && (
                  <p className="text-xs font-semibold text-[#10B981]">
                    Variety: {listing.variety}
                  </p>
                )}
              </div>

              {/* Short Editorial Blurb */}
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {listing.description ||
                  'Direct farm harvest verified by AgroLnk. Backed by tamper-proof escrow settlement, optional third-party assayer testing, and verified corridor logistics.'}
              </p>

              {/* Ratings, Volume Sold & Trust Social Proof */}
              <div className="flex items-center gap-3 text-xs text-[#4B5563] flex-wrap pb-1">
                <span className="font-bold text-[#111827]">
                  {listing.quantity} {listing.unit} Available
                </span>
                <span className="text-[#D1D5DB]">•</span>
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <span>⭐ 4.9</span>
                  <span className="text-[#6B7280] font-normal">(128 verified trades)</span>
                </div>
                <span className="text-[#D1D5DB]">•</span>
                <span className="text-[#059669] font-medium bg-[#ECFDF5] px-2.5 py-0.5 rounded-full text-[11px] border border-[#A7F3D0]">
                  Verified Farm Lot
                </span>
              </div>

              {/* Price Banner (Clean eCommerce Aesthetic) */}
              <div className="py-3 border-y border-[#F3F4F6] space-y-2">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-extrabold font-heading text-[#111827]">
                      ₹{Number(listing.price || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm font-medium text-[#6B7280]">/ {listing.unit}</span>
                    {listing.unit === 'MT' && (
                      <span className="text-xs font-semibold text-[#10B981]">
                        (₹{Math.round(Number(listing.price || 0) / 10).toLocaleString('en-IN')} / Quintal)
                      </span>
                    )}
                  </div>
                  <Badge variant="accent" size="sm">
                    In Stock
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span>Unit Price: Fixed Direct Rate</span>
                  <span>Est. Lot Total: <strong className="text-[#111827] font-bold">₹{estimatedTotal.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>

              {/* Attributes / Specs Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]/80 space-y-1">
                  <span className="block text-[11px] font-medium text-[#6B7280]">Quality Grade</span>
                  <span className="block text-xs font-bold text-[#111827]">
                    Grade {listing.grade} (FAQ Standard)
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]/80 space-y-1">
                  <span className="block text-[11px] font-medium text-[#6B7280]">Location / Origin</span>
                  <span className="block text-xs font-bold text-[#111827] truncate flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span className="truncate">
                      {listing.district ? `${listing.district}, ` : ''}{listing.state}
                    </span>
                  </span>
                </div>
              </div>

              {/* Interactive Quantity Selector (Matching Reference Design) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827]">Purchase Quantity ({listing.unit})</span>
                  <span className="text-[11px] text-[#6B7280]">Available: {listing.quantity} {listing.unit}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-full bg-[#F3F4F6] p-1 border border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => setBuyQty((prev) => Math.max(1, prev - (listing.unit === 'MT' ? 5 : 1)))}
                      className="w-8 h-8 rounded-full bg-white text-[#111827] hover:bg-[#F9FAFB] flex items-center justify-center font-bold text-sm shadow-xs transition-colors cursor-pointer select-none"
                    >
                      −
                    </button>
                    <span className="px-5 text-xs font-extrabold text-[#111827] min-w-20 text-center select-none">
                      {buyQty} {listing.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBuyQty((prev) => Math.min(Number(listing.quantity || 100), prev + (listing.unit === 'MT' ? 5 : 1)))}
                      className="w-8 h-8 rounded-full bg-white text-[#111827] hover:bg-[#F9FAFB] flex items-center justify-center font-bold text-sm shadow-xs transition-colors cursor-pointer select-none"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-[#566861] font-medium">
                    Order Value: <strong className="text-[#111827]">₹{(buyQty * Number(listing.price || 0)).toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons Console (Matching Reference Design) */}
              <div className="space-y-3 pt-2">
                
                {/* Secondary Pill Button: Pre-Buy Quality Check */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isVerified) {
                      setIsVerificationModalOpen(true);
                    } else if (existingInspection?.status === 'passed' && existingInspection?.feeStatus !== 'paid') {
                      handleOpenInspectionPayment();
                    } else {
                      setAutoTriggerInspectionPayment(false);
                      setIsInspectionOpen(true);
                    }
                  }}
                  className="w-full py-3.5 px-6 rounded-full border border-[#D1D5DB] bg-white hover:bg-[#F9FAFB] text-[#111827] font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <ClipboardCheck className="w-4 h-4 text-[#10B981]" />
                  <span>
                    {!existingInspection
                      ? 'Request Pre-Buy Quality Check +'
                      : existingInspection.status === 'requested'
                      ? 'View Inspector Status (Pending Report)'
                      : existingInspection.feeStatus === 'paid'
                      ? 'View Certified Assay Certificate ✓'
                      : `Pay Lab Fee (₹${existingInspection.inspectionFee || 500}) & View Report`}
                  </span>
                </button>

                {/* Primary Action Button: Buy Now or Verify KYC */}
                {isOwnListing ? (
                  <div className="p-3.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold text-center flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>You are the producer of this listing. Self-trading is not permitted.</span>
                  </div>
                ) : !isVerified ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsVerificationModalOpen(true)}
                      className="w-full py-4 px-6 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      <ShieldCheck className="w-5 h-5 text-white" />
                      <span>Verify Identity to Purchase</span>
                    </button>
                    <p className="text-[11px] text-[#9A3412] text-center font-medium flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-[#EA580C]" />
                      <span>Identity verification required to place escrow trade orders</span>
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-4 px-6 rounded-full bg-[#1F4E40] hover:bg-[#153A2F] text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>Buy Now • Escrow Secured</span>
                  </button>
                )}

              </div>

              {/* Trust Guarantees Row */}
              <div className="pt-4 border-t border-[#F3F4F6] grid grid-cols-2 gap-3 text-xs text-[#4B5563]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>100% Escrow deposit protection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>GPS tracked corridor dispatch</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Specifications & Traceability Grid (Below Hero Showcase) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Quality & Assay Specifications */}
          <div className="p-6 bg-white rounded-3xl border border-[#E5EDE8] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B3326] font-heading uppercase tracking-wider">
                Quality & Assay Specifications
              </h3>
              {existingInspection?.status === 'passed' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Assayed & Certified
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5EDE8]">
                <span className="text-[#6B7280] block text-[11px]">Quality Rating</span>
                <span className="font-bold text-[#111827] text-sm">
                  {existingInspection?.grade ? `Grade ${existingInspection.grade} (Assayed)` : `Grade ${listing.grade} (Standard)`}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5EDE8]">
                <span className="text-[#6B7280] block text-[11px]">Quality Status</span>
                <span className={`font-bold text-sm ${existingInspection?.inspectorName ? 'text-[#10B981]' : 'text-[#111827]'}`}>
                  {existingInspection?.inspectorName ? 'Assayer Certified ✓' : 'Farmer Self-Declared'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5EDE8]">
                <span className="text-[#6B7280] block text-[11px]">Pre-Dispatch Assay</span>
                <span className="font-bold text-[#10B981] text-sm">
                  {existingInspection?.inspectorName ? 'Report Available ✓' : 'Available on Request'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5EDE8]">
                <span className="text-[#6B7280] block text-[11px]">Dispatch Readiness</span>
                <span className="font-bold text-[#111827] text-sm">Immediate (T+0)</span>
              </div>
            </div>
          </div>

          {/* Seller Marketplace Identity & Traceability */}
          <div className="p-6 bg-white rounded-3xl border border-[#E5EDE8] shadow-xs space-y-4">
            <span className="font-bold text-[#0B3326] uppercase tracking-wider block text-sm font-heading">
              Seller Profile & Origin Traceability
            </span>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5EDE8]">
              <div>
                <span className="font-bold text-[#111827] text-sm block">
                  {listing.farmerName || 'Verified Producer'}
                </span>
                <span className="text-xs text-[#6B7280]">
                  {listing.village ? `${listing.village}, ` : ''}{listing.district ? `${listing.district}, ` : ''}{listing.state}
                </span>
              </div>
              <Badge variant="emerald" size="sm">
                Verified Farmer
              </Badge>
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Direct producer registered on the AgroLnk Digital Agri Exchange. 100% past delivery fulfillment rate with WDRA storage guarantees.
            </p>
          </div>

        </div>

      </div>

      {/* Pre-Buy Quality Inspection Modal */}
      <BuyerInspectionModal
        order={listing}
        initialInspection={existingInspection}
        buyerUser={user}
        isOpen={isInspectionOpen}
        autoOpenPayment={autoTriggerInspectionPayment}
        onClose={() => {
          setIsInspectionOpen(false);
          setAutoTriggerInspectionPayment(false);
          loadInspection();
        }}
        onSuccess={(insp) => {
          setExistingInspection(insp);
          loadInspection();
        }}
        onProceedToBuy={() => {
          setIsInspectionOpen(false);
          setAutoTriggerInspectionPayment(false);
          setIsModalOpen(true);
        }}
      />

      {/* Buy Now Confirmation Modal */}
      <OrderModal
        listing={listing}
        isOpen={isModalOpen}
        currentUser={user}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleOrderConfirmed}
      />

      {/* Verification Required Modal */}
      {isVerificationModalOpen && (
        <VerificationRequiredModal
          isOpen={isVerificationModalOpen}
          currentUser={user}
          actionName="place escrow purchase orders and request certified quality assays"
          onClose={() => setIsVerificationModalOpen(false)}
          onSuccess={() => {
            setIsVerificationModalOpen(false);
            setCurrentKycStatus('pending');
          }}
        />
      )}
    </DashboardLayout>
  );
}
