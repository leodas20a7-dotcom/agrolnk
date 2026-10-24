import React, { useEffect } from 'react';
import { getCurrentUser, isAuthenticated, getUserRole } from '../utils/auth';

export default function ProtectedRoute({ children, requiredRole, allowedRoles, onNavigate }) {
  const authenticated = isAuthenticated();
  const user = getCurrentUser();
  const currentRole = getUserRole();
  const effectiveRole = currentRole || user?.role;

  const isRoleAllowed = () => {
    if (!effectiveRole) return false;
    if (allowedRoles && Array.isArray(allowedRoles)) {
      return allowedRoles.includes(effectiveRole);
    }
    if (requiredRole) {
      if (requiredRole === 'farmer') {
        return effectiveRole === 'farmer' || effectiveRole === 'fpo' || effectiveRole === 'food_processor';
      }
      if (requiredRole === 'buyer') {
        return effectiveRole === 'buyer' || effectiveRole === 'food_processor';
      }
      return effectiveRole === requiredRole;
    }
    return true;
  };

  useEffect(() => {
    if (!authenticated || !user) {
      onNavigate('login', {}, true);
      return;
    }

    if (!isRoleAllowed()) {
      // Redirect to the user's appropriate role dashboard safely
      const targetDashboard = effectiveRole === 'food_processor'
        ? 'food-processor-dashboard'
        : (effectiveRole ? `${effectiveRole}-dashboard` : 'role-selection');
      onNavigate(targetDashboard, { user }, true);
    }
  }, [authenticated, user, effectiveRole, requiredRole, allowedRoles, onNavigate]);

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

  if (!isRoleAllowed()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF8]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-[#566861]">
            Redirecting to your <span className="capitalize font-bold">{effectiveRole || 'user'}</span> dashboard...
          </p>
        </div>
      </div>
    );
  }

  return children;
}

