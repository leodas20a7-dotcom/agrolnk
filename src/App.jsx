import React, { useState, useEffect, lazy, Suspense } from 'react';
import Landing from './pages/Landing';
import RoleSelection from './pages/RoleSelection';
import Register from './pages/Register';
import Login from './pages/Login';

// Farmer Experience Module Pages (Code-Split)
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));
const CreateListing = lazy(() => import('./pages/farmer/CreateListing'));
const ListingPreview = lazy(() => import('./pages/farmer/ListingPreview'));
const MyListings = lazy(() => import('./pages/farmer/MyListings'));
const FarmerOrders = lazy(() => import('./pages/farmer/FarmerOrders'));
const CreateAuction = lazy(() => import('./pages/farmer/CreateAuction'));
const MyAuctions = lazy(() => import('./pages/farmer/MyAuctions'));
const FarmerFinancing = lazy(() => import('./pages/farmer/FarmerFinancing'));
const FarmerLoanRepayments = lazy(() => import('./pages/farmer/FarmerLoanRepayments'));
const FarmerDeliveries = lazy(() => import('./pages/farmer/FarmerDeliveries'));
const FarmerInventory = lazy(() => import('./pages/farmer/FarmerInventory'));

// Buyer Marketplace Module Pages (Code-Split)
const BuyerDashboard = lazy(() => import('./pages/buyer/BuyerDashboard'));
const Marketplace = lazy(() => import('./pages/buyer/Marketplace'));
const ListingDetail = lazy(() => import('./pages/buyer/ListingDetail'));
const BuyerOrders = lazy(() => import('./pages/buyer/BuyerOrders'));
const LiveAuctions = lazy(() => import('./pages/buyer/LiveAuctions'));
const MyBids = lazy(() => import('./pages/buyer/MyBids'));
const BuyerFinancing = lazy(() => import('./pages/buyer/BuyerFinancing'));
const BuyerLoanRepayments = lazy(() => import('./pages/buyer/BuyerLoanRepayments'));
const BuyerDeliveries = lazy(() => import('./pages/buyer/BuyerDeliveries'));

// Shared Auction Room Page (Code-Split)
const AuctionRoom = lazy(() => import('./pages/auction/AuctionRoom'));

// Financier Portal Experience Pages (Code-Split)
const FinancierDashboard = lazy(() => import('./pages/dashboards/FinancierDashboard'));
const UnderwritingDesk = lazy(() => import('./pages/financier/UnderwritingDesk'));
const FinancierPortfolio = lazy(() => import('./pages/financier/FinancierPortfolio'));
const CollateralVault = lazy(() => import('./pages/financier/CollateralVault'));
const DisbursementsLedger = lazy(() => import('./pages/financier/DisbursementsLedger'));

// Transporter Dashboard (Code-Split)
const TransporterDashboard = lazy(() => import('./pages/transporter/TransporterDashboard'));

// Warehouse Dashboard (Code-Split)
const WarehouseDashboard = lazy(() => import('./pages/warehouse/WarehouseDashboard'));

// Admin Command Center Module Pages (Code-Split)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserVerificationQueue = lazy(() => import('./pages/admin/UserVerificationQueue'));
const EscrowCommissionLedger = lazy(() => import('./pages/admin/EscrowCommissionLedger'));
const InspectionDisputes = lazy(() => import('./pages/admin/InspectionDisputes'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

import ProtectedRoute from './components/ProtectedRoute';
import FlashLoadingScreen from './components/ui/FlashLoadingScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { LoadingProvider, showGlobalLoader, hideGlobalLoader } from './context/LoadingContext';
import { getCurrentUser } from './utils/auth';

const PUBLIC_PAGES = new Set(['landing', 'role-selection', 'register', 'login']);

const VALID_ROUTES = new Set([
  'landing',
  'role-selection',
  'register',
  'login',
  // Admin
  'admin-dashboard',
  'admin-verification',
  'admin-escrow',
  'admin-disputes',
  'admin-settings',
  // Farmer
  'farmer-dashboard',
  'farmer-create-listing',
  'farmer-preview-listing',
  'farmer-my-listings',
  'farmer-orders',
  'farmer-create-auction',
  'farmer-my-auctions',
  'farmer-financing',
  'farmer-loan-repayments',
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
  'buyer-loan-repayments',
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
  'warehouse-dashboard': 'Accessing Warehouse Storage Network...',
  'transporter-dashboard': 'Syncing Logistics & Corridor Dispatch...',
  'create-listing': 'Initializing Lot Assay Form...',
  'farmer-financing': 'Loading Working Capital Facilities...',
  'farmer-deliveries': 'Loading Active Dispatch Schedules...',
  'farmer-inventory': 'Connecting to Warehouse Storage & Receipts...',
  'admin-dashboard': 'Opening Executive Command Center...',
  'admin-verification': 'Loading KYC Verification Queue...',
  'admin-escrow': 'Auditing Escrow & Take-Rate Ledgers...',
  'admin-disputes': 'Accessing Quality Dispute Desk...',
  'admin-settings': 'Configuring Platform & User Directory...',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [currentPage, setCurrentPage] = useState(() => getInitialPage());
  const [navState, setNavState] = useState({});

  // Initial app load flash curtain to hide blank flashes
  useEffect(() => {
    showGlobalLoader('Synchronizing Agrolnk...', 'Connecting to decentralized commodity network...');
    const timer = setTimeout(() => {
      hideGlobalLoader();
    }, 350);
    return () => {
      clearTimeout(timer);
      hideGlobalLoader();
    };
  }, []);

  const triggerFlashTransition = (targetPage) => {
    const msg = PAGE_MESSAGES[targetPage] || 'Loading Agrolnk...';
    showGlobalLoader(msg, 'Fetching verified records from network...');
    setTimeout(() => {
      hideGlobalLoader();
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
      <LoadingProvider>
        <div className="min-h-screen bg-[#F8FAF8] text-[#14211D]">
          <Suspense fallback={<FlashLoadingScreen message="Loading Agrolnk Portal..." />}>
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

      {currentPage === 'farmer-loan-repayments' && (
        <ProtectedRoute requiredRole="farmer" onNavigate={handleNavigate}>
          <FarmerLoanRepayments
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
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
            navState={navState}
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

      {currentPage === 'buyer-loan-repayments' && (
        <ProtectedRoute requiredRole="buyer" onNavigate={handleNavigate}>
          <BuyerLoanRepayments
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
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

      {/* 11. Admin Command Center Routes */}
      {currentPage === 'admin-dashboard' && (
        <ProtectedRoute requiredRole="admin" onNavigate={handleNavigate}>
          <AdminDashboard
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'admin-verification' && (
        <ProtectedRoute requiredRole="admin" onNavigate={handleNavigate}>
          <UserVerificationQueue
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'admin-escrow' && (
        <ProtectedRoute requiredRole="admin" onNavigate={handleNavigate}>
          <EscrowCommissionLedger
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'admin-disputes' && (
        <ProtectedRoute requiredRole="admin" onNavigate={handleNavigate}>
          <InspectionDisputes
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}

      {currentPage === 'admin-settings' && (
        <ProtectedRoute requiredRole="admin" onNavigate={handleNavigate}>
          <AdminSettings
            currentUser={currentUser || navState.user}
            onNavigate={handleNavigate}
          />
        </ProtectedRoute>
      )}
          </Suspense>
        </div>
      </LoadingProvider>
    </ErrorBoundary>
  );
}
