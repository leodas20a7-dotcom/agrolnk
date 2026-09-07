import React, { useState } from 'react';
import { ShieldCheck, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

export default function VerificationRequiredModal({
  isOpen,
  onClose,
  currentUser,
  actionName = 'post listings or trade',
  onSuccess,
}) {
  const [docType, setDocType] = useState('Aadhaar / Identity Document');
  const [docNumber, setDocNumber] = useState('');
  const [businessName, setBusinessName] = useState(currentUser?.companyName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!docNumber.trim()) return;

    setIsSubmitting(true);

    try {
      const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
      const registry = storedRaw ? JSON.parse(storedRaw) : [];
      const userIndex = registry.findIndex(
        (u) => u.id === currentUser?.id || u.email === currentUser?.email
      );

      const submission = {
        id: currentUser?.id || `usr_${Date.now()}`,
        name: currentUser?.name || 'Registered Partner',
        role: currentUser?.role || 'farmer',
        email: currentUser?.email || 'user@example.com',
        phone: currentUser?.phone || '9876543210',
        state: currentUser?.state || 'Tamil Nadu',
        district: currentUser?.district || 'Salem',
        orgName: businessName.trim() || `${currentUser?.name} Enterprise`,
        verificationStatus: 'pending',
        submittedAt: new Date().toISOString(),
        verifiedAt: null,
        verifiedBy: null,
        documents: [
          {
            type: docType,
            number: docNumber.trim(),
            status: 'pending',
            fileUrl: '',
          },
        ],
        auditNotes: `Submitted ${docType} (${docNumber.trim()}) for trading authorization.`,
      };

      if (userIndex >= 0) {
        registry[userIndex] = {
          ...registry[userIndex],
          ...submission,
        };
      } else {
        registry.unshift(submission);
      }

      localStorage.setItem('agrolnk_admin_kyc_registry', JSON.stringify(registry));

      // Update current user cached status
      try {
        const cached = localStorage.getItem('agrolnkUser');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.kycStatus = 'pending';
          localStorage.setItem('agrolnkUser', JSON.stringify(parsed));
        }
      } catch {}

      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to submit verification:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-[#E5EDE8] shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B3326]">
                Admin Verification Required
              </h3>
              <p className="text-[11px] text-[#566861]">
                Identity & document approval required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#566861] hover:text-[#0B3326] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EBF5F0] text-[#10B981] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-[#0B3326]">
              Documents Submitted for Review!
            </h4>
            <p className="text-xs text-[#566861] max-w-xs mx-auto">
              Your details have been sent to the Admin verification queue. Once approved, you will receive the Verified Badge and full posting access.
            </p>
            <div className="pt-2">
              <Button variant="primary" size="md" onClick={onClose} className="w-full">
                Got It, Thanks
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block">Why is this required?</span>
              <p className="text-[11px] text-amber-800">
                To prevent fraud and maintain direct escrow trust, all partners must submit identification before they can {actionName}.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D] block">
                Select Document / ID Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              >
                <option value="Aadhaar / Identity Document">Aadhaar / Government ID</option>
                <option value="GSTIN Registration Certificate">GSTIN Certificate</option>
                <option value="PAN Card (Business / Personal)">PAN Card</option>
                <option value="Trade License / Land Record / Permit">Trade License / Land Passbook</option>
                <option value="WDRA / Lab Accreditation">WDRA / Warehouse Accreditation</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D] block">
                Document / ID Number
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="e.g. 33AAACA1122P1Z5 or XXXX-4921"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D] block">
                Entity / Farm / Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Vel Organic Farms"
                className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                size="md"
                disabled={isSubmitting}
                className="text-xs font-bold"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Admin Review'}
              </Button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
