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
import { getCurrentUser } from './utils/auth';

const PUBLIC_PAGES = new Set(['landing', 'role-selection', 'register', 'login']);

function getInitialPage() {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  const user = getCurrentUser();

  if (hash) {
    if (PUBLIC_PAGES.has(hash)) {
      if (user?.role && hash === 'landing') {
        return `${user.role}-dashboard`;
      }
      return hash;
    }
    // Protected page
    if (user) {
      return hash;
    }
    return 'login';
  }

  // No hash in URL
  if (user?.role) {
    return `${user.role}-dashboard`;
  }
  return 'landing';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => getInitialPage());
  const [navState, setNavState] = useState({});
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  const handleNavigate = (page, state = {}, replace = false) => {
    let resolvedPage = page;
    const user = getCurrentUser();

    if (page === 'dashboard') {
      resolvedPage = user?.role ? `${user.role}-dashboard` : 'login';
    }

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
      const hashPage = window.location.hash.replace(/^#\/?/, '').trim();
      const user = getCurrentUser();
      setCurrentUser(user);

      if (!hashPage) {
        const defaultTarget = user?.role ? `${user.role}-dashboard` : 'landing';
        setCurrentPage(defaultTarget);
        window.location.replace(`#/${defaultTarget}`);
        return;
      }

      if (!PUBLIC_PAGES.has(hashPage) && !user) {
        setCurrentPage('login');
        window.location.replace('#/login');
        return;
      }

      setCurrentPage(hashPage);
    };

    // Ensure hash is set on initial mount
    if (!window.location.hash) {
      const initial = getInitialPage();
      window.location.replace(`#/${initial}`);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#14211D]">
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
  );
}
