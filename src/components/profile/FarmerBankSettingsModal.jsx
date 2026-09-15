import React, { useState, useEffect } from 'react';
import {
  X,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  CreditCard,
  Lock,
  Sparkles,
  Zap,
  ArrowRight,
  Check,
  RefreshCw,
  QrCode,
  Info
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  getUserBankDetails,
  saveUserBankDetails,
  resolveIfscCode,
  POPULAR_BANKS,
  simulatePennyDropVerification,
  maskAccountNumber
} from '../../utils/bankDetails';
import { getCurrentUser } from '../../utils/auth';

export default function FarmerBankSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onSaved,
}) {
  const activeUser = currentUser || getCurrentUser() || {
    id: 'usr_farmer_01',
    name: 'Sakthi Vel',
    role: 'farmer'
  };

  const [formData, setFormData] = useState({
    accountHolderName: activeUser.name || 'Sakthi Vel',
    bankName: 'State Bank of India',
    accountNumber: '38291048211',
    confirmAccountNumber: '38291048211',
    ifscCode: 'SBIN0004921',
    accountType: 'savings',
    branchName: 'Attur Main Branch, Salem',
    upiId: 'sakthivel@oksbi',
  });

  const [resolvedIfsc, setResolvedIfsc] = useState(null);
  const [isVerifyingPenny, setIsVerifyingPenny] = useState(false);
  const [pennyResult, setPennyResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load existing bank details on open
  useEffect(() => {
    if (isOpen) {
      const existing = getUserBankDetails(activeUser.id);
      if (existing) {
        setFormData({
          accountHolderName: existing.accountHolderName || activeUser.name || '',
          bankName: existing.bankName || 'State Bank of India',
          accountNumber: existing.accountNumber || '',
          confirmAccountNumber: existing.accountNumber || '',
          ifscCode: existing.ifscCode || 'SBIN0004921',
          accountType: existing.accountType || 'savings',
          branchName: existing.branchName || 'Attur Main Branch, Salem',
          upiId: existing.upiId || '',
        });
        if (existing.ifscCode) {
          setResolvedIfsc(resolveIfscCode(existing.ifscCode));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          accountHolderName: activeUser.name || '',
        }));
      }
      setPennyResult(null);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, activeUser.id, activeUser.name]);

  if (!isOpen) return null;

  const handleIfscChange = (val) => {
    const uppercase = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, ifscCode: uppercase }));
    if (uppercase.length >= 4) {
      const info = resolveIfscCode(uppercase);
      setResolvedIfsc(info);
      if (info?.bankName && info.isValidFormat) {
        setFormData(prev => ({
          ...prev,
          bankName: info.bankName,
          branchName: info.branch,
        }));
      }
    } else {
      setResolvedIfsc(null);
    }
  };

  const handleSelectPopularBank = (bank) => {
    setFormData(prev => ({
      ...prev,
      bankName: bank.name,
      ifscCode: bank.ifscPrefix.padEnd(11, '0'),
    }));
    setResolvedIfsc(resolveIfscCode(bank.ifscPrefix.padEnd(11, '0')));
  };

  const handlePennyDropTest = async () => {
    setErrorMsg('');
    setPennyResult(null);

    if (!formData.accountNumber || formData.accountNumber.length < 8) {
      setErrorMsg('Please enter a valid Account Number (minimum 8 digits).');
      return;
    }
    if (formData.accountNumber !== formData.confirmAccountNumber) {
      setErrorMsg('Account Numbers do not match.');
      return;
    }
    if (!formData.ifscCode || formData.ifscCode.length !== 11) {
      setErrorMsg('Please enter a valid 11-digit IFSC code (e.g. SBIN0004921).');
      return;
    }

    setIsVerifyingPenny(true);
    try {
      const res = await simulatePennyDropVerification({
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        bankName: formData.bankName,
      });
      setPennyResult(res);
    } catch (err) {
      setErrorMsg(err.message || 'Penny drop verification failed.');
    } finally {
      setIsVerifyingPenny(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.accountHolderName.trim()) {
      setErrorMsg('Beneficiary / Account Holder Name is required.');
      return;
    }
    if (!formData.accountNumber || formData.accountNumber.length < 8) {
      setErrorMsg('Please provide a valid Account Number (min 8 digits).');
      return;
    }
    if (formData.accountNumber !== formData.confirmAccountNumber) {
      setErrorMsg('Account Number and Confirmation do not match.');
      return;
    }
    if (!formData.ifscCode || formData.ifscCode.length !== 11) {
      setErrorMsg('Please enter an 11-character RBI IFSC code.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveUserBankDetails(activeUser.id, formData);
      setSuccessMsg('Bank account linked & verified successfully! Escrow payouts will disburse here.');
      if (onSaved) {
        onSaved(saved);
      }
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Failed to save bank details:', err);
      setErrorMsg('Failed to save bank details. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center text-xl shadow-md shrink-0">
              <Landmark className="w-6 h-6 text-[#34D399]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#0B3326] font-heading">
                  Escrow Payout Bank Account
                </h3>
                <Badge variant="emerald" size="sm">
                  100% Escrow Direct Payout
                </Badge>
              </div>
              <p className="text-xs text-[#566861] mt-0.5">
                Link your bank account to receive immediate disbursements when produce delivery is verified.
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

        {/* Live Visual Bank Beneficiary Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0B3326] via-[#104735] to-[#0B3326] text-white shadow-lg border border-[#14624A] relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
                  Beneficiary Payout Link
                </span>
                <span className="text-xs text-white/70">
                  {formData.bankName || 'State Bank of India'}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-mono font-extrabold tracking-widest text-white mt-2">
                {formData.accountNumber ? maskAccountNumber(formData.accountNumber) : '•••• •••• •••• ••••'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <CreditCard className="w-5 h-5 text-[#34D399]" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
            <div>
              <span className="text-[10px] text-white/60 block uppercase font-medium">Account Holder</span>
              <span className="font-bold text-white tracking-wide">
                {formData.accountHolderName || activeUser.name || 'Account Holder'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-white/60 block uppercase font-medium">IFSC Code</span>
              <span className="font-mono font-bold text-[#34D399]">
                {formData.ifscCode || 'SBIN0004921'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-white/60 block uppercase font-medium">Type / UPI</span>
              <span className="font-semibold text-white/90">
                {formData.upiId || (formData.accountType === 'kcc' ? 'Kisan Credit Card' : 'Savings A/C')}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 flex items-center gap-2.5 text-xs text-[#0B3326] font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-red-200 flex items-center gap-2.5 text-xs text-red-700 font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {pennyResult && (
          <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#1E40AF]">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                <span className="text-xs font-bold font-heading">Penny-Drop Bank Verification Succeeded</span>
              </div>
              <Badge variant="blue" size="sm">Ref: {pennyResult.referenceId}</Badge>
            </div>
            <p className="text-xs text-[#1E3A8A] leading-relaxed">
              {pennyResult.message}
            </p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-5">
          
          {/* Quick Bank Selectors */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#14211D]">
              Select Bank or Search
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_BANKS.slice(0, 6).map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => handleSelectPopularBank(b)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    formData.bankName === b.name
                      ? 'bg-[#0B3326] text-white border-[#0B3326] shadow-xs'
                      : 'bg-[#F8FAF8] text-[#14211D] border-[#E5EDE8] hover:border-[#10B981] hover:bg-white'
                  }`}
                >
                  <span>{b.icon}</span>
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Account Holder Name */}
            <div>
              <label className="block text-xs font-bold text-[#14211D] mb-1">
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.accountHolderName}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                placeholder="e.g. Sakthi Vel"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
              <span className="text-[10px] text-[#566861] mt-0.5 block">
                Must match your bank passbook & Aadhaar name.
              </span>
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-xs font-bold text-[#14211D] mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  required
                />
              </div>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-xs font-bold text-[#14211D] mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
                placeholder="e.g. 38291048211"
                maxLength={18}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] font-mono text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
            </div>

            {/* Confirm Account Number */}
            <div>
              <label className="block text-xs font-bold text-[#14211D] mb-1">
                Confirm Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.confirmAccountNumber}
                onChange={(e) => setFormData({ ...formData, confirmAccountNumber: e.target.value.replace(/\D/g, '') })}
                placeholder="Re-enter account number"
                maxLength={18}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white border font-mono text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 ${
                  formData.confirmAccountNumber && formData.accountNumber !== formData.confirmAccountNumber
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-[#E5EDE8] focus:ring-[#10B981]'
                }`}
                required
              />
              {formData.confirmAccountNumber && formData.accountNumber !== formData.confirmAccountNumber && (
                <span className="text-[10px] text-red-600 font-semibold mt-0.5 block">
                  Numbers do not match
                </span>
              )}
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-xs font-bold text-[#14211D] mb-1">
                IFSC Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ifscCode}
                onChange={(e) => handleIfscChange(e.target.value)}
                placeholder="e.g. SBIN0004921"
                maxLength={11}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] font-mono uppercase text-xs font-bold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
              />
              {resolvedIfsc && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#0B3326] font-semibold bg-[#EBF5F0] px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>{resolvedIfsc.bankName} • {resolvedIfsc.branch}</span>
                </div>
              )}
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-xs font-bold text-[#14211D] mb-1">
                Account Type
              </label>
              <select
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              >
                <option value="savings">Savings Account</option>
                <option value="current">Current Account (FPO / Enterprise)</option>
                <option value="kcc">Kisan Credit Card (KCC)</option>
              </select>
            </div>

            {/* Optional UPI ID */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#14211D] mb-1">
                Virtual Payment Address (VPA / UPI ID) <span className="text-xs text-[#566861] font-normal">(Optional instant fallback)</span>
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value.toLowerCase().trim() })}
                  placeholder="e.g. sakthivel@oksbi or 9443211223@upi"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
            </div>

          </div>

          {/* Test Penny Drop Action */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              <div className="text-left">
                <span className="text-xs font-bold text-[#0B3326] block">Test Penny-Drop IMPS Verification</span>
                <span className="text-[10px] text-[#566861]">Simulate ₹1.00 instant deposit validation with NPCI switch</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={isVerifyingPenny ? RefreshCw : Zap}
              iconPosition="left"
              onClick={handlePennyDropTest}
              disabled={isVerifyingPenny}
              className="text-xs font-bold border-[#E5EDE8] bg-white hover:bg-[#EFF6FF] text-[#1E40AF] cursor-pointer shrink-0"
            >
              {isVerifyingPenny ? 'Verifying with Bank...' : 'Verify Bank Details'}
            </Button>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-[11px] text-[#566861] flex items-center justify-center sm:justify-start gap-1">
              <Lock className="w-3.5 h-3.5 text-[#10B981]" />
              Protected by 256-bit RBI Nodal Trust Encryption
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
                icon={Check}
                iconPosition="left"
                disabled={isSaving}
                className="text-xs font-bold shadow-xs cursor-pointer justify-center w-full sm:w-auto"
              >
                {isSaving ? 'Linking Bank...' : 'Save & Link Payout Account'}
              </Button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
