import React from 'react';
import Badge from '../ui/Badge';

export default function OrderStatus({ status = 'pending', escrowStatus, isAuction, size = 'sm' }) {
  // If newly placed, pending, or confirmed:
  if (status === 'order_placed' || status === 'pending' || status === 'confirmed') {
    if (escrowStatus === 'funded' && !isAuction) {
      return (
        <Badge variant="blue" size={size} dot={true}>
          <span>Escrow Funded</span>
        </Badge>
      );
    }
    return (
      <Badge variant="emerald" size={size} dot={true}>
        <span>Order Confirmed</span>
      </Badge>
    );
  }

  const statusConfigs = {
    in_transit: {
      label: 'In Transit (GPS Tracked)',
      variant: 'blue',
      dot: true,
    },
    ready_for_delivery: {
      label: 'Ready for Dispatch',
      variant: 'amber',
      dot: true,
    },
    dispatched: {
      label: 'Dispatched',
      variant: 'blue',
      dot: true,
    },
    delivered: {
      label: '📞 Delivered (Pending Confirmation)',
      variant: 'amber',
      dot: true,
    },
    pending_admin_approval: {
      label: '📞 Pending Delivery Clearance',
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

  const config = statusConfigs[status] || {
    label: 'Order Confirmed',
    variant: 'emerald',
    dot: true,
  };

  return (
    <Badge variant={config.variant} size={size} dot={config.dot}>
      {config.label}
    </Badge>
  );
}
