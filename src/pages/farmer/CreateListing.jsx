import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Tag,
  Gavel,
  Package,
  Camera,
  Sparkles,
  AlertCircle,
  Check,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { createListing, updateListing, COMMODITY_IMAGES, getPlatformCommodities, registerCustomCommodity, fetchRemoteCommodities, saveListingDraft, getListingDraft, clearListingDraft } from '../../utils/listings';
import { uploadProduceImage } from '../../utils/imageUpload';
import { toast } from '../../context/ToastContext';
import { createAuction, updateAuction } from '../../utils/auctions';
import VerificationRequiredModal from '../../components/verification/VerificationRequiredModal';
import { isUserVerified } from '../../utils/admin';
import { getResolvedUserKycStatus, getCurrentUser } from '../../utils/auth';
import CommoditySelect from '../../components/ui/CommoditySelect';
import SearchableSelect from '../../components/ui/SearchableSelect';
import VarietySelect from '../../components/ui/VarietySelect';
import MultiMediaUploader from '../../components/ui/MultiMediaUploader';
import { getVarietyImageUrl, hasSpecificVariety } from '../../data/commodityTaxonomy';
import { computePricingBreakdown, PRICING_UNIT_OPTIONS, formatDualPriceRate, getRateInUnit, UNIT_KG_FACTORS } from '../../utils/pricingUnits';

