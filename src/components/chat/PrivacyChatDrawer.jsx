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
  MessageSquare
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getThreadMessages, sendPrivacyMessage, maskSensitivePII } from '../../utils/chat';

export default function PrivacyChatDrawer({
  isOpen,
  onClose,
  currentUser,
  threadKey = 'general_support',
  orderContext = null,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const user = currentUser || { id: 'usr_guest', name: 'Trading Participant', role: 'buyer' };

  useEffect(() => {
    if (isOpen) {
      const activeKey = orderContext?.orderNumber || threadKey;
      setMessages(getThreadMessages(activeKey));
    }
  }, [isOpen, threadKey, orderContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const activeKey = orderContext?.orderNumber || threadKey;
    const updated = sendPrivacyMessage(activeKey, {
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      text: inputText.trim(),
    });

    setMessages(updated);
    setInputText('');
  };

  const activeKey = orderContext?.orderNumber || threadKey;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E5EDE8] animate-in slide-in-from-right duration-200">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5EDE8] bg-[#0B3326] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0F4A37] text-white flex items-center justify-center border border-[#14624A]">
              <Lock className="w-4 h-4 text-[#34D399]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white">
                  Privacy Shield Chat
                </h3>
                <Badge variant="accent" size="sm">
                  PII Masked
                </Badge>
              </div>
              <span className="text-[11px] text-[#DCFCE7]/80 block">
                {orderContext ? `Order ${orderContext.orderNumber} • ${orderContext.commodity}` : 'AgroLnk Participant Channel'}
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

        {/* Protection Notice Banner */}
        <div className="p-3 bg-[#EBF5F0] border-b border-[#10B981]/20 text-[11px] text-[#0B3326] flex items-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>Phone numbers, emails, and direct accounts are protected from direct exposure.</span>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8FAF8]">
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
                  <span className="font-semibold text-[#14211D]">{isMe ? 'You' : msg.senderName}</span>
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
            placeholder="Type message (phone/email masked automatically)..."
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
