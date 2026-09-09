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
  ArrowRight
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { saveWarehouseProfile, getWarehouseProfile } from '../../utils/warehouses';

const STORAGE_TYPE_OPTIONS = [
  {
    id: 'cold_multichamber',
    name: 'Multi-Chamber Cold Storage',
    defaultTemp: '2°C - 8°C',
    icon: ThermometerSnowflake,
    description: 'For fruits, vegetables, potatoes, and horticulture perishables.',
    defaultCap: 1500,
  },
  {
    id: 'dry_silos',
    name: 'Dry Silo / Covered Warehouse',
    defaultTemp: 'Ambient (22°C - 26°C)',
    icon: Layers,
    description: 'For grains, paddy, wheat, pulses, maize, and turmeric.',
    defaultCap: 1200,
  },
  {
    id: 'ca_storage',
    name: 'Controlled Atmosphere (CA) Cold Storage',
    defaultTemp: '0°C - 2°C (Low O₂/CO₂)',
    icon: ThermometerSnowflake,
    description: 'High-tech long-term storage for export apples, kiwis, grapes.',
    defaultCap: 800,
  },
  {
    id: 'open_plinth',
    name: 'Covered Shed / Open Plinth Depot',
    defaultTemp: 'Ventilated Ambient',
    icon: Building2,
    description: 'Bagged grain storage with HDPE covers and fumigation.',
    defaultCap: 1000,
  },
  {
    id: 'deep_freeze',
    name: 'Frozen / Deep Cold Storage',
    defaultTemp: '-18°C to -22°C',
    icon: ThermometerSnowflake,
    description: 'IQF produce, butter, frozen pulp, and processed cold products.',
    defaultCap: 500,
  },
];

