import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ShoppingBag,
  Truck,
  CreditCard,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../../utils/notifications';
import { subscribeToCrossTabSync } from '../../utils/syncChannel';

export default function NotificationBell({ currentUser, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const user = currentUser || { id: '', role: 'farmer' };

  const loadNotifications = async () => {
    try {
      const list = await getNotificationsForUser(user);
      setNotifications(list || []);
    } catch (err) {
      console.warn('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    const unsubscribe = subscribeToCrossTabSync((msg) => {
      if (msg.domain === 'notifications' || msg.domain === 'orders' || msg.domain === 'deliveries' || msg.domain === 'financing') {
        handleUpdate();
      }
    });

    window.addEventListener('agrolnk_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('agrolnk_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user.id, user.role, user.email]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(user);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearAll = async () => {
    await clearAllNotifications(user);
    setNotifications([]);
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id, user);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    if (notif.link && typeof onNavigate === 'function') {
      onNavigate(notif.link);
      setIsOpen(false);
    } else if (notif.link && typeof window !== 'undefined') {
      window.location.hash = notif.link;
      setIsOpen(false);
    }
  };

  const handleDelete = async (e, notifId) => {
    e.stopPropagation();
    // Immediate optimistic removal from state so UI updates instantly
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    await deleteNotification(notifId);
  };

  const formatTimeAgo = (dateStr) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'delivery':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'financing':
        return <Landmark className="w-4 h-4 text-purple-600" />;
      case 'escrow':
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
      case 'kyc':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#10B981]" />;
    }
  };

  const getTypeBg = (type) => {
    switch (type) {
      case 'order':
        return 'bg-emerald-50 border-emerald-200';
      case 'delivery':
        return 'bg-blue-50 border-blue-200';
      case 'financing':
        return 'bg-purple-50 border-purple-200';
      case 'escrow':
        return 'bg-amber-50 border-amber-200';
      case 'kyc':
        return 'bg-emerald-50 border-emerald-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={unreadCount > 0 ? `${unreadCount} new notifications` : 'Notifications'}
        className={`relative p-2 rounded-2xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F2FBF6] transition-all cursor-pointer border ${
          isOpen ? 'bg-[#F2FBF6] border-[#10B981]/40 text-[#0B3326]' : 'border-transparent'
        }`}
      >
        <Bell className="w-5 h-5" />

        {/* Unread Counter Dot Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#10B981] px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notifications Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-[#E5EDE8] shadow-xl z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E5EDE8] bg-[#FAFBF9] flex items-center justify-between">
            <span className="text-xs font-bold text-[#0B3326]">
              Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
            </span>

            <div className="flex items-center gap-2.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-medium text-[#10B981] hover:text-[#0B3326] hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-medium text-slate-400 hover:text-rose-600 hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-[#E5EDE8]/50 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#566861]">
                <span>No new notifications.</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3 transition-colors cursor-pointer group flex items-start gap-2.5 relative ${
                    notif.isRead
                      ? 'bg-white hover:bg-[#F8FAF8]'
                      : 'bg-emerald-50/40 hover:bg-emerald-50/70'
                  }`}
                >
                  {/* Category Icon */}
                  <div
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${getTypeBg(
                      notif.type
                    )}`}
                  >
                    {getTypeIcon(notif.type)}
                  </div>

                  {/* Body Text */}
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs block truncate ${
                          notif.isRead ? 'font-semibold text-[#14211D]' : 'font-bold text-[#0B3326]'
                        }`}
                      >
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-[#566861] shrink-0">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#566861] mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread Dot */}
                  {!notif.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0 mt-2" />
                  )}

                  {/* Delete / Dismiss on Hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, notif.id)}
                    className="absolute right-1.5 top-1.5 p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
