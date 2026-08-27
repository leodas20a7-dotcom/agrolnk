import React from 'react';
import Badge from '../ui/Badge';
import { Truck, Clock, CheckCircle2, Navigation, PackageCheck, UserCheck } from 'lucide-react';

export default function DeliveryStatusBadge({ status, size = 'sm' }) {
  const config = {
    pending: {
      label: 'Waiting for Transport',
      variant: 'amber',
      icon: Clock,
      dot: true,
    },
    transport_requested: {
      label: 'Transport Requested',
      variant: 'amber',
      icon: Clock,
      dot: true,
    },
    assigned: {
      label: 'Transporter Assigned',
      variant: 'blue',
      icon: UserCheck,
      dot: true,
    },
    picked_up: {
      label: 'Produce Picked Up',
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
      label: 'Delivered (Awaiting Confirmation)',
      variant: 'teal',
      icon: Truck,
      dot: true,
    },
    completed: {
      label: 'Delivery Confirmed',
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
