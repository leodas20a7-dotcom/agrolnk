import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getDeliveries,
  getTransporterStats
} from '../utils/deliveries';
import { getTransporterFleet } from '../utils/fleet';
import { getResolvedUserKycStatus, fetchCurrentProfile } from '../utils/auth';
import { subscribeToCrossTabSync } from '../utils/syncChannel';
import { showGlobalLoader, hideGlobalLoader } from '../context/LoadingContext';

/**
 * Shared data & live-sync hook across all Transporter Desk pages
 * (Overview, Load Board, My Fleet, Payouts & Escrow).
 */
export function useTransporterDesk(user) {
  const userId = user?.id || '';
  const userEmail = user?.email || '';

  const [deliveries, setDeliveries] = useState([]);
  const [fleetVehicles, setFleetVehicles] = useState([]);
  const [stats, setStats] = useState({
    availableJobs: 0,
    activeDeliveries: 0,
    completedTrips: 0,
    totalTonnes: 0,
  });
  const [currentKycStatus, setCurrentKycStatus] = useState(() => getResolvedUserKycStatus(user));
  const [inspectingDoc, setInspectingDoc] = useState(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const isVerified = currentKycStatus === 'verified';

  const loadData = useCallback(async (showFlash = false) => {
    if (showFlash) {
      showGlobalLoader('Syncing Transporter Desk...', 'Loading freight corridors, fleet & escrow payouts...');
    }
    try {
      const [all, computedStats, fleet] = await Promise.all([
        getDeliveries(),
        getTransporterStats(userId),
        getTransporterFleet(userId, userEmail),
      ]);
      setDeliveries(all || []);
      setStats(computedStats || {
        availableJobs: 0,
        activeDeliveries: 0,
        completedTrips: 0,
        totalTonnes: 0,
      });
      setFleetVehicles(fleet || []);
    } catch (err) {
      console.error('Error loading transporter desk data:', err);
    } finally {
      if (showFlash) {
        hideGlobalLoader();
      }
    }
  }, [userId, userEmail]);

  useEffect(() => {
    const syncKyc = async () => {
      const localStatus = getResolvedUserKycStatus(user);
      setCurrentKycStatus(localStatus);
      try {
        const profile = await fetchCurrentProfile();
        if (profile?.kycStatus) {
          setCurrentKycStatus(profile.kycStatus);
        }
      } catch {}
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        syncKyc();
      }
    };

    const handleFleetUpdate = (e) => {
      if (e?.detail?.fleet) {
        setFleetVehicles(e.detail.fleet);
      } else {
        getTransporterFleet(userId, userEmail).then(setFleetVehicles);
      }
    };

    syncKyc();

    window.addEventListener('agrolnk_kyc_updated', syncKyc);
    window.addEventListener('storage', syncKyc);
    window.addEventListener('focus', syncKyc);
    window.addEventListener('agrolnk_user_profile_updated', syncKyc);
    window.addEventListener('agrolnk_fleet_updated', handleFleetUpdate);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    }

    return () => {
      window.removeEventListener('agrolnk_kyc_updated', syncKyc);
      window.removeEventListener('storage', syncKyc);
      window.removeEventListener('focus', syncKyc);
      window.removeEventListener('agrolnk_user_profile_updated', syncKyc);
      window.removeEventListener('agrolnk_fleet_updated', handleFleetUpdate);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
    };
  }, [user, userId, userEmail]);

  useEffect(() => {
    loadData(true);

    const handleDeliverySync = (payload) => {
      const item = payload?.data || payload?.detail;
      if (item && item.id) {
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === item.id || d.deliveryNumber === item.deliveryNumber ? { ...d, ...item } : d
          )
        );
      }
      loadData(false);
    };

    const unsubscribeCrossTab = subscribeToCrossTabSync((msg) => {
      if (msg.domain === 'deliveries' || msg.domain === 'orders') {
        handleDeliverySync(msg);
      }
    });

    window.addEventListener('agrolnk_deliveries_updated', handleDeliverySync);
    window.addEventListener('agrolnk_delivery_updated', handleDeliverySync);
    window.addEventListener('agrolnk_orders_updated', handleDeliverySync);
    window.addEventListener('storage', handleDeliverySync);

    return () => {
      hideGlobalLoader();
      unsubscribeCrossTab();
      window.removeEventListener('agrolnk_deliveries_updated', handleDeliverySync);
      window.removeEventListener('agrolnk_delivery_updated', handleDeliverySync);
      window.removeEventListener('agrolnk_orders_updated', handleDeliverySync);
      window.removeEventListener('storage', handleDeliverySync);
    };
  }, [loadData]);

  const handleOpenKycAction = useCallback(() => {
    if (currentKycStatus === 'pending') {
      try {
        const storedRaw = localStorage.getItem('agrolnk_admin_kyc_registry');
        const registry = storedRaw ? JSON.parse(storedRaw) : [];
        const found = registry.find((u) => u.id === userId || u.email === userEmail);
        if (found?.documents?.length > 0) {
          setInspectingDoc(found.documents[0]);
          return;
        }
      } catch {}
      if (user?.documents?.length > 0) {
        setInspectingDoc(user.documents[0]);
        return;
      }
    }
    setIsVerificationModalOpen(true);
  }, [currentKycStatus, userId, userEmail, user?.documents]);

  const safeDeliveries = useMemo(() => (Array.isArray(deliveries) ? deliveries : []), [deliveries]);

  const availableJobs = useMemo(() => (
    safeDeliveries.filter(
      (d) =>
        (d.status === 'transport_requested' || d.status === 'price_offered') &&
        d.freightEscrowStatus !== 'locked' &&
        d.freightEscrowStatus !== 'escrow_locked' &&
        d.freightEscrowStatus !== 'released'
    )
  ), [safeDeliveries]);

  const myQuotedDeliveries = useMemo(() => (
    safeDeliveries.filter(
      (d) =>
        (d.status === 'transport_requested' || d.status === 'price_offered') &&
        Array.isArray(d.freightQuotes) &&
        d.freightQuotes.some((q) => String(q.transporterId) === String(userId))
    )
  ), [safeDeliveries, userId]);

  const myDeliveries = useMemo(() => (
    safeDeliveries.filter((d) => String(d.transporterId) === String(userId))
  ), [safeDeliveries, userId]);

  const activeTrips = useMemo(() => (
    myDeliveries.filter((d) =>
      d.status === 'assigned' || d.status === 'picked_up' || d.status === 'in_transit'
    )
  ), [myDeliveries]);

  const completedTrips = useMemo(() => (
    myDeliveries.filter((d) => d.status === 'delivered' || d.status === 'completed')
  ), [myDeliveries]);

  const primaryVehicle = useMemo(
    () => fleetVehicles.find((v) => v.isPrimary) || fleetVehicles[0] || null,
    [fleetVehicles]
  );

  return {
    deliveries: safeDeliveries,
    fleetVehicles,
    setFleetVehicles,
    primaryVehicle,
    stats,
    currentKycStatus,
    setCurrentKycStatus,
    isVerified,
    inspectingDoc,
    setInspectingDoc,
    isVerificationModalOpen,
    setIsVerificationModalOpen,
    handleOpenKycAction,
    availableJobs,
    myQuotedDeliveries,
    myDeliveries,
    activeTrips,
    completedTrips,
    loadData,
  };
}
