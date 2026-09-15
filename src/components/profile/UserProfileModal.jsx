import React, { useState } from 'react';
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
import { Landmark, CreditCard, Lock } from 'lucide-react';

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) {
  if (!isOpen) return null;

  const user = currentUser || {};
  const existingBank = getUserBankDetails(user.id) || {};

  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    farmName: user.farmName || user.orgName || user.companyName || '',
    address: user.address || '',
    district: user.district || 'Salem',
    state: user.state || 'Tamil Nadu',
    pincode: user.pincode || '',
    landmark: user.landmark || '',
    bankName: existingBank.bankName || user.bankName || 'State Bank of India',
    accountHolderName: existingBank.accountHolderName || user.name || '',
    accountNumber: existingBank.accountNumber || user.bankAccount || '',
    ifscCode: existingBank.ifscCode || user.bankIfsc || 'SBIN0004921',
    upiId: existingBank.upiId || user.upiId || '',
    accountType: existingBank.accountType || 'savings',
  });

  const [resolvedIfsc, setResolvedIfsc] = useState(() => resolveIfscCode(formData.ifscCode));
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center text-lg font-extrabold shadow-md shrink-0">
              {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                  Profile & Auto-Fill Defaults
                </h3>
                <Badge variant="emerald" size="sm">
                  {user.role || 'Member'}
                </Badge>
              </div>
              <p className="text-xs text-[#566861] mt-0.5">
                Save your address & details to automatically auto-fill future listings and orders.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 flex items-center gap-2.5 text-xs text-[#0B3326] font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-red-200 text-xs text-red-700 font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-5">
          
          {/* Section 1: Personal & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#10B981]" /> Contact & Identity
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Sakthi Vel"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1">
                  Email Address (Read-only)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#566861] cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1">
                  Farm / Enterprise Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.farmName}
                    onChange={(e) => handleChange('farmName', e.target.value)}
                    placeholder="e.g. Velan Agro Farm"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Address & Location Details */}
          <div className="space-y-3 pt-3 border-t border-[#E5EDE8]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#10B981]" /> Farmgate Address & Auto-fill Location
              </h4>
              <span className="text-[10px] text-[#10B981] font-bold bg-[#EBF5F0] px-2 py-0.5 rounded-full">
                ⚡ Auto-fills listings & dispatch
              </span>
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#14211D] mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleChange('district', e.target.value)}
                    placeholder="e.g. Salem"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1">
                  Nearest Highway / Hub Landmark (Optional)
                </label>
                <div className="relative">
                  <Navigation className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => handleChange('landmark', e.target.value)}
                    placeholder="e.g. Near NH44 Toll Plaza / APMC Market Gate"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Bank Account & Escrow Payout Details */}
          <div className="space-y-3 pt-3 border-t border-[#E5EDE8]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-[#10B981]" /> Escrow Payout Bank Account
              </h4>
              <span className="text-[10px] text-[#10B981] font-bold bg-[#EBF5F0] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> RBI Nodal Direct Payout
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  placeholder="e.g. State Bank of India"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] font-mono text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] font-mono uppercase text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
                {resolvedIfsc && (
                  <span className="text-[10px] text-[#10B981] font-semibold block mt-0.5">
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
                  placeholder="e.g. sakthivel@oksbi"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-[11px] text-[#566861] flex items-center justify-center sm:justify-start gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              Secured in your encrypted session
            </span>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="text-xs font-semibold justify-center w-full sm:w-auto"
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
                className="text-xs font-bold shadow-xs cursor-pointer justify-center w-full sm:w-auto"
              >
                {isSaving ? 'Saving...' : 'Save Profile Defaults'}
              </Button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
