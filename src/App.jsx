import React, { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import RoleSelection from './pages/RoleSelection';
import Register from './pages/Register';
import Login from './pages/Login';

// Farmer Experience Module Pages
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import CreateListing from './pages/farmer/CreateListing';
import ListingPreview from './pages/farmer/ListingPreview';
import MyListings from './pages/farmer/MyListings';
import FarmerOrders from './pages/farmer/FarmerOrders';
import CreateAuction from './pages/farmer/CreateAuction';
import MyAuctions from './pages/farmer/MyAuctions';
import FarmerFinancing from './pages/farmer/FarmerFinancing';
import FarmerDeliveries from './pages/farmer/FarmerDeliveries';
import FarmerInventory from './pages/farmer/FarmerInventory';

// Buyer Marketplace Module Pages
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import Marketplace from './pages/buyer/Marketplace';
import ListingDetail from './pages/buyer/ListingDetail';
import BuyerOrders from './pages/buyer/BuyerOrders';
import LiveAuctions from './pages/buyer/LiveAuctions';
import MyBids from './pages/buyer/MyBids';
import BuyerFinancing from './pages/buyer/BuyerFinancing';
import BuyerDeliveries from './pages/buyer/BuyerDeliveries';

// Shared Auction Room Page
import AuctionRoom from './pages/auction/AuctionRoom';

// Financier Portal Experience Pages
import FinancierDashboard from './pages/dashboards/FinancierDashboard';
import UnderwritingDesk from './pages/financier/UnderwritingDesk';
import FinancierPortfolio from './pages/financier/FinancierPortfolio';
import CollateralVault from './pages/financier/CollateralVault';
import DisbursementsLedger from './pages/financier/DisbursementsLedger';

// Transporter Dashboard
import TransporterDashboard from './pages/transporter/TransporterDashboard';

// Warehouse Dashboard
import WarehouseDashboard from './pages/warehouse/WarehouseDashboard';

import ProtectedRoute from './components/ProtectedRoute';
import FlashLoadingScreen from './components/ui/FlashLoadingScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { getCurrentUser } from './utils/auth';

const PUBLIC_PAGES = new Set(['landing', 'role-selection', 'register', 'login']);

const VALID_ROUTES = new Set([
  'landing',
  'role-selection',
  'register',
  'login',
  // Farmer
  'farmer-dashboard',
  'farmer-create-listing',
  'farmer-preview-listing',
  'farmer-my-listings',
  'farmer-orders',
  'farmer-create-auction',
  'farmer-my-auctions',
  'farmer-financing',
  'farmer-deliveries',
  'farmer-inventory',
  // Buyer
  'buyer-dashboard',
  'buyer-marketplace',
  'buyer-listing-detail',
  'buyer-orders',
  'buyer-live-auctions',
  'buyer-my-bids',
  'buyer-financing',
  'buyer-deliveries',
  // Shared
  'auction-room',
  // Financier
  'financier-dashboard',
  'financier-underwriting',
  'financier-portfolio',
  'financier-collateral-vault',
  'financier-disbursements',
  // Transporter
  'transporter-dashboard',
  // Warehouse
  'warehouse-dashboard',
]);

/**
 * Strips #, queries, and trailing slashes from raw hash
 */
export function sanitizeRoute(rawHash) {
  if (!rawHash) return '';
  let clean = rawHash.replace(/^#+\/?/, '').trim();
  clean = clean.split('?')[0].split('#')[0].replace(/\/+$/, '').trim();
  return clean;
}

/**
 * Resolves a route or shortcut/alias to a known valid route
 */
export function resolveRoute(rawRoute, user) {
  const clean = sanitizeRoute(rawRoute);
  const currentRole = user?.role || 'farmer';

  if (!clean) {
    return user ? `${currentRole}-dashboard` : 'landing';
  }

  // Handle common aliases and shortcuts
  if (clean === 'dashboard') {
    return user ? `${currentRole}-dashboard` : 'login';
  }
  if (clean === 'orders') {
    return user ? `${currentRole}-orders` : 'login';
  }
  if (clean === 'financing') {
    return user ? `${currentRole}-financing` : 'login';
  }
  if (clean === 'deliveries') {
    return user ? `${currentRole}-deliveries` : 'login';
  }
  if (clean === 'inventory') {
    return 'farmer-inventory';
  }
  if (clean === 'marketplace') {
    return 'buyer-marketplace';
  }
  if (clean === 'auctions') {
    return user?.role === 'farmer' ? 'farmer-my-auctions' : 'buyer-live-auctions';
  }

  if (VALID_ROUTES.has(clean)) {
    if (PUBLIC_PAGES.has(clean)) {
      if (user?.role && clean === 'landing') {
        return `${user.role}-dashboard`;
      }
      return clean;
    }
    // Protected page
    if (user) {
      return clean;
    }
    return 'login';
  }

  // Fallback for unknown routes
  return user ? `${currentRole}-dashboard` : 'landing';
}

function getInitialPage() {
  const user = getCurrentUser();
  return resolveRoute(window.location.hash, user);
}

const PAGE_MESSAGES = {
  'buyer-marketplace': 'Loading Agricultural Marketplace...',
  'live-auctions': 'Connecting to Real-time Auction Floor...',
  'auction-room': 'Entering Live Auction Arena...',
  'farmer-orders': 'Retrieving Escrow Contracts & Orders...',
  'buyer-orders': 'Retrieving Procurement Orders...',
  'farmer-dashboard': 'Syncing Farmer Desk...',
  'buyer-dashboard': 'Syncing Buyer Terminal...',
  'financier-dashboard': 'Loading Capital & Liquidity Vault...',
  'warehouse-dashboard': 'Accessing e-NWR Warehousing Network...',
  'transporter-dashboard': 'Syncing Logistics & Corridor Dispatch...',
  'create-listing': 'Initializing Lot Assay Form...',
  'farmer-financing': 'Loading Working Capital Facilities...',
  'farmer-deliveries': 'Loading Active Dispatch Schedules...',
  'farmer-inventory': 'Connecting to WDRA e-NWR Vault...',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [currentPage, setCurrentPage] = useState(() => getInitialPage());
  const [navState, setNavState] = useState({});
  const [isFlashLoading, setIsFlashLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Synchronizing Agrolnk...');

  // Initial app load flash curtain to hide blank flashes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlashLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const triggerFlashTransition = (targetPage) => {
    const msg = PAGE_MESSAGES[targetPage] || 'Loading Agrolnk...';
    setLoadingMessage(msg);
    setIsFlashLoading(true);
    setTimeout(() => {
      setIsFlashLoading(false);
    }, 280);
  };

  const handleNavigate = (page, state = {}, replace = false) => {
    const user = getCurrentUser() || currentUser;
    const resolvedPage = resolveRoute(page, user);

    triggerFlashTransition(resolvedPage);
    setCurrentPage(resolvedPage);
    setNavState(state || {});
    if (state?.user) {
      setCurrentUser(state.user);
    } else if (user) {
      setCurrentUser(user);
    }

    const newHash = `#/${resolvedPage}`;
    if (window.location.hash !== newHash) {
      if (replace) {
        window.location.replace(newHash);
      } else {
        window.location.hash = newHash;
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const user = getCurrentUser();
      setCurrentUser(user);

      const resolved = resolveRoute(window.location.hash, user);
      triggerFlashTransition(resolved);
      setCurrentPage(resolved);

      const targetHash = `#/${resolved}`;
      if (window.location.hash !== targetHash) {
        window.location.replace(targetHash);
      }
    };

    // Ensure clean valid hash on initial mount
    const initial = getInitialPage();
    const expectedHash = `#/${initial}`;
    if (window.location.hash !== expectedHash) {
      window.location.replace(expectedHash);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F8FAF8] text-[#14211D]">
        {/* Global Flash Loading Screen to cover all data delays */}
        {isFlashLoading && <FlashLoadingScreen message={loadingMessage} />}
      {/* 1. Public Landing Page */}
      {currentPage === 'landing' && (
        <Landing
          onNavigate={(target, state) => {
            if (target === 'register') {
              handleNavigate('role-selection', state);
            } else {
              handleNavigate(target, state);
            }
          }}
        />
      )}

      {/* 2. Role Selection Onboarding */}
      {currentPage === 'role-selection' && (
        <RoleSelection onNavigate={handleNavigate} navState={navState} />
      )}

      {/* 3. Register Page */}
      {currentPage === 'register' && (
        <Register onNavigate={handleNavigate} navState={navState} />
      )}

      {/* 4. Login Page */}
      {currentPage === 'login' && (
        <Login onNavigate={handleNavigate} navState={navState} />
      )}

      {/* 5. Farmer Experience Module Routes */}
      {currentPage === 'farmer-dashboard' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <FarmerDashboard
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'farmer-create-listing' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <CreateListing
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'farmer-preview-listing' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <ListingPreview
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'farmer-my-listings' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <MyListings
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'farmer-orders' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <FarmerOrders
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'farmer-create-auction' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <CreateAuction
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'farmer-my-auctions' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <MyAuctions
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'farmer-financing' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <FarmerFinancing
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'farmer-deliveries' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <FarmerDeliveries
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'farmer-inventory' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <FarmerInventory
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {/* 6. Buyer Marketplace & Auction Module Routes */}
      {currentPage === 'buyer-dashboard' && (
        <ProtectedRoute requiredRole="buyer" onNavigate={handleNavigate}>
          <BuyerDashboard
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'buyer-marketplace' && (
        <ProtectedRoute requiredRole="buyer" onNavigate={handleNavigate}>
          <Marketplace
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'buyer-listing-detail' && (
        <ProtectedRoute requiredRole="buyer" onNavigate={handleNavigate}>
          <ListingDetail
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'buyer-orders' && (
        <ProtectedRoute requiredRole="buyer" onNavigate={handleNavigate}>
          <BuyerOrders
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'buyer-live-auctions' && (
        <ProtectedRoute requiredRole="buyer" onNavigate={handleNavigate}>
          <LiveAuctions
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'buyer-my-bids' && (
        <ProtectedRoute requiredRole="buyer" onNavigate={handleNavigate}>
          <MyBids
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'buyer-financing' && (
        <ProtectedRoute requiredRole="buyer" onNavigate={handleNavigate}>
          <BuyerFinancing
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'buyer-deliveries' && (
        <ProtectedRoute requiredRole="buyer" onNavigate={handleNavigate}>
          <BuyerDeliveries
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {/* 7. Shared Live Auction Room (Farmer Monitor or Buyer Bidding) */}
      {currentPage === 'auction-room' && (
        <ProtectedRoute onNavigate={handleNavigate}>
          <AuctionRoom
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
            navState={navState}
          />
        </ProtectedRoute>
      )}

      {/* 8. Financier Portal Experience Routes */}
      {currentPage === 'financier-dashboard' && (
        <ProtectedRoute requiredRole="financier" onNavigate={handleNavigate}>
          <FinancierDashboard
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'financier-underwriting' && (
        <ProtectedRoute requiredRole="financier" onNavigate={handleNavigate}>
          <UnderwritingDesk
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'financier-portfolio' && (
        <ProtectedRoute requiredRole="financier" onNavigate={handleNavigate}>
          <FinancierPortfolio
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'financier-collateral-vault' && (
        <ProtectedRoute requiredRole="financier" onNavigate={handleNavigate}>
          <CollateralVault
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'financier-disbursements' && (
        <ProtectedRoute requiredRole="financier" onNavigate={handleNavigate}>
          <DisbursementsLedger
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {/* 9. Transporter Dashboard */}
      {currentPage === 'transporter-dashboard' && (
        <ProtectedRoute requiredRole="transporter" onNavigate={handleNavigate}>
          <TransporterDashboard
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {/* 10. Warehouse Operator Dashboard */}
      {currentPage === 'warehouse-dashboard' && (
        <ProtectedRoute requiredRole="warehouse" onNavigate={handleNavigate}>
          <WarehouseDashboard
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}
      </div>
    </ErrorBoundary>
  );
}
