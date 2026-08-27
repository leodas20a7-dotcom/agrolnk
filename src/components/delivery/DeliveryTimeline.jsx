import React from 'react';
import { Check, Clock, Truck, Package, MapPin, UserCheck, Navigation, CheckCircle2 } from 'lucide-react';

export default function DeliveryTimeline({
  currentStatus = 'transport_requested',
  delivery = {},
}) {
  const steps = [
    {
      id: 'transport_requested',
      label: 'Transport Requested',
      description: 'Dispatch manifest created by producer',
      icon: Clock,
      timestamp: delivery.createdAt,
    },
    {
      id: 'assigned',
      label: 'Transporter Assigned',
      description: delivery.transporterName ? `${delivery.transporterName}` : 'Driver & vehicle assigned',
      icon: UserCheck,
      timestamp: delivery.assignedAt,
    },
    {
      id: 'picked_up',
      label: 'Produce Picked Up',
      description: 'Loaded at origin farmgate/depot',
      icon: Package,
      timestamp: delivery.pickedUpAt,
    },
    {
      id: 'in_transit',
      label: 'In Transit',
      description: 'Moving along logistics corridor',
      icon: Navigation,
      timestamp: delivery.inTransitAt,
    },
    {
      id: 'delivered',
      label: 'Delivered',
      description: 'Arrived at buyer destination',
      icon: Truck,
      timestamp: delivery.deliveredAt,
    },
    {
      id: 'completed',
      label: 'Receipt Confirmed',
      description: 'Buyer verified batch delivery',
      icon: CheckCircle2,
      timestamp: delivery.confirmedAt,
    },
  ];

  const statusOrder = [
    'pending',
    'transport_requested',
    'assigned',
    'picked_up',
    'in_transit',
    'delivered',
    'completed',
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="w-full py-2">
      <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-6 sm:gap-2 relative">
        {steps.map((step, idx) => {
          const stepIndex = statusOrder.indexOf(step.id);
          const isPassed = currentIndex > stepIndex || (currentIndex === stepIndex && currentStatus === 'completed');
          const isCurrent = currentIndex === stepIndex && currentStatus !== 'completed';
          const isUpcoming = currentIndex < stepIndex;

          const StepIcon = step.icon;

          return (
            <div key={step.id} className="relative flex sm:flex-col items-start sm:items-center text-left sm:text-center group">
              {/* Connector line on desktop */}
              {idx < steps.length - 1 && (
                <div
                  className={`hidden sm:block absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors ${
                    isPassed ? 'bg-[#10B981]' : 'bg-[#E5EDE8]'
                  }`}
                />
              )}

              {/* Step Circle */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs shrink-0 ${
                  isPassed
                    ? 'bg-[#10B981] text-white ring-4 ring-[#EBF5F0]'
                    : isCurrent
                    ? 'bg-[#0B3326] text-white ring-4 ring-[#DCFCE7] animate-pulse'
                    : 'bg-white text-[#566861] border border-[#E5EDE8]'
                }`}
              >
                {isPassed ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? 'text-[#34D399]' : 'text-[#566861]'}`} />
                )}
              </div>

              {/* Content */}
              <div className="ml-3 sm:ml-0 sm:mt-2 sm:px-1 space-y-0.5">
                <span
                  className={`block text-xs font-bold leading-tight ${
                    isCurrent
                      ? 'text-[#0B3326]'
                      : isPassed
                      ? 'text-[#10B981]'
                      : 'text-[#566861]'
                  }`}
                >
                  {step.label}
                </span>
                <span className="block text-[10px] text-[#566861] leading-tight line-clamp-2">
                  {step.description}
                </span>
                {step.timestamp && (
                  <span className="block text-[9px] text-[#566861]/80 font-medium">
                    {new Date(step.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
