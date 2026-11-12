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
  FileText,
  Info
} from 'lucide-react';
import { createOrder, getOrders } from '../../utils/orders';
import { deductListingQuantity, getListingById, COMMODITY_IMAGES } from '../../utils/listings';
import { getInspectionForOrder, subscribeToInspections } from '../../utils/inspection';
import { getResolvedUserKycStatus, isUserKycVerified, getCurrentUser } from '../../utils/auth';
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

  const activeUser = currentUser || user;
  const [currentKycStatus, setCurrentKycStatus] = useState(() => 
    activeUser?.kycStatus || activeUser?.verificationStatus || getResolvedUserKycStatus(activeUser)
  );
  const isVerified = isUserKycVerified(activeUser) || currentKycStatus === 'verified' || activeUser?.kycStatus === 'verified' || activeUser?.verificationStatus === 'verified';
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  useEffect(() => {
    const syncKyc = () => {
      const u = currentUser || user;
      setCurrentKycStatus(u?.kycStatus || u?.verificationStatus || getResolvedUserKycStatus(u));
    };
    syncKyc();
    window.addEventListener('agrolnk_kyc_updated', syncKyc);
    window.addEventListener('storage', syncKyc);
    return () => {
      window.removeEventListener('agrolnk_kyc_updated', syncKyc);
      window.removeEventListener('storage', syncKyc);
    };
  }, [user.id, user.email, currentUser]);

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
    setAutoTriggerInspectionPayment(true);
    setIsInspectionOpen(true);
  };

  const loadInspection = async () => {
    if (listing?.id) {
      const insp = await getInspectionForOrder(listing.id);
      setExistingInspection(insp);
    }
  };

  const [activeBuyerOrder, setActiveBuyerOrder] = useState(null);

  const loadActiveOrder = async () => {
    if (!listing?.id) return;
    try {
      const all = await getOrders();
      const u = activeUser || getCurrentUser() || user;
      const uId = String(u?.id || '').toLowerCase().trim();
      const uEmail = String(u?.email || '').toLowerCase().trim();
      const uName = String(u?.name || '').toLowerCase().trim();
      const currentListingId = String(listing.id || '').trim();

      const listingOrders = all.filter((o) => {
        const orderListingId = String(o.listingId || o.listing_id || '').trim();
        const matchesListing = Boolean(
          (orderListingId && currentListingId && orderListingId === currentListingId) ||
          (!orderListingId && o.commodity === listing.commodity && o.variety === listing.variety)
        );

        if (!matchesListing) return false;

        const oBuyerId = String(o.buyerId || o.buyer_id || '').toLowerCase().trim();
        const oBuyerEmail = String(o.buyerEmail || o.buyer_email || '').toLowerCase().trim();
        const oBuyerName = String(o.buyerName || o.buyer_name || '').toLowerCase().trim();

        const matchesBuyer = Boolean(
          (!uId && !uEmail && !uName) ||
          (uId && oBuyerId && uId === oBuyerId) ||
          (uEmail && oBuyerEmail && uEmail === oBuyerEmail) ||
          (uName && oBuyerName && !['buyer', 'verified buyer', 'user'].includes(uName) && uName === oBuyerName) ||
          o.status === 'awaiting_freight_quote' ||
          o.status === 'freight_quoted' ||
          Boolean(o.awaitingFreightQuote)
        );

        const isNotDead = o.status !== 'cancelled' && o.status !== 'deleted';
        return matchesListing && matchesBuyer && isNotDead;
      });

      listingOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setActiveBuyerOrder(listingOrders[0] || null);
    } catch (e) {
      console.warn('Could not load active order for listing:', e);
    }
  };

  useEffect(() => {
    loadActiveOrder();
    window.addEventListener('agrolnk_orders_updated', loadActiveOrder);
    window.addEventListener('agrolnk_order_updated', loadActiveOrder);
    window.addEventListener('storage', loadActiveOrder);
    return () => {
      window.removeEventListener('agrolnk_orders_updated', loadActiveOrder);
      window.removeEventListener('agrolnk_order_updated', loadActiveOrder);
      window.removeEventListener('storage', loadActiveOrder);
    };
  }, [listing?.id, activeUser?.id, activeUser?.email]);

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
      let order = orderPayload?.alreadyCreatedOrder || null;

      if (!order) {
        order = await createOrder({
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
      }

      toast.success(
        order?.status === 'awaiting_freight_quote' || orderPayload?.awaitingFreightQuote
          ? 'Lot reserved! 30-minute live freight RFQ broadcasted to verified transporters.'
          : orderPayload.paymentMode === 'escrow_van'
          ? 'Order placed! Combined Crop + Freight Escrow verified via automated bank clearing.'
          : 'Order confirmed! Combined Crop + Freight Escrow locked in security.'
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
      <div className="max-w-4xl mx-auto space-y-8 text-left">
        
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('buyer-marketplace')}
              title="Return to Marketplace"
              aria-label="Back to Marketplace"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs hover:bg-[#F8FAF8] text-[#0B3326] flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-5 h-5 text-[#0B3326]" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-[#0B3326] hidden sm:inline">
              Marketplace Lot Inspection
            </span>
          </div>
          <Badge variant="emerald" size="sm" dot={true}>
            Live Verified Batch
          </Badge>
        </div>

        {/* Main Produce Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Produce Photo/Video Slider & Visual Badges */}
          <div className="lg:col-span-7 space-y-4">
            <ProductMediaSlider
              media={listing.images || []}
              commodity={listing.commodity}
              aspectClassName="h-72 sm:h-96"
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
                <div className="p-3 rounded-2xl bg-[#0B3326] border border-[#14624A] text-white flex items-center justify-between text-xs shadow-md">
                  <span className="flex items-center gap-1.5 text-[#34D399] font-medium">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" /> Escrow Secured Agreement
                  </span>
                  <span className="font-bold">Ready for Dispatch</span>
                </div>
              }
            />

            {/* Quality & Assay Specifications */}
            <Card className="p-6 bg-white border border-[#E5EDE8] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B3326] font-heading uppercase tracking-wider">
                  Quality & Assay Report
                </h3>
                {existingInspection?.status === 'passed' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Assayed & Certified
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="text-[#566861] block text-[11px]">Quality Rating</span>
                  <span className="font-bold text-[#0B3326] text-sm">
                    {existingInspection?.grade ? `Grade ${existingInspection.grade} (Assayed)` : `Grade ${listing.grade} (Standard)`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="text-[#566861] block text-[11px]">Quality Status</span>
                  <span className={`font-bold text-sm ${existingInspection?.inspectorName ? 'text-[#10B981]' : 'text-[#0B3326]'}`}>
                    {existingInspection?.inspectorName ? 'Assayer Certified ✓' : 'Farmer Self-Declared'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Produce Detailing & Farmer Notes */}
            {listing.description && (
              <Card className="p-5 sm:p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E5EDE8]">
                  <FileText className="w-4 h-4 text-[#10B981]" />
                  <h3 className="text-sm font-bold text-[#0B3326] font-heading">
                    Produce Detailing & Special Notes
                  </h3>
                </div>
                <p className="text-xs text-[#2D5A47] leading-relaxed whitespace-pre-line bg-[#F8FAF8] p-3.5 rounded-xl border border-[#E5EDE8]/60">
                  {listing.description}
                </p>
              </Card>
            )}
          </div>

          {/* Right Column: Pricing, Seller Info & Buy Now Card */}
          <div className="lg:col-span-5 space-y-5">
            
            <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-md space-y-6">
              
              {/* Commodity Title & Variety */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
                  {listing.commodity}
                </h1>
                {hasSpecificVariety(listing.variety) && (
                  <p className="text-xs font-semibold text-[#10B981]">
                    Variety: {listing.variety}
                  </p>
                )}
                <p className="text-xs text-[#566861] flex items-center gap-1.5 pt-1 flex-wrap">
                  <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>
                    {listing.district ? `${listing.district}, ` : ''}
                    {listing.state}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#0B3326]">
                    Exact Address Privacy Protected
                  </span>
                </p>
              </div>

              {/* Price & Valuation Banner */}
              <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#DCFCE7]/80">
                  <span>Ex-Farm Unit Price</span>
                  <span className="text-[#34D399] font-bold">Fixed Direct Price</span>
                </div>
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline flex-wrap gap-2">
                    <span className="text-3xl font-extrabold font-heading text-white">
                      ₹{Number(listing.price || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-white/70">/ {listing.unit}</span>
                    {listing.unit === 'MT' && (
                      <span className="text-xs text-[#34D399] font-bold">
                        (₹{Math.round(Number(listing.price || 0) / 10).toLocaleString('en-IN')} / Quintal)
                      </span>
                    )}
                  </div>
                  <Badge variant="accent" size="sm">
                    In Stock
                  </Badge>
                </div>
                <div className="pt-2.5 border-t border-[#14624A] grid grid-cols-2 gap-2 text-xs text-[#DCFCE7]/90">
                  <div>
                    <span className="text-[10px] text-white/60 block uppercase font-semibold">Available Stock</span>
                    <span className="font-bold text-white">
                      {Number(listing.quantity || 0).toLocaleString('en-IN')} {listing.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/60 block uppercase font-semibold">Min Order (MOQ)</span>
                    <span className="font-bold text-[#34D399]">
                      {Number(listing.effectiveMinOrderQuantity || listing.minOrderQuantity || 1).toLocaleString('en-IN')} {listing.unit}
                      {Number(listing.minOrderQuantity || 1) > Number(listing.quantity || 0) && (
                        <span className="text-[10px] text-amber-300 block font-normal">
                          (Final Remainder Lot)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#14624A]/60 flex items-center justify-between text-[11px] text-[#DCFCE7]/80">
                  <span>Full Lot Crop Value</span>
                  <span className="font-bold text-white text-xs">
                    ₹{estimatedTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Seller Marketplace Identity */}
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2 text-xs">
                <span className="font-bold text-[#566861] uppercase tracking-wider block text-[10px]">
                  Seller Profile
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#14211D] text-sm">
                    {listing.farmerName || 'Verified Producer'}
                  </span>
                  <Badge variant="emerald" size="sm" className="whitespace-nowrap shrink-0">
                    Verified
                  </Badge>
                </div>
                <p className="text-[11px] text-[#566861]">
                  Direct grower with 100% past delivery fulfillment on AgroLnk.
                </p>
              </div>

              {/* Quality Verification / Pre-Buy Inspection Desk — one crisp status card */}
              {(() => {
                const insp = existingInspection;
                const fee = insp?.inspectionFee || 500;
                const stage = !insp
                  ? 'none'
                  : insp.status === 'disputed'
                  ? 'disputed'
                  : insp.status === 'passed' || insp.status === 'resolved'
                  ? insp.feeStatus === 'paid' ? 'verified' : 'ready'
                  : 'testing';

                const config = {
                  none: {
                    pill: 'Optional',
                    pillCls: 'bg-white text-[#566861] border border-[#E5EDE8]',
                    line: 'Get an official lab test before you buy.',
                  },
                  testing: {
                    pill: 'In Progress',
                    pillCls: 'bg-amber-100 text-amber-800',
                    line: "Assayer is testing this lot. We'll notify you when the report is ready.",
                  },
                  ready: {
                    pill: 'Report Ready',
                    pillCls: 'bg-amber-100 text-amber-800',
                    line: `Lab report is ready. Pay ₹${fee} to view it and unlock buying.`,
                  },
                  verified: {
                    pill: 'Verified ✓',
                    pillCls: 'bg-emerald-100 text-emerald-800',
                    line: `Grade ${insp?.grade || 'A'} • Moisture ${insp?.moisture ?? '—'}% • Lab certified`,
                  },
                  disputed: {
                    pill: 'Under Review',
                    pillCls: 'bg-red-100 text-red-700',
                    line: 'Quality issue is being reviewed by AgroLnk.',
                  },
                }[stage];

                // 3-step tracker: Requested → Lab Testing → Report
                const stepIndex = stage === 'testing' ? 1 : (stage === 'ready' || stage === 'verified') ? 2 : 0;
                const steps = ['Requested', 'Testing', 'Report'];

                const openDetails = () => {
                  setAutoTriggerInspectionPayment(false);
                  setIsInspectionOpen(true);
                };

                return (
                  <div className={`p-4 rounded-2xl border space-y-3 text-xs ${
                    stage === 'verified'
                      ? 'bg-[#F2FBF6] border-[#A7F3D0]'
                      : stage === 'disputed'
                      ? 'bg-red-50/60 border-red-200'
                      : 'bg-amber-50/50 border-amber-200/80'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#0B3326] flex items-center gap-1.5 text-sm">
                        <ClipboardCheck className={`w-4 h-4 ${stage === 'verified' ? 'text-emerald-600' : 'text-amber-700'}`} />
                        Quality Check
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${config.pillCls}`}>
                        {config.pill}
                      </span>
                    </div>

                    {stage !== 'none' && stage !== 'disputed' && (
                      <div className="flex items-center">
                        {steps.map((label, i) => {
                          const done = i < stepIndex || stage === 'verified';
                          const active = i === stepIndex && stage !== 'verified';
                          return (
                            <React.Fragment key={label}>
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  done
                                    ? 'bg-emerald-500 text-white'
                                    : active
                                    ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                                    : 'bg-white border border-[#E5EDE8] text-[#566861]'
                                }`}>
                                  {done ? '✓' : i + 1}
                                </span>
                                <span className={`text-[10px] font-semibold ${done || active ? 'text-[#0B3326]' : 'text-[#9AA8A2]'}`}>
                                  {label}
                                </span>
                              </div>
                              {i < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1.5 mb-4 rounded-full ${i < stepIndex || stage === 'verified' ? 'bg-emerald-400' : 'bg-[#E5EDE8]'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-[11px] text-[#566861] leading-snug">{config.line}</p>

                    {stage === 'none' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={openDetails}
                        icon={ClipboardCheck}
                        iconPosition="left"
                        className="w-full justify-center py-2 text-xs font-bold border-amber-200 text-amber-950 hover:bg-amber-100/60 cursor-pointer"
                      >
                        Request Quality Check
                      </Button>
                    )}

                    {stage === 'testing' && (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-200/60">
                        <span className="flex items-center gap-1 text-[10px] text-amber-800 font-medium">
                          <Lock className="w-3 h-3" /> Buying unlocks after the report
                        </span>
                        <button
                          type="button"
                          onClick={openDetails}
                          className="text-[11px] font-bold text-[#0B3326] underline underline-offset-2 hover:text-[#10B981] cursor-pointer whitespace-nowrap"
                        >
                          View details
                        </button>
                      </div>
                    )}

                    {stage === 'ready' && (
                      <button
                        type="button"
                        onClick={handleOpenInspectionPayment}
                        className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer flex items-center justify-center gap-2 transition-all"
                      >
                        <Scale className="w-4 h-4 text-amber-200" />
                        Pay ₹{fee} & View Report
                      </button>
                    )}

                    {stage === 'verified' && (
                      <button
                        type="button"
                        onClick={openDetails}
                        className="w-full py-2 px-4 bg-white border border-[#A7F3D0] hover:bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View Lab Report
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Buy Now CTA Section with Quality Inspection Protection */}
              <div className="space-y-2">
                {/* Inspection requested / passed-unpaid states are fully handled by the Quality Check card above */}

                {/* Condition 3: Quality disputed */}
                {existingInspection && existingInspection.status === 'disputed' && (
                  <div className="space-y-2">
                    <button
                      disabled
                      className="w-full py-3.5 px-4 bg-red-50 border border-red-200 text-red-700 font-bold text-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      Quality Dispute Under Review
                    </button>
                    <p className="text-[11px] text-red-700 text-center font-medium">
                      Admin ombudsman is arbitrating the quality discrepancy.
                    </p>
                  </div>
                )}

                {/* Anti-Self-Trading: Seller cannot purchase own produce */}
                {isOwnListing ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold text-center flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>You are the producer of this listing. Self-trading is not permitted.</span>
                  </div>
                ) : (
                  /* Condition 4: No inspection requested OR inspection passed AND fee is paid */
                  (!existingInspection || (
                    (existingInspection.status === 'passed' || existingInspection.status === 'resolved') && 
                    existingInspection.feeStatus === 'paid'
                  )) && (
                    <div>
                      {!isVerified ? (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 space-y-3 shadow-xs text-left">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
                              <ShieldCheck className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-bold text-amber-950">KYC Verification Required</h4>
                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-md">Action Needed</span>
                              </div>
                              <p className="text-[11px] text-amber-800 mt-1 leading-snug">
                                Complete quick identity verification to unlock escrow purchases and place trade orders.
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="amber"
                            size="md"
                            onClick={() => setIsVerificationModalOpen(true)}
                            icon={ShieldCheck}
                            iconPosition="left"
                            className="w-full justify-center py-2.5 font-bold text-xs shadow-xs cursor-pointer"
                          >
                            Verify Identity to Purchase
                          </Button>

                          <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-700/90 pt-0.5">
                            <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>100% Escrow & WDRA Protected Exchange</span>
                          </div>
                        </div>
                      ) : activeBuyerOrder && (activeBuyerOrder.status === 'awaiting_freight_quote' || activeBuyerOrder.status === 'freight_quoted' || activeBuyerOrder.awaitingFreightQuote) ? (
                        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-2.5 text-xs text-left shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                              <Truck className="w-4 h-4 text-amber-700 animate-pulse" />
                              30-Min Freight Bidding Active
                            </span>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                              {activeBuyerOrder.orderNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-900 leading-snug">
                            You reserved <strong>{activeBuyerOrder.quantity} {activeBuyerOrder.unit}</strong> from this lot. Transporters are currently submitting live competitive bids.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <Button
                              variant="primary"
                              size="md"
                              onClick={() => setIsModalOpen(true)}
                              icon={Truck}
                              iconPosition="left"
                              className="w-full justify-center font-bold text-xs bg-[#0B3326] text-white hover:bg-[#07241A] py-2.5 cursor-pointer shadow-xs"
                            >
                              View Bids &amp; Escrow
                            </Button>
                            <Button
                              variant="secondary"
                              size="md"
                              onClick={() => onNavigate('buyer-orders', { selectedOrder: activeBuyerOrder })}
                              className="w-full justify-center font-bold text-xs py-2.5 cursor-pointer"
                            >
                              Track in My Orders
                            </Button>
                          </div>
                        </div>
                      ) : activeBuyerOrder && activeBuyerOrder.status !== 'cancelled' && activeBuyerOrder.status !== 'deleted' ? (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2 text-xs text-left shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Order Placed ({activeBuyerOrder.orderNumber})
                            </span>
                            <Badge variant="emerald" size="sm">Active Order</Badge>
                          </div>
                          <p className="text-[11px] text-emerald-900 leading-snug">
                            You have an active order for <strong>{activeBuyerOrder.quantity} {activeBuyerOrder.unit}</strong> from this consignment.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="secondary"
                              size="md"
                              onClick={() => onNavigate('buyer-orders', { selectedOrder: activeBuyerOrder })}
                              className="flex-1 justify-center text-xs font-bold py-2"
                            >
                              Track Order &amp; Delivery →
                            </Button>
                            {Number(listing.quantity) >= (listing.effectiveMinOrderQuantity || 1) && (
                              <Button
                                variant="ghost"
                                size="md"
                                onClick={() => {
                                  setActiveBuyerOrder(null);
                                  setIsModalOpen(true);
                                }}
                                className="text-xs font-semibold text-[#0B3326]"
                              >
                                Buy More
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Button
                            variant="accent"
                            size="lg"
                            onClick={() => setIsModalOpen(true)}
                            icon={ShoppingBag}
                            iconPosition="left"
                            className="w-full justify-center py-3.5 font-bold text-base shadow-sm cursor-pointer"
                          >
                            Buy Now
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

            </Card>

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
        initialOrder={activeBuyerOrder}
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
