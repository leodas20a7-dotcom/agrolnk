import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  ArrowLeft,
  Shield,
  User,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  ShoppingBag,
  Gavel,
  Package,
  Landmark,
  CreditCard,
  Compass,
  Truck,
  Building2,
  Award,
  Tag,
  Sparkles,
  FileText,
  PieChart,
  Receipt,
  Menu,
  X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { logoutUser } from '../utils/auth';
import logoImg from '../assets/Logo.jpeg';

export default function DashboardLayout({
  children,
  currentUser,
  onNavigate,
  currentPage,
}) {
  const user = currentUser || {
    name: 'Sakthi Vel',
    email: 'farmer@agrolnk.com',
    role: 'farmer',
  };

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    logoutUser();
    onNavigate('landing');
  };

  const roleColors = {
    farmer: {
      badge: 'emerald',
      title: 'Farmer Desk',
    },
    buyer: {
      badge: 'blue',
      title: 'Buyer Terminal',
    },
    financier: {
      badge: 'amber',
      title: 'Financial Institution',
    },
    transporter: {
      badge: 'purple',
      title: 'Transporter Desk',
    },
    warehouse: {
      badge: 'emerald',
      title: 'Warehouse Desk',
    },
  };

  const currentRoleConfig = roleColors[user.role] || roleColors.farmer;

  // Grouped 4-pillar clean navigation
  const farmerNavGroups = [
    {
      type: 'single',
      label: 'Dashboard',
      page: 'farmer-dashboard',
      icon: LayoutDashboard,
    },
    {
      type: 'dropdown',
      id: 'trading',
      label: 'Trading Desk',
      icon: Package,
      items: [
        {
          label: 'Direct Listings',
          page: 'farmer-my-listings',
          icon: Tag,
          desc: 'Fixed-price produce catalog',
        },
        {
          label: 'Digital Auctions',
          page: 'farmer-my-auctions',
          icon: Gavel,
          desc: 'Live competitive clock lots',
        },
      ],
    },
    {
      type: 'dropdown',
      id: 'fulfillment',
      label: 'Fulfillment',
      icon: Truck,
      items: [
        {
          label: 'Orders Received',
          page: 'farmer-orders',
          icon: ShoppingBag,
          desc: 'Buyer contracts & agreements',
        },
        {
          label: 'Deliveries & Dispatch',
          page: 'farmer-deliveries',
          icon: Truck,
          desc: 'Farmgate carrier logistics',
        },
      ],
    },
    {
      type: 'dropdown',
      id: 'services',
      label: 'Services & Vault',
      icon: Landmark,
      items: [
        {
          label: 'Trade Financing',
          page: 'farmer-financing',
          icon: Landmark,
          desc: 'Instant working capital advance',
        },
        {
          label: 'Warehouse & e-NWR',
          page: 'farmer-inventory',
          icon: Building2,
          desc: 'WDRA certified storage receipts',
        },
      ],
    },
  ];

  const buyerNavGroups = [
    {
      type: 'single',
      label: 'Dashboard',
      page: 'buyer-dashboard',
      icon: LayoutDashboard,
    },
    {
      type: 'dropdown',
      id: 'sourcing',
      label: 'Sourcing',
      icon: Compass,
      items: [
        {
          label: 'Direct Marketplace',
          page: 'buyer-marketplace',
          icon: Compass,
          desc: 'Fixed-price produce lots',
        },
        {
          label: 'Live Clock Auctions',
          page: 'buyer-live-auctions',
          icon: Gavel,
          desc: 'Real-time bidding rooms',
        },
        {
          label: 'My Bids',
          page: 'buyer-my-bids',
          icon: ShoppingBag,
          desc: 'Active auction bid tracking',
        },
      ],
    },
    {
      type: 'dropdown',
      id: 'logistics',
      label: 'Orders & Dispatch',
      icon: Truck,
      items: [
        {
          label: 'Procurement Orders',
          page: 'buyer-orders',
          icon: ShoppingBag,
          desc: 'Agreements & escrow tracking',
        },
        {
          label: 'Inbound Deliveries',
          page: 'buyer-deliveries',
          icon: Truck,
          desc: 'Live physical consignment tracking',
        },
      ],
    },
    {
      type: 'single',
      label: 'Trade Credit',
      page: 'buyer-financing',
      icon: CreditCard,
    },
  ];

  const financierNavGroups = [
    {
      type: 'single',
      label: 'Executive Desk',
      page: 'financier-dashboard',
      icon: LayoutDashboard,
    },
    {
      type: 'dropdown',
      id: 'credit-desk',
      label: 'Credit Operations',
      icon: Landmark,
      items: [
        {
          label: 'Underwriting Queue',
          page: 'financier-underwriting',
          icon: FileText,
          desc: 'Evaluate & approve loan requests',
        },
        {
          label: 'Active Credit Portfolio',
          page: 'financier-portfolio',
          icon: PieChart,
          desc: 'Live loans & repayment tracking',
        },
      ],
    },
    {
      type: 'dropdown',
      id: 'vault-ledger',
      label: 'Vault & Settlements',
      icon: Shield,
      items: [
        {
          label: 'Collateral & e-NWR Vault',
          page: 'financier-collateral-vault',
          icon: Building2,
          desc: 'WDRA receipts & escrow liens',
        },
        {
          label: 'Disbursements & Yields',
          page: 'financier-disbursements',
          icon: Receipt,
          desc: 'Payout ledger & interest returns',
        },
      ],
    },
  ];

  const getNavGroups = () => {
    if (user.role === 'buyer') return buyerNavGroups;
    if (user.role === 'farmer') return farmerNavGroups;
    if (user.role === 'financier') return financierNavGroups;
    return [];
  };

  const navGroups = getNavGroups();

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#E5EDE8] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            
            {/* 1. Left: Brand Logo & Desk Indicator */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onNavigate('landing')}
                className="flex items-center gap-2.5 group focus:outline-none cursor-pointer"
              >
                <img
                  src={logoImg}
                  alt="Agrolnk Logo"
                  className="w-9 h-9 object-contain rounded-xl bg-white border border-[#E5EDE8] p-0.5 shadow-xs"
                />
                <div className="text-left">
                  <span className="text-lg font-bold text-[#0B3326] font-heading leading-none block">
                    Agrolnk
                  </span>
                  <span className="text-[10px] text-[#10B981] font-semibold uppercase tracking-wider block mt-0.5">
                    {currentRoleConfig.title}
                  </span>
                </div>
              </button>
            </div>

            {/* 2. Center: Grouped Modern Dropdown Navigation */}
            <nav ref={navRef} className="hidden lg:flex items-center gap-1.5">
              {navGroups.map((group, idx) => {
                if (group.type === 'single') {
                  const Icon = group.icon;
                  return (
                    <button
                      key={group.page || idx}
                      onClick={() => onNavigate(group.page)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#566861] hover:text-[#0B3326] hover:bg-[#F2FBF6] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>{group.label}</span>
                    </button>
                  );
                }

                // Dropdown menu
                const GroupIcon = group.icon;
                const isOpen = activeDropdown === group.id;

                return (
                  <div key={group.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(isOpen ? null : group.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isOpen
                          ? 'bg-[#0B3326] text-white shadow-xs'
                          : 'text-[#566861] hover:text-[#0B3326] hover:bg-[#F2FBF6]'
                      }`}
                    >
                      <GroupIcon className={`w-3.5 h-3.5 ${isOpen ? 'text-[#34D399]' : 'text-[#10B981]'}`} />
                      <span>{group.label}</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-white' : 'text-[#566861]'
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Popup */}
                    {isOpen && (
                      <div className="absolute top-full left-0 mt-2 w-64 p-2 rounded-2xl bg-white border border-[#E5EDE8] shadow-xl space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
                        {group.items.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <button
                              key={subItem.page}
                              type="button"
                              onClick={() => {
                                setActiveDropdown(null);
                                onNavigate(subItem.page);
                              }}
                              className="w-full p-2.5 rounded-xl hover:bg-[#F2FBF6] transition-colors flex items-start gap-2.5 text-left cursor-pointer group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#0B3326] group-hover:text-white transition-colors">
                                <SubIcon className="w-3.5 h-3.5 text-[#10B981] group-hover:text-[#34D399]" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-[#14211D] group-hover:text-[#0B3326] block">
                                  {subItem.label}
                                </span>
                                <span className="text-[10px] text-[#566861] block leading-tight">
                                  {subItem.desc}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* 3. Right: Role Pill, User Avatar & Sign Out */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Role Badge */}
              <Badge variant={currentRoleConfig.badge} size="sm" dot={true}>
                <span className="capitalize font-bold">{user.role}</span>
              </Badge>

              {/* User Avatar & Name */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E5EDE8]">
                <div className="w-8 h-8 rounded-full bg-[#0B3326] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left leading-tight hidden xl:block">
                  <span className="block text-xs font-bold text-[#14211D]">
                    {user.name || 'User'}
                  </span>
                  <span className="block text-[10px] text-[#566861]">
                    {user.email}
                  </span>
                </div>
              </div>

              {/* Sign Out */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                icon={LogOut}
                iconPosition="right"
                className="text-xs text-[#566861] hover:text-[#0B3326] cursor-pointer"
              >
                <span className="hidden sm:inline">Sign Out</span>
              </Button>

              {/* Mobile Menu Toggle Button (only when subnav groups exist) */}
              {navGroups.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] cursor-pointer"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>

          </div>

          {/* Mobile Drawer Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-[#E5EDE8] space-y-3 text-left">
              {navGroups.map((group, idx) => {
                if (group.type === 'single') {
                  const Icon = group.icon;
                  return (
                    <button
                      key={group.page || idx}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigate(group.page);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold text-[#14211D] hover:bg-[#F2FBF6] flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4 text-[#10B981]" />
                      <span>{group.label}</span>
                    </button>
                  );
                }

                return (
                  <div key={group.id} className="space-y-1">
                    <span className="px-3 text-[10px] font-bold text-[#566861] uppercase tracking-wider block">
                      {group.label}
                    </span>
                    <div className="space-y-0.5 pl-2">
                      {group.items.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <button
                            key={subItem.page}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              onNavigate(subItem.page);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold text-[#14211D] hover:bg-[#F2FBF6] flex items-center gap-2"
                          >
                            <SubIcon className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </header>

      {/* Main Page Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Modern Compact Footer */}
      <footer className="border-t border-[#E5EDE8] bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#566861]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0B3326]">Agrolnk</span>
            <span className="hidden sm:inline">• Fairer, Direct Agricultural Exchange</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#10B981] font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>100% Escrow <span className="hidden sm:inline">& Bank Grade Security</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
