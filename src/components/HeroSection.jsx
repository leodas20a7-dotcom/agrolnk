import React from 'react';
import { ArrowRight, MapPin, TrendingUp, ShieldCheck } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';

export default function HeroSection({ onExplore, onJoin }) {
  return (
    <section className="relative pt-20 pb-12 md:pt-24 md:pb-16 bg-[#F8FAF8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          
          {/* Left Column: Clean Copy & Action */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center">
              <Badge variant="emerald" size="lg" dot={true}>
                Agricultural Marketplace
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0B3326] font-heading leading-[1.12]">
                A Fairer Marketplace <br className="hidden sm:inline" />
                <span className="text-[#10B981]">for Agriculture.</span>
              </h1>
              
              <p className="text-sm sm:text-lg text-[#566861] font-normal leading-relaxed max-w-xl">
                Trade produce directly without middlemen. Transparent pricing, verified quality, and secure escrow.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-1">
              <Button
                variant="primary"
                size="lg"
                onClick={onJoin}
                icon={ArrowRight}
                iconPosition="right"
                className="shadow-xs font-bold text-sm sm:text-base py-3 sm:py-3.5 px-6 sm:px-7 cursor-pointer"
              >
                Join Agrolnk
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={onExplore}
                className="font-bold text-sm sm:text-base py-3 sm:py-3.5 px-6 sm:px-7 cursor-pointer"
              >
                Explore Marketplace
              </Button>
            </div>

            {/* Clean Trust Metrics */}
            <div className="pt-5 sm:pt-6 border-t border-[#E5EDE8] grid grid-cols-3 gap-4 sm:gap-6 max-w-lg">
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#0B3326] font-heading">₹0</div>
                <div className="text-[11px] sm:text-xs text-[#566861] mt-0.5">Commission</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#0B3326] font-heading">100%</div>
                <div className="text-[11px] sm:text-xs text-[#566861] mt-0.5">Escrow Secured</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-[#0B3326] font-heading">Direct</div>
                <div className="text-[11px] sm:text-xs text-[#566861] mt-0.5">
                  <span className="sm:hidden">Payouts</span>
                  <span className="hidden sm:inline">Trade Realization</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Sample Lot Card */}
          <div className="lg:col-span-5">
            <Card className="p-6 sm:p-7 bg-white border border-[#E5EDE8] shadow-md space-y-5 text-left">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] flex items-center justify-center text-xl">
                    🌾
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#14211D]">Sharbati Wheat</h3>
                    <p className="text-xs text-[#566861] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#10B981]" /> Sehore, Madhya Pradesh
                    </p>
                  </div>
                </div>
                <Badge variant="dark" size="sm">Grade A</Badge>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#566861] block font-medium">Available Lot</span>
                  <span className="text-sm font-bold text-[#14211D]">45.0 MT</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#566861] block font-medium">Quality Rating</span>
                  <span className="text-sm font-bold text-[#10B981]">Lab Assayed ✓</span>
                </div>
              </div>

              {/* Price Banner */}
              <div className="p-4 rounded-2xl bg-[#0B3326] text-white flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#DCFCE7]/80 block">Direct Sale Price</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-heading text-white">₹2,850</span>
                    <span className="text-xs text-white/70">/ Quintal</span>
                  </div>
                </div>
                <Badge variant="accent" size="sm">
                  Instant Lock
                </Badge>
              </div>

              {/* Escrow Note */}
              <div className="flex items-center gap-2 text-xs text-[#566861] pt-1">
                <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>100% Escrow protected trade</span>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </section>
  );
}