export default function CreateListing({ currentUser, onNavigate, navState }) {
  const activeSessionUser = getCurrentUser();
  const user = currentUser || activeSessionUser || { name: 'Farmer', id: '', role: 'farmer' };

  const initialSource = navState?.editListing || navState?.editAuction || navState?.initialData;
  const isEditing = Boolean(initialSource?.id && initialSource.id !== 'draft_local');
  const editingListingId = isEditing ? initialSource.id : null;
  const isEditingAuction = Boolean(navState?.editAuction || (isEditing && (initialSource?.saleType === 'auction' || initialSource?.basePrice !== undefined)));

  const [existingDraft, setExistingDraft] = useState(() => {
    if (initialSource) return null;
    return getListingDraft(user.id);
  });

  // 5 Progressive Compact Steps
  const [currentStep, setCurrentStep] = useState(1);
  const [saleType, setSaleType] = useState(() => {
    if (navState?.editAuction || isEditingAuction) return 'auction';
    if (navState?.saleType) return navState.saleType;
    if (initialSource?.saleType === 'auction' || initialSource?.startingBid || initialSource?.basePrice) return 'auction';
    return initialSource?.saleType || 'direct';
  });

  // Accurately convert canonical DB price to the selected price unit when editing
  const initialPricing = useMemo(() => {
    if (!initialSource) {
      return {
        unit: 'kg',
        price: '',
        priceUnit: 'kg',
        startingBid: '',
        reservePrice: '',
      };
    }

    const volUnit = initialSource.unit || 'kg';
    const rateUnit = initialSource.priceUnit || volUnit;

    let displayPrice = '';
    const rawPrice = initialSource.price !== undefined && initialSource.price !== null && initialSource.price !== ''
      ? Number(initialSource.price)
      : (initialSource.pricePerUnit !== undefined && initialSource.pricePerUnit !== null ? Number(initialSource.pricePerUnit) : null);

    if (rawPrice !== null && !isNaN(rawPrice)) {
      // In DB, rawPrice is canonical (per volUnit). Convert to rateUnit (e.g., from MT to Quintal)
      const converted = getRateInUnit(rawPrice, volUnit, rateUnit);
      displayPrice = String(converted);
    }

    let displayStartingBid = '';
    const rawStartingBid = initialSource.startingBid !== undefined && initialSource.startingBid !== null
      ? initialSource.startingBid
      : (initialSource.basePrice !== undefined && initialSource.basePrice !== null ? initialSource.basePrice : null);

    if (rawStartingBid !== null && !isNaN(Number(rawStartingBid))) {
      const converted = getRateInUnit(Number(rawStartingBid), volUnit, rateUnit);
      displayStartingBid = String(converted);
    }

    let displayReservePrice = '';
    if (initialSource.reservePrice !== undefined && initialSource.reservePrice !== null && !isNaN(Number(initialSource.reservePrice))) {
      const converted = getRateInUnit(Number(initialSource.reservePrice), volUnit, rateUnit);
      displayReservePrice = String(converted);
    }

    return {
      unit: volUnit,
      price: displayPrice || displayStartingBid,
      priceUnit: rateUnit,
      startingBid: displayStartingBid,
      reservePrice: displayReservePrice,
    };
  }, [initialSource]);

  const [formData, setFormData] = useState({
    commodity: initialSource?.commodity || '',
    variety: initialSource?.variety || 'None',
    grade: initialSource?.grade || 'A',
    quantity: initialSource?.quantity ? String(initialSource.quantity) : '',
    unit: initialPricing.unit,
    price: initialPricing.price,
    priceUnit: initialPricing.priceUnit,
    startingBid: initialPricing.startingBid,
    reservePrice: initialPricing.reservePrice,
    auctionType: initialSource?.auctionType || 'forward',
    bidStep: initialSource?.bidStep ? String(initialSource.bidStep) : '25',
    durationMinutes: initialSource?.durationMinutes ? String(initialSource.durationMinutes) : '1440',
    state: initialSource?.state || '',
    district: initialSource?.district || '',
    village: initialSource?.village || '',
    harvestDate: initialSource?.harvestDate || '',
    description: initialSource?.description || '',
    productType: initialSource?.productType || (user.role === 'food_processor' ? 'processed' : 'raw'),
    brandName: initialSource?.brandName || '',
    packagingType: initialSource?.packagingType || '',
    images: initialSource?.images || [],
    isDefaultImage: !initialSource?.images,
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Auto-save draft when fields are filled
  React.useEffect(() => {
    if (isSubmitting) return;
    if (user?.id && (formData.commodity || formData.quantity || formData.price || formData.startingBid)) {
      saveListingDraft(user.id, {
        formData,
        saleType,
        currentStep,
      });
    }
  }, [formData, saleType, currentStep, user?.id, isSubmitting]);

  // Dynamic platform commodities state
  const [commodities, setCommodities] = useState(() => getPlatformCommodities());
  const [isAddingCustomCommodity, setIsAddingCustomCommodity] = useState(false);
  const [customCommodityName, setCustomCommodityName] = useState('');

  React.useEffect(() => {
    // Initial fetch from Supabase
    fetchRemoteCommodities().then(list => {
      if (list && list.length > 0) setCommodities(list);
    });

    const handleCommoditiesUpdated = () => {
      setCommodities(getPlatformCommodities());
    };
    window.addEventListener('agrolnk_commodities_updated', handleCommoditiesUpdated);
    return () => window.removeEventListener('agrolnk_commodities_updated', handleCommoditiesUpdated);
  }, []);

  const grades = ['A', 'B', 'C', 'Export'];
  const units = ['kg', 'Quintal', 'MT'];

  const [pricingMode, setPricingMode] = useState('rate'); // 'rate' | 'total'
  const [totalDirectPriceInput, setTotalDirectPriceInput] = useState('');
  const [totalStartBidInput, setTotalStartBidInput] = useState('');
  const [totalReservePriceInput, setTotalReservePriceInput] = useState('');

  const lotQty = Math.max(1, Number(formData.quantity) || 1);
  const directPriceTotal = Math.round((Number(formData.price) || 0) * lotQty);
  const startingBidTotal = Math.round((Number(formData.startingBid) || 0) * lotQty);
  const reservePriceTotal = Math.round((Number(formData.reservePrice) || 0) * lotQty);

  const handleTotalDirectPriceChange = (totalVal) => {
    setTotalDirectPriceInput(totalVal);
    const tot = Number(totalVal);
    if (!tot || tot <= 0) {
      setFormData((p) => ({ ...p, price: '' }));
      return;
    }
    const rate = Math.round((tot / lotQty) * 100) / 100;
    setFormData((p) => ({ ...p, price: String(rate) }));
  };

  const handleTotalStartBidChange = (totalVal) => {
    setTotalStartBidInput(totalVal);
    const tot = Number(totalVal);
    if (!tot || tot <= 0) {
      setFormData((p) => ({ ...p, startingBid: '' }));
      return;
    }
    const rate = Math.round((tot / lotQty) * 100) / 100;
    setFormData((p) => ({ ...p, startingBid: String(rate) }));
  };

  const handleTotalReservePriceChange = (totalVal) => {
    setTotalReservePriceInput(totalVal);
    const tot = Number(totalVal);
    if (!tot || tot <= 0) {
      setFormData((p) => ({ ...p, reservePrice: '' }));
      return;
    }
    const rate = Math.round((tot / lotQty) * 100) / 100;
    setFormData((p) => ({ ...p, reservePrice: String(rate) }));
  };

  const handleTogglePricingMode = (newMode) => {
    setPricingMode(newMode);
    if (newMode === 'total') {
      if (directPriceTotal > 0) setTotalDirectPriceInput(String(directPriceTotal));
      if (startingBidTotal > 0) setTotalStartBidInput(String(startingBidTotal));
      if (reservePriceTotal > 0) setTotalReservePriceInput(String(reservePriceTotal));
    }
  };

  // Agricultural Pricing & Multi-Unit Breakdown
  const pricingBreakdown = useMemo(() => {
    return computePricingBreakdown({
      quantity: formData.quantity,
      unit: formData.unit,
      price: saleType === 'direct' ? formData.price : (formData.startingBid || formData.reservePrice),
      priceUnit: formData.priceUnit || formData.unit,
    });
  }, [formData.quantity, formData.unit, formData.price, formData.startingBid, formData.reservePrice, formData.priceUnit, saleType]);

  const estimatedValue = pricingBreakdown.totalEscrowValue;

  // Dynamically re-calculate and convert quoted price when user changes the price basis unit
  const handlePriceUnitChange = (newPriceUnit) => {
    const currentPriceUnit = formData.priceUnit || formData.unit;
    if (!newPriceUnit || newPriceUnit === currentPriceUnit) return;

    setFormData((prev) => {
      const updated = { ...prev, priceUnit: newPriceUnit };

      if (prev.price && Number(prev.price) > 0) {
        const converted = getRateInUnit(Number(prev.price), currentPriceUnit, newPriceUnit);
        updated.price = String(converted);
      }
      if (prev.startingBid && Number(prev.startingBid) > 0) {
        const converted = getRateInUnit(Number(prev.startingBid), currentPriceUnit, newPriceUnit);
        updated.startingBid = String(converted);
      }
      if (prev.reservePrice && Number(prev.reservePrice) > 0) {
        const converted = getRateInUnit(Number(prev.reservePrice), currentPriceUnit, newPriceUnit);
        updated.reservePrice = String(converted);
      }

      return updated;
    });
  };

  const handleCommoditySelect = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsAddingCustomCommodity(true);
      return;
    }
    setIsAddingCustomCommodity(false);
    const defaultImg = COMMODITY_IMAGES[val] || COMMODITY_IMAGES.Other;
    setFormData((prev) => ({
      ...prev,
      commodity: val,
      images: [defaultImg],
      isDefaultImage: true,
    }));
  };

  const handleSaveCustomCommodity = () => {
    if (!customCommodityName.trim()) return;
    const cleanName = customCommodityName.trim().charAt(0).toUpperCase() + customCommodityName.trim().slice(1);
    const registered = registerCustomCommodity(cleanName);
    if (registered) {
      setCommodities(getPlatformCommodities());
      const defaultImg = COMMODITY_IMAGES[registered] || COMMODITY_IMAGES.Other;
      setFormData((prev) => ({
        ...prev,
        commodity: registered,
        images: [defaultImg],
        isDefaultImage: true,
      }));
      setCustomCommodityName('');
      setIsAddingCustomCommodity(false);
    }
  };

  const handleCustomImage = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const localPreview = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        images: [localPreview],
        isDefaultImage: false,
      }));

      try {
        const permanentUrl = await uploadProduceImage(file);
        if (permanentUrl) {
          setFormData((prev) => ({
            ...prev,
            images: [permanentUrl],
            isDefaultImage: false,
          }));
          toast.success('Produce photo optimized & attached!');
        }
      } catch (err) {
        console.warn('Image upload error:', err);
      }
    }
  };

  const handleNextStep = () => {
    setError('');

    if (currentStep === 2 && !formData.commodity.trim()) {
      setError('Please select a commodity.');
      return;
    }

    if (currentStep === 3) {
      if (!formData.quantity || Number(formData.quantity) <= 0) {
        setError('Please enter a valid quantity.');
        return;
      }
      if (saleType === 'direct' && (!formData.price || Number(formData.price) <= 0)) {
        setError('Please enter a valid selling price.');
        return;
      }
      if (saleType === 'auction') {
        if (!formData.startingBid || Number(formData.startingBid) <= 0) {
          setError('Please enter a starting bid.');
          return;
        }
        if (formData.reservePrice && Number(formData.reservePrice) > 0) {
          if (formData.auctionType === 'reverse') {
            if (Number(formData.startingBid) < Number(formData.reservePrice)) {
              setError('In a reverse auction, the starting ceiling price must be equal to or higher than your reserve floor price.');
              return;
            }
          } else {
            if (Number(formData.startingBid) > Number(formData.reservePrice)) {
              setError('In a forward auction, starting base bid should generally be equal to or lower than the reserve price.');
              return;
            }
          }
        }
      }
    }

    if (currentStep === 4) {
      const stateVal = formData.state.trim();
      const districtVal = formData.district.trim();
      if (!stateVal || !districtVal) {
        setError('Please provide state and district.');
        return;
      }
      if (/\d/.test(stateVal) || /\d/.test(districtVal)) {
        setError('District and State names cannot contain numbers. Please enter alphabetic names only.');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(5, prev + 1));
  };

  const handlePrevStep = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      if (navState?.returnTo) {
        onNavigate(navState.returnTo);
      } else if (isEditingAuction || navState?.editAuction) {
        onNavigate('farmer-my-auctions');
      } else if (isEditing) {
        onNavigate('farmer-my-listings');
      } else {
        onNavigate('farmer-dashboard');
      }
    }
  };

  const handleResumeDraft = (draft) => {
    if (!draft) return;
    if (draft.formData) setFormData(draft.formData);
    if (draft.saleType) setSaleType(draft.saleType);
    if (draft.currentStep) setCurrentStep(Math.max(draft.currentStep, 5));
    setExistingDraft(null);
  };

  const handleDiscardDraft = () => {
    clearListingDraft(user.id);
    setExistingDraft(null);
  };

  const handlePublishListing = async () => {
    setError('');

    // Check verification status before publishing
    const resolvedStatus = getResolvedUserKycStatus(user);
    const verified = (resolvedStatus === 'verified') || (await isUserVerified(user.id || user.email));
    if (!verified && user.kycStatus !== 'verified') {
      saveListingDraft(user.id, { formData, saleType, currentStep: 5 });
      setIsVerificationModalOpen(true);
      return;
    }

    setIsSubmitting(true);

    try {
      if (saleType === 'auction') {
        const startBidBreakdown = computePricingBreakdown({
          quantity: formData.quantity,
          unit: formData.unit,
          price: formData.startingBid || formData.price,
          priceUnit: formData.priceUnit || (formData.unit === 'MT' ? 'Quintal' : formData.unit),
        });
        const reserveBreakdown = computePricingBreakdown({
          quantity: formData.quantity,
          unit: formData.unit,
          price: formData.reservePrice || (Number(formData.startingBid || formData.price) * 1.1),
          priceUnit: formData.priceUnit || (formData.unit === 'MT' ? 'Quintal' : formData.unit),
        });

        const effectiveFarmerId = user.id || activeSessionUser?.id || '';
        const auctionPayload = {
          farmerId: effectiveFarmerId,
          farmerName: user.name || activeSessionUser?.name || 'Farmer',
          commodity: formData.commodity,
          variety: formData.variety || 'None',
          grade: formData.grade,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          startingBid: startBidBreakdown.canonicalPricePerListingUnit,
          reservePrice: reserveBreakdown.canonicalPricePerListingUnit,
          durationMinutes: Number(formData.durationMinutes || 1440),
          auctionType: formData.auctionType || 'english',
          bidStep: Math.max(1, Number(formData.bidStep) || 25),
          state: formData.state,
          district: formData.district,
          village: formData.village,
          description: formData.description || '',
          images: formData.images,
        };

        if (isEditing && editingListingId) {
          await updateAuction(editingListingId, auctionPayload);
          clearListingDraft(user.id || activeSessionUser?.id);
          toast.success('Auction lot updated successfully!');
        } else {
          await createAuction(auctionPayload);
          clearListingDraft(user.id || activeSessionUser?.id);
          toast.success(
            formData.auctionType === 'reverse'
              ? 'Reverse Auction lot published successfully!'
              : 'Live Auction lot published successfully!'
          );
        }
        onNavigate('farmer-my-auctions');
      } else {
        const effectiveFarmerId = user.id || activeSessionUser?.id || '';
        if (isEditing && editingListingId) {
          await updateListing(editingListingId, {
            commodity: formData.commodity,
            variety: formData.variety || 'None',
            grade: formData.grade,
            quantity: Number(formData.quantity),
            unit: formData.unit,
            price: pricingBreakdown.canonicalPricePerListingUnit,
            pricePerUnit: pricingBreakdown.canonicalPricePerListingUnit,
            priceUnit: formData.priceUnit,
            totalAmount: pricingBreakdown.totalEscrowValue,
            state: formData.state,
            district: formData.district,
            village: formData.village,
            harvestDate: formData.harvestDate || null,
            description: formData.description || '',
            productType: formData.productType || 'raw',
            brandName: formData.brandName || null,
            packagingType: formData.packagingType || null,
            images: formData.images,
            saleType: 'direct',
          });
          toast.success('Listing updated successfully!');
        } else {
          await createListing({
            farmerId: effectiveFarmerId,
            farmerName: user.name || activeSessionUser?.name || 'Farmer',
            commodity: formData.commodity,
            variety: formData.variety || 'None',
            grade: formData.grade,
            quantity: Number(formData.quantity),
            unit: formData.unit,
            price: pricingBreakdown.canonicalPricePerListingUnit,
            pricePerUnit: pricingBreakdown.canonicalPricePerListingUnit,
            priceUnit: formData.priceUnit,
            totalAmount: pricingBreakdown.totalEscrowValue,
            state: formData.state,
            district: formData.district,
            village: formData.village,
            harvestDate: formData.harvestDate || null,
            description: formData.description || '',
            productType: formData.productType || 'raw',
            brandName: formData.brandName || null,
            packagingType: formData.packagingType || null,
            images: formData.images,
            saleType: 'direct',
          });
          toast.success('Listing published successfully!');
        }
        clearListingDraft(user.id || activeSessionUser?.id);
        onNavigate('farmer-my-listings');
      }
    } catch (err) {
      console.error('Failed to publish listing:', err);
      const friendlyMsg = err?.message || 'Failed to publish listing. Please try again.';
      setError(friendlyMsg);
      toast.error(friendlyMsg);
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Mode' },
    { num: 2, label: 'Produce' },
    { num: 3, label: 'Pricing' },
    { num: 4, label: 'Origin' },
    { num: 5, label: 'Preview' },
  ];

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto space-y-5 text-left">
        
        {/* Saved Draft Resume Notification Banner */}
        {existingDraft && existingDraft.formData?.commodity && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#EBF5F0] via-[#F2FBF6] to-white border border-[#10B981] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#0B3326]">
                    Unpublished Produce Draft Found
                  </h4>
                  <Badge variant="emerald" size="sm">Saved Draft</Badge>
                </div>
                <p className="text-xs text-[#2D5A47] mt-0.5">
                  <strong>{existingDraft.formData.commodity}</strong> ({existingDraft.formData.quantity || 0} {existingDraft.formData.unit || 'kg'} • ₹{Number(existingDraft.formData.quantity || 0) * Number(existingDraft.formData.price || 0)}) was saved during your previous session.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#566861] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              >
                Discard
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleResumeDraft(existingDraft)}
                icon={ArrowRight}
                iconPosition="right"
                className="text-xs font-bold py-1.5 px-3.5 cursor-pointer shadow-xs"
              >
                Resume & Review
              </Button>
            </div>
          </div>
        )}
        
        {/* Sleek Smart Header with Back, Centered Progress Pills & Next Button */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs flex items-center justify-between gap-3">
          
          {/* Back button */}
          <button
            type="button"
            onClick={handlePrevStep}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#566861] hover:text-[#0B3326] px-2.5 py-1.5 rounded-xl hover:bg-[#F8FAF8] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{currentStep > 1 ? 'Back' : 'Dashboard'}</span>
          </button>

          {/* Smart Step Progress Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {stepsList.map((st) => {
              const isPassed = currentStep > st.num;
              const isCurrent = currentStep === st.num;

              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => {
                    if (isEditing || st.num < currentStep) setCurrentStep(st.num);
                  }}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : isPassed
                      ? 'bg-[#EBF5F0] text-[#10B981] cursor-pointer'
                      : 'bg-[#F8FAF8] text-[#566861]/60'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'bg-[#10B981] text-white'
                        : isPassed
                        ? 'bg-[#10B981] text-white'
                        : 'bg-[#E5EDE8] text-[#566861]'
                    }`}
                  >
                    {isPassed ? '✓' : st.num}
                  </span>
                  <span className="hidden md:inline">{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Next / Submit Button */}
          {currentStep < 5 ? (
            <Button
              variant="accent"
              size="sm"
              onClick={handleNextStep}
              icon={ArrowRight}
              iconPosition="right"
              className="text-xs font-bold py-2 px-4 shadow-xs cursor-pointer shrink-0"
            >
              Next
            </Button>
          ) : (
            <Button
              variant="accent"
              size="sm"
              disabled={isSubmitting}
              onClick={handlePublishListing}
              icon={CheckCircle2}
              iconPosition="left"
              className="text-xs font-bold py-2 px-4 shadow-xs cursor-pointer shrink-0"
            >
              {isSubmitting ? 'Publishing...' : 'Publish'}
            </Button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ================= STEP 1: Selling Mode ================= */}
        {currentStep === 1 && (
          <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3326] font-heading">
                Choose How to Sell
              </h2>
              <p className="text-xs text-[#566861]">
                Select your preferred transaction model for this produce batch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Direct Sale */}
              <div
                onClick={() => setSaleType('direct')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  saleType === 'direct'
                    ? 'border-[#10B981] bg-[#F2FBF6]/50 shadow-xs ring-2 ring-[#10B981]/20'
                    : 'border-[#E5EDE8] bg-white hover:border-[#10B981]/50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                      <Tag className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        saleType === 'direct'
                          ? 'bg-[#10B981] border-[#10B981] text-white'
                          : 'border-[#E5EDE8]'
                      }`}
                    >
                      {saleType === 'direct' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#0B3326]">
                      Direct Fixed-Price Sale
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Set guaranteed price. Buyers purchase instantly with 100% escrow protection.
                    </p>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] font-bold text-[#10B981]">
                    {saleType === 'direct' ? '✓ Active Selection' : 'Click to select'}
                  </span>
                </div>
              </div>

              {/* Live Auction */}
              <div
                onClick={() => setSaleType('auction')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  saleType === 'auction'
                    ? 'border-[#D97706] bg-[#FEF3C7]/30 shadow-xs ring-2 ring-[#D97706]/20'
                    : 'border-[#E5EDE8] bg-white hover:border-[#D97706]/50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                      <Gavel className="w-5 h-5 text-[#D97706]" />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        saleType === 'auction'
                          ? 'bg-[#D97706] border-[#D97706] text-white'
                          : 'border-[#E5EDE8]'
                      }`}
                    >
                      {saleType === 'auction' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#0B3326]">
                      Live Clock Auction
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Dynamic bidding room. Maximize price realization for high-demand bulk lots.
                    </p>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] font-bold text-[#D97706]">
                    {saleType === 'auction' ? '✓ Active Selection' : 'Click to select'}
                  </span>
                </div>
              </div>

            </div>
          </Card>
        )}

        {/* ================= STEP 2: Produce Specs ================= */}
        {currentStep === 2 && (
          <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3326] font-heading">
                Produce & Quality
              </h2>
              <p className="text-xs text-[#566861]">
                Specify commodity variety, quality grade, and lot photo.
              </p>
            </div>

            {/* Product Classification (Raw vs Processed) */}
            <div className="space-y-2 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <label className="text-xs font-bold text-[#0B3326] block">
                Product Classification
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, productType: 'raw' })}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                    formData.productType !== 'processed'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Raw Agricultural Commodity
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, productType: 'processed' })}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                    formData.productType === 'processed'
                      ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Processed Food Product
                </button>
              </div>

              {formData.productType === 'processed' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 mt-2 border-t border-gray-200">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 block">
                      Brand / Mill Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.brandName || ''}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      placeholder="e.g. Royal Golden Mills"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-purple-600 focus:border-purple-600 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 block">
                      Packaging Format (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.packagingType || ''}
                      onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                      placeholder="e.g. 50kg Bags, 15L Tins, 1kg Pouches"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-1 focus:ring-purple-600 focus:border-purple-600 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Commodity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Commodity <span className="text-red-500">*</span>
                </label>
                <CommoditySelect
                  value={formData.commodity}
                  onChange={(val) => {
                    const defaultImg = COMMODITY_IMAGES[val] || COMMODITY_IMAGES.Other;
                    setFormData((prev) => ({
                      ...prev,
                      commodity: val,
                      variety: 'None',
                      images: prev.isDefaultImage ? [defaultImg] : (prev.images.length ? prev.images : [defaultImg]),
                    }));
                  }}
                  onImageChange={(imgUrl) => {
                    if (formData.isDefaultImage) {
                      setFormData((prev) => ({ ...prev, images: [imgUrl] }));
                    }
                  }}
                  userId={user.id}
                  placeholder="Select Commodity..."
                  required
                />
              </div>

              {/* Variety */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Variety / Cultivar
                </label>
                <VarietySelect
                  commodity={formData.commodity}
                  value={formData.variety}
                  onChange={(val) => {
                    const varietyImg = getVarietyImageUrl(formData.commodity, val);
                    setFormData((prev) => {
                      const updated = { ...prev, variety: val };
                      if (varietyImg && (prev.isDefaultImage || !prev.images || prev.images.length === 0 || prev.images[0] === COMMODITY_IMAGES[prev.commodity])) {
                        updated.images = [varietyImg];
                        updated.isDefaultImage = true;
                      }
                      return updated;
                    });
                  }}
                  placeholder="Select or enter variety..."
                />
              </div>

              {/* Quality Grade */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Quality Grade
                </label>
                <SearchableSelect
                  options={grades.map((g) => ({
                    value: g,
                    label: `Grade ${g}`,
                  }))}
                  value={formData.grade}
                  onChange={(val) => setFormData({ ...formData, grade: val })}
                  placeholder="Select Grade"
                  searchPlaceholder="Search grade..."
                  buttonClassName="bg-[#F8FAF8]"
                />
              </div>

              {/* Produce Detailing / Description (Optional) */}
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                    <span>Produce Detailing & Specifications</span>
                    <span className="text-[10px] font-semibold text-[#566861] bg-[#F1F4F2] px-2 py-0.5 rounded-full">Optional</span>
                  </label>
                  <span className="text-[11px] text-[#71847D]">
                    {(formData.description || '').length}/1000 characters
                  </span>
                </div>
                <textarea
                  name="description"
                  rows={3}
                  maxLength={1000}
                  value={formData.description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Share details about produce freshness, packaging type (gunny bags, crates), moisture content, organic certification, harvest timing, or loading instructions..."
                  className="w-full text-xs text-[#0B3326] bg-[#F8FAF8] border border-[#CBD7D0] focus:border-[#008236] focus:ring-1 focus:ring-[#008236] rounded-xl p-3 outline-hidden transition-all duration-150 resize-y placeholder:text-[#8E9F97] leading-relaxed"
                />
                <p className="text-[11px] text-[#566861]">
                  Help verified buyers understand your lot specifics, packaging condition, or transportation readiness.
                </p>
              </div>

              {/* Photo & Video Multi-Media Upload */}
              <div className="sm:col-span-2 pt-3 border-t border-[#E5EDE8]">
                <MultiMediaUploader
                  media={formData.images || []}
                  onChange={(newMedia) => {
                    setFormData((prev) => ({
                      ...prev,
                      images: newMedia,
                      isDefaultImage: false,
                    }));
                  }}
                  maxFiles={8}
                  maxVideos={1}
                />
              </div>

            </div>
          </Card>
        )}

        {/* ================= STEP 3: Pricing & Volume ================= */}
        {currentStep === 3 && (
          <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3326] font-heading">
                Pricing & Volume
              </h2>
              <p className="text-xs text-[#566861]">
                Define batch volume and target pricing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Lot Volume
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="e.g. 500"
                    min="1"
                    step="1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  <div className="w-28 shrink-0">
                    <SearchableSelect
                      options={units.map((u) => ({ value: u, label: u }))}
                      value={formData.unit}
                      onChange={(val) => {
                        setFormData((prev) => {
                          const currentPriceUnit = prev.priceUnit || prev.unit;
                          const defaultPriceUnit = val === 'MT' ? 'Quintal' : val;
                          const updated = { ...prev, unit: val, priceUnit: val === 'MT' ? 'Quintal' : val };
                          if (prev.startingBid && Number(prev.startingBid) > 0) {
                            const converted = getRateInUnit(Number(prev.startingBid), currentPriceUnit, updated.priceUnit);
                            updated.startingBid = String(converted);
                          }
                          if (prev.reservePrice && Number(prev.reservePrice) > 0) {
                            const converted = getRateInUnit(Number(prev.reservePrice), currentPriceUnit, updated.priceUnit);
                            updated.reservePrice = String(converted);
                          }
                          if (prev.price && Number(prev.price) > 0) {
                            const converted = getRateInUnit(Number(prev.price), currentPriceUnit, updated.priceUnit);
                            updated.price = String(converted);
                          }
                          if (val === 'MT' && (!prev.bidStep || prev.bidStep === '25')) {
                            updated.bidStep = '250';
                          } else if (val === 'Quintal' && prev.bidStep === '250') {
                            updated.bidStep = '25';
                          } else if (val === 'kg' && (prev.bidStep === '25' || prev.bidStep === '250')) {
                            updated.bidStep = '2';
                          }
                          return updated;
                        });
                      }}
                      placeholder="Unit"
                      searchPlaceholder="Search unit..."
                      buttonClassName="bg-[#F8FAF8]"
                    />
                  </div>
                </div>
              </div>

              {/* Price (Direct) or Pricing Basis Tabs (Auction) */}
              {saleType === 'direct' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0B3326] block">
                      Target Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-[#10B981] font-semibold">
                      Quoted per {formData.priceUnit || (formData.unit === 'MT' ? 'Quintal' : formData.unit)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0B3326]">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder={formData.priceUnit === 'MT' ? '18500' : (formData.priceUnit === 'kg' ? '18.5' : '1850')}
                        min="0.1"
                        step="any"
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-extrabold text-[#0B3326] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      />
                    </div>
                    <div className="w-40 shrink-0">
                      <SearchableSelect
                        options={PRICING_UNIT_OPTIONS}
                        value={formData.priceUnit || (formData.unit === 'MT' ? 'Quintal' : formData.unit)}
                        onChange={(val) => handlePriceUnitChange(val)}
                        placeholder="Per unit"
                        searchPlaceholder="Price basis..."
                        buttonClassName="bg-[#F8FAF8]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Pricing Basis Tabs (Only for Live Auction) */
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0B3326] block">
                    Pricing Basis
                  </label>
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-[#F1F4F2] border border-[#E5EDE8] h-[41px] items-stretch gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePricingMode('rate')}
                      className={`h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        pricingMode === 'rate'
                          ? 'bg-[#10B981] text-white shadow-xs'
                          : 'text-[#566861] hover:text-[#0B3326]'
                      }`}
                    >
                      Per {formData.unit}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePricingMode('total')}
                      className={`h-full rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        pricingMode === 'total'
                          ? 'bg-[#10B981] text-white shadow-xs'
                          : 'text-[#566861] hover:text-[#0B3326]'
                      }`}
                    >
                      Full Lot (Total ₹)
                    </button>
                  </div>
                </div>
              )}

              {/* Auction Controls */}
              {saleType === 'auction' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0B3326] block">
                    Auction Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Forward Auction Button */}
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, auctionType: 'forward' }))}
                      className={`h-[38px] px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formData.auctionType === 'forward'
                          ? 'border-[#10B981] bg-[#F2FBF6] text-[#0B3326] shadow-xs'
                          : 'border-[#E5EDE8] bg-white text-[#566861] hover:border-[#10B981]/50'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Forward Auction</span>
                      {formData.auctionType === 'forward' && (
                        <Check className="w-3 h-3 text-[#10B981] stroke-[3]" />
                      )}
                    </button>

                    {/* Reverse Auction Button */}
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, auctionType: 'reverse' }))}
                      className={`h-[38px] px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formData.auctionType === 'reverse'
                          ? 'border-[#D97706] bg-[#FEF3C7]/50 text-[#92400E] shadow-xs'
                          : 'border-[#E5EDE8] bg-white text-[#566861] hover:border-[#D97706]/50'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>Reverse Auction</span>
                      {formData.auctionType === 'reverse' && (
                        <Check className="w-3 h-3 text-[#D97706] stroke-[3]" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Additional Auction Controls */}
              {saleType === 'auction' && (
                <>
                  {/* Clean Bid Step Selector */}
                  <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                    <span className="text-xs font-bold text-[#0B3326]">
                      Bid Step ({formData.auctionType === 'reverse' ? '-' : '+'}₹ / {formData.unit}):
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(formData.unit === 'MT' ? [100, 250, 500, 1000] : (formData.unit === 'kg' ? [1, 2, 5, 10] : [10, 25, 50, 100])).map((step) => {
                        const isSelected = Number(formData.bidStep) === step;
                        return (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, bidStep: String(step) }))}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#0B3326] bg-[#0B3326] text-white shadow-xs'
                                : 'border-[#E5EDE8] bg-white text-[#566861] hover:border-[#0B3326]/40'
                            }`}
                          >
                            {formData.auctionType === 'reverse' ? '-' : '+'}₹{step}
                          </button>
                        );
                      })}
                      <div className="relative w-20">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#566861]">₹</span>
                        <input
                          type="number"
                          min="1"
                          value={formData.bidStep}
                          onChange={(e) => setFormData({ ...formData, bidStep: e.target.value })}
                          placeholder={formData.unit === 'MT' ? '250' : '25'}
                          className="w-full pl-5 pr-1 py-1 rounded-lg border border-[#E5EDE8] bg-white text-xs font-bold text-[#0B3326] focus:ring-1 focus:ring-[#10B981]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Starting Bid Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#0B3326] block">
                        {pricingMode === 'rate'
                          ? (formData.auctionType === 'reverse' ? 'Starting Ceiling Bid (₹)' : 'Starting Bid (₹)')
                          : (formData.auctionType === 'reverse' ? 'Starting Ceiling (Full Lot ₹)' : 'Starting Bid (Full Lot ₹)')}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-[#566861]">
                        {pricingMode === 'rate'
                          ? `Total: ₹${startingBidTotal.toLocaleString('en-IN')}`
                          : `Rate: ₹${(Number(formData.startingBid) || 0).toLocaleString('en-IN')} / ${formData.unit}`}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0B3326]">
                        ₹
                      </span>
                      {pricingMode === 'rate' ? (
                        <input
                          type="number"
                          value={formData.startingBid}
                          onChange={(e) => setFormData({ ...formData, startingBid: e.target.value })}
                          placeholder={formData.auctionType === 'reverse' ? `e.g. ${formData.unit === 'MT' ? '24000' : '2400'}` : `e.g. ${formData.unit === 'MT' ? '18000' : '1800'}`}
                          min="0.1"
                          step="any"
                          className="w-full pl-7 pr-16 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                        />
                      ) : (
                        <input
                          type="number"
                          value={totalStartBidInput || (startingBidTotal > 0 ? String(startingBidTotal) : '')}
                          onChange={(e) => handleTotalStartBidChange(e.target.value)}
                          placeholder="e.g. 12000000"
                          min="1"
                          step="any"
                          className="w-full pl-7 pr-16 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                        />
                      )}
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#566861]">
                        {pricingMode === 'rate' ? `/ ${formData.unit}` : 'Total'}
                      </span>
                    </div>
                  </div>

                  {/* Reserve Floor Price Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#0B3326] block">
                        {pricingMode === 'rate'
                          ? (formData.auctionType === 'reverse' ? 'Reserve Target Price (₹)' : 'Reserve Floor Price (₹)')
                          : (formData.auctionType === 'reverse' ? 'Reserve Target (Full Lot ₹)' : 'Reserve Floor (Full Lot ₹)')}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-[#566861]">
                        {pricingMode === 'rate'
                          ? `Total: ₹${reservePriceTotal.toLocaleString('en-IN')}`
                          : `Rate: ₹${(Number(formData.reservePrice) || 0).toLocaleString('en-IN')} / ${formData.unit}`}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0B3326]">
                        ₹
                      </span>
                      {pricingMode === 'rate' ? (
                        <input
                          type="number"
                          value={formData.reservePrice}
                          onChange={(e) => setFormData({ ...formData, reservePrice: e.target.value })}
                          placeholder={formData.auctionType === 'reverse' ? `e.g. ${formData.unit === 'MT' ? '18500' : '1850'}` : `e.g. ${formData.unit === 'MT' ? '20000' : '2000'}`}
                          min="0.1"
                          step="any"
                          className="w-full pl-7 pr-16 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#0B3326] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                        />
                      ) : (
                        <input
                          type="number"
                          value={totalReservePriceInput || (reservePriceTotal > 0 ? String(reservePriceTotal) : '')}
                          onChange={(e) => handleTotalReservePriceChange(e.target.value)}
                          placeholder="e.g. 9250000"
                          min="1"
                          step="any"
                          className="w-full pl-7 pr-16 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#0B3326] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                        />
                      )}
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#566861]">
                        {pricingMode === 'rate' ? `/ ${formData.unit}` : 'Total'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-[#0B3326] block">
                      Auction Closing Duration
                    </label>
                    <SearchableSelect
                      options={[
                        { value: '15', label: '⏱ 15 Minutes (Flash Auction)' },
                        { value: '30', label: '⏱ 30 Minutes (Quick Sale)' },
                        { value: '60', label: '⏱ 1 Hour' },
                        { value: '120', label: '⏱ 2 Hours' },
                        { value: '360', label: '⏱ 6 Hours' },
                        { value: '720', label: '⏱ 12 Hours' },
                        { value: '1440', label: '⏱ 24 Hours (1 Day - Recommended)' },
                        { value: '2880', label: '⏱ 2 Days (48 Hours)' },
                        { value: '4320', label: '⏱ 3 Days (72 Hours)' },
                      ]}
                      value={formData.durationMinutes}
                      onChange={(val) => setFormData({ ...formData, durationMinutes: val })}
                      placeholder="Select Duration"
                      searchPlaceholder="Search duration..."
                      buttonClassName="bg-[#F8FAF8]"
                    />
                  </div>
                </>
              )}

            </div>

            {/* Simple Calculated Escrow Box */}
            <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] shadow-xs flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-xs text-[#DCFCE7]/90 font-bold block">
                  Total Transaction Escrow Value:
                </span>
                <span className="text-[11px] text-[#34D399]">
                  {pricingBreakdown.totalQuintals.toLocaleString('en-IN')} Quintals ({pricingBreakdown.quantity || 0} {pricingBreakdown.unit}) × ₹{pricingBreakdown.pricePerQuintal.toLocaleString('en-IN')} / Qtl
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-white font-heading">
                  ₹{estimatedValue.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-[#34D399] block font-semibold">
                  100% Escrow Protected
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* ================= STEP 4: Origin Location ================= */}
        {currentStep === 4 && (
          <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3326] font-heading">
                Origin & Pickup Location
              </h2>
              <p className="text-xs text-[#566861]">
                Where should the logistics transporter collect this produce batch?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  District <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => {
                    const lettersOnly = e.target.value.replace(/[^a-zA-Z\s.-]/g, '');
                    setFormData({ ...formData, district: lettersOnly });
                  }}
                  placeholder="e.g. Salem"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0B3326] block">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => {
                    const lettersOnly = e.target.value.replace(/[^a-zA-Z\s.-]/g, '');
                    setFormData({ ...formData, state: lettersOnly });
                  }}
                  placeholder="e.g. Tamil Nadu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Farmgate / Mandi Pickup Address
                </label>
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  placeholder="e.g. Attur Farmgate Depot, Salem"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

            </div>
          </Card>
        )}

        {/* ================= STEP 5: Review & Direct Submit ================= */}
        {currentStep === 5 && (
          <Card className="p-6 sm:p-7 bg-white border-2 border-[#10B981]/40 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                  Summary Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                {saleType === 'auction' && (
                  <Badge variant={formData.auctionType === 'reverse' ? 'amber' : 'emerald'} size="sm">
                    {formData.auctionType === 'reverse' ? `Reverse (-₹${formData.bidStep})` : `Forward (+₹${formData.bidStep})`}
                  </Badge>
                )}
                <Badge variant={saleType === 'direct' ? 'emerald' : 'dark'} size="sm">
                  {saleType === 'direct' ? 'Fixed-Price Direct Lot' : 'Live Auction Lot'}
                </Badge>
              </div>
            </div>

            {/* Compact Spec Grid */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={formData.images?.[0] || COMMODITY_IMAGES[formData.commodity] || COMMODITY_IMAGES.Other}
                  alt={formData.commodity || 'Produce'}
                  className="w-20 h-20 rounded-2xl object-cover border border-[#E5EDE8]"
                />
                {formData.images?.length > 1 && (
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#0B3326] text-white text-[10px] font-bold shadow-xs border border-white/20">
                    +{formData.images.length - 1} media
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-[#0B3326] font-heading">
                    {formData.commodity || 'Unspecified Commodity'}
                  </h3>
                  <Badge variant="dark" size="sm">Grade {formData.grade}</Badge>
                </div>
                <p className="text-xs text-[#566861]">
                  {hasSpecificVariety(formData.variety) && (
                    <>
                      Variety: <strong>{formData.variety}</strong> •{' '}
                    </>
                  )}
                  Location: <strong>{formData.district || 'Unspecified'}, {formData.state || 'India'}</strong>
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-[#E5EDE8] sm:pl-4">
                <span className="text-[10px] text-[#566861] block font-medium">Escrow Value</span>
                <span className="text-2xl font-extrabold text-[#0B3326] font-heading">
                  ₹{estimatedValue.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-[#10B981] font-semibold block">
                  {pricingBreakdown.quantity || 0} {pricingBreakdown.unit} @ ₹{pricingBreakdown.pricePerQuintal.toLocaleString('en-IN')}/Qtl {pricingBreakdown.unit === 'MT' && `(₹${pricingBreakdown.pricePerMT.toLocaleString('en-IN')}/MT)`}
                </span>
              </div>
            </div>

            {/* Produce Detailing Preview if provided */}
            {formData.description && (
              <div className="p-3.5 bg-[#F8FAF8] rounded-xl border border-[#E5EDE8] text-xs text-[#2D5A47] leading-relaxed">
                <span className="font-bold text-[#0B3326] block text-[11px] mb-1">Produce Detailing & Special Notes:</span>
                <p className="whitespace-pre-line text-[#14211D]">{formData.description}</p>
              </div>
            )}

            {/* Big Action Button */}
            <div className="pt-2">
              <Button
                variant="accent"
                size="lg"
                disabled={isSubmitting}
                onClick={handlePublishListing}
                icon={CheckCircle2}
                iconPosition="left"
                className="w-full font-bold py-3 px-6 shadow-md shadow-[#10B981]/20 text-sm cursor-pointer"
              >
                {isSubmitting 
                  ? (isEditing ? 'Updating Lot...' : 'Publishing to Live Exchange...') 
                  : (isEditing 
                      ? (saleType === 'auction' ? 'Save Changes & Update Auction' : 'Save Changes & Update Listing') 
                      : (saleType === 'auction' ? 'Confirm & Launch Auction' : 'Confirm & Publish Listing'))}
              </Button>
            </div>
          </Card>
        )}

      </div>

      {/* Verification Required Modal */}
      <VerificationRequiredModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        currentUser={user}
        actionName="publish farmgate lots or auctions"
        draftProduce={{ ...formData, saleType }}
        onSuccess={() => {
          setIsVerificationModalOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
