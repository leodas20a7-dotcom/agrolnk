import React from 'react';
import { Check, Truck, CheckCircle2, PackageCheck, Clock } from 'lucide-react';

export default function DeliveryTimeline({
  currentStatus = 'pending',
  delivery = {},
}) {
  const steps = [
    {
      id: 'ordered',
      label: 'Order Confirmed',
      sublabel: 'Escrow Secured',
      icon: PackageCheck,
      match: ['pending', 'order_placed', 'confirmed', 'transport_requested', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed'],
    },
    {
      id: 'in_transit',
      label: 'Dispatched & In Transit',
      sublabel: delivery.vehicleNumber ? `Vehicle: ${delivery.vehicleNumber}` : 'Carrier moving',
      icon: Truck,
      match: ['in_transit', 'delivered', 'completed'],
    },
    {
      id: 'delivered',
      label: 'Arrived at Destination',
      sublabel: 'Ready for receipt',
      icon: Clock,
      match: ['delivered', 'completed'],
    },
    {
      id: 'completed',
      label: 'Completed & Settled',
      sublabel: 'Escrow Released',
      icon: CheckCircle2,
      match: ['completed'],
    },
  ];

  // Determine which step is current
  let activeStepId = 'ordered';
  if (currentStatus === 'completed') activeStepId = 'completed';
  else if (currentStatus === 'delivered') activeStepId = 'delivered';
  else if (currentStatus === 'in_transit' || currentStatus === 'picked_up' || currentStatus === 'assigned' || currentStatus === 'ready_for_delivery') activeStepId = 'in_transit';
  else activeStepId = 'ordered';

  const stepKeys = ['ordered', 'in_transit', 'delivered', 'completed'];
  const activeIndex = stepKeys.indexOf(activeStepId);

  return (
    <div className="w-full py-1">
      <div className="grid grid-cols-4 gap-2 relative items-start text-center">
        {steps.map((step, idx) => {
          const isPassed = idx < activeIndex || currentStatus === 'completed';
          const isCurrent = idx === activeIndex && currentStatus !== 'completed';
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="relative flex flex-col items-center">
              {/* Desktop Connector Line */}
              {idx < steps.length - 1 && (
                <div
                  className={`absolute top-3.5 left-1/2 w-full h-1 -z-0 transition-all ${
                    idx < activeIndex ? 'bg-[#10B981]' : 'bg-[#E5EDE8]'
                  }`}
                />
              )}

              {/* Step Circle Badge */}
              <div
                className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shrink-0 ${
                  isPassed
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : isCurrent
                    ? 'bg-[#0B3326] text-white ring-4 ring-[#DCFCE7] shadow-sm animate-pulse'
                    : 'bg-white text-[#566861] border-2 border-[#E5EDE8]'
                }`}
              >
                {isPassed ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5]" />
                ) : (
                  <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? 'text-[#34D399]' : 'text-[#566861]'}`} />
                )}
              </div>

              {/* Step Label */}
              <div className="mt-1.5 space-y-0.5 px-0.5">
                <span
                  className={`block text-[11px] sm:text-xs font-bold leading-tight ${
                    isCurrent
                      ? 'text-[#0B3326]'
                      : isPassed
                      ? 'text-[#10B981]'
                      : 'text-[#566861]'
                  }`}
                >
                  {step.label}
                </span>
                <span className="block text-[9px] sm:text-[10px] text-[#566861] leading-tight line-clamp-1">
                  {step.sublabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
