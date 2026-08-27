import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import EcosystemFlow from '../components/EcosystemFlow';
import SellingMethods from '../components/SellingMethods';
import Stakeholders from '../components/Stakeholders';
import MissionBanner from '../components/MissionBanner';
import Footer from '../components/Footer';

export default function Landing({ onNavigate }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-[#14211D]">
      {/* Sticky Header Navigation */}
      <Navbar onNavigate={onNavigate} />

      <main className="flex-1">
        {/* Step 5: Hero Section */}
        <HeroSection
          onExplore={() => {
            const el = document.getElementById('marketplace');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          onJoin={() => onNavigate('register')}
        />

        {/* Step 6: Visual Ecosystem */}
        <EcosystemFlow />

        {/* Step 7: Direct Sale & Live Auction */}
        <SellingMethods
          onExploreDirect={() => onNavigate('register')}
          onExploreAuction={() => onNavigate('register')}
        />

        {/* Step 8: Stakeholders Breakdown */}
        <Stakeholders
          onSelectRole={(role) => onNavigate('register', { initialRole: role })}
        />

        {/* Step 9: Mission & Core Value Pillars */}
        <MissionBanner onJoin={() => onNavigate('register')} />
      </main>

      {/* Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
