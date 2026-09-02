import React from 'react';
import Badge from '../ui/Badge';

export default function OrderStatus({ status = 'pending', size = 'sm' }) {
  const statusConfigs = {
    order_placed: {
      label: 'Pending Confirmation',
      variant: 'amber',
      dot: true,
    },
    pending: {
      label: 'Pending Confirmation',
      variant: 'amber',
      dot: true,
    },
    in_transit: {
      label: 'In Transit / Dispatched',
      variant: 'blue',
      dot: true,
    },
    delivered: {
      label: 'Delivered (Verifying)',
      variant: 'accent',
      dot: true,
    },
    completed: {
      label: 'Completed & Settled',
      variant: 'emerald',
      dot: false,
    },
    cancelled: {
      label: 'Cancelled',
      variant: 'dark',
      dot: false,
    },
  };

  const config = statusConfigs[status] || statusConfigs.pending;

  return (
    <Badge variant={config.variant} size={size} dot={config.dot}>
      {config.label}
    </Badge>
  );
}
