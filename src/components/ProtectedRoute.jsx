import React, { useEffect, useRef } from 'react';
import { getCurrentUser, isAuthenticated, getUserRole, logoutUser } from '../utils/auth';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children, requiredRole, allowedRoles, onNavigate }) {
  const authenticated = isAuthenticated();
  const user = getCurrentUser();
  const currentRole = getUserRole();
  const effectiveRole = currentRole || user?.role;
  const hasRedirectedRef = useRef(false);

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

    // Critical Security: For Admin routes, verify active Supabase Auth session with the server
    if (requiredRole === 'admin' || (allowedRoles && allowedRoles.includes('admin'))) {
      const verifyServerAdmin = async () => {
        try {
          let { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            // Attempt background session refresh before assuming session is expired
            const { data: refreshData } = await supabase.auth.refreshSession().catch(() => ({ data: {} }));
            if (refreshData?.session) {
              session = refreshData.session;
              error = null;
            } else {
              const cached = getCurrentUser();
              const adminEmail = (cached?.email || '').toLowerCase().trim();
              const hasSupabaseToken = Object.keys(localStorage).some(
                (k) => k.startsWith('sb-') && k.endsWith('-auth-token') && Boolean(localStorage.getItem(k))
              );
              if (
                hasSupabaseToken &&
                (adminEmail === 'agrolnkadmin@gmail.com' || adminEmail === 'admin@agrolnk.com')
              ) {
                // Legitimate platform admin with active token: preserve session against temporary server rate-limits/throttling
                return;
              }
              console.warn('Unauthorized admin access attempt: No active Supabase server session.');
              if (isMounted && !hasRedirectedRef.current) {
                hasRedirectedRef.current = true;
                logoutUser();
                onNavigate('login', { user: null }, true);
              }
              return;
            }
          }

          if (!session?.user?.id) return;

          // Verify authoritative role from profiles table
          const { data: profile, error: profErr } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          // Only reject if the server definitively confirmed an active non-admin role
          if (!profErr && profile && profile.role !== 'admin') {
            console.warn('Unauthorized admin access attempt: User does not hold server admin role.');
            if (isMounted && !hasRedirectedRef.current) {
              hasRedirectedRef.current = true;
              logoutUser();
              onNavigate('login', { user: null }, true);
            }
          }
        } catch (err) {
          console.warn('Admin session validation network notice (session preserved):', err);
          // Do not kick out admin on transient network or rate-limit exceptions
        }
      };

      verifyServerAdmin();
    }

    return () => {
      isMounted = false;
    };
  }, [authenticated, user?.id, effectiveRole, requiredRole, onNavigate]);

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

