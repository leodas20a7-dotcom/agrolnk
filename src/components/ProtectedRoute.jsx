import React, { useEffect, useRef, useState } from 'react';
import { getCurrentUser, isAuthenticated, getUserRole, logoutUser } from '../utils/auth';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children, requiredRole, allowedRoles, onNavigate }) {
  const authenticated = isAuthenticated();
  const user = getCurrentUser();
  const currentRole = getUserRole();
  const effectiveRole = currentRole || user?.role;
  const isAdminRoute = requiredRole === 'admin' || (Array.isArray(allowedRoles) && allowedRoles.includes('admin'));
  const hasRedirectedRef = useRef(false);
  const [adminVerified, setAdminVerified] = useState(false);

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
    let isMounted = true;
    setAdminVerified(false);

    if (!authenticated || !user) {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        onNavigate('login', { user: null }, true);
      }
      return;
    }

    if (!isRoleAllowed()) {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        // Redirect to the user's appropriate role dashboard safely
        const targetDashboard = effectiveRole === 'food_processor'
          ? 'food-processor-dashboard'
          : (effectiveRole ? `${effectiveRole}-dashboard` : 'role-selection');
        onNavigate(targetDashboard, { user }, true);
      }
      return;
    }

    // Critical Security: Admin UI never mounts until Supabase Auth & DB profile strictly verify admin role.
    // Fail closed on expired, offline, tampered, or non-admin sessions (no localStorage email fallback).
    if (isAdminRoute) {
      const failAdminVerification = () => {
        if (isMounted) setAdminVerified(false);
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          logoutUser();
          onNavigate('login', { user: null }, true);
        }
      };

      const verifyServerAdmin = async () => {
        try {
          let { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            const { data: refreshData } = await supabase.auth.refreshSession().catch(() => ({ data: {} }));
            session = refreshData?.session || null;
          }

          if (!session?.access_token) {
            console.warn('Unauthorized admin access attempt: No active Supabase server session.');
            failAdminVerification();
            return;
          }

          // Cryptographically verify session against Supabase Auth server (blocks expired/forged local tokens)
          const { data: userData, error: userErr } = await supabase.auth.getUser(session.access_token);
          if (userErr || !userData?.user?.id) {
            console.warn('Unauthorized admin access attempt: Supabase token validation failed.');
            failAdminVerification();
            return;
          }

          // Verify authoritative role from profiles table
          const { data: profile, error: profErr } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .maybeSingle();

          if (profErr || !profile || profile.role !== 'admin') {
            console.warn('Unauthorized admin access attempt: User does not hold server admin role.');
            failAdminVerification();
            return;
          }

          if (isMounted) {
            setAdminVerified(true);
          }
        } catch (err) {
          console.warn('Admin session validation failed closed:', err);
          failAdminVerification();
        }
      };

      verifyServerAdmin();
    }

    return () => {
      isMounted = false;
    };
  }, [authenticated, user?.id, effectiveRole, requiredRole, isAdminRoute, onNavigate]);

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

  if (isAdminRoute && !adminVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF8]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-[#566861]">Verifying Administrator Session...</p>
        </div>
      </div>
    );
  }

  return children;
}

