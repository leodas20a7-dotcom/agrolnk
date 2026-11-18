import React from 'react';
import Badge from '../ui/Badge';
import { Truck, Clock, CheckCircle2, Navigation, PackageCheck, UserCheck } from 'lucide-react';

export default function DeliveryStatusBadge({ status, size = 'sm' }) {
  const config = {
    pending: {
      label: 'Waiting',
      variant: 'amber',
      icon: Clock,
      dot: true,
    },
    transport_requested: {
      label: 'Open Load',
      variant: 'amber',
      icon: Clock,
      dot: true,
    },
    price_offered: {
      label: 'Quote Sent',
      variant: 'amber',
      icon: Clock,
      dot: true,
    },
    assigned: {
      label: 'Assigned',
      variant: 'blue',
      icon: UserCheck,
      dot: true,
    },
    picked_up: {
      label: 'Picked Up',
      variant: 'purple',
      icon: PackageCheck,
      dot: true,
    },
    in_transit: {
      label: 'In Transit',
      variant: 'indigo',
      icon: Navigation,
      dot: true,
    },
    delivered: {
      label: 'Delivered',
      variant: 'teal',
      icon: Truck,
      dot: true,
    },
    completed: {
      label: 'Confirmed',
      variant: 'emerald',
      icon: CheckCircle2,
      dot: true,
    },
  };

  const item = config[status] || config.pending;

  return (
    <Badge variant={item.variant} size={size} dot={item.dot}>
      <span className="capitalize">{item.label}</span>
    </Badge>
  );
}
