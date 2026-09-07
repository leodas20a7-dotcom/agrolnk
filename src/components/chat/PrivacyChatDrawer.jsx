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
  Headphones
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getThreadMessages, sendPrivacyMessage, maskSensitivePII, getSharedThreadKey } from '../../utils/chat';
import { getBuyerOrders, getFarmerOrders } from '../../utils/orders';

export default function PrivacyChatDrawer({
  isOpen,
  onClose,
  currentUser,
  threadKey = 'general_support',
  orderContext = null,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [channels, setChannels] = useState([]);
  const [selectedChannelKey, setSelectedChannelKey] = useState(threadKey);
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const user = currentUser || { id: 'usr_guest', name: 'Trading Participant', role: 'buyer' };

  // Load available channels (Support Desk + Deduplicated Trading Partners)
  useEffect(() => {
    const loadChannels = async () => {
      const defaultChannels = [
        {
          key: `${user.role || 'general'}_support`,
          title: 'AgroLnk Desk & Smart Assistant',
          subtitle: 'Official Support, Escrow & Dispute Desk',
          role: 'Admin & AI Assistant',
          icon: Headphones,
          badgeColor: 'emerald',
        },
      ];

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
              ? (ord.farmerName || 'Verified Producer')
              : (ord.buyerName || 'Wholesale Buyer');
            
            const partnerId = isUserBuyer
              ? (ord.farmerId || partnerName.toLowerCase().replace(/[^a-z0-9]/g, '_'))
              : (ord.buyerId || partnerName.toLowerCase().replace(/[^a-z0-9]/g, '_'));

            const myIdentifier = user.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : (user.role === 'buyer' ? 'maran' : 'veerappan');
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
              ? (entry.orders[0].orderNumber.startsWith('#') ? entry.orders[0].orderNumber : `#${entry.orders[0].orderNumber}`)
              : '';

            const subtitle = count === 1
              ? `Order ${singleOrderNum} • ${entry.orders[0]?.commodity || 'Produce'} (${entry.orders[0]?.quantity} ${entry.orders[0]?.unit || 'kg'})`
              : `${count} Active Orders (${commodityList}) • Escrow Protected`;

            defaultChannels.push({
              key: entry.key,
              title: `${entry.partnerName} (${entry.partnerRole})`,
              subtitle,
              role: entry.partnerRole,
              icon: Package,
              badgeColor: 'blue',
              orders: entry.orders,
            });
          });
        }
      } catch (err) {
        console.warn('Error loading chat channels:', err);
      }

      setChannels(defaultChannels);

      // Default to orderContext if provided, else support or active channel
      if (orderContext) {
        const partnerName = user.role === 'buyer' 
          ? (orderContext.farmerName || 'Verified Producer') 
          : (orderContext.buyerName || 'Wholesale Buyer');
        const partnerId = user.role === 'buyer'
          ? (orderContext.farmerId || partnerName.toLowerCase().replace(/[^a-z0-9]/g, '_'))
          : (orderContext.buyerId || partnerName.toLowerCase().replace(/[^a-z0-9]/g, '_'));
        
        const myIdentifier = user.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : (user.role === 'buyer' ? 'maran' : 'veerappan');
        const matchedKey = getSharedThreadKey(myIdentifier, partnerId);
        setSelectedChannelKey(matchedKey);
      } else if (!selectedChannelKey) {
        setSelectedChannelKey(defaultChannels[0].key);
      }
    };

    if (isOpen) {
      loadChannels();
    }
  }, [isOpen, user.id, user.name, user.role, orderContext]);

  // Load messages for the selected channel with live storage sync
  const refreshMessages = () => {
    if (selectedChannelKey) {
      setMessages(getThreadMessages(selectedChannelKey));
    }
  };

  useEffect(() => {
    if (isOpen && selectedChannelKey) {
      refreshMessages();
    }
  }, [isOpen, selectedChannelKey]);

  // Live cross-tab / cross-role storage listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'agrolnk_privacy_chat_threads') {
        refreshMessages();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedChannelKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const currentChannel = channels.find(c => c.key === selectedChannelKey) || channels[0] || {
    title: 'AgroLnk Desk & Smart Assistant',
    subtitle: 'Official Support & Trade Desk',
    role: 'AgroLnk Platform',
    badgeColor: 'emerald',
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
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E5EDE8] animate-in slide-in-from-right duration-200">
        
        {/* Top Header with Explicit Counterparty Info */}
        <div className="p-4 sm:p-5 border-b border-[#E5EDE8] bg-[#0B3326] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F4A37] text-white flex items-center justify-center border border-[#14624A] shrink-0">
              <Lock className="w-5 h-5 text-[#34D399]" />
            </div>
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-[#34D399] tracking-wider block">
                  Chatting With:
                </span>
              </div>
              <h3 className="font-bold text-sm text-white line-clamp-1">
                {currentChannel.title}
              </h3>
              <span className="text-[11px] text-[#DCFCE7]/80 block line-clamp-1">
                {currentChannel.subtitle}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Selector Bar */}
        {channels.length > 1 && (
          <div className="p-2.5 bg-[#F8FAF8] border-b border-[#E5EDE8] shrink-0 text-left relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#566861]">Conversation:</span>
              <button
                type="button"
                onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#E5EDE8] hover:bg-[#F2FBF6] transition-colors cursor-pointer shadow-2xs"
              >
                <span className="line-clamp-1 max-w-[200px]">{currentChannel.title}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              </button>
            </div>

            {/* Dropdown Options */}
            {isChannelDropdownOpen && (
              <div className="absolute top-full left-2 right-2 mt-1 bg-white rounded-2xl border border-[#E5EDE8] shadow-xl z-20 overflow-hidden divide-y divide-[#E5EDE8] animate-in fade-in zoom-in-95 duration-150">
                {channels.map((chan) => {
                  const Icon = chan.icon || MessageSquare;
                  const isSelected = chan.key === selectedChannelKey;
                  return (
                    <button
                      key={chan.key}
                      onClick={() => {
                        setSelectedChannelKey(chan.key);
                        setIsChannelDropdownOpen(false);
                      }}
                      className={`w-full p-3 text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#EBF5F0]' : 'hover:bg-[#F8FAF8]'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-[#F0FDF4] text-[#0B3326] shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-[#10B981]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0B3326] truncate">
                            {chan.title}
                          </span>
                          <span className="text-[10px] font-semibold text-[#10B981]">
                            {chan.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#566861] truncate mt-0.5">
                          {chan.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Protection Notice Banner */}
        <div className="p-2.5 bg-[#EBF5F0] border-b border-[#10B981]/20 text-[11px] text-[#0B3326] flex items-center gap-2 shrink-0 text-left">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>Privacy Shield Active &bull; Phone numbers, emails, and direct accounts are protected.</span>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8FAF8] text-left">
          {messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            const isSystem = msg.isSystem;

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="p-3 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs space-y-1 text-xs text-[#0B3326] my-2"
                >
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#10B981]">
                    <Bot className="w-3.5 h-3.5" />
                    <span>{msg.senderName}</span>
                  </div>
                  <p className="text-[#566861] leading-relaxed text-[11px]">{msg.text}</p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-[#566861]">
                  <span className="font-semibold text-[#14211D]">
                    {isMe ? `You (${user.role === 'buyer' ? 'Buyer' : user.role === 'farmer' ? 'Farmer' : 'Participant'})` : msg.senderName}
                  </span>
                  <span>• {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[#0B3326] text-white rounded-tr-none shadow-xs'
                      : 'bg-white border border-[#E5EDE8] text-[#14211D] rounded-tl-none shadow-2xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 sm:p-4 border-t border-[#E5EDE8] bg-white flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${currentChannel.title.split('(')[0].trim()} (PII masked automatically)...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] placeholder:text-[#566861]/60 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
          <Button
            type="submit"
            variant="accent"
            size="sm"
            disabled={!inputText.trim()}
            icon={Send}
            iconPosition="right"
            className="px-3.5 py-2.5 font-bold cursor-pointer shrink-0"
          >
            Send
          </Button>
        </form>

      </div>
    </div>
  );
}
