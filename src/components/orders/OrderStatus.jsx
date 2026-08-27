import React from 'react';
import Badge from '../ui/Badge';

export default function OrderStatus({ status = 'pending', size = 'sm' }) {
  const statusConfigs = {
    pending: {
      label: 'Pending Confirmation',
      variant: 'amber',
      dot: true,
    },
    confirmed: {
      label: 'Order Confirmed',
      variant: 'blue',
      dot: true,
    },
    ready_for_delivery: {
      label: 'Ready for Dispatch',
      variant: 'emerald',
      dot: true,
    },
    delivered: {
      label: 'Delivered',
      variant: 'accent',
      dot: false,
    },
    completed: {
      label: 'Completed & Settled',
      variant: 'emerald',
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
