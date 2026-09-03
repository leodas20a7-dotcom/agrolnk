import React, { useEffect } from 'react';
import { getCurrentUser, isAuthenticated, getUserRole } from '../utils/auth';

export default function ProtectedRoute({ children, requiredRole, onNavigate }) {
  const authenticated = isAuthenticated();
  const user = getCurrentUser();
  const currentRole = getUserRole();

  useEffect(() => {
    if (!authenticated || !user) {
      onNavigate('login', {}, true);
      return;
    }

    if (requiredRole && currentRole && currentRole !== requiredRole) {
      // Redirect to the user's appropriate role dashboard
      onNavigate(`${currentRole}-dashboard`, { user }, true);
    }
  }, [authenticated, user, currentRole, requiredRole, onNavigate]);

  if (!authenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF8]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-[#566861]">Redirecting to Sign In...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && currentRole !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF8]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-[#566861]">
            Redirecting to your <span className="capitalize font-bold">{currentRole || 'user'}</span> dashboard...
          </p>
        </div>
      </div>
    );
  }

  return children;
}

