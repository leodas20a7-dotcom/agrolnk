import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import Button from './ui/Button';

export default function MissionBanner({ onJoin }) {
  return (
    <section className="py-16 bg-[#F8FAF8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Clean Call To Action Box */}
        <div className="rounded-3xl bg-[#0B3326] text-white p-8 sm:p-12 lg:p-14 text-center space-y-6 border border-[#14624A] shadow-md">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0F4A37] border border-[#14624A] text-xs text-[#34D399] font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Start Trading Today
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-heading tracking-tight text-white leading-tight max-w-3xl mx-auto">
            From Farm to Market. <br className="hidden sm:inline" />
            <span className="text-[#34D399]">Fair, Direct & Transparent.</span>
          </h2>

          <p className="text-sm sm:text-base text-[#DCFCE7]/90 max-w-xl mx-auto">
            Join thousands of farmers and buyers transforming agricultural commerce across India.
          </p>

          <div className="pt-2 flex justify-center">
            <Button
              variant="accent"
              size="lg"
              onClick={onJoin}
              icon={ArrowRight}
              iconPosition="right"
              className="font-bold py-3.5 px-8 shadow-xs cursor-pointer text-sm sm:text-base"
            >
              Get Started with Agrolnk
            </Button>
          </div>

        </div>

      </div>
    </section>
  );
}
