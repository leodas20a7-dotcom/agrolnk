import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  ShieldCheck,
  Bot,
  User,
  Building2,
  Lock,
  Sparkles,
  Info,
  MessageSquare,
  ChevronDown,
  Truck,
  Package,
  Headphones,
  Plus,
  ArrowLeft,
  Search,
  CheckCheck,
  Check,
  MoreVertical,
  Landmark,
  Shield,
  MessageCircle,
  Clock
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  getThreadMessages,
  fetchThreadMessages,
  subscribeToThread,
  sendPrivacyMessage,
  maskSensitivePII,
  getSharedThreadKey,
  formatChatTimestamp,
  getPlatformContacts,
  getAllStoredThreads,
  markThreadAsRead,
  isThreadRead,
  getThreadUnreadCount
} from '../../utils/chat';
import { getBuyerOrders, getFarmerOrders } from '../../utils/orders';

export default function PrivacyChatDrawer({
  isOpen,
  onClose,
  currentUser,
  threadKey = 'agrolnk_support_desk',
  orderContext = null,
  partnerContext = null,
}) {
  const user = currentUser || { id: 'usr_guest', name: 'Trading Participant', role: 'buyer' };

  // View state: 'chat_list' (Image 3) | 'contact_picker' (Image 2) | 'conversation' (Image 1)
  const [viewMode, setViewMode] = useState('chat_list');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [channels, setChannels] = useState([]);
  const [selectedChannelKey, setSelectedChannelKey] = useState(threadKey);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'orders' | 'warehouses'
  const messagesEndRef = useRef(null);

  // Load available channels & contacts directory
  const loadChannels = async () => {
    const defaultChannels = [
      {
        key: 'agrolnk_support_desk',
        title: 'AgroLnk Desk & Smart Assistant',
        subtitle: 'Official Support, Escrow & Dispute Desk',
        role: 'Admin & AI Assistant',
        category: 'support',
        icon: Headphones,
        avatarBg: 'bg-[#0B3326]',
        avatarColor: 'text-[#34D399]',
        badgeColor: 'emerald',
        phoneMask: 'Official Support',
        initials: 'AL',
        unreadCount: 0,
      },
      {
        key: 'chat_partner_wh_salem_01',
        title: 'Salem Agri Cold Storage Hub',
        subtitle: 'WDRA Accredited Facility • 5,000 MT Cold Vault',
        role: 'Warehouse Operator',
        category: 'warehouses',
        icon: Building2,
        avatarBg: 'bg-emerald-700',
        avatarColor: 'text-white',
        badgeColor: 'emerald',
        phoneMask: '+91 98421 88901',
        initials: 'SL',
        unreadCount: 1,
      },
      {
        key: 'chat_partner_wh_dindigul_02',
        title: 'Dindigul Central Agri Logistics Park',
        subtitle: 'NABARD Approved Modern Silo & Cold Cell',
        role: 'Warehouse Operator',
        category: 'warehouses',
        icon: Building2,
        avatarBg: 'bg-teal-700',
        avatarColor: 'text-white',
        badgeColor: 'emerald',
        phoneMask: '+91 94432 10982',
        initials: 'DG',
        unreadCount: 0,
      },
      {
        key: 'chat_partner_usr_transporter_03',
        title: 'Vetri Logistics Fleet',
        subtitle: 'Refrigerated Multi-axle Fleet • Live Dispatch Tracking',
        role: 'Transporter',
        category: 'orders',
        icon: Truck,
        avatarBg: 'bg-amber-600',
        avatarColor: 'text-white',
        badgeColor: 'amber',
        phoneMask: '+91 94433 77889',
        initials: 'VL',
        unreadCount: 0,
      },
      {
        key: 'chat_partner_usr_financier_05',
        title: 'Kisan Capital Credit Desk',
        subtitle: 'Trade Settlement & Warehouse e-NWR Credit',
        role: 'Financier',
        category: 'orders',
        icon: Landmark,
        avatarBg: 'bg-blue-700',
        avatarColor: 'text-white',
        badgeColor: 'blue',
        phoneMask: '+91 98400 99112',
        initials: 'KC',
        unreadCount: 0,
      },
    ];

    // If direct partner / warehouse context is passed, inject it at top
    if (partnerContext) {
      const partnerKey = partnerContext.threadKey || `chat_partner_${partnerContext.partnerId || 'wh'}`;
      const exists = defaultChannels.find((c) => c.key === partnerKey);
      if (!exists) {
        defaultChannels.unshift({
          key: partnerKey,
          title: partnerContext.partnerName || partnerContext.facilityName || 'Certified Storage Operator',
          subtitle: partnerContext.facilityName
            ? `WDRA Accredited Facility • Direct Inquiries`
            : `${partnerContext.partnerRole || 'Operator'} • Direct Secure Chat`,
          role: partnerContext.partnerRole || 'Warehouse Operator',
          category: 'warehouses',
          icon: Building2,
          avatarBg: 'bg-emerald-800',
          avatarColor: 'text-white',
          badgeColor: 'emerald',
          isWarehouse: true,
          facilityName: partnerContext.facilityName,
          phoneMask: '+91 98421 *****',
          initials: (partnerContext.partnerName || 'WH').slice(0, 2).toUpperCase(),
          unreadCount: 0,
        });
      }
    }

    try {
      let userOrders = [];
      if (user.role === 'farmer') {
        userOrders = await getFarmerOrders(user.id);
      } else {
        userOrders = await getBuyerOrders(user.id);
      }

      if (userOrders && userOrders.length > 0) {
        const partnerMap = new Map();

        userOrders.forEach((ord) => {
          const isUserBuyer = user.role === 'buyer';
          const partnerName = isUserBuyer
            ? ord.farmerName || 'Verified Producer'
            : ord.buyerName || 'Wholesale Buyer';

          const partnerId = isUserBuyer
            ? ord.farmerId || partnerName.toLowerCase().replace(/[^a-z0-9]/g, '_')
            : ord.buyerId || partnerName.toLowerCase().replace(/[^a-z0-9]/g, '_');

          const myIdentifier = user.name
            ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
            : user.role === 'buyer'
            ? 'maran'
            : 'veerappan';
          const sharedKey = getSharedThreadKey(myIdentifier, partnerId);
          const partnerRole = isUserBuyer ? 'Farmer' : 'Buyer';

          if (!partnerMap.has(partnerId)) {
            partnerMap.set(partnerId, {
              key: sharedKey,
              partnerId,
              partnerName,
              partnerRole,
              orders: [ord],
              commodities: [ord.commodity].filter(Boolean),
            });
          } else {
            const existing = partnerMap.get(partnerId);
            existing.orders.push(ord);
            if (ord.commodity && !existing.commodities.includes(ord.commodity)) {
              existing.commodities.push(ord.commodity);
            }
          }
        });

        // Convert grouped partners into deduplicated channels
        partnerMap.forEach((entry) => {
          const count = entry.orders.length;
          const commodityList = entry.commodities.slice(0, 3).join(', ');
          const singleOrderNum = entry.orders[0]?.orderNumber
            ? entry.orders[0].orderNumber.startsWith('#')
              ? entry.orders[0].orderNumber
              : `#${entry.orders[0].orderNumber}`
            : '';

          const subtitle =
            count === 1
              ? `Order ${singleOrderNum} • ${entry.orders[0]?.commodity || 'Produce'} (${entry.orders[0]?.quantity} ${entry.orders[0]?.unit || 'kg'})`
              : `${count} Active Orders (${commodityList}) • Escrow Protected`;

          const existsIdx = defaultChannels.findIndex((c) => c.key === entry.key);
          const channelObj = {
            key: entry.key,
            title: `${entry.partnerName} (${entry.partnerRole})`,
            subtitle,
            role: entry.partnerRole,
            category: 'orders',
            icon: Package,
            avatarBg: entry.partnerRole === 'Farmer' ? 'bg-emerald-600' : 'bg-indigo-600',
            avatarColor: 'text-white',
            badgeColor: 'blue',
            orders: entry.orders,
            phoneMask: '+91 98402 *****',
            initials: entry.partnerName.slice(0, 2).toUpperCase(),
            unreadCount: 0,
          };

          if (existsIdx >= 0) {
            defaultChannels[existsIdx] = channelObj;
          } else {
            defaultChannels.splice(1, 0, channelObj);
          }
        });
      }
    } catch (err) {
      console.warn('Error loading chat channels:', err);
    }

    // Attach stored message previews, read status & timestamps to each channel
    const enriched = await Promise.all(
      defaultChannels.map(async (c) => {
        const msgs = await fetchThreadMessages(c.key);
        const nonSystem = msgs.filter((m) => !m.isSystem && m.id !== 'msg_init');
        const latestMsg =
          nonSystem.length > 0
            ? nonSystem[nonSystem.length - 1]
            : msgs && msgs.length > 0
            ? msgs[msgs.length - 1]
            : null;
        const unreadCount = getThreadUnreadCount(c.key, user.id, msgs);
        const isLastSenderMe = latestMsg
          ? latestMsg.senderId === user.id || latestMsg.senderId === 'usr_current'
          : false;
        return {
          ...c,
          unreadCount,
          lastMessageText: latestMsg ? latestMsg.text : c.subtitle,
          lastMessageTime: latestMsg ? formatChatTimestamp(latestMsg.timestamp) : '2:27 pm',
          lastSenderMe: isLastSenderMe,
          lastMessageRead: latestMsg ? !!latestMsg.isRead : false,
        };
      })
    );

    setChannels(enriched);
    const totalUnread = enriched.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrolnk_chat_unread_update', { detail: { count: totalUnread } }));
    }
  };

  // Handle drawer open state and initial viewMode
  useEffect(() => {
    if (isOpen) {
      loadChannels();
      if (partnerContext) {
        const targetKey = partnerContext.threadKey || `chat_partner_${partnerContext.partnerId || 'wh'}`;
        markThreadAsRead(targetKey, user.id);
        setSelectedChannelKey(targetKey);
        setMessages(getThreadMessages(targetKey));
        fetchThreadMessages(targetKey).then((dbMsgs) => {
          if (dbMsgs && dbMsgs.length > 0) setMessages(dbMsgs);
        });
        setViewMode('conversation');
      } else if (orderContext) {
        const partnerName =
          user.role === 'buyer'
            ? orderContext.farmerName || 'Verified Producer'
            : orderContext.buyerName || 'Wholesale Buyer';
        const partnerId =
          user.role === 'buyer'
            ? orderContext.farmerId || partnerName.toLowerCase().replace(/[^a-z0-9]/g, '_')
            : orderContext.buyerId || partnerName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        const myIdentifier = user.name
          ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
          : user.role === 'buyer'
          ? 'maran'
          : 'veerappan';
        const matchedKey = getSharedThreadKey(myIdentifier, partnerId);
        markThreadAsRead(matchedKey, user.id);
        setSelectedChannelKey(matchedKey);
        setMessages(getThreadMessages(matchedKey));
        fetchThreadMessages(matchedKey).then((dbMsgs) => {
          if (dbMsgs && dbMsgs.length > 0) setMessages(dbMsgs);
        });
        setViewMode('conversation');
      } else {
        setViewMode('chat_list');
      }
    }
  }, [isOpen, partnerContext, orderContext]);

  // Load messages & subscribe to Supabase Realtime channel for selected conversation
  useEffect(() => {
    if (!isOpen || !selectedChannelKey) return;

    // Mark messages in this active thread as read
    markThreadAsRead(selectedChannelKey, user.id);

    // 1. Optimistic instant local load
    setMessages(getThreadMessages(selectedChannelKey));

    // 2. Fetch latest data from Supabase
    fetchThreadMessages(selectedChannelKey).then((fetched) => {
      if (fetched && fetched.length > 0) {
        setMessages(fetched);
      }
    });

    // 3. Supabase Realtime Subscription
    const unsubscribe = subscribeToThread(
      selectedChannelKey,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Also update channel preview list in background
        setChannels((prev) =>
          prev.map((c) =>
            c.key === selectedChannelKey
              ? {
                  ...c,
                  lastMessageText: newMsg.text,
                  lastMessageTime: formatChatTimestamp(newMsg.timestamp),
                  lastSenderMe: newMsg.senderId === user.id || newMsg.senderId === 'usr_current',
                  lastMessageRead: !!newMsg.isRead,
                }
              : c
          )
        );
      },
      (updatedMsg) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
        setChannels((prev) =>
          prev.map((c) =>
            c.key === selectedChannelKey
              ? {
                  ...c,
                  lastMessageRead: !!updatedMsg.isRead,
                }
              : c
          )
        );
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isOpen, selectedChannelKey]);

  // Sync across browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'agrolnk_privacy_chat_threads' && selectedChannelKey) {
        setMessages(getThreadMessages(selectedChannelKey));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedChannelKey]);

  useEffect(() => {
    if (viewMode === 'conversation') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, viewMode]);

  if (!isOpen) return null;

  const currentChannel =
    channels.find((c) => c.key === selectedChannelKey) ||
    channels[0] || {
      title: 'AgroLnk Desk & Smart Assistant',
      subtitle: 'Official Support & Trade Desk',
      role: 'AgroLnk Platform',
      badgeColor: 'emerald',
      avatarBg: 'bg-[#0B3326]',
      avatarColor: 'text-[#34D399]',
      initials: 'AL',
    };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const updated = sendPrivacyMessage(selectedChannelKey, {
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      text: inputText.trim(),
    });

    setMessages(updated);
    setInputText('');

    // Update channel preview in local state
    const nonSystem = updated.filter((m) => !m.isSystem && m.id !== 'msg_init');
    const latest = nonSystem[nonSystem.length - 1] || updated[updated.length - 1];
    if (latest) {
      setChannels((prev) =>
        prev.map((c) =>
          c.key === selectedChannelKey
            ? {
                ...c,
                lastMessageText: latest.text,
                lastMessageTime: formatChatTimestamp(latest.timestamp),
                lastSenderMe: true,
                lastMessageRead: false,
              }
            : c
        )
      );
    }
  };

  const openConversation = (key) => {
    markThreadAsRead(key, user.id);
    setSelectedChannelKey(key);
    setMessages(getThreadMessages(key));
    fetchThreadMessages(key).then((msgs) => {
      if (msgs && msgs.length > 0) setMessages(msgs);
    });
    setChannels((prev) => {
      const updated = prev.map((c) =>
        c.key === key || (key && c.key.includes(key)) ? { ...c, unreadCount: 0 } : c
      );
      const totalUnread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agrolnk_chat_unread_update', { detail: { count: totalUnread } }));
      }
      return updated;
    });
    setViewMode('conversation');
  };

  // Filter channels for Chats List (Image 3)
  const filteredChannels = channels.filter((chan) => {
    const matchesSearch =
      chan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chan.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chan.lastMessageText && chan.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeFilter === 'unread') return chan.unreadCount > 0;
    if (activeFilter === 'orders') return chan.category === 'orders';
    if (activeFilter === 'warehouses') return chan.category === 'warehouses';
    return true;
  });

  // Directory contacts for Contact Picker (Image 2)
  const allContacts = getPlatformContacts(user).filter((cnt) => {
    if (!searchQuery) return true;
    return (
      cnt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cnt.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cnt.status && cnt.status.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E5EDE8] animate-in slide-in-from-right duration-200 text-left relative overflow-hidden">
        
        {/* ========================================================================= */}
        {/* 1. MAIN WHATSAPP CHATS LIST VIEW (Image 3)                                */}
        {/* ========================================================================= */}
        {viewMode === 'chat_list' && (
          <div className="flex flex-col h-full bg-white">
            
            {/* Top Green Brand Header with + New Chat button */}
            <div className="px-5 py-4 bg-[#0B3326] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#34D399]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-heading text-white tracking-tight leading-none">
                    AgroLnk Chat
                  </h2>
                  <span className="text-[10px] text-[#34D399] font-medium tracking-wide">
                    100% Privacy Protected
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Green + New Chat Button (Matches WhatsApp Action) */}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setViewMode('contact_picker');
                  }}
                  title="New Chat / View Known Contacts"
                  className="w-9 h-9 rounded-full bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Bar (Image 3 Search or start a new chat) */}
            <div className="p-3 bg-white border-b border-[#E5EDE8] shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search or start a new chat"
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F0F2F5] border border-transparent text-xs font-medium text-[#14211D] placeholder:text-[#566861] focus:bg-white focus:border-[#10B981] focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#566861] hover:text-[#0B3326] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Pills (All, Unread, Orders, Warehouses, +) */}
              <div className="flex items-center gap-1.5 pt-2.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-[#EBF5F0] text-[#0B3326] font-bold border border-[#10B981]/30'
                      : 'bg-[#F0F2F5] text-[#566861] hover:bg-[#E5EDE8]'
                  }`}
                >
                  All
                </button>

                <button
                  onClick={() => setActiveFilter('unread')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === 'unread'
                      ? 'bg-[#EBF5F0] text-[#0B3326] font-bold border border-[#10B981]/30'
                      : 'bg-[#F0F2F5] text-[#566861] hover:bg-[#E5EDE8]'
                  }`}
                >
                  <span>Unread</span>
                  {channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#10B981] text-white text-[10px] font-bold flex items-center justify-center">
                      {channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveFilter('orders')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeFilter === 'orders'
                      ? 'bg-[#EBF5F0] text-[#0B3326] font-bold border border-[#10B981]/30'
                      : 'bg-[#F0F2F5] text-[#566861] hover:bg-[#E5EDE8]'
                  }`}
                >
                  Orders
                </button>

                <button
                  onClick={() => setActiveFilter('warehouses')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeFilter === 'warehouses'
                      ? 'bg-[#EBF5F0] text-[#0B3326] font-bold border border-[#10B981]/30'
                      : 'bg-[#F0F2F5] text-[#566861] hover:bg-[#E5EDE8]'
                  }`}
                >
                  Warehouses
                </button>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setViewMode('contact_picker');
                  }}
                  className="px-2 py-1 rounded-full text-xs font-bold bg-[#F0F2F5] text-[#10B981] hover:bg-[#EBF5F0] transition-all cursor-pointer ml-auto shrink-0"
                  title="New Contact / Group"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conversation Threads List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E5EDE8]">
              {filteredChannels.length > 0 ? (
                filteredChannels.map((chan) => {
                  const isSupport = chan.key.includes('support');
                  return (
                    <div
                      key={chan.key}
                      onClick={() => openConversation(chan.key)}
                      className="px-4 py-3 hover:bg-[#F5F6F6] transition-colors cursor-pointer flex items-center gap-3 relative group"
                    >
                      {/* Avatar Circle */}
                      <div
                        className={`w-12 h-12 rounded-full ${chan.avatarBg || 'bg-[#0B3326]'} ${
                          chan.avatarColor || 'text-white'
                        } flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs relative`}
                      >
                        {isSupport ? (
                          <Bot className="w-6 h-6 text-[#34D399]" />
                        ) : chan.category === 'warehouses' ? (
                          <Building2 className="w-6 h-6 text-white" />
                        ) : (
                          <span>{chan.initials || 'AP'}</span>
                        )}
                        {/* Online Indicator */}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                      </div>

                      {/* Content Preview */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-sm font-bold text-[#14211D] truncate group-hover:text-[#0B3326]">
                            {chan.title}
                          </h4>
                          <span className="text-[11px] text-[#566861] font-medium shrink-0">
                            {chan.lastMessageTime || '1:42 pm'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-[#566861] truncate flex items-center gap-1">
                            {chan.lastSenderMe && (
                              chan.lastMessageRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" title="Seen" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-[#8696A0] shrink-0" title="Sent" />
                              )
                            )}
                            <span className="truncate">{chan.lastMessageText || chan.subtitle}</span>
                          </p>

                          {chan.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-[#10B981] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                              {chan.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-[#566861] space-y-3">
                  <MessageSquare className="w-8 h-8 text-[#10B981] mx-auto opacity-60" />
                  <p className="font-semibold text-sm text-[#0B3326]">No chats found</p>
                  <p>Click the <b>+</b> button above to start a conversation with any verified counterparty or warehouse.</p>
                  <Button
                    variant="accent"
                    size="sm"
                    icon={Plus}
                    iconPosition="left"
                    onClick={() => {
                      setSearchQuery('');
                      setViewMode('contact_picker');
                    }}
                    className="mx-auto text-xs font-bold"
                  >
                    Start New Chat
                  </Button>
                </div>
              )}
            </div>

            {/* Bottom Info Banner */}
            <div className="p-3 bg-[#F8FAF8] border-t border-[#E5EDE8] flex items-center justify-between text-[11px] text-[#566861] shrink-0">
              <div className="flex items-center gap-1.5 text-[#10B981] font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>AgroLnk Encrypted Anti-Circumvention</span>
              </div>
              <span className="text-[10px] text-[#566861]">Zero Commission Leakage</span>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. KNOWN CONTACTS PICKER VIEW (Image 2)                                  */}
        {/* ========================================================================= */}
        {viewMode === 'contact_picker' && (
          <div className="flex flex-col h-full bg-white">
            
            {/* Contacts Header */}
            <div className="px-4 py-3.5 bg-[#0B3326] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('chat_list')}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Back to Chats"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-sm text-white">Select Known Contact</h3>
                  <span className="text-[11px] text-[#34D399]">
                    {allContacts.length} verified trading contacts
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contact Search Input (Image 2: Search name, number or @username) */}
            <div className="p-3 bg-white border-b border-[#E5EDE8] shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-[#10B981] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, number or @username"
                  className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[#F0F2F5] border border-[#10B981]/30 text-xs font-medium text-[#14211D] placeholder:text-[#566861] focus:bg-white focus:border-[#10B981] focus:outline-none transition-colors shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#566861] hover:text-[#0B3326] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Contacts Directory */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E5EDE8]">
              
              {/* My Status Item (Matching Image 2) */}
              <div
                onClick={() => openConversation('agrolnk_support_desk')}
                className="px-4 py-3 hover:bg-[#F8FAF8] transition-colors cursor-pointer flex items-center gap-3.5"
              >
                <div className="w-11 h-11 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-[#14211D]">
                    {user.name || 'Verified Participant'} (You)
                  </h4>
                  <p className="text-xs text-[#566861] truncate">
                    AgroLnk Escrow Verified Profile &bull; Message Support
                  </p>
                </div>
              </div>

              {/* Subheader */}
              <div className="px-4 py-2 bg-[#F8FAF8] text-[11px] font-bold text-[#566861] uppercase tracking-wider">
                Recent Contacts & Known Counterparties
              </div>

              {/* Contacts List */}
              {allContacts.map((contact) => {
                return (
                  <div
                    key={contact.id}
                    onClick={() => openConversation(contact.threadKey)}
                    className="px-4 py-3 hover:bg-[#F0FDF4] transition-colors cursor-pointer flex items-center gap-3.5 group"
                  >
                    {/* Circle Avatar */}
                    <div
                      className={`w-11 h-11 rounded-full ${contact.avatarColor || 'bg-[#0B3326] text-white'} flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs`}
                    >
                      {contact.isOfficial ? (
                        <Bot className="w-5 h-5 text-[#34D399]" />
                      ) : contact.category === 'warehouse' ? (
                        <Building2 className="w-5 h-5 text-white" />
                      ) : (
                        <span>{contact.initials || 'TC'}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-sm font-bold text-[#14211D] group-hover:text-[#0B3326] truncate">
                          {contact.name}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#10B981] shrink-0">
                          {contact.role}
                        </span>
                      </div>
                      <p className="text-xs text-[#566861] truncate">
                        {contact.status || 'Hey there! I am using AgroLnk secure trade.'}
                      </p>
                    </div>
                  </div>
                );
              })}

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. ACTIVE WHATSAPP CHAT CONVERSATION VIEW (Image 1)                       */}
        {/* ========================================================================= */}
        {viewMode === 'conversation' && (
          <div className="flex flex-col h-full bg-[#F8FAF8]">
            
            {/* Conversation Header with Back Button */}
            <div className="px-4 py-3.5 bg-[#0B3326] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => {
                    loadChannels();
                    setViewMode('chat_list');
                  }}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title="Back to Chats List"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  className={`w-10 h-10 rounded-full ${currentChannel.avatarBg || 'bg-[#0F4A37]'} ${
                    currentChannel.avatarColor || 'text-white'
                  } flex items-center justify-center font-bold text-xs shrink-0 border border-white/20`}
                >
                  {currentChannel.key.includes('support') ? (
                    <Bot className="w-5 h-5 text-[#34D399]" />
                  ) : currentChannel.category === 'warehouses' ? (
                    <Building2 className="w-5 h-5 text-white" />
                  ) : (
                    <span>{currentChannel.initials || 'AP'}</span>
                  )}
                </div>

                <div className="min-w-0 text-left">
                  <h3 className="font-bold text-sm text-white truncate">
                    {currentChannel.title}
                  </h3>
                  <span className="text-[11px] text-[#34D399] block truncate">
                    {currentChannel.subtitle || 'Active Escrow Protection • Online'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Privacy Shield Notice (Matching Image 1) */}
            <div className="px-4 py-2.5 bg-[#EBF5F0] border-b border-[#10B981]/20 text-[11px] text-[#0B3326] flex items-center gap-2 shrink-0 text-left font-medium">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>Privacy Shield Active &bull; Phone numbers, emails, and direct accounts are protected.</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#EFEAE2]/30 text-left">
              {messages.map((msg) => {
                const isMe = msg.senderId === user.id;
                const isSystem = msg.isSystem;

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs space-y-1 text-xs text-[#0B3326] my-2"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#10B981]">
                        <Bot className="w-4 h-4" />
                        <span>{msg.senderName}</span>
                      </div>
                      <p className="text-[#566861] leading-relaxed text-xs">{msg.text}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed relative shadow-2xs ${
                        msg.text.includes('[Protected') || msg.text.includes('[Fragment Redacted')
                          ? 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/30 font-medium'
                          : isMe
                          ? 'bg-[#E7FFDB] text-[#14211D] rounded-tr-none border border-[#D1F4BE]'
                          : 'bg-white border border-[#E5EDE8] text-[#14211D] rounded-tl-none'
                      }`}
                    >
                      {msg.text.includes('[Protected') || msg.text.includes('[Fragment Redacted') ? (
                        <div className="flex items-start gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                          <span>{msg.text}</span>
                        </div>
                      ) : (
                        <span>{msg.text}</span>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#566861]">
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          }).toLowerCase()}
                        </span>
                        {isMe && (
                          msg.isRead ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" title="Seen" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#8696A0] shrink-0" title="Sent" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Live Typing Privacy Warning */}
            {inputText.trim() &&
              (maskSensitivePII(inputText) !== inputText ||
                maskSensitivePII(inputText).includes('[Protected')) && (
                <div className="px-4 py-2 bg-[#FFFBEB] border-t border-[#FCD34D] text-[11px] text-[#B45309] flex items-center gap-1.5 shrink-0 text-left animate-in fade-in duration-150">
                  <Lock className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                  <span>
                    <b>Privacy Shield:</b> Direct contact detail detected. Will be masked on send to preserve escrow warranty.
                  </span>
                </div>
              )}

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSend}
              className="p-3 sm:p-4 border-t border-[#E5EDE8] bg-white flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message ${currentChannel.title.split('(')[0].trim()} (PII masked)...`}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-[#F0F2F5] border border-transparent text-xs font-medium text-[#14211D] placeholder:text-[#566861]/70 focus:bg-white focus:border-[#10B981] focus:outline-none transition-colors"
              />
              <Button
                type="submit"
                variant="accent"
                size="sm"
                disabled={!inputText.trim()}
                icon={Send}
                iconPosition="right"
                className="px-4 py-2.5 font-bold rounded-2xl cursor-pointer shrink-0 shadow-sm"
              >
                Send
              </Button>
            </form>

          </div>
        )}

      </div>
    </div>
  );
}
