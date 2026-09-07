import React, { useState } from 'react';
import { ShieldCheck, X, FileText, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
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
  const [fileName, setFileName] = useState('');
  const [fileFormat, setFileFormat] = useState('PDF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  const getDocHelperText = () => {
    switch (docType) {
      case 'Aadhaar / Identity Document':
        return 'Format: Exactly 12 digits (e.g. 1234 5678 9012)';
      case 'GSTIN Registration Certificate':
        return 'Format: Exactly 15 characters (e.g. 33AAACA1122P1Z5)';
      case 'PAN Card (Business / Personal)':
        return 'Format: Exactly 10 characters (e.g. ABCDE1234F)';
      default:
        return 'Format: 6 to 30 alphanumeric characters';
    }
  };

  const getPlaceholder = () => {
    switch (docType) {
      case 'Aadhaar / Identity Document':
        return '12 digit Aadhaar number';
      case 'GSTIN Registration Certificate':
        return '15 character GSTIN number';
      case 'PAN Card (Business / Personal)':
        return '10 character PAN number';
      default:
        return 'Enter certificate or license number';
    }
  };

  const handleFileChange = (e) => {
    setErrorMessage('');
    setFieldErrors((prev) => ({ ...prev, file: '' }));
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size exceeds 10MB limit. Please upload a smaller file.');
        return;
      }

      setFileName(file.name);
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setFileFormat('PDF');
      } else if (file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)) {
        setFileFormat('IMAGE');
      } else {
        setErrorMessage('Invalid file format. Please upload a PDF, PNG, or JPG file.');
        setFileName('');
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    const cleanNum = docNumber.trim();

    // 1. Validate Document Number
    if (!cleanNum) {
      errors.docNumber = 'Document / ID Number is required.';
    } else if (docType === 'Aadhaar / Identity Document') {
      const digitsOnly = cleanNum.replace(/[\s-]/g, '');
      if (!/^\d{12}$/.test(digitsOnly)) {
        errors.docNumber = 'Aadhaar number must be exactly 12 digits (e.g. 1234 5678 9012).';
      }
    } else if (docType === 'GSTIN Registration Certificate') {
      const upper = cleanNum.toUpperCase();
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(upper)) {
        errors.docNumber = 'Please enter a valid 15-character GSTIN (e.g. 33AAACA1122P1Z5).';
      }
    } else if (docType === 'PAN Card (Business / Personal)') {
      const upper = cleanNum.toUpperCase();
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(upper)) {
        errors.docNumber = 'Please enter a valid 10-character PAN (e.g. ABCDE1234F).';
      }
    } else {
      if (cleanNum.length < 6 || cleanNum.length > 30) {
        errors.docNumber = 'License/registration number must be between 6 and 30 characters.';
      }
    }

    // 2. Validate File Upload (Mandatory)
    if (!fileName) {
      errors.file = 'Uploading a PDF or image document file is mandatory.';
    }

    // 3. Validate Entity / Business Name
    if (!businessName.trim()) {
      errors.businessName = 'Entity / Farm / Business Name is required.';
    } else if (businessName.trim().length < 3) {
      errors.businessName = 'Entity / Business Name must be at least 3 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      setErrorMessage('Please fix the highlighted errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
      const registry = storedRaw ? JSON.parse(storedRaw) : [];
      const userIndex = registry.findIndex(
        (u) => u.id === currentUser?.id || u.email === currentUser?.email
      );

      const uploadedDocName = fileName;

      const submission = {
        id: currentUser?.id || `usr_${Date.now()}`,
        name: currentUser?.name || 'Registered Partner',
        role: currentUser?.role || 'farmer',
        email: currentUser?.email || 'user@example.com',
        phone: currentUser?.phone || '9876543210',
        state: currentUser?.state || 'Tamil Nadu',
        district: currentUser?.district || 'Salem',
        orgName: businessName.trim(),
        verificationStatus: 'pending',
        submittedAt: new Date().toISOString(),
        verifiedAt: null,
        verifiedBy: null,
        documents: [
          {
            type: docType,
            number: docNumber.trim().toUpperCase(),
            fileName: uploadedDocName,
            format: fileFormat,
            fileSize: '1.8 MB',
            status: 'pending',
            fileUrl: '',
          },
        ],
        auditNotes: `Submitted ${docType} (${docNumber.trim().toUpperCase()}) in ${fileFormat} format for trading verification.`,
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
      setErrorMessage('Failed to save submission. Please try again.');
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
                Mandatory identity & document approval
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
              Document Submitted for Review!
            </h4>
            <p className="text-xs text-[#566861] max-w-xs mx-auto">
              Your {fileFormat} file and verified credentials have been submitted to Admin. You will receive the Verified Badge once approved.
            </p>
            <div className="pt-2">
              <Button variant="primary" size="md" onClick={onClose} className="w-full">
                Got It, Thanks
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block">Why is this required?</span>
              <p className="text-[11px] text-amber-800">
                To prevent fraud and maintain direct escrow trust, all partners must submit valid documents before they can {actionName}.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Document Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D] flex items-center gap-1">
                <span>Select Document / ID Type</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                value={docType}
                onChange={(e) => {
                  setDocType(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, docNumber: '' }));
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              >
                <option value="Aadhaar / Identity Document">Aadhaar / Government ID</option>
                <option value="GSTIN Registration Certificate">GSTIN Certificate</option>
                <option value="PAN Card (Business / Personal)">PAN Card</option>
                <option value="Trade License / Land Record / Permit">Trade License / Land Passbook</option>
                <option value="WDRA / Lab Accreditation">WDRA / Warehouse Accreditation</option>
              </select>
            </div>

            {/* Document ID Number */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#14211D] flex items-center gap-1">
                  <span>Document / ID Number</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <span className="text-[10px] text-[#566861] italic">{getDocHelperText()}</span>
              </div>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => {
                  setDocNumber(e.target.value);
                  if (fieldErrors.docNumber) setFieldErrors((prev) => ({ ...prev, docNumber: '' }));
                }}
                placeholder={getPlaceholder()}
                className={`w-full px-3 py-2.5 rounded-xl bg-[#F8FAF8] border text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 ${
                  fieldErrors.docNumber ? 'border-red-500 focus:ring-red-500' : 'border-[#E5EDE8] focus:ring-[#10B981]'
                }`}
              />
              {fieldErrors.docNumber && (
                <span className="text-[11px] text-red-600 font-semibold block mt-0.5">
                  {fieldErrors.docNumber}
                </span>
              )}
            </div>

            {/* Mandatory File Upload (PDF, PNG, JPG) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D] flex items-center gap-1">
                <span>Upload Document File (PDF, PNG, JPG)</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <label className={`flex items-center justify-between p-3 rounded-xl bg-[#F8FAF8] border border-dashed hover:border-[#10B981] cursor-pointer transition-colors ${
                fieldErrors.file ? 'border-red-500 bg-red-50/40' : 'border-[#E5EDE8]'
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  <Upload className="w-4 h-4 text-[#10B981]" />
                  <span className="text-[#566861] font-medium truncate max-w-[200px]">
                    {fileName ? fileName : 'Choose PDF or Image file...'}
                  </span>
                </div>
                {fileName ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {fileFormat}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-[#566861]">
                    Browse File
                  </span>
                )}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {fieldErrors.file && (
                <span className="text-[11px] text-red-600 font-semibold block mt-0.5">
                  {fieldErrors.file}
                </span>
              )}
            </div>

            {/* Entity / Business Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D] flex items-center gap-1">
                <span>Entity / Farm / Business Name</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (fieldErrors.businessName) setFieldErrors((prev) => ({ ...prev, businessName: '' }));
                }}
                placeholder="e.g. Vel Organic Farms Pvt Ltd"
                className={`w-full px-3 py-2.5 rounded-xl bg-[#F8FAF8] border text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 ${
                  fieldErrors.businessName ? 'border-red-500 focus:ring-red-500' : 'border-[#E5EDE8] focus:ring-[#10B981]'
                }`}
              />
              {fieldErrors.businessName && (
                <span className="text-[11px] text-red-600 font-semibold block mt-0.5">
                  {fieldErrors.businessName}
                </span>
              )}
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
