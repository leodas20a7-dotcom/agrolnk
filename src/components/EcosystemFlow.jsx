import React from 'react';
import { Sprout, ShoppingBag, Landmark, ArrowRight, ShieldCheck } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';

export default function EcosystemFlow() {
  const steps = [
    {
      step: '1',
      title: 'Farmer Lists Produce',
      desc: 'Set target price or launch a live auction with verified assay grading.',
      icon: Sprout,
    },
    {
      step: '2',
      title: 'Buyer Discovers & Buys',
      desc: 'Compare lots, lock prices, and deposit payments securely into escrow.',
      icon: ShoppingBag,
    },
    {
      step: '3',
      title: 'Verified Fulfillment',
      desc: 'Track dispatch, verify quality on delivery, and release instant payouts.',
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white border-y border-[#E5EDE8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <Badge variant="emerald" size="md">How It Works</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B3326] font-heading tracking-tight">
            Simple, Transparent Agricultural Trade
          </h2>
          <p className="text-sm sm:text-base text-[#566861]">
            A direct digital journey connecting harvest origin to verified market buyers.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.step}
                hoverEffect
                className="p-7 bg-[#F8FAF8] border border-[#E5EDE8] text-left space-y-4 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#10B981]" />
                  </div>
                  <span className="text-xs font-bold text-[#566861] bg-white px-2.5 py-1 rounded-full border border-[#E5EDE8]">
                    Step {item.step}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#566861] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

      </div>
    </section>
  );
}
