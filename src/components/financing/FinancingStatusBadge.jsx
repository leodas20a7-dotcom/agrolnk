import React from 'react';
import Badge from '../ui/Badge';
import { Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function FinancingStatusBadge({ status, size = 'sm' }) {
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
    approved: {
      label: 'Funding Approved',
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
