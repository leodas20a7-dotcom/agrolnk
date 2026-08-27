import React from 'react';
import { Sprout, ShoppingCart, Landmark, ArrowRight } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';

export default function Stakeholders({ onSelectRole }) {
  const stakeholders = [
    {
      id: 'farmer',
      title: 'Farmers & FPOs',
      role: 'Sell Produce',
      icon: Sprout,
      color: '#10B981',
      bgLight: '#EBF5F0',
      description: 'List harvest lots, set your reserve price, and reach buyers nationwide with guaranteed payouts.',
    },
    {
      id: 'buyer',
      title: 'Buyers & Traders',
      role: 'Discover & Buy',
      icon: ShoppingCart,
      color: '#0B3326',
      bgLight: '#F2FBF6',
      description: 'Discover quality produce, compare lots, and trade directly with lab-assayed quality assurance.',
    },
    {
      id: 'financier',
      title: 'Financiers & Banks',
      role: 'Deploy Capital',
      icon: Landmark,
      color: '#1E40AF',
      bgLight: '#EFF6FF',
      description: 'Finance verified trade invoices and escrow transactions with institutional risk protection.',
    },
  ];

  return (
    <section id="stakeholders" className="py-20 bg-white border-t border-[#E5EDE8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <Badge variant="emerald" size="md">Marketplace Roles</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B3326] font-heading tracking-tight">
            Built for Every Participant
          </h2>
          <p className="text-sm sm:text-base text-[#566861]">
            Choose your role and start trading in a transparent agricultural ecosystem.
          </p>
        </div>

        {/* 3 Stakeholders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
          {stakeholders.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                hoverEffect
                className="p-7 bg-[#F8FAF8] border border-[#E5EDE8] flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xs"
                      style={{ backgroundColor: item.bgLight, color: item.color }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#566861] bg-white px-2.5 py-1 rounded-full border border-[#E5EDE8]">
                      {item.role}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#566861] mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => onSelectRole?.(item.id)}
                    className="text-xs font-bold text-[#0B3326] hover:text-[#10B981] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    Join as {item.title.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

      </div>
    </section>
  );
}