export default function WarehouseSetupModal({
  isOpen,
  onClose,
  currentUser,
  onProfileSaved,
}) {
  const user = currentUser || { id: 'usr_wh_01', name: 'Sundar', email: 'sundar@gmail.com' };

  const [companyName, setCompanyName] = useState('');
  const [totalCapacityTonnes, setTotalCapacityTonnes] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [wdraCode, setWdraCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState(user.district || '');
  const [state, setState] = useState(user.state || '');
  const [pincode, setPincode] = useState('');

  // Selected storage types and individual capacities
  const [selectedTypes, setSelectedTypes] = useState({
    cold_multichamber: { enabled: true, capacity: 1200, temp: '2°C - 8°C' },
    dry_silos: { enabled: true, capacity: 800, temp: 'Ambient (24°C)' },
    ca_storage: { enabled: false, capacity: 500, temp: '0°C - 2°C (CA)' },
    open_plinth: { enabled: false, capacity: 500, temp: 'Ventilated Ambient' },
    deep_freeze: { enabled: false, capacity: 300, temp: '-18°C' },
  });

  // Document upload state
  const [wdraFileName, setWdraFileName] = useState('');
  const [wdraFileObj, setWdraFileObj] = useState(null);
  const [gstFileName, setGstFileName] = useState('');
  const [gstFileObj, setGstFileObj] = useState(null);
  const [insFileName, setInsFileName] = useState('');
  const [insFileObj, setInsFileObj] = useState(null);

  const [activeStep, setActiveStep] = useState(1); // 1: Enterprise & Capacity, 2: Storage Types, 3: WDRA & KYC Docs
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load existing profile if already saved
  useEffect(() => {
    if (isOpen) {
      const existing = getWarehouseProfile(user.id, user.email);
      if (existing) {
        setCompanyName(existing.companyName || existing.warehouseName || '');
        setTotalCapacityTonnes(String(existing.totalCapacityTonnes || 2000));
        setWebsiteUrl(existing.websiteUrl || '');
        setWdraCode(existing.wdraCode || '');
        setGstin(existing.gstin || '');
        setAddress(existing.address || '');
        setDistrict(existing.district || 'Salem');
        setState(existing.state || 'Tamil Nadu');
        setPincode(existing.pincode || '636004');

        if (existing.storageTypesConfig) {
          setSelectedTypes(existing.storageTypesConfig);
        }
        if (existing.documentNames) {
          setWdraFileName(existing.documentNames.wdraCert || '');
          setGstFileName(existing.documentNames.gstinCert || '');
          setInsFileName(existing.documentNames.insuranceCert || '');
        }
      } else {
        // Pre-fill initial intuitive defaults from user name
        const defaultName = user.name ? `${user.name} Agri Logistics & Cold Storage` : 'Certified Agri Storage Terminal';
        setCompanyName(defaultName);
        setWdraCode(`WDRA/2025/${(user.district || 'TN').slice(0, 2).toUpperCase()}/${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
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
      const current = prev[typeId] || { enabled: true, capacity: 0, temp: '' };
      return {
        ...prev,
        [typeId]: {
          ...current,
          capacity: Number(value) || 0,
        },
      };
    });
  };

  const calculateSumOfChambers = () => {
    return Object.entries(selectedTypes)
      .filter(([_, val]) => val.enabled)
      .reduce((sum, [_, val]) => sum + (Number(val.capacity) || 0), 0);
  };

  const handleFileUpload = (e, setFile, setName) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage('File size exceeds 25MB limit.');
        return;
      }
      setName(file.name);
      setFile(file);
      setErrorMessage('');
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
      const path = `${folder}/${safeUserId}_${timestamp}_${safeName}`;

      const { error } = await supabase.storage.from('proof').upload(path, fileObj, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        console.warn('Supabase storage upload notice:', error);
        return await readFileAsDataURL(fileObj);
      }

      const { data: publicUrlData } = supabase.storage.from('proof').getPublicUrl(path);
      return publicUrlData?.publicUrl || (await readFileAsDataURL(fileObj));
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
    if (enabledTypes.length === 0) {
      setErrorMessage('Please select at least one type of storage facility you operate.');
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

      // Formulate chamber breakdown
      const formattedChambers = STORAGE_TYPE_OPTIONS.filter(
        (opt) => selectedTypes[opt.id]?.enabled
      ).map((opt) => ({
        id: opt.id,
        name: opt.name,
        temp: selectedTypes[opt.id]?.temp || opt.defaultTemp,
        capacity: Number(selectedTypes[opt.id]?.capacity || opt.defaultCap),
        description: opt.description,
      }));

      const profilePayload = {
        warehouseName: companyName.trim(),
        companyName: companyName.trim(),
        operatorName: user.name || 'Warehouse Operator',
        email: user.email || '',
        phone: user.phone || '',
        totalCapacityTonnes: numCapacity,
        websiteUrl: websiteUrl.trim(),
        wdraCode: wdraCode.trim() || `WDRA/2025/TN/${Math.floor(1000 + Math.random() * 9000)}`,
        gstin: gstin.trim(),
        address: address.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        storageTypesConfig: selectedTypes,
        storageTypes: formattedChambers,
        documentNames: {
          wdraCert: wdraFileName || (wdraFileObj ? wdraFileObj.name : 'wdra_license_doc.pdf'),
          gstinCert: gstFileName || (gstFileObj ? gstFileObj.name : 'gst_certificate.pdf'),
          insuranceCert: insFileName || (insFileObj ? insFileObj.name : ''),
        },
        documentUrls: {
          wdraCert: wdraUrl,
          gstinCert: gstUrl,
          insuranceCert: insUrl,
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
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-150 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Pinned Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white z-10 relative space-y-4">
          <div className="flex items-start gap-3.5 pr-8">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shrink-0 shadow-md">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#34D399]" />
            </div>
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[11px] font-bold text-[#10B981]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>WDRA Accredited Facility KYC</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-[#0B3326] font-heading">
                Warehouse Facility Setup & Verification
              </h2>
              <p className="text-xs text-[#566861]">
                Enter your enterprise storage capacities, chamber telemetry, WDRA accreditation, and KYC files.
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-5 sm:top-6 right-5 sm:right-6 p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 3 Step Pill Indicator */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 1
                  ? 'bg-[#0B3326] text-white shadow-xs'
                  : 'bg-[#F8FAF8] text-[#566861] hover:bg-[#EBF5F0]'
              }`}
            >
              <span>1. Enterprise Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 2
                  ? 'bg-[#0B3326] text-white shadow-xs'
                  : 'bg-[#F8FAF8] text-[#566861] hover:bg-[#EBF5F0]'
              }`}
            >
              <span>2. Storage Types</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 3
                  ? 'bg-[#0B3326] text-white shadow-xs'
                  : 'bg-[#F8FAF8] text-[#566861] hover:bg-[#EBF5F0]'
              }`}
            >
              <span>3. WDRA & Documents</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#14211D] block">
                    Total Accredited Storage Capacity (Tonnes) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={totalCapacityTonnes}
                      onChange={(e) => setTotalCapacityTonnes(e.target.value)}
                      min="10"
                      step="10"
                      placeholder="e.g. 2000"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
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
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Location */}
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
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
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="District"
                    className="px-3 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs text-[#14211D]"
                  />
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="px-3 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs text-[#14211D]"
                  />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Pincode"
                    className="px-3 py-2 rounded-xl border border-[#E5EDE8] bg-white text-xs text-[#14211D]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveStep(2)}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="font-bold text-xs"
                >
                  Next: Storage Types & Chambers
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: Storage Types & Breakdown ================= */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <span className="text-xs font-bold text-[#14211D] block">
                    What types of storage facilities do you operate?
                  </span>
                  <p className="text-[11px] text-[#566861]">
                    Select all that apply and specify your dedicated capacity for each chamber type.
                  </p>
                </div>
                <Badge variant={chamberSum === Number(totalCapacityTonnes) ? 'emerald' : 'amber'} size="sm">
                  Chamber Sum: {chamberSum} / {totalCapacityTonnes} T
                </Badge>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {STORAGE_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isChecked = selectedTypes[opt.id]?.enabled;
                  const currentCap = selectedTypes[opt.id]?.capacity || opt.defaultCap;

                  return (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isChecked
                          ? 'border-[#10B981] bg-[#F2FBF6]'
                          : 'border-[#E5EDE8] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        
                        <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStorageType(opt.id, opt.defaultCap, opt.defaultTemp)}
                            className="w-4 h-4 rounded text-[#10B981] focus:ring-[#10B981] mt-0.5 cursor-pointer accent-[#10B981]"
                          />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[#0B3326]">
                                {opt.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5EDE8] text-[#0B3326] font-semibold">
                                {opt.defaultTemp}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#566861]">
                              {opt.description}
                            </p>
                          </div>
                        </label>

                        {isChecked && (
                          <div className="w-28 shrink-0 space-y-1">
                            <span className="text-[10px] text-[#566861] block font-semibold text-right">
                              Capacity (T)
                            </span>
                            <input
                              type="number"
                              value={currentCap}
                              onChange={(e) => handleTypeCapacityChange(opt.id, e.target.value)}
                              min="10"
                              step="50"
                              className="w-full px-2.5 py-1 rounded-lg border border-[#10B981] bg-white text-xs font-bold text-right text-[#0B3326] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveStep(1)}
                  className="font-bold text-xs"
                >
                  Back
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveStep(3)}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="font-bold text-xs"
                >
                  Next: WDRA & KYC Documents
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              {/* Document Upload Area */}
              <div className="space-y-3 pt-1">
                <span className="text-xs font-bold text-[#0B3326] block">
                  Mandatory Compliance Document Uploads (PDF / JPG / PNG)
                </span>

                {/* 1. WDRA Certificate */}
                <div className="p-3 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-[#10B981] shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-[#14211D] block truncate">
                        1. WDRA Accreditation Certificate <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] text-[#566861] truncate block">
                        {wdraFileName || 'No file selected (Required for e-NWR issuance)'}
                      </span>
                    </div>
                  </div>

                  <label className="px-3 py-1.5 rounded-xl border border-[#10B981] text-[#0B3326] bg-white hover:bg-[#EBF5F0] font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{wdraFileName ? 'Replace' : 'Upload'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, setWdraFileObj, setWdraFileName)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 2. GST / Trade License */}
                <div className="p-3 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-[#10B981] shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-[#14211D] block truncate">
                        2. GSTIN Certificate / Trade License <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] text-[#566861] truncate block">
                        {gstFileName || 'No file selected'}
                      </span>
                    </div>
                  </div>

                  <label className="px-3 py-1.5 rounded-xl border border-[#10B981] text-[#0B3326] bg-white hover:bg-[#EBF5F0] font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{gstFileName ? 'Replace' : 'Upload'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, setGstFileObj, setGstFileName)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 3. Insurance / Fire NOC (Optional) */}
                <div className="p-3 rounded-xl border border-[#E5EDE8] bg-[#F8FAF8] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-[#566861] shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-[#14211D] block truncate">
                        3. Storage Facility Insurance / Fire NOC <span className="text-[10px] text-[#566861] font-normal">(Optional)</span>
                      </span>
                      <span className="text-[11px] text-[#566861] truncate block">
                        {insFileName || 'Optional for premium trade guarantees'}
                      </span>
                    </div>
                  </div>

                  <label className="px-3 py-1.5 rounded-xl border border-[#E5EDE8] text-[#566861] bg-white hover:bg-[#F8FAF8] font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{insFileName ? 'Replace' : 'Upload'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, setInsFileObj, setInsFileName)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveStep(2)}
                  className="font-bold text-xs"
                >
                  Back
                </Button>

                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  disabled={isSubmitting}
                  icon={ShieldCheck}
                  iconPosition="left"
                  className="font-bold text-xs py-2.5 px-5 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving & Submitting KYC...' : 'Complete Warehouse Setup & KYC'}
                </Button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-[#EBF5F0] border border-[#10B981] text-[#0B3326] text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

        </form>

      </div>
    </div>
  );
}
