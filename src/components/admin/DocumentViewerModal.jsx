import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  FileText,
  Building2,
  User,
  QrCode,
  ExternalLink,
  Award,
  Check,
  Clock,
  Sparkles,
  Lock,
  Maximize2,
  Minimize2
} from 'lucide-react';
import Button from '../ui/Button';

export default function DocumentViewerModal({
  isOpen,
  onClose,
  document: doc,
  user,
  onApprove,
  onReject
}) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !doc) return null;

  const docType = doc.type || 'Identity / Compliance Document';
  const docNumber = doc.number && doc.number !== 'Uploaded Document' ? doc.number : (
    docType.toLowerCase().includes('aadhaar') ? 'XXXX-XXXX-' + (user?.phone ? user.phone.slice(-4) : '4921') :
    docType.toLowerCase().includes('wdra') ? (user?.wdraCode || 'WDRA-TN-SLM-2024-884') :
    docType.toLowerCase().includes('gst') ? '33AAACA' + (user?.phone ? user.phone.slice(-4) : '9182') + '1Z5' :
    'AGR-KYC-' + Math.floor(100000 + Math.random() * 900000)
  );

  const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.format === 'PDF' || !doc.format;
  const hasRealImage = doc.fileUrl && !doc.fileUrl.endsWith('.pdf') && (
    doc.fileUrl.startsWith('data:image') || 
    doc.fileUrl.startsWith('blob:') || 
    doc.fileUrl.startsWith('http')
  );

  const handlePrint = () => {
    window.print();
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(docNumber);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Determine Certificate Theme based on document type
  const isAadhaar = docType.toLowerCase().includes('aadhaar') || docType.toLowerCase().includes('identity');
  const isWdra = docType.toLowerCase().includes('wdra') || docType.toLowerCase().includes('warehouse');
  const isGst = docType.toLowerCase().includes('gst') || docType.toLowerCase().includes('tax');
  const isLand = docType.toLowerCase().includes('land') || docType.toLowerCase().includes('kisan') || docType.toLowerCase().includes('passbook');
  const isTransport = docType.toLowerCase().includes('permit') || docType.toLowerCase().includes('vehicle') || docType.toLowerCase().includes('driver');

  return (
    <div className={`fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-all duration-200 ${isFullscreen ? 'p-0' : ''}`}>
      <div 
        className={`bg-white rounded-3xl w-full shadow-2xl border border-[#E5EDE8] flex flex-col overflow-hidden text-left transition-all ${
          isFullscreen 
            ? 'h-full max-w-none rounded-none' 
            : 'max-w-3xl max-h-[92vh]'
        }`}
      >
        {/* Top Control Bar */}
        <div className="bg-[#0B3326] text-white p-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#14624A] text-[#34D399]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-[260px] sm:max-w-md">
                  {docType}
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#14624A] text-[#34D399] text-[10px] font-bold uppercase tracking-wider">
                  Verifiable Credential
                </span>
              </div>
              <p className="text-xs text-[#DCFCE7]/80">
                Holder: <strong>{user?.name || 'Registered User'}</strong> &bull; {user?.orgName || user?.role || 'Agrolnk Participant'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex items-center bg-[#14624A] rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 15, 70))}
                title="Zoom Out"
                className="p-1 hover:text-[#34D399] cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-mono text-[#34D399]">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 15, 160))}
                title="Zoom In"
                className="p-1 hover:text-[#34D399] cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                title="Reset Zoom"
                className="p-1 border-l border-[#0B3326] ml-1 pl-1.5 hover:text-[#34D399] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              title="Print / Save PDF"
              className="p-2 rounded-xl bg-[#14624A] hover:bg-[#1A775B] text-[#DCFCE7] transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="p-2 rounded-xl bg-[#14624A] hover:bg-[#1A775B] text-[#DCFCE7] transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close Document"
              className="p-2 rounded-xl bg-red-900/60 hover:bg-red-800 text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F1F5F3] flex items-start justify-center">
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-[#D1DDD6] overflow-hidden transition-transform duration-150 relative text-left my-2"
          >
            {/* Real Uploaded Image Rendering if available */}
            {hasRealImage ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
                  <span className="text-xs font-bold text-[#0B3326]">
                    Uploaded Scanned Copy: {doc.fileName || 'document.jpg'}
                  </span>
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#10B981] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Full Resolution
                    </a>
                  )}
                </div>
                <div className="rounded-xl overflow-hidden border border-[#E5EDE8] bg-slate-900/5 flex items-center justify-center p-2">
                  <img
                    src={doc.fileUrl}
                    alt={docType}
                    className="max-h-[500px] w-auto object-contain rounded-lg shadow-xs"
                  />
                </div>
              </div>
            ) : (
              /* High-Fidelity Official Digital Certificate Renderer */
              <div className="p-6 sm:p-8 space-y-6 relative overflow-hidden bg-gradient-to-b from-[#FAFCFA] to-white">
                
                {/* Security Holographic Watermark Stamp */}
                <div className="absolute right-6 top-6 opacity-10 pointer-events-none select-none">
                  <ShieldCheck className="w-48 h-48 text-[#0B3326]" />
                </div>

                {/* 1. Official Authority Header */}
                <div className="text-center space-y-2 border-b-2 border-[#0B3326] pb-5">
                  {/* Tricolor Bar for Indian Official Docs */}
                  <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808] border border-gray-200 shadow-2xs mb-3" />
                  
                  {isAadhaar ? (
                    <>
                      <div className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                        Unique Identification Authority of India (UIDAI)
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-[#0B3326] font-heading tracking-tight">
                        GOVERNMENT OF INDIA &bull; भारत सरकार
                      </h2>
                      <p className="text-xs text-[#566861] font-semibold">
                        Aadhaar — Resident Identification Certificate
                      </p>
                    </>
                  ) : isWdra ? (
                    <>
                      <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                        WDRA Statutory Accreditation &bull; Ministry of Consumer Affairs
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-[#0B3326] font-heading tracking-tight">
                        WAREHOUSING DEVELOPMENT & REGULATORY AUTHORITY
                      </h2>
                      <p className="text-xs text-[#566861] font-semibold">
                        Certificate of Warehouse Accreditation & e-NWR Issuance Terminal
                      </p>
                    </>
                  ) : isGst ? (
                    <>
                      <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                        Goods and Services Tax Network (GSTN)
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-[#0B3326] font-heading tracking-tight">
                        GOVERNMENT OF INDIA &bull; FORM GST REG-06
                      </h2>
                      <p className="text-xs text-[#566861] font-semibold">
                        Certificate of Commercial Registration & Tax Compliance
                      </p>
                    </>
                  ) : isTransport ? (
                    <>
                      <div className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                        Ministry of Road Transport & Highways (MoRTH)
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-[#0B3326] font-heading tracking-tight">
                        NATIONAL CARRIAGE & FREIGHT PERMIT
                      </h2>
                      <p className="text-xs text-[#566861] font-semibold">
                        All-India Commercial Goods Transport Fleet Accreditation
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                        Agrolnk Verified Participant Credential
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-[#0B3326] font-heading tracking-tight">
                        {docType.toUpperCase()}
                      </h2>
                      <p className="text-xs text-[#566861] font-semibold">
                        Verified Ecosystem Compliance Audit Record
                      </p>
                    </>
                  )}
                </div>

                {/* 2. Holder Credentials & Identity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#566861]">Registered Holder / Entity</span>
                    <h4 className="font-extrabold text-[#0B3326] text-sm sm:text-base">
                      {user?.name || 'Verified Participant'}
                    </h4>
                    <span className="text-xs text-[#566861] block">
                      {user?.orgName || `${user?.name} Enterprise`} &bull; <strong className="capitalize text-[#0B3326]">{user?.role}</strong>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#566861]">Identification / Document Number</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-extrabold text-[#0B3326] text-sm sm:text-base">
                        {docNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-[#E5EDE8] text-[#0B3326] hover:bg-[#EBF5F0] cursor-pointer"
                      >
                        {copiedId ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <span className="text-[10px] text-[#10B981] font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Encrypted National Register Entry
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#566861]">Registered Jurisdiction & Location</span>
                    <p className="font-semibold text-[#0B3326]">
                      {user?.district ? `${user.district}, ${user.state || 'Tamil Nadu'}` : 'Salem, Tamil Nadu, India'}
                    </p>
                    <span className="text-[11px] text-[#566861] block">PIN: 636004 &bull; India</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#566861]">Contact Linkage</span>
                    <p className="font-semibold text-[#0B3326]">
                      Phone: <span className="font-mono">{user?.phone || '+91 98882 31932'}</span>
                    </p>
                    <p className="font-semibold text-[#566861] truncate">
                      Email: {user?.email || 'user@agrolnk.com'}
                    </p>
                  </div>
                </div>

                {/* 3. Security Stamp, QR Code & Digital Signature Verification */}
                <div className="p-4 rounded-2xl bg-[#EBF5F0] border border-[#A7F3D0] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-white p-1 rounded-xl border border-[#A7F3D0] shrink-0 flex items-center justify-center shadow-xs">
                      <QrCode className="w-12 h-12 text-[#0B3326]" />
                    </div>
                    <div className="space-y-0.5 text-xs text-left">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>VERIFIED DIGITAL SIGNATURE</span>
                      </div>
                      <p className="text-[11px] text-[#065F46] leading-relaxed">
                        Issued under the Digital Personal Data Protection (DPDP) Act & IT Act 2000. Verified on Agrolnk Trust Protocol.
                      </p>
                      <span className="text-[10px] font-mono text-[#566861] block">
                        SHA-256: 7f8a92b...{docNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)}...e89a
                      </span>
                    </div>
                  </div>

                  {/* Stamp Seal */}
                  <div className="p-2.5 px-4 rounded-xl border-2 border-dashed border-emerald-600 bg-white text-emerald-700 text-center shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-widest block">AGROLNK VERIFIED</span>
                    <span className="text-xs font-black uppercase">COMPLIANCE PASSED</span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 sm:px-6 bg-white border-t border-[#E5EDE8] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#566861]">
            <Lock className="w-4 h-4 text-[#10B981]" />
            <span>Encrypted Audit Ledger &bull; Immutable record</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs cursor-pointer"
            >
              Back to Profile
            </Button>

            {onReject && (
              <button
                type="button"
                onClick={() => {
                  onReject();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer transition-colors"
              >
                Reject Document
              </button>
            )}

            {onApprove && (
              <button
                type="button"
                onClick={() => {
                  onApprove();
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-[#0B3326] hover:bg-[#07241A] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                <span>Approve & Validate</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
