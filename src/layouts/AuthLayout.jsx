import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import logoImg from '../assets/Logo.jpeg';

export default function AuthLayout({ children, onBack, title, subtitle }) {
  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        {onBack && (
          <div className="flex justify-start mb-4">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        )}

        {/* AGRAMAZ Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <img
            src={logoImg}
            alt="AGRAMAZ Logo"
            className="w-10 h-10 object-contain rounded-xl bg-white border border-[#E5EDE8] p-0.5 shadow-xs"
          />
          <span className="text-2xl font-extrabold tracking-tight text-[#0B3326] font-heading">
            AGRAMAZ
          </span>
        </div>

        {title && (
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="mt-1.5 text-xs sm:text-sm text-[#566861] max-w-sm mx-auto">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        {children}
      </div>

      <div className="mt-8 text-center flex items-center justify-center gap-1.5 text-xs text-[#566861]">
        <ShieldCheck className="w-4 h-4 text-[#10B981]" />
        <span>Protected by AGRAMAZ Trust & Escrow Architecture</span>
      </div>
    </div>
  );
}
