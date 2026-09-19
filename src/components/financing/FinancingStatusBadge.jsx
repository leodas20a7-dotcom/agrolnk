import React from 'react';
import Badge from '../ui/Badge';
import { Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function FinancingStatusBadge({ status, applicantKycStatus, size = 'sm' }) {
  if ((status === 'pending' || status === 'under_review') && applicantKycStatus && applicantKycStatus !== 'verified') {
    return (
      <Badge variant="amber" size={size} dot={true}>
        <span>KYC Pending Approval</span>
      </Badge>
    );
  }

  const config = {
    pending: {
      label: 'Pending Review',
      variant: 'amber',
      icon: Clock,
      dot: true,
    },
    under_review: {
      label: 'Under Review',
      variant: 'blue',
      icon: Clock,
      dot: true,
    },
    offer_received: {
      label: 'Term-Sheet Offer Received',
      variant: 'amber',
      icon: Clock,
      dot: true,
    },
    borrower_accepted: {
      label: 'Terms Accepted (Ready to Disburse)',
      variant: 'emerald',
      icon: CheckCircle2,
      dot: true,
    },
    approved: {
      label: 'Funding Approved',
      variant: 'emerald',
      icon: CheckCircle2,
      dot: true,
    },
    disbursed: {
      label: 'Disbursed',
      variant: 'blue',
      icon: CheckCircle2,
      dot: true,
    },
    repaid: {
      label: 'Repaid & Settled',
      variant: 'emerald',
      icon: CheckCircle2,
      dot: true,
    },
    settled: {
      label: 'Repaid & Settled',
      variant: 'emerald',
      icon: CheckCircle2,
      dot: true,
    },
    rejected: {
      label: 'Rejected',
      variant: 'rose',
      icon: XCircle,
      dot: false,
    },
  };

  const item = config[status] || config.pending;
  const Icon = item.icon;

  return (
    <Badge variant={item.variant} size={size} dot={item.dot}>
      <span className="capitalize">{item.label}</span>
    </Badge>
  );
}
