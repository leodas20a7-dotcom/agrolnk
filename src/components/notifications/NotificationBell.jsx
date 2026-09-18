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
  deleteNotification
} from '../../utils/notifications';
import { subscribeToCrossTabSync } from '../../utils/syncChannel';

export default function NotificationBell({ currentUser, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [isPinging, setIsPinging] = useState(false);
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
      setIsPinging(true);
      setTimeout(() => setIsPinging(false), 3000);
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

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(user);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
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
    await deleteNotification(notifId);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
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
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        className={`relative p-2 rounded-2xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F2FBF6] transition-all cursor-pointer border ${
          isOpen ? 'bg-[#F2FBF6] border-[#10B981]/40 text-[#0B3326]' : 'border-transparent'
        }`}
      >
        <Bell className={`w-5 h-5 ${isPinging ? 'animate-bounce text-[#10B981]' : ''}`} />

        {/* Unread Badge Counter Pill */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#10B981] px-1 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-white animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
            </span>
          </span>
        )}
      </button>

      {/* Floating Notifications Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white border border-[#E5EDE8] shadow-2xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Popover Header */}
          <div className="p-4 pb-3 border-b border-[#E5EDE8] bg-[#FAFBF9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#0B3326] text-white flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#34D399]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0B3326] font-heading flex items-center gap-1.5">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-[#10B981]/15 text-[#0B3326] px-2 py-0.5 rounded-full font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </h4>
                <span className="text-[10px] text-[#566861]">Real-time alerts for your desk</span>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#10B981] hover:text-[#0B3326] hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2 border-b border-[#E5EDE8] flex items-center gap-2 bg-white text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#0B3326] text-white'
                  : 'bg-[#F8FAF8] text-[#566861] hover:bg-[#F2FBF6]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#F8FAF8] text-[#566861] hover:bg-[#F2FBF6]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Scrollable Notification Items List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#E5EDE8]/60 overscroll-contain">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#F2FBF6] border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h5 className="text-xs font-bold text-[#0B3326]">You're all caught up!</h5>
                <p className="text-[11px] text-[#566861]">
                  {filter === 'unread'
                    ? 'No unread notifications at the moment.'
                    : 'New orders, deliveries, and payment alerts will show up here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 sm:p-4 transition-all cursor-pointer group flex items-start gap-3 relative ${
                    notif.isRead
                      ? 'bg-white hover:bg-[#F8FAF8]'
                      : 'bg-[#F0FDF4]/70 hover:bg-[#F0FDF4]'
                  }`}
                >
                  {/* Category Icon Badge */}
                  <div
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${getTypeBg(
                      notif.type
                    )}`}
                  >
                    {getTypeIcon(notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs block truncate ${
                          notif.isRead
                            ? 'font-bold text-[#14211D]'
                            : 'font-extrabold text-[#0B3326]'
                        }`}
                      >
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-[#566861] shrink-0">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#566861] mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    {notif.link && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#10B981] mt-1.5 group-hover:underline">
                        <span>View details</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Unread Indicator Dot */}
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-[#10B981] shrink-0 mt-2 shadow-xs" />
                  )}

                  {/* Delete button on hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, notif.id)}
                    className="absolute right-2 top-2 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#FAFBF9] border-t border-[#E5EDE8] text-center">
            <span className="text-[10px] text-[#566861]">
              Filtered strictly for your verified {user.role || 'user'} account
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
