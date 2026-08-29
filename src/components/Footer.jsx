import React from 'react';
import { ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import logoImg from '../assets/Logo.jpeg';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-[#061B14] text-white border-t border-[#0F4A37] pt-16 pb-12 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <img
                src={logoImg}
                alt="Agrolnk Logo"
                className="w-10 h-10 object-contain rounded-xl bg-white p-0.5 shadow-xs"
              />
              <div>
                <span className="text-xl font-bold tracking-tight text-white font-heading">
                  Agrolnk
                </span>
                <span className="block text-[10px] font-semibold text-[#10B981] uppercase tracking-widest">
                  Agricultural Digital Exchange
                </span>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed max-w-sm">
              Empowering farmers, buyers, and financial partners with a high-trust digital marketplace for direct trade and live auctions.
            </p>

            <div className="flex items-center gap-2 text-xs text-[#34D399] font-medium pt-2">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>NABL Assayed & Escrow Protected Trading</span>
            </div>
          </div>

          {/* Col 2: Marketplace */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#34D399]">Marketplace</h4>
            <ul className="space-y-2 text-xs text-white/70">
              <li><a href="#marketplace" className="hover:text-white transition-colors">Direct Sales</a></li>
              <li><a href="#marketplace" className="hover:text-white transition-colors">Live Auctions</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Quality Assay Reports</a></li>
            </ul>
          </div>

          {/* Col 3: Stakeholders */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#34D399]">Stakeholders</h4>
            <ul className="space-y-2 text-xs text-white/70">
              <li><a href="#stakeholders" className="hover:text-white transition-colors">For Farmers & FPOs</a></li>
              <li><a href="#stakeholders" className="hover:text-white transition-colors">For Commodity Buyers</a></li>
              <li><a href="#stakeholders" className="hover:text-white transition-colors">For Financial Institutions</a></li>
            </ul>
          </div>

          {/* Col 4: Platform & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#34D399]">Platform</h4>
            <ul className="space-y-2 text-xs text-white/70">
              <li><button onClick={() => onNavigate?.('login')} className="hover:text-white transition-colors text-left cursor-pointer">Sign In</button></li>
              <li><button onClick={() => onNavigate?.('register')} className="hover:text-white transition-colors text-left cursor-pointer">Create Account</button></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Trust & Escrow Policy</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Status */}
        <div className="pt-8 border-t border-[#14624A]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Agrolnk Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-white/70">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" /> All Systems Operational
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
