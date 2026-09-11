import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Building2,
  Truck,
  Landmark,
  ExternalLink,
  AlertCircle,
  Clock
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { updateKYCStatus } from '../../utils/admin';
import DocumentViewerModal from './DocumentViewerModal';

export default function KYCVerificationModal({
  user,
  isOpen,
  onClose,
  onStatusUpdated,
}) {
  const [auditNotes, setAuditNotes] = useState(user?.auditNotes || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [inspectingDoc, setInspectingDoc] = useState(null);

  React.useEffect(() => {
    if (user) {
      setAuditNotes(user.auditNotes || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleAction = async (newStatus) => {
    setIsUpdating(true);
    try {
      const updated = await updateKYCStatus(user.id, newStatus, auditNotes, 'AgroLnk Admin (Govind)');
      setIsUpdating(false);
      onStatusUpdated?.(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update KYC status:', err);
      setIsUpdating(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'farmer': return User;
      case 'buyer': return Building2;
      case 'transporter': return Truck;
      case 'warehouse': return Building2;
      case 'financier': return Landmark;
      default: return User;
    }
  };

  const RoleIcon = getRoleIcon(user.role);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-base sm:text-xl font-extrabold text-[#0B3326] font-heading truncate">
                  {user.name}
                </h3>
                <Badge
                  variant={
                    user.verificationStatus === 'verified'
                      ? 'emerald'
                      : user.verificationStatus === 'rejected'
                      ? 'dark'
                      : 'amber'
                  }
                  size="sm"
                  dot={user.verificationStatus === 'pending'}
                  className="shrink-0"
                >
                  <span className="capitalize">{user.verificationStatus}</span>
                </Badge>
              </div>
              <span className="text-[10px] sm:text-xs text-[#566861] block truncate">
                {user.orgName || 'Trading Participant'} • {user.district ? `${user.district}, ` : ''}{user.state}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Applicant Meta Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Participant Role</span>
            <span className="font-bold text-[#14211D] capitalize">{user.role}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Contact Phone</span>
            <span className="font-bold text-[#14211D]">{user.phone || '+91 98400 12345'}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#566861] block font-medium">Registered Email</span>
            <span className="font-bold text-[#0B3326] truncate block">{user.email}</span>
          </div>
        </div>

        {/* Uploaded Verification Documents */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
              Verification Credentials & Government IDs
            </h4>
            <span className="text-[11px] text-[#566861]">
              {(user.documents || []).length} Documents Submitted
            </span>
          </div>

          <div className="space-y-2.5">
            {(user.documents || []).map((doc, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white border border-[#E5EDE8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 hover:border-[#10B981]/40 transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-[#14211D] block truncate">{doc.type}</span>
                    <span className="text-[11px] text-[#566861] font-mono block truncate">
                      Ref / ID: {doc.number}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setInspectingDoc(doc)}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8FAF8] border border-[#E5EDE8] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Inspect Document</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Audit & Compliance Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
            Admin Compliance & Audit Remarks
          </label>
          <textarea
            rows={3}
            value={auditNotes}
            onChange={(e) => setAuditNotes(e.target.value)}
            placeholder="Add verification verification memos, NABL validation, or notes..."
            className="w-full p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] placeholder:text-[#566861]/60 focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
          />
        </div>

        {/* Action Decision Bar */}
        <div className="pt-3 border-t border-[#E5EDE8] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Button
            variant="danger"
            size="md"
            disabled={isUpdating || user.verificationStatus === 'rejected'}
            onClick={() => handleAction('rejected')}
            icon={XCircle}
            iconPosition="left"
            className="w-full justify-center text-xs font-bold py-2.5 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
          >
            Reject Application
          </Button>

          <Button
            variant="secondary"
            size="md"
            disabled={isUpdating}
            onClick={() => handleAction('action_required')}
            icon={Clock}
            iconPosition="left"
            className="w-full justify-center text-xs font-bold py-2.5 cursor-pointer text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
          >
            Request Documents
          </Button>

          <Button
            variant="accent"
            size="md"
            disabled={isUpdating || user.verificationStatus === 'verified'}
            onClick={() => handleAction('verified')}
            icon={CheckCircle2}
            iconPosition="left"
            className="w-full justify-center text-xs font-bold py-2.5 shadow-md cursor-pointer"
          >
            {isUpdating ? 'Approving...' : 'Approve & Activate'}
          </Button>
        </div>

        {/* Document Inspection Lightbox Modal */}
        {inspectingDoc && (
          <DocumentViewerModal
            isOpen={!!inspectingDoc}
            onClose={() => setInspectingDoc(null)}
            document={inspectingDoc}
            user={user}
            onApprove={() => handleAction('verified')}
            onReject={() => handleAction('rejected')}
          />
        )}

      </div>
    </div>
  );
}
