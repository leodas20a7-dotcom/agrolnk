import React from 'react';
import { Tag, Gavel, CheckCircle2 } from 'lucide-react';
import Badge from '../ui/Badge';

export default function SaleMethodCard({ selectedMethod, onSelect }) {
  const methods = [
    {
      id: 'direct',
      title: 'Direct Sale',
      tagline: 'Set your price and sell directly to buyers.',
      description: 'Fixed-price trading for quick and predictable transactions. Lock in guaranteed rates per kg/quintal.',
      icon: Tag,
      badge: 'Immediate Lock',
      badgeVariant: 'emerald',
      status: 'Fully Available',
    },
    {
      id: 'auction',
      title: 'Live Auction',
      tagline: 'Let verified buyers compete for your produce.',
      description: 'Time-bound dynamic bidding. Maximize price realization for high-demand bulk lots.',
      icon: Gavel,
      badge: 'Competitive Bidding',
      badgeVariant: 'amber',
      status: 'Preview Mode',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {methods.map((method) => {
        const Icon = method.icon;
        const isSelected = selectedMethod === method.id;

        return (
          <div
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={`p-6 sm:p-7 rounded-3xl cursor-pointer transition-all duration-200 border-2 bg-white flex flex-col justify-between group ${
              isSelected
                ? 'border-[#10B981] shadow-lg ring-4 ring-[#10B981]/15 bg-[#F2FBF6]/30 -translate-y-0.5'
                : 'border-[#E5EDE8] hover:border-[#10B981]/50 hover:shadow-md'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={method.badgeVariant} size="sm">
                  {method.badge}
                </Badge>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#10B981] border-[#10B981] text-white shadow-xs'
                      : 'border-[#E5EDE8] bg-white group-hover:border-[#10B981]/50'
                  }`}
                >
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-white stroke-[2.5]" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-[#E5EDE8]" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                    method.id === 'direct' ? 'bg-[#0B3326]' : 'bg-[#0F4A37]'
                  }`}
                >
                  <Icon className="w-6 h-6 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0B3326] font-heading">
                    {method.title}
                  </h3>
                  <span className="text-xs font-semibold text-[#10B981]">
                    {method.status}
                  </span>
                </div>
              </div>

              <p className="text-xs font-bold text-[#0B3326]">
                "{method.tagline}"
              </p>

              <p className="text-xs text-[#566861] leading-relaxed">
                {method.description}
              </p>
            </div>

            <div className="pt-5">
              <div
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-colors ${
                  isSelected
                    ? 'bg-[#10B981] text-white'
                    : 'bg-[#F8FAF8] text-[#566861] group-hover:bg-[#EBF5F0] group-hover:text-[#0B3326]'
                }`}
              >
                {isSelected ? '✓ Selected Method' : `Choose ${method.title}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
