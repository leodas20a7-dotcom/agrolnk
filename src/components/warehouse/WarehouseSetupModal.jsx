import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
  Globe,
  Layers,
  ThermometerSnowflake,
  FileText,
  MapPin,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { saveWarehouseProfile, getWarehouseProfile, getWarehouseOperatorProfile } from '../../utils/warehouses';

const STORAGE_TYPE_OPTIONS = [
  {
    id: 'cold_multichamber',
    name: 'Multi-Chamber Cold Storage',
    defaultTemp: '2°C - 8°C',
    icon: ThermometerSnowflake,
    description: 'For fruits, vegetables, potatoes, and horticulture perishables.',
    defaultCap: 1000,
    defaultRate: 350,
  },
  {
    id: 'dry_silos',
    name: 'Dry Silo / Covered Warehouse',
    defaultTemp: 'Ambient (22°C - 26°C)',
    icon: Layers,
    description: 'For grains, paddy, wheat, pulses, maize, and turmeric.',
    defaultCap: 1000,
    defaultRate: 200,
  },
  {
    id: 'ca_storage',
    name: 'Controlled Atmosphere (CA) Cold Storage',
    defaultTemp: '0°C - 2°C (Low O₂/CO₂)',
    icon: ThermometerSnowflake,
    description: 'High-tech long-term storage for export apples, kiwis, grapes.',
    defaultCap: 500,
    defaultRate: 480,
  },
  {
    id: 'open_plinth',
    name: 'Covered Shed / Open Plinth Depot',
    defaultTemp: 'Ventilated Ambient',
    icon: Building2,
    description: 'Bagged grain storage with HDPE covers and fumigation.',
    defaultCap: 1000,
    defaultRate: 180,
  },
  {
    id: 'deep_freeze',
    name: 'Frozen / Deep Cold Storage',
    defaultTemp: '-18°C to -22°C',
    icon: ThermometerSnowflake,
    description: 'IQF produce, butter, frozen pulp, and processed cold products.',
    defaultCap: 500,
    defaultRate: 650,
  },
];

