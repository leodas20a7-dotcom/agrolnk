import React from 'react';
import logoImg from '../../assets/Logo.jpeg';

export default function FlashLoadingScreen({ message = 'Loading Agrolnk...' }) {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#071F17]/95 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
      {/* Background Ambient Glow */}
      <div className="absolute w-72 h-72 rounded-full bg-[#10B981]/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -top-10 -right-10 w-96 h-96 rounded-full bg-[#0B3326]/40 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-6 max-w-sm">
        {/* Glowing Logo Badge */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-3xl blur-md opacity-40 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-white p-2.5 shadow-2xl flex items-center justify-center border border-[#10B981]/30">
            <img
              src={logoImg}
              alt="Agrolnk"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Brand & Loading Indicator */}
        <div className="space-y-2">


          <h3 className="text-base sm:text-lg font-extrabold text-white font-heading tracking-tight">
            {message}
          </h3>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="w-48 h-1.5 bg-[#0B3326] rounded-full overflow-hidden border border-[#14624A]/60 shadow-inner relative">
          <div className="h-full bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#10B981] rounded-full animate-pulse w-full" />
        </div>

      </div>
    </div>
  );
}
