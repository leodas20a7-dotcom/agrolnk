import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Sparkles, X, Plus } from 'lucide-react';
import {
  getPlatformCommodities,
  fetchRemoteCommodities,
  registerCustomCommodity,
  COMMODITY_IMAGES,
} from '../../utils/listings';

export default function CommoditySelect({
  value,
  onChange,
  onImageChange,
  placeholder = 'Select Commodity',
  className = '',
  userId = null,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [commodities, setCommodities] = useState(() => getPlatformCommodities());
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCropName, setNewCropName] = useState('');

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync commodities with Supabase on mount and listen to global events
  useEffect(() => {
    fetchRemoteCommodities().then((list) => {
      if (list && list.length > 0) setCommodities(list);
    });

    const handleUpdate = () => {
      setCommodities(getPlatformCommodities());
    };
    window.addEventListener('agrolnk_commodities_updated', handleUpdate);
    return () => window.removeEventListener('agrolnk_commodities_updated', handleUpdate);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsAddingNew(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = commodities.filter((c) =>
    c.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleSelect = (commodityName) => {
    onChange?.(commodityName);
    if (onImageChange) {
      const defaultImg = COMMODITY_IMAGES[commodityName] || COMMODITY_IMAGES.Other;
      onImageChange(defaultImg, true);
    }
    setIsOpen(false);
    setSearchTerm('');
    setIsAddingNew(false);
  };

  const handleAddNewCrop = async (customName) => {
    const targetName = (customName || newCropName || searchTerm).trim();
    if (!targetName) return;

    const clean = targetName.charAt(0).toUpperCase() + targetName.slice(1);
    const registered = await registerCustomCommodity(clean, null, userId);

    if (registered) {
      setCommodities(getPlatformCommodities());
      handleSelect(registered);
      setNewCropName('');
      setIsAddingNew(false);
      setSearchTerm('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border text-xs font-semibold text-left transition-all flex items-center justify-between cursor-pointer ${
          isOpen
            ? 'border-[#10B981] ring-2 ring-[#10B981]/20 bg-white shadow-xs'
            : 'border-[#E5EDE8] hover:border-[#10B981]/60 hover:bg-white'
        } ${!value ? 'text-[#8C9E96]' : 'text-[#14211D]'}`}
      >
        <div className="flex items-center gap-2 truncate">
          {value ? (
            <>
              {COMMODITY_IMAGES[value] && (
                <img
                  src={COMMODITY_IMAGES[value]}
                  alt={value}
                  className="w-5 h-5 rounded-md object-cover border border-[#E5EDE8] shrink-0"
                />
              )}
              <span className="font-bold text-[#0B3326] truncate">{value}</span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#566861] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#10B981]' : ''
          }`}
        />
      </button>

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-2xl border border-[#E5EDE8] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header inside Dropdown */}
          <div className="p-2 border-b border-[#F0F4F2] bg-[#F8FAF8]">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#8C9E96] absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filtered.length > 0) {
                      handleSelect(filtered[0]);
                    } else if (searchTerm.trim()) {
                      handleAddNewCrop(searchTerm);
                    }
                  }
                }}
                placeholder="Search crop or type to add..."
                className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-white border border-[#E5EDE8] text-[#14211D] placeholder:text-[#8C9E96] focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 p-0.5 rounded-full text-[#8C9E96] hover:text-[#14211D] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Commodity Items List - Exactly 5 visible items with scrollbar */}
          <div
            className="overflow-y-auto divide-y divide-[#F8FAF8] overscroll-contain"
            style={{ maxHeight: '210px' }} // Height calibrated for exactly 5 items (42px each)
          >
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const isSelected = value?.toLowerCase() === item.toLowerCase();
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full px-3 py-2.5 text-xs flex items-center justify-between text-left transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-[#EBF5F0] text-[#0B3326] font-bold'
                        : 'hover:bg-[#F2FBF6] text-[#14211D] font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {COMMODITY_IMAGES[item] ? (
                        <img
                          src={COMMODITY_IMAGES[item]}
                          alt={item}
                          className="w-5 h-5 rounded-md object-cover border border-[#E5EDE8] shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-md bg-[#E5EDE8] flex items-center justify-center text-[10px] shrink-0 text-[#0B3326] font-bold">
                          {item.charAt(0)}
                        </div>
                      )}
                      <span className="truncate group-hover:text-[#0B3326]">{item}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center space-y-2">
                <p className="text-2xs text-[#566861]">
                  No crop found matching <span className="font-bold text-[#14211D]">"{searchTerm}"</span>
                </p>
                <button
                  type="button"
                  onClick={() => handleAddNewCrop(searchTerm)}
                  className="w-full py-2 px-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Add "{searchTerm.trim()}" to Platform
                </button>
              </div>
            )}
          </div>

          {/* Quick Add Custom Crop Footer */}
          {!isAddingNew ? (
            <div className="p-2 border-t border-[#F0F4F2] bg-[#F8FAF8]">
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="w-full py-1.5 px-3 rounded-xl border border-dashed border-[#10B981]/50 hover:bg-[#EBF5F0] text-[#10B981] hover:text-[#0B3326] text-2xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add New / Missing Commodity...</span>
              </button>
            </div>
          ) : (
            <div className="p-2.5 border-t border-[#10B981]/30 bg-[#EBF5F0] space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newCropName}
                  onChange={(e) => setNewCropName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewCrop(newCropName);
                    }
                  }}
                  placeholder="e.g. Dragon Fruit, Moringa"
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white rounded-lg border border-[#10B981] text-[#14211D] focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleAddNewCrop(newCropName)}
                  disabled={!newCropName.trim()}
                  className="px-2.5 py-1.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewCropName('');
                  }}
                  className="p-1 text-[#566861] hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