export default function WarehouseSetupModal({
  isOpen,
  onClose,
  currentUser,
  onProfileSaved,
}) {
  const user = currentUser || { id: '', name: 'Warehouse Operator', email: '' };

  const [companyName, setCompanyName] = useState('');
  const [totalCapacityTonnes, setTotalCapacityTonnes] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [wdraCode, setWdraCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState(user.district || '');
  const [state, setState] = useState(user.state || '');
  const [pincode, setPincode] = useState('');
  const [monthlyRatePerTonne, setMonthlyRatePerTonne] = useState('350');
  const [minBillingDays, setMinBillingDays] = useState('15');

  // Selected storage types and individual capacities & custom rates
  const [selectedTypes, setSelectedTypes] = useState({
    cold_multichamber: { enabled: true, capacity: 1000, temp: '2°C - 8°C', rate: 350 },
    dry_silos: { enabled: false, capacity: 1000, temp: 'Ambient (22°C - 26°C)', rate: 200 },
    ca_storage: { enabled: false, capacity: 500, temp: '0°C - 2°C (CA)', rate: 480 },
    open_plinth: { enabled: false, capacity: 1000, temp: 'Ventilated Ambient', rate: 180 },
    deep_freeze: { enabled: false, capacity: 500, temp: '-18°C', rate: 650 },
  });
  const [customChambers, setCustomChambers] = useState([]);

  // Document upload state
  const [wdraFileName, setWdraFileName] = useState('');
  const [wdraFileObj, setWdraFileObj] = useState(null);
  const [existingWdraUrl, setExistingWdraUrl] = useState('');
  const [gstFileName, setGstFileName] = useState('');
  const [gstFileObj, setGstFileObj] = useState(null);
  const [existingGstUrl, setExistingGstUrl] = useState('');
  const [insFileName, setInsFileName] = useState('');
  const [insFileObj, setInsFileObj] = useState(null);
  const [existingInsUrl, setExistingInsUrl] = useState('');

  const [activeStep, setActiveStep] = useState(1); // 1: Enterprise & Capacity, 2: Storage Types, 3: WDRA & KYC Docs
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load existing profile if already saved
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      const applyExistingProfile = (existing) => {
        if (!existing || !isMounted) return;
        setCompanyName(existing.companyName || existing.warehouseName || '');
        setTotalCapacityTonnes(existing.totalCapacityTonnes ? String(existing.totalCapacityTonnes) : '');
        setWebsiteUrl(existing.websiteUrl || '');
        setWdraCode(existing.wdraCode || '');
        setGstin(existing.gstin || '');
        setAddress(existing.address || '');
        setDistrict(existing.district || user.district || '');
        setState(existing.state || user.state || '');
        setPincode(existing.pincode || '');
        if (existing.monthlyRatePerTonne) {
          setMonthlyRatePerTonne(String(existing.monthlyRatePerTonne));
        }
        if (existing.minBillingDays !== undefined) {
          setMinBillingDays(String(existing.minBillingDays));
        }

        if (existing.storageTypesConfig) {
          setSelectedTypes(existing.storageTypesConfig);
        }
        if (Array.isArray(existing.customChambers)) {
          setCustomChambers(existing.customChambers);
        }
        if (existing.documentNames) {
          setWdraFileName(existing.documentNames.wdraCert || '');
          setGstFileName(existing.documentNames.gstinCert || '');
          setInsFileName(existing.documentNames.insuranceCert || '');
        }
        if (existing.documentUrls) {
          setExistingWdraUrl(existing.documentUrls.wdraCert || '');
          setExistingGstUrl(existing.documentUrls.gstinCert || '');
          setExistingInsUrl(existing.documentUrls.insuranceCert || '');
        } else if (Array.isArray(existing.documents)) {
          const wd = existing.documents.find((d) => (d.type || '').toLowerCase().includes('wdra'));
          const gd = existing.documents.find((d) => (d.type || '').toLowerCase().includes('gst'));
          const id = existing.documents.find((d) => (d.type || '').toLowerCase().includes('insurance'));
          if (wd?.fileUrl) setExistingWdraUrl(wd.fileUrl);
          if (gd?.fileUrl) setExistingGstUrl(gd.fileUrl);
          if (id?.fileUrl) setExistingInsUrl(id.fileUrl);
        }
      };

      // 1. Check local cache first for instant populate
      const cached = getWarehouseProfile(user.id, user.email);
      if (cached && (cached.companyName || cached.totalCapacityTonnes)) {
        applyExistingProfile(cached);
      } else {
        const defaultName = user.name ? `${user.name} Agri Logistics & Cold Storage` : 'Certified Agri Storage Terminal';
        setCompanyName(defaultName);
        setWdraCode(`WDRA/2025/${(user.district || 'TN').slice(0, 2).toUpperCase()}/${Math.floor(1000 + Math.random() * 9000)}`);
      }

      // 2. Fetch latest from Supabase DB to guarantee fresh data on hard reload
      const fetchDbProfile = async () => {
        const identifier = user.id || user.email;
        if (!identifier) return;
        const dbProfile = await getWarehouseOperatorProfile(identifier);
        if (dbProfile && (dbProfile.companyName || dbProfile.totalCapacityTonnes || dbProfile.address)) {
          applyExistingProfile(dbProfile);
        }
      };
      fetchDbProfile();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, user.id, user.email, user.name, user.district, user.state]);

  if (!isOpen) return null;

  const handleToggleStorageType = (typeId, defaultCap, defaultTemp) => {
    setSelectedTypes((prev) => {
      const current = prev[typeId] || { enabled: false, capacity: defaultCap, temp: defaultTemp };
      return {
        ...prev,
        [typeId]: {
          ...current,
          enabled: !current.enabled,
        },
      };
    });
  };

  const handleTypeCapacityChange = (typeId, value) => {
    setSelectedTypes((prev) => {
      const current = prev[typeId] || { enabled: true, capacity: '', temp: '' };
      return {
        ...prev,
        [typeId]: {
          ...current,
          capacity: value,
        },
      };
    });
  };

  const handleTypeRateChange = (typeId, value) => {
    setSelectedTypes((prev) => {
      const current = prev[typeId] || { enabled: true, capacity: '', temp: '', rate: '' };
      return {
        ...prev,
        [typeId]: {
          ...current,
          rate: value,
        },
      };
    });
  };

  const handleTypeTempChange = (typeId, value) => {
    setSelectedTypes((prev) => {
      const current = prev[typeId] || { enabled: true, capacity: '', temp: '', rate: '' };
      return {
        ...prev,
        [typeId]: {
          ...current,
          temp: value,
        },
      };
    });
  };

  const handleAddCustomChamber = () => {
    const totalCapNum = Number(totalCapacityTonnes) || 0;
    const remainingCap = totalCapNum > 0 ? Math.max(0, totalCapNum - calculateSumOfChambers()) : 250;
    const suggestedCap = totalCapNum > 0 ? Math.min(250, remainingCap) : 250;
    setCustomChambers((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: `Custom Chamber ${prev.length + 1}`,
        capacity: suggestedCap > 0 ? String(suggestedCap) : '',
        temp: '2°C - 6°C',
        rate: '500',
      },
    ]);
  };

  const handleCustomChamberChange = (id, field, value) => {
    setCustomChambers((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch))
    );
  };

  const handleRemoveCustomChamber = (id) => {
    setCustomChambers((prev) => prev.filter((ch) => ch.id !== id));
  };

  const calculateSumOfChambers = () => {
    const presetSum = Object.entries(selectedTypes)
      .filter(([_, val]) => val.enabled)
      .reduce((sum, [_, val]) => sum + (Number(val.capacity) || 0), 0);
    const customSum = customChambers.reduce((sum, ch) => sum + (Number(ch.capacity) || 0), 0);
    return presetSum + customSum;
  };

  const handleFileUpload = async (e, setFile, setName, setUrl) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage('File size exceeds 25MB limit.');
        return;
      }
      setName(file.name);
      setFile(file);
      setErrorMessage('');
      try {
        const dataUrl = await readFileAsDataURL(file);
        if (setUrl && dataUrl) {
          setUrl(dataUrl);
        }
      } catch {}
    }
  };

  const readFileAsDataURL = (fileObj) => {
    return new Promise((resolve) => {
      if (!fileObj) return resolve('');
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(URL.createObjectURL(fileObj));
      reader.readAsDataURL(fileObj);
    });
  };

  const uploadFileToSupabase = async (fileObj, folder = 'kyc') => {
    if (!fileObj) return '';
    try {
      const safeUserId = (user.id || 'wh').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const safeName = fileObj.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      // Store documents inside user's designated tenant folder: ${safeUserId}/*
      const path = `${safeUserId}/${folder}_${timestamp}_${safeName}`;

      const { error } = await supabase.storage.from('proof').upload(path, fileObj, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        console.warn('Supabase storage upload notice:', error);
        return await readFileAsDataURL(fileObj);
      }

      // Generate short-lived signed link (15 minutes) for private documents
      const { data: signedData } = await supabase.storage.from('proof').createSignedUrl(path, 900);
      return signedData?.signedUrl || path;
    } catch {
      return await readFileAsDataURL(fileObj);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!companyName.trim()) {
      setErrorMessage('Please enter your Warehouse / Enterprise Name.');
      setActiveStep(1);
      return;
    }

    const numCapacity = Number(totalCapacityTonnes);
    if (!numCapacity || numCapacity <= 0) {
      setErrorMessage('Please enter a valid total storage capacity in Tonnes.');
      setActiveStep(1);
      return;
    }

    const enabledTypes = Object.entries(selectedTypes).filter(([_, v]) => v.enabled);
    const validCustomChambers = customChambers.filter((c) => (c.name || '').trim() !== '');
    if (enabledTypes.length === 0 && validCustomChambers.length === 0) {
      setErrorMessage('Please select at least one storage preset or add a custom chamber.');
      setActiveStep(2);
      return;
    }

    for (const cc of validCustomChambers) {
      if (!cc.capacity || isNaN(Number(cc.capacity)) || Number(cc.capacity) <= 0) {
        setErrorMessage(`Please enter a valid capacity (MT) for "${cc.name}".`);
        setActiveStep(2);
        return;
      }
      if (!cc.rate || isNaN(Number(cc.rate)) || Number(cc.rate) <= 0) {
        setErrorMessage(`Please enter a valid monthly rate (₹/T/mo) for "${cc.name}".`);
        setActiveStep(2);
        return;
      }
    }

    const totalAllocatedCap = calculateSumOfChambers();
    if (totalAllocatedCap > numCapacity) {
      setErrorMessage(
        `Combined chamber capacity (${totalAllocatedCap.toLocaleString('en-IN')} MT) exceeds your total facility space (${numCapacity.toLocaleString('en-IN')} MT). Please adjust chamber sizes.`
      );
      setActiveStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload files
      const [wdraUrl, gstUrl, insUrl] = await Promise.all([
        uploadFileToSupabase(wdraFileObj, 'warehouse_wdra'),
        uploadFileToSupabase(gstFileObj, 'warehouse_gst'),
        uploadFileToSupabase(insFileObj, 'warehouse_insurance'),
      ]);

      // Formulate chamber breakdown and custom chamber rates
      const chamberRates = {};
      const formattedPresetChambers = STORAGE_TYPE_OPTIONS.filter(
        (opt) => selectedTypes[opt.id]?.enabled
      ).map((opt) => {
        const rawRate = selectedTypes[opt.id]?.rate;
        const rate = (rawRate !== undefined && rawRate !== '' && !isNaN(Number(rawRate)))
          ? Number(rawRate)
          : (opt.defaultRate || 350);
        const rawCap = selectedTypes[opt.id]?.capacity;
        const cap = (rawCap !== undefined && rawCap !== '' && !isNaN(Number(rawCap)))
          ? Number(rawCap)
          : opt.defaultCap;
        const temp = (selectedTypes[opt.id]?.temp || opt.defaultTemp).trim();
        const chamberTitle = `${opt.name} (${cap}T - ${temp})`;
        chamberRates[chamberTitle] = rate;
        chamberRates[opt.name] = rate;
        chamberRates[opt.id] = rate;

        return {
          id: opt.id,
          name: opt.name,
          temp,
          capacity: cap,
          rate,
          description: opt.description,
        };
      });

      const formattedCustomChambers = validCustomChambers.map((cc) => {
        const name = cc.name.trim();
        const cap = Number(cc.capacity);
        const rate = Number(cc.rate);
        const temp = (cc.temp || 'Ambient').trim();
        const chamberTitle = `${name} (${cap}T - ${temp})`;
        chamberRates[chamberTitle] = rate;
        chamberRates[name] = rate;
        chamberRates[cc.id] = rate;

        return {
          id: cc.id,
          name,
          temp,
          capacity: cap,
          rate,
          isCustom: true,
          description: `Custom facility chamber (${temp})`,
        };
      });

      const formattedChambers = [...formattedPresetChambers, ...formattedCustomChambers];
      const chamberLabels = formattedChambers.map((c) => `${c.name} (${c.capacity}T - ${c.temp})`);

      // Calculate baseline facility tariff automatically from minimum chamber rate
      const chamberRateValues = formattedChambers.map((c) => c.rate).filter((r) => r > 0);
      const baseRateNum = chamberRateValues.length > 0 ? Math.min(...chamberRateValues) : (Number(monthlyRatePerTonne) || 350);

      const profilePayload = {
        warehouseName: companyName.trim(),
        companyName: companyName.trim(),
        operatorName: user.name || 'Warehouse Operator',
        role: 'warehouse',
        email: user.email || '',
        phone: user.phone || '',
        totalCapacityTonnes: numCapacity,
        monthlyRatePerTonne: baseRateNum,
        monthlyRatePerKg: Number((baseRateNum / 1000).toFixed(2)),
        minBillingDays: Number(minBillingDays || 0),
        handlingFeePerTonne: 0,
        enableBulkDiscount: false,
        chamberRates,
        websiteUrl: websiteUrl.trim(),
        wdraCode: wdraCode.trim() || `WDRA/2025/TN/${Math.floor(1000 + Math.random() * 9000)}`,
        gstin: gstin.trim(),
        address: address.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        storageTypesConfig: selectedTypes,
        customChambers: validCustomChambers,
        storageTypes: formattedChambers,
        chambers: chamberLabels,
        documentNames: {
          wdraCert: wdraFileName || (wdraFileObj ? wdraFileObj.name : ''),
          gstinCert: gstFileName || (gstFileObj ? gstFileObj.name : ''),
          insuranceCert: insFileName || (insFileObj ? insFileObj.name : ''),
        },
        documentUrls: {
          wdraCert: wdraUrl || existingWdraUrl || '',
          gstinCert: gstUrl || existingGstUrl || '',
          insuranceCert: insUrl || existingInsUrl || '',
        },
      };

      const saved = await saveWarehouseProfile(user.id, profilePayload);

      if (saved.hasPendingReview && saved.verificationStatus === 'modification_pending') {
        setSuccessMessage('✓ Facility revisions submitted for Administrative Approval! Your currently active verified capacity remains live until the compliance board approves your update.');
      } else {
        setSuccessMessage('✓ Warehouse facility and KYC documents submitted for verification successfully!');
      }

      if (onProfileSaved) {
        onProfileSaved(saved);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Failed to save warehouse profile:', err);
      setErrorMessage(err.message || 'Failed to save warehouse profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  const chamberSum = calculateSumOfChambers();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose?.();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-150 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Pinned Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white z-10 relative space-y-4">
          <div className="flex items-start gap-3.5 pr-8">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#34D399]" />
            </div>
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[11px] font-bold text-[#10B981]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>WDRA Accredited Terminal</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-[#0B3326] font-heading">
                Warehouse Setup & Verification
              </h2>
              <p className="text-xs text-[#566861]">
                Configure enterprise capacities, chamber fees, and compliance documents.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-5 sm:top-6 right-5 sm:right-6 p-2 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 3 Step Pill Indicator */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 1
                  ? 'bg-[#0B3326] text-white shadow-xs'
                  : 'bg-[#F4F6F4] text-[#566861] hover:bg-[#EBF5F0]'
              }`}
            >
              <span>1. Enterprise</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 2
                  ? 'bg-[#0B3326] text-white shadow-xs'
                  : 'bg-[#F4F6F4] text-[#566861] hover:bg-[#EBF5F0]'
              }`}
            >
              <span>2. Chambers & Rates</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 3
                  ? 'bg-[#0B3326] text-white shadow-xs'
                  : 'bg-[#F4F6F4] text-[#566861] hover:bg-[#EBF5F0]'
              }`}
            >
              <span>3. Documents</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body (Single unified clean scrollbar) */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5">
          
          {/* ================= STEP 1: Enterprise Profile & Total Capacity ================= */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#14211D] block">
                  Warehouse / Company Enterprise Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Sundar Cold Storage & Agri Silos Pvt Ltd"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] block">
                    Total Storage Capacity (Tonnes / MT) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={totalCapacityTonnes}
                      onChange={(e) => setTotalCapacityTonnes(e.target.value)}
                      min="1"
                      step="any"
                      placeholder="e.g. 2000"
                      required
                      className="w-full pl-4 pr-24 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white transition-all"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#566861] font-semibold">
                      Tonnes (MT)
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] flex items-center justify-between">
                    <span>Company Website / Portal</span>
                    <span className="text-[10px] text-[#566861] font-normal">Optional</span>
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://sundarcoldstorage.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Commercial Billing Policy */}
              <div className="p-4.5 rounded-2xl bg-[#F4FAF6] border border-[#10B981]/25 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#10B981]" />
                    <span className="text-xs font-bold text-[#0B3326]">
                      Commercial Billing Policy
                    </span>
                  </div>
                  <span className="text-[11px] text-[#065F46] font-semibold">
                    Configurable Chamber Rates in Step 2
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#0B3326] block">
                    Minimum Billing Duration
                  </label>
                  <select
                    value={minBillingDays}
                    onChange={(e) => setMinBillingDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                  >
                    <option value="0">No Minimum (Pay per exact days stored)</option>
                    <option value="15">15 Days Minimum Billing</option>
                    <option value="30">30 Days Minimum Billing (1 Month)</option>
                  </select>
                </div>
              </div>

              {/* Physical Location */}
              <div className="p-4.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
                <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#10B981]" />
                  <span>Facility Physical Location</span>
                </span>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street / Industrial Area Address (e.g. Omalur Main Road, NH-44)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-white text-xs text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value.replace(/[^a-zA-Z\s.-]/g, ''))}
                    placeholder="District"
                    className="px-3.5 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs text-[#14211D]"
                  />
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value.replace(/[^a-zA-Z\s.-]/g, ''))}
                    placeholder="State"
                    className="px-3.5 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs text-[#14211D]"
                  />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Pincode"
                    className="px-3.5 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs text-[#14211D]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setActiveStep(2)}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="font-bold text-xs py-2.5 px-5 cursor-pointer"
                >
                  Next: Configure Storage Chambers & Rates
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: Storage Chambers & Breakdown ================= */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Header Status Bar */}
              <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                Number(totalCapacityTonnes) > 0 && chamberSum > Number(totalCapacityTonnes)
                  ? 'bg-red-50 border-red-300'
                  : 'bg-[#F4FAF6] border-[#10B981]/30'
              }`}>
                <div>
                  <span className="text-xs font-bold text-[#0B3326] block">
                    Storage Chambers & Individual Monthly Fees
                  </span>
                  <p className={`text-[11px] ${
                    Number(totalCapacityTonnes) > 0 && chamberSum > Number(totalCapacityTonnes)
                      ? 'text-red-700 font-semibold'
                      : 'text-[#566861]'
                  }`}>
                    {Number(totalCapacityTonnes) > 0 && chamberSum > Number(totalCapacityTonnes)
                      ? `Exceeds your total facility space by ${(chamberSum - Number(totalCapacityTonnes)).toLocaleString('en-IN')} MT. Reduce chamber capacities to continue.`
                      : 'Toggle or add chambers within your total facility capacity, with degree and monthly rental fee.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <div className={`px-3 py-1.5 rounded-xl bg-white border text-xs font-bold ${
                    Number(totalCapacityTonnes) > 0 && chamberSum > Number(totalCapacityTonnes)
                      ? 'border-red-300 text-red-700'
                      : 'border-[#E5EDE8] text-[#0B3326]'
                  }`}>
                    Chamber Total:{' '}
                    <span className={Number(totalCapacityTonnes) > 0 && chamberSum > Number(totalCapacityTonnes) ? 'text-red-600' : 'text-[#10B981]'}>
                      {chamberSum} MT
                    </span>{' '}
                    / {totalCapacityTonnes || 0} MT
                  </div>
                </div>
              </div>

              {/* List of Chambers (Single smooth scroll flow) */}
              <div className="space-y-3">
                {STORAGE_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isChecked = selectedTypes[opt.id]?.enabled;
                  const capVal = selectedTypes[opt.id]?.capacity;
                  const currentCap = capVal !== undefined ? capVal : opt.defaultCap;
                  const rateVal = selectedTypes[opt.id]?.rate;
                  const currentRate = rateVal !== undefined ? rateVal : (opt.defaultRate || 350);

                  return (
                    <div
                      key={opt.id}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isChecked
                          ? 'border-[#10B981] bg-[#F8FCF9] shadow-xs'
                          : 'border-[#E5EDE8] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      {/* Clickable Header Row */}
                      <div
                        onClick={() => handleToggleStorageType(opt.id, opt.defaultCap, opt.defaultTemp)}
                        className="p-4 flex items-start gap-3.5 cursor-pointer select-none"
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by parent div
                            className="w-4 h-4 rounded text-[#10B981] focus:ring-[#10B981] accent-[#10B981] cursor-pointer"
                          />
                        </div>

                        <div className="w-9 h-9 rounded-xl bg-white border border-[#E5EDE8] flex items-center justify-center shrink-0 shadow-2xs">
                          <Icon className={`w-4 h-4 ${isChecked ? 'text-[#10B981]' : 'text-[#566861]'}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#0B3326]">
                              {opt.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5EDE8] text-[#0B3326] font-semibold">
                              {opt.defaultTemp}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#566861] mt-0.5">
                            {opt.description}
                          </p>
                        </div>
                      </div>

                      {/* Active Chamber Configuration Controls */}
                      {isChecked && (
                        <div className="px-4 pb-4 pt-1 border-t border-[#10B981]/20 bg-white/70">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            {/* Capacity Input */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-[#0B3326] block">
                                Chamber Capacity (MT)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={currentCap}
                                  onChange={(e) => handleTypeCapacityChange(opt.id, e.target.value)}
                                  min="0"
                                  step="any"
                                  placeholder="e.g. 1000"
                                  className="w-full pl-3 pr-14 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#566861]">
                                  MT
                                </span>
                              </div>
                            </div>

                            {/* Temperature / Degree Input */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-[#0B3326] block">
                                Temperature / Degree
                              </label>
                              <input
                                type="text"
                                value={selectedTypes[opt.id]?.temp ?? opt.defaultTemp}
                                onChange={(e) => handleTypeTempChange(opt.id, e.target.value)}
                                placeholder={opt.defaultTemp}
                                className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs font-semibold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                              />
                            </div>

                            {/* Monthly Rental Fee Input */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-[#0B3326] block">
                                Monthly Storage Fee
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#566861]">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  value={currentRate}
                                  onChange={(e) => handleTypeRateChange(opt.id, e.target.value)}
                                  min="0"
                                  step="any"
                                  placeholder="e.g. 350"
                                  className="w-full pl-7 pr-20 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs font-extrabold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#566861]">
                                  / T / Mo
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Live Unit Calculation Pill */}
                          <div className="mt-2.5 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#EBF5F0] border border-[#10B981]/25 text-[11px] text-[#065F46]">
                            <span className="font-semibold">Live farmer rates:</span>
                            <div className="flex items-center gap-2 font-bold">
                              <span>₹{(Number(currentRate || 0) / 1000).toFixed(2)} / kg</span>
                              <span>•</span>
                              <span>₹{((Number(currentRate || 0) / 1000) * 50).toFixed(1)} / 50kg bag</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Custom Chambers Builder */}
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-dashed border-[#10B981]/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-[#0B3326]">
                      Custom Chambers (Your Own Chamber Names, Size &amp; Degree)
                    </h4>
                    <p className="text-[11px] text-[#566861]">
                      Add specific bays or cold rooms with their exact MT capacity, °C range, and monthly fee.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddCustomChamber}
                    icon={Plus}
                    iconPosition="left"
                    className="text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Add Custom Chamber
                  </Button>
                </div>

                {customChambers.length > 0 && (
                  <div className="space-y-2.5">
                    {customChambers.map((cc) => (
                      <div
                        key={cc.id}
                        className="p-3.5 rounded-xl bg-white border border-[#E5EDE8] space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981]">
                            Custom Chamber
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomChamber(cc.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#0B3326] block">
                              Chamber Name *
                            </label>
                            <input
                              type="text"
                              value={cc.name}
                              onChange={(e) => handleCustomChamberChange(cc.id, 'name', e.target.value)}
                              placeholder="e.g. Cold Chamber A1"
                              className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#0B3326] block">
                              Size / Capacity (MT) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={cc.capacity}
                              onChange={(e) => handleCustomChamberChange(cc.id, 'capacity', e.target.value)}
                              placeholder="e.g. 250"
                              className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#0B3326] block">
                              Degree / Temperature *
                            </label>
                            <input
                              type="text"
                              value={cc.temp}
                              onChange={(e) => handleCustomChamberChange(cc.id, 'temp', e.target.value)}
                              placeholder="e.g. 2°C - 4°C"
                              className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#0B3326] block">
                              Monthly Rate (₹/T/Mo) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={cc.rate}
                              onChange={(e) => handleCustomChamberChange(cc.id, 'rate', e.target.value)}
                              placeholder="e.g. 800"
                              className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-extrabold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setActiveStep(1)}
                  className="font-bold text-xs py-2.5 px-4"
                >
                  Back to Enterprise
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setActiveStep(3)}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="font-bold text-xs py-2.5 px-5 cursor-pointer"
                >
                  Next: WDRA & Documents
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: WDRA Registration & KYC Documents ================= */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] block">
                    WDRA Registration / License No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={wdraCode}
                    onChange={(e) => setWdraCode(e.target.value)}
                    placeholder="e.g. WDRA/2025/TN/0892"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white"
                  />
                  <span className="text-[10px] text-[#566861] block">
                    Issued by Warehousing Development and Regulatory Authority.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] block">
                    GSTIN / Commercial Registration No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:bg-white"
                  />
                </div>
              </div>

              {/* Document Upload Area */}
              <div className="space-y-3 pt-1">
                <span className="text-xs font-bold text-[#0B3326] block">
                  Mandatory Compliance Document Uploads (PDF / JPG / PNG)
                </span>

                {/* 1. WDRA Certificate */}
                <div className="p-3.5 rounded-2xl border border-[#E5EDE8] bg-[#F8FAF8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#E5EDE8] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#14211D] block truncate">
                        1. WDRA Accreditation Certificate <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] text-[#566861] truncate block">
                        {wdraFileName || 'Required for electronic Negotiable Warehouse Receipts (e-NWR)'}
                      </span>
                    </div>
                  </div>

                  <label className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#10B981] text-[#0B3326] bg-white hover:bg-[#EBF5F0] font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{wdraFileName ? 'Replace File' : 'Upload Document'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, setWdraFileObj, setWdraFileName, setExistingWdraUrl)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 2. GST / Trade License */}
                <div className="p-3.5 rounded-2xl border border-[#E5EDE8] bg-[#F8FAF8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#E5EDE8] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#14211D] block truncate">
                        2. GSTIN Certificate / Trade License <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] text-[#566861] truncate block">
                        {gstFileName || 'Business verification document'}
                      </span>
                    </div>
                  </div>

                  <label className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#10B981] text-[#0B3326] bg-white hover:bg-[#EBF5F0] font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{gstFileName ? 'Replace File' : 'Upload Document'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, setGstFileObj, setGstFileName, setExistingGstUrl)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 3. Insurance / Fire NOC (Optional) */}
                <div className="p-3.5 rounded-2xl border border-[#E5EDE8] bg-[#F8FAF8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#E5EDE8] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#566861]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#14211D] block truncate">
                        3. Storage Facility Insurance / Fire NOC <span className="text-[10px] text-[#566861] font-normal">(Optional)</span>
                      </span>
                      <span className="text-[11px] text-[#566861] truncate block">
                        {insFileName || 'Optional for premium trade guarantees'}
                      </span>
                    </div>
                  </div>

                  <label className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#E5EDE8] text-[#566861] bg-white hover:bg-[#F8FAF8] font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{insFileName ? 'Replace File' : 'Upload Document'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, setInsFileObj, setInsFileName, setExistingInsUrl)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setActiveStep(2)}
                  className="font-bold text-xs py-2.5 px-4"
                >
                  Back to Chambers
                </Button>

                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  disabled={isSubmitting}
                  icon={ShieldCheck}
                  iconPosition="left"
                  className="font-bold text-xs py-2.5 px-6 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Saving & Submitting KYC...' : 'Complete Warehouse Setup & KYC'}
                </Button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#10B981] text-[#0B3326] text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

        </form>

      </div>
    </div>
  );
}
