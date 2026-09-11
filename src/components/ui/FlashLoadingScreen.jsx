import React from 'react';
import logoImg from '../../assets/Logo.jpeg';

export default function FlashLoadingScreen({ 
  message = 'Loading Agrolnk...', 
  subMessage = 'Synchronizing verified exchange data...' 
}) {
  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#071F17]/95 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      role="status"
      aria-live="polite"
    >
      {/* Background Ambient Glow */}
      <div className="absolute w-80 h-80 rounded-full bg-[#10B981]/20 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#0B3326]/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-96 h-96 rounded-full bg-[#0B3326]/50 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-6 max-w-sm">
        
        {/* Glowing Logo Badge */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-3xl blur-md opacity-50 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-white p-2.5 shadow-2xl flex items-center justify-center border border-[#10B981]/30">
            <img
              src={logoImg}
              alt="Agrolnk Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Brand & Loading Indicator Message */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F4A37]/80 border border-[#14624A] text-[#34D399] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span>Agrolnk Decentralized Exchange</span>
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-white font-heading tracking-tight pt-1">
            {message}
          </h3>

          {subMessage && (
            <p className="text-xs text-[#DCFCE7]/75 font-medium">
              {subMessage}
            </p>
          )}
        </div>

        {/* Shimmering Progress Bar */}
        <div className="w-52 h-1.5 bg-[#0B3326] rounded-full overflow-hidden border border-[#14624A]/70 shadow-inner relative">
          <div className="h-full bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#10B981] rounded-full animate-pulse w-full" />
        </div>

      </div>
    </div>
  );
}
