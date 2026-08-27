import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import Button from './ui/Button';
import logoImg from '../assets/Logo.jpeg';

export default function Navbar({ onNavigate }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Marketplace', href: '#marketplace' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'For Farmers', href: '#stakeholders' },
    { name: 'For Buyers', href: '#stakeholders' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'bg-[#F8FAF8] border-b border-[#E5EDE8] shadow-xs py-3.5'
          : 'bg-[#F8FAF8] py-4 border-b border-[#E5EDE8]/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo with Custom Logo.jpeg */}
          <a
            href="#"
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <img
              src={logoImg}
              alt="AGRAMAZ Logo"
              className="w-10 h-10 object-contain rounded-xl bg-white border border-[#E5EDE8] p-0.5 shadow-xs"
            />
            <div className="flex flex-col text-left">
              <span className="text-xl font-extrabold tracking-tight text-[#0B3326] font-heading leading-tight">
                AGRAMAZ
              </span>
              <span className="text-[10px] font-semibold text-[#10B981] uppercase tracking-widest">
                Agri Exchange
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white px-4 py-1.5 rounded-full border border-[#E5EDE8] shadow-xs">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-[#566861] hover:text-[#0B3326] px-3.5 py-1.5 rounded-full hover:bg-[#F2FBF6] transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('login')}
              className="text-[#0B3326] font-semibold cursor-pointer"
            >
              Login
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => onNavigate?.('register')}
              className="cursor-pointer"
            >
              Join AGRAMAZ
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#0B3326] hover:bg-[#EBF5F0] transition-colors focus:outline-none"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E5EDE8] px-4 pt-3 pb-6 space-y-3 shadow-lg text-left">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-[#14211D] hover:text-[#0B3326] hover:bg-[#F2FBF6] px-4 py-2.5 rounded-xl transition-all"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E5EDE8] flex flex-col gap-2.5">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate?.('login');
              }}
            >
              Login
            </Button>
            <Button
              variant="primary"
              className="w-full justify-center"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate?.('register');
              }}
            >
              Join AGRAMAZ
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
