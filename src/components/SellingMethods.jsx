import React from 'react';
import { Tag, Gavel, ArrowRight, Check } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';

export default function SellingMethods({ onExploreDirect, onExploreAuction }) {
  return (
    <section id="marketplace" className="py-20 bg-[#F8FAF8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <Badge variant="emerald" size="md">Trading Methods</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B3326] font-heading tracking-tight">
            Two Ways to Trade
          </h2>
          <p className="text-sm sm:text-base text-[#566861]">
            Sell at a fixed price or open your lot to competitive market bidding.
          </p>
        </div>

        {/* 2 Main Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
          
          {/* Card 1: Direct Sale */}
          <Card hoverEffect className="p-8 bg-white border border-[#E5EDE8] shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] flex items-center justify-center">
                  <Tag className="w-6 h-6 text-[#10B981]" />
                </div>
                <Badge variant="emerald" size="sm">
                  Fixed Price
                </Badge>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-[#0B3326] font-heading">
                  Direct Sale
                </h3>
                <p className="text-xs sm:text-sm text-[#566861] leading-relaxed">
                  Set your target price and sell directly to verified wholesale buyers with guaranteed escrow settlement.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E5EDE8] text-xs text-[#14211D]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Instant buyer matching at your fixed rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Zero commission deductions on sales</span>
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={onExploreDirect}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0B3326] hover:text-[#10B981] transition-colors cursor-pointer"
              >
                <span>Explore Direct Sales</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Card>

          {/* Card 2: Live Auction */}
          <Card hoverEffect className="p-8 bg-white border border-[#E5EDE8] shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#0B3326] flex items-center justify-center text-white">
                  <Gavel className="w-6 h-6 text-[#10B981]" />
                </div>
                <Badge variant="amber" size="sm" dot={true}>
                  Live Bidding
                </Badge>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-[#0B3326] font-heading">
                  Live Auction
                </h3>
                <p className="text-xs sm:text-sm text-[#566861] leading-relaxed">
                  Let verified buyers compete for your harvest lots in timed auctions with minimum reserve price protection.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E5EDE8] text-xs text-[#14211D]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Dynamic price discovery with reserve floor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Access to national bulk procurement buyers</span>
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={onExploreAuction}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0B3326] hover:text-[#10B981] transition-colors cursor-pointer"
              >
                <span>Explore Auctions</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Card>

        </div>

      </div>
    </section>
  );
}
