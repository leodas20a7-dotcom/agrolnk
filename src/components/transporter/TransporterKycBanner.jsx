import React from 'react';
import { Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import VerificationRequiredModal from '../verification/VerificationRequiredModal';
import DocumentViewerModal from '../admin/DocumentViewerModal';

/**
 * Shared KYC status banner & verification modals across all Transporter Desk pages.
 */
export default function TransporterKycBanner({
  user,
  currentKycStatus,
  onOpenKycAction,
  isVerificationModalOpen,
  onCloseVerificationModal,
  onVerificationSuccess,
  inspectingDoc,
  onCloseInspectingDoc,
}) {
  return (
    <>
      {currentKycStatus !== 'verified' && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            currentKycStatus === 'pending'
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : currentKycStatus === 'rejected'
              ? 'bg-red-50/90 border-red-200 text-red-900'
              : 'bg-purple-50/90 border-purple-200 text-purple-900'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                currentKycStatus === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : currentKycStatus === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-white text-purple-700'
              }`}
            >
              {currentKycStatus === 'pending' ? (
                <Clock className="w-4 h-4" />
              ) : currentKycStatus === 'rejected' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-purple-600" />
              )}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold">
                  {currentKycStatus === 'pending'
                    ? 'KYC Verification Under Review'
                    : currentKycStatus === 'rejected'
                    ? 'KYC Documents Rejected'
                    : 'KYC Verification Required'}
                </span>
                <Badge
                  variant={currentKycStatus === 'pending' ? 'amber' : currentKycStatus === 'rejected' ? 'red' : 'purple'}
                  size="sm"
                >
                  {currentKycStatus === 'pending' ? 'Reviewing' : currentKycStatus === 'rejected' ? 'Rejected' : 'Action Required'}
                </Badge>
              </div>
              <p className="text-xs text-[#566861]">
                {currentKycStatus === 'pending'
                  ? 'Documents are under review. Freight quoting and dispatch loads will activate once approved.'
                  : currentKycStatus === 'rejected'
                  ? 'Please review and re-submit your driving credentials.'
                  : 'Complete driver & vehicle verification to unlock corridor loads and payouts.'}
              </p>
            </div>
          </div>

          <Button
            variant={currentKycStatus === 'pending' ? 'secondary' : 'primary'}
            size="sm"
            onClick={onOpenKycAction}
            className="shrink-0 cursor-pointer shadow-xs whitespace-nowrap text-xs font-semibold py-1.5 px-3"
          >
            {currentKycStatus === 'pending' ? 'View' : currentKycStatus === 'rejected' ? 'Re-submit Proof' : 'Verify Now'}
          </Button>
        </div>
      )}

      {isVerificationModalOpen && (
        <VerificationRequiredModal
          isOpen={isVerificationModalOpen}
          currentUser={user}
          actionName="submit freight quotes and accept dispatch loads"
          onClose={onCloseVerificationModal}
          onSuccess={onVerificationSuccess}
        />
      )}

      <DocumentViewerModal
        isOpen={Boolean(inspectingDoc)}
        document={inspectingDoc}
        user={user}
        onClose={onCloseInspectingDoc}
      />
    </>
  );
}
