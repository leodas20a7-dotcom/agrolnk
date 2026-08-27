import React, { useEffect } from 'react';
import { getCurrentUser, isAuthenticated, getUserRole } from '../utils/auth';

export default function ProtectedRoute({ children, requiredRole, onNavigate }) {
  const authenticated = isAuthenticated();
  const user = getCurrentUser();
  const currentRole = getUserRole();

  useEffect(() => {
    if (!authenticated || !user) {
      onNavigate('login');
      return;
    }

    if (requiredRole && currentRole && currentRole !== requiredRole) {
      // Redirect to the user's appropriate role dashboard
      onNavigate(`${currentRole}-dashboard`, { user });
    }
  }, [authenticated, user, currentRole, requiredRole, onNavigate]);

  if (!authenticated || !user) {
    return null;
  }

  if (requiredRole && currentRole !== requiredRole) {
    return null;
  }

  return children;
}
