import React from 'react';
import { ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export default function InspectionStatusBadge({ status = 'requested', size = 'md' }) {
  const configs = {
    requested: {
      label: 'Inspection Requested',
      sublabel: 'Awaiting Inspector Dispatch',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Clock,
    },
    passed: {
      label: 'Assay Certified (Passed)',
      sublabel: 'Verified by Inspector',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
    },
    disputed: {
      label: 'Quality Discrepancy',
      sublabel: 'Assay Dispute',
      bg: 'bg-red-50 text-red-800 border-red-200',
      icon: AlertTriangle,
    },
    resolved: {
      label: 'Arbitrated & Settled',
      sublabel: 'Ombudsman Settled',
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: ShieldCheck,
    },
  };

  const config = configs[status] || configs.requested;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.bg}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
