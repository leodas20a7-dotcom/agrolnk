import React from 'react';
import { Check, Clock, Truck, ShieldCheck, PackageCheck, PhoneCall, AlertCircle } from 'lucide-react';

export default function OrderTimeline({ currentStatus = 'pending', className = '', escrowStatus, isAuction }) {
  const isFunded = escrowStatus === 'funded' && !isAuction;
  const steps = [
    {
      id: 'order_placed',
      title: isFunded ? 'Order Placed (Escrow Funded)' : 'Order Confirmed',
      desc: isFunded
        ? 'Buyer deposited 100% trade funds into RBI Nodal Escrow Trust'
        : 'Trade order confirmed and registered in AgroLnk ledger',
      icon: Clock,
    },
    {
      id: 'in_transit',
      title: 'Dispatched & In Transit',
      desc: 'Carrier picked up produce; live freight manifest tracked',
      icon: Truck,
    },
    {
      id: 'delivered',
      title: 'Consignment Arrived',
      desc: 'Produce delivered at buyer facility awaiting inspection',
      icon: PackageCheck,
    },
    {
      id: 'admin_verification',
      title: 'Admin Buyer Call & Quality Audit',
      desc: 'AgroLnk operations calls buyer to verify satisfaction & weight slips',
      icon: PhoneCall,
    },
    {
      id: 'completed',
      title: 'Settled & Bank Disbursed',
      desc: 'Admin released escrow: Instant payout credited to farmer bank account with UTR',
      icon: ShieldCheck,
    },
  ];

  const statusOrder = ['order_placed', 'in_transit', 'delivered', 'admin_verification', 'completed'];
  let mappedStatus = currentStatus === 'pending' ? 'order_placed' : currentStatus;
  if (mappedStatus === 'delivered') {
    mappedStatus = 'admin_verification';
  }
  const currentIndex = Math.max(0, statusOrder.indexOf(mappedStatus));
  const isAllCompleted = currentStatus === 'completed';

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isPassed = isAllCompleted || index <= currentIndex;
          const isDone = isAllCompleted || index < currentIndex;
          const isCurrent = !isAllCompleted && index === currentIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="relative flex items-start gap-4 group">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-4 top-8 -bottom-3 w-0.5 transition-colors ${
                    isAllCompleted || index < currentIndex ? 'bg-[#10B981]' : 'bg-[#E5EDE8]'
                  }`}
                />
              )}

              {/* Step Circle Indicator */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                  isDone
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : isCurrent
                    ? 'bg-[#0B3326] text-white ring-4 ring-[#10B981]/20 shadow-xs'
                    : 'bg-[#F8FAF8] border-2 border-[#E5EDE8] text-[#566861]'
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      isPassed ? 'text-[#0B3326]' : 'text-[#566861]'
                    }`}
                  >
                    {step.title}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#10B981] font-bold uppercase tracking-wider animate-pulse">
                      Active Step
                    </span>
                  )}
                  {isAllCompleted && index === steps.length - 1 && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#10B981] font-bold uppercase tracking-wider">
                      ✓ Fulfilled
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#566861] mt-0.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
