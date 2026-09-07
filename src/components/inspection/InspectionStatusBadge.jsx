import React from 'react';
import Badge from '../ui/Badge';
import { ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export default function InspectionStatusBadge({ status = 'pending', size = 'sm' }) {
  switch (status) {
    case 'passed':
    case 'approved':
      return (
        <Badge variant="emerald" size={size} dot={false}>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Assay Verified (Passed)
          </span>
        </Badge>
      );
    case 'disputed':
    case 'rejected_dispute':
      return (
        <Badge variant="amber" size={size} dot={true}>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Inspection Disputed
          </span>
        </Badge>
      );
    case 'settled_refund':
    case 'resolved_released':
      return (
        <Badge variant="dark" size={size}>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Arbitrated by Admin
          </span>
        </Badge>
      );
    case 'pending':
    case 'pending_inspection':
    default:
      return (
        <Badge variant="amber" size={size} dot={true}>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting Buyer Inspection
          </span>
        </Badge>
      );
  }
}
