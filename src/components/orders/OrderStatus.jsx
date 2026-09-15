import React from 'react';
import Badge from '../ui/Badge';

export default function OrderStatus({ status = 'pending', size = 'sm' }) {
  const statusConfigs = {
    order_placed: {
      label: 'Escrow Funded',
      variant: 'blue',
      dot: true,
    },
    pending: {
      label: 'Escrow Funded',
      variant: 'blue',
      dot: true,
    },
    in_transit: {
      label: 'In Transit (GPS Tracked)',
      variant: 'blue',
      dot: true,
    },
    delivered: {
      label: '📞 Arrived (Pending Admin Call)',
      variant: 'amber',
      dot: true,
    },
    pending_admin_approval: {
      label: '📞 Pending Buyer Call Clearance',
      variant: 'amber',
      dot: true,
    },
    disputed: {
      label: '⚠️ Escrow Disputed / Hold',
      variant: 'amber',
      dot: true,
    },
    completed: {
      label: 'Settled to Bank (100%)',
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
