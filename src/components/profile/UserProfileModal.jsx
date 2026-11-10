import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  MapPin,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  Sparkles,
  Save,
  ShieldCheck,
  Navigation
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import SearchableSelect from '../ui/SearchableSelect';
import { updateUserProfile } from '../../utils/auth';
import {
  getUserBankDetails,
  saveUserBankDetails,
  resolveIfscCode,
  POPULAR_BANKS,
  maskAccountNumber
} from '../../utils/bankDetails';
import { Landmark, CreditCard, Lock, Copy, Check, Clock } from 'lucide-react';

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) {
  const user = currentUser || {};
  const existingBank = getUserBankDetails(user.id) || {};

  // Disregard legacy hardcoded seed defaults if no real address or account exists
  const isLegacyDemoDistrict = (user.district === 'Salem' || user.district === 'HQ Operations') && !user.address && !user.pincode;
  const isLegacyDemoState = (user.state === 'Tamil Nadu' || user.state === 'Central Command') && !user.address && !user.pincode;
  const isLegacyDemoBank = (existingBank.bankName === 'State Bank of India' || user.bankName === 'State Bank of India') && !existingBank.accountNumber && !user.bankAccount;
  const isLegacyDemoIfsc = (existingBank.ifscCode === 'SBIN0004921' || user.bankIfsc === 'SBIN0004921') && !existingBank.accountNumber && !user.bankAccount;

  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    farmName: user.farmName || user.orgName || user.companyName || '',
    address: user.address || '',
    district: isLegacyDemoDistrict ? '' : (user.district || ''),
    state: isLegacyDemoState ? '' : (user.state || ''),
    pincode: user.pincode || '',
    landmark: user.landmark || '',
    bankName: isLegacyDemoBank ? '' : (existingBank.bankName || user.bankName || ''),
    accountHolderName: existingBank.accountHolderName || user.name || '',
    accountNumber: existingBank.accountNumber || user.bankAccount || '',
    ifscCode: isLegacyDemoIfsc ? '' : (existingBank.ifscCode || user.bankIfsc || ''),
    upiId: existingBank.upiId || user.upiId || '',
    accountType: existingBank.accountType || 'savings',
  });

  const [resolvedIfsc, setResolvedIfsc] = useState(() => (formData.ifscCode ? resolveIfscCode(formData.ifscCode) : null));
  const [activeTab, setActiveTab] = useState('contact'); // 'contact' | 'address' | 'bank'
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedVan, setCopiedVan] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setActiveTab('contact');
      const curUser = currentUser || {};
      const curBank = getUserBankDetails(curUser.id) || {};
      const legDist = (curUser.district === 'Salem' || curUser.district === 'HQ Operations') && !curUser.address && !curUser.pincode;
      const legState = (curUser.state === 'Tamil Nadu' || curUser.state === 'Central Command') && !curUser.address && !curUser.pincode;
      const legBank = (curBank.bankName === 'State Bank of India' || curUser.bankName === 'State Bank of India') && !curBank.accountNumber && !curUser.bankAccount;
      const legIfsc = (curBank.ifscCode === 'SBIN0004921' || curUser.bankIfsc === 'SBIN0004921') && !curBank.accountNumber && !curUser.bankAccount;

      const code = legIfsc ? '' : (curBank.ifscCode || curUser.bankIfsc || '');
      setFormData({
        name: curUser.name || '',
        email: curUser.email || '',
        phone: curUser.phone || '',
        farmName: curUser.farmName || curUser.orgName || curUser.companyName || '',
        address: curUser.address || '',
        district: legDist ? '' : (curUser.district || ''),
        state: legState ? '' : (curUser.state || ''),
        pincode: curUser.pincode || '',
        landmark: curUser.landmark || '',
        bankName: legBank ? '' : (curBank.bankName || curUser.bankName || ''),
        accountHolderName: curBank.accountHolderName || curUser.name || '',
        accountNumber: curBank.accountNumber || curUser.bankAccount || '',
        ifscCode: code,
        upiId: curBank.upiId || curUser.upiId || '',
        accountType: curBank.accountType || 'savings',
      });
      setResolvedIfsc(code ? resolveIfscCode(code) : null);
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [isOpen, currentUser]);

  const handleChange = (field, value) => {
    let cleanValue = value;
    if (field === 'phone') {
      cleanValue = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData((prev) => ({
      ...prev,
      [field]: cleanValue,
    }));
    if (field === 'ifscCode') {
      const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, ifscCode: clean }));
      if (clean.length >= 4) {
        const info = resolveIfscCode(clean);
        setResolvedIfsc(info);
        if (info?.bankName && info.isValidFormat) {
          setFormData(prev => ({ ...prev, bankName: info.bankName }));
        }
      } else {
        setResolvedIfsc(null);
      }
    }
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Full name is required.');
      setActiveTab('contact');
      return;
    }
    const cleanPhone = (formData.phone || '').replace(/\D/g, '');
    if (cleanPhone && (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone))) {
      setErrorMessage('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      setActiveTab('contact');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      const updatedUser = await updateUserProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        farmName: formData.farmName.trim(),
        orgName: formData.farmName.trim(),
        companyName: formData.farmName.trim(),
        address: formData.address.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        landmark: formData.landmark.trim(),
      });

      // Save Bank Details if provided
      if (formData.accountNumber && formData.ifscCode) {
        await saveUserBankDetails(user.id, {
          accountHolderName: formData.accountHolderName || formData.name,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          accountType: formData.accountType,
          upiId: formData.upiId,
        });
      }

      setSuccessMessage('Profile & Bank Payout settings saved successfully!');
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setErrorMessage('Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const commonStates = [
    'Tamil Nadu',
    'Maharashtra',
    'Karnataka',
    'Andhra Pradesh',
    'Telangana',
    'Kerala',
    'Madhya Pradesh',
    'Gujarat',
    'Punjab',
    'Uttar Pradesh',
    'Rajasthan',
    'Haryana',
    'Himachal Pradesh',
    'Bihar',
    'West Bengal',
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-[#E5EDE8] bg-white z-10 flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center text-base font-extrabold shadow-sm shrink-0">
              {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#0B3326] font-heading truncate">
                  Profile Details
                </h3>
                <Badge variant="emerald" size="sm">
                  {user.role || 'Member'}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-[#566861] mt-0.5 truncate">
                Manage your identity, farmgate address &amp; banking details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer shrink-0"
            aria-label="Close profile modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Segmented Tabs (Crisp, modern, zero endless scroll) */}
        <div className="shrink-0 px-4 sm:px-6 pt-3 pb-2.5 bg-[#F8FAF8] border-b border-[#E5EDE8]">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#E5EDE8]/60">
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 outline-none focus:outline-none ${
                activeTab === 'contact'
                  ? 'bg-white text-[#0B3326] shadow-xs'
                  : 'text-[#566861] hover:text-[#0B3326]'
              }`}
            >
              <User className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'contact' ? 'text-[#10B981]' : 'text-[#566861]'}`} />
              <span className="truncate">Identity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('address')}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 outline-none focus:outline-none ${
                activeTab === 'address'
                  ? 'bg-white text-[#0B3326] shadow-xs'
                  : 'text-[#566861] hover:text-[#0B3326]'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'address' ? 'text-[#10B981]' : 'text-[#566861]'}`} />
              <span className="truncate">Address</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 outline-none focus:outline-none ${
                activeTab === 'bank'
                  ? 'bg-white text-[#0B3326] shadow-xs'
                  : 'text-[#566861] hover:text-[#0B3326]'
              }`}
            >
              <Landmark className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'bank' ? 'text-[#10B981]' : 'text-[#566861]'}`} />
              <span className="truncate">Bank &amp; VAN</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body Wrapped in Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="p-4 sm:p-6 space-y-4">
            
            {/* Feedback Alerts */}
            {successMessage && (
              <div className="p-3 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 flex items-center gap-2.5 text-xs text-[#0B3326] font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-[#FEF2F2] border border-red-200 text-xs text-red-700 font-semibold animate-in fade-in">
                {errorMessage}
              </div>
            )}

            {/* TAB 1: Contact & Identity */}
            {activeTab === 'contact' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-[#E5EDE8]">
                  <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#10B981]" /> Contact &amp; Identity
                  </h4>
                  <span className="text-[10px] text-[#566861]">Step 1 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g. Sakthi Vel"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="9876543210"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      Email Address (Read-only)
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={formData.email}
                        readOnly
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#566861] cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      Farm / Enterprise Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.farmName}
                        onChange={(e) => handleChange('farmName', e.target.value)}
                        placeholder="e.g. Velan Agro Farm"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('address')}
                    className="text-xs font-bold text-[#10B981] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    Next: Farmgate Address &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Address & Location */}
            {activeTab === 'address' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-[#E5EDE8]">
                  <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#10B981]" /> Farmgate Address &amp; Location
                  </h4>
                  <span className="text-[10px] text-[#566861]">Step 2 of 3</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      Street / Village / Farmgate Address
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="e.g. 42 Green Valley Road, Omalur Taluk"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
                    />
                  </div>

                  {/* 3-Column Micro-Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#14211D] mb-1">
                        District
                      </label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => handleChange('district', e.target.value)}
                        placeholder="e.g. Salem"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#14211D] mb-1">
                        State
                      </label>
                      <SearchableSelect
                        options={commonStates}
                        value={formData.state}
                        onChange={(val) => handleChange('state', val)}
                        placeholder="Select State"
                        searchPlaceholder="Search state..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#14211D] mb-1">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => handleChange('pincode', e.target.value)}
                        placeholder="e.g. 636001"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      Nearest Highway / Hub Landmark (Optional)
                    </label>
                    <div className="relative">
                      <Navigation className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.landmark}
                        onChange={(e) => handleChange('landmark', e.target.value)}
                        placeholder="e.g. Near NH44 Toll Plaza / APMC Gate"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className="text-xs font-semibold text-[#566861] hover:underline cursor-pointer"
                  >
                    &larr; Back to Identity
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bank')}
                    className="text-xs font-bold text-[#10B981] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    Next: Bank &amp; VAN &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Bank & VAN */}
            {activeTab === 'bank' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-[#E5EDE8]">
                  <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-[#10B981]" /> Escrow Payout &amp; VAN
                  </h4>
                  <span className="text-[10px] text-[#10B981] font-bold bg-[#EBF5F0] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> RBI Nodal Payout
                  </span>
                </div>

                {/* Compact Dedicated Virtual Account Number (VAN) */}
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-[#F8FAF8] border border-emerald-200/90 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5 uppercase tracking-wide">
                      <Landmark className="w-3.5 h-3.5 text-emerald-700" />
                      Virtual Account (VAN)
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                      user.vanStatus === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : user.vanStatus === 'rejected'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {user.vanStatus === 'active'
                        ? '● Active'
                        : user.vanStatus === 'rejected'
                        ? '✕ Rejected'
                        : '⏳ Approval Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-white border border-emerald-100">
                      <span className="text-[9px] text-[#566861] uppercase tracking-wider block font-semibold">Virtual A/C No. (VAN)</span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono font-extrabold text-[#0B3326] text-xs">
                          {user.virtualAccountNumber || 'Awaiting Bank Issuance'}
                        </span>
                        {user.virtualAccountNumber && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(user.virtualAccountNumber);
                              setCopiedVan(true);
                              setTimeout(() => setCopiedVan(false), 2000);
                            }}
                            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
                            title="Copy VAN"
                          >
                            {copiedVan ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-emerald-100">
                      <span className="text-[9px] text-[#566861] uppercase tracking-wider block font-semibold">Dedicated Branch IFSC</span>
                      <span className="font-mono font-extrabold text-[#0B3326] text-xs block mt-0.5">
                        {user.virtualAccountIfsc || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGROLNK_ESCROW_IFSC) || 'ICIC0000104'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bank Account Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => handleChange('bankName', e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => handleChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 38291048211"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] font-mono text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={formData.ifscCode}
                      onChange={(e) => handleChange('ifscCode', e.target.value)}
                      placeholder="e.g. SBIN0004921"
                      maxLength={11}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] font-mono uppercase text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                    {resolvedIfsc && (
                      <span className="text-[10px] text-[#10B981] font-semibold block mt-0.5 truncate">
                        ✓ {resolvedIfsc.bankName} ({resolvedIfsc.branch})
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14211D] mb-1">
                      UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => handleChange('upiId', e.target.value.toLowerCase().trim())}
                      placeholder="e.g. name@oksbi"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                </div>

                <div className="pt-1 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setActiveTab('address')}
                    className="text-xs font-semibold text-[#566861] hover:underline cursor-pointer"
                  >
                    &larr; Back to Address
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="shrink-0 p-4 sm:p-5 border-t border-[#E5EDE8] bg-white flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 z-10">
            <span className="text-[11px] text-[#566861] flex items-center justify-center sm:justify-start gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              Encrypted session security
            </span>

            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="text-xs font-semibold px-4 py-2 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                size="sm"
                icon={Save}
                iconPosition="left"
                disabled={isSaving}
                className="text-xs font-bold shadow-xs cursor-pointer px-5 py-2"
              >
                {isSaving ? 'Saving...' : 'Save Profile Details'}
              </Button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
