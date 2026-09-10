import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

/**
 * Reusable SearchableSelect Component
 * 
 * @param {Array<string|{value: string, label: string, subtext?: string, icon?: any, badge?: string}>} options
 * @param {string} value - Selected value
 * @param {Function} onChange - (value, optionObj) => void
 * @param {string} placeholder - Placeholder text
 * @param {string} searchPlaceholder - Placeholder inside search input
 * @param {string} label - Optional field label
 * @param {boolean} disabled - Disable the dropdown
 * @param {boolean} required - Form validation flag
 * @param {string} className - Additional container styling
 * @param {string} buttonClassName - Custom trigger button styling
 * @param {string} dropdownClassName - Custom dropdown popup styling
 * @param {boolean} allowClear - Show clear (X) icon when value selected
 */
export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  label = null,
  disabled = false,
  required = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  allowClear = false,
  id = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to uniform { value, label, subtext, icon, badge }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: String(opt), label: String(opt) };
      }
      return {
        value: String(opt.value ?? opt.id ?? opt.name ?? ''),
        label: String(opt.label ?? opt.name ?? opt.title ?? opt.value ?? ''),
        subtext: opt.subtext || opt.description || null,
        icon: opt.icon || null,
        badge: opt.badge || null,
        ...opt,
      };
    });
  }, [options]);

  // Find currently selected option object
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === String(value)) || null;
  }, [normalizedOptions, value]);

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(term))
    );
  }, [normalizedOptions, searchTerm]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : Math.max(0, filteredOptions.length - 1)
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleSelect = (option) => {
    onChange?.(option.value, option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('', null);
    setSearchTerm('');
  };

  return (
    <div
      ref={containerRef}
      className={`relative text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-[#14211D] mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] shadow-2xs hover:border-[#10B981]/50 focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed bg-[#F8FAF8]' : ''
        } ${isOpen ? 'ring-2 ring-[#10B981] border-transparent' : ''} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="text-[#10B981] shrink-0">
              {React.createElement(selectedOption.icon, { className: 'w-4 h-4' })}
            </span>
          )}
          {selectedOption ? (
            <span className="truncate text-[#14211D] font-bold">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-[#566861] font-normal truncate">
              {placeholder}
            </span>
          )}
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#EBF5F0] text-[#0B3326] rounded-md shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && value && !disabled && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClear(e);
                }
              }}
              className="p-1 rounded-md text-[#566861] hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </div>
          )}
          <ChevronDown
            className={`w-4 h-4 text-[#566861] transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#10B981]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5EDE8] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
          style={{ minWidth: '100%' }}
        >
          {/* Integrated Search Bar Inside Dropdown */}
          <div className="p-2 border-b border-[#E5EDE8] bg-[#F8FAF8]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#566861] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] placeholder:text-[#566861] focus:outline-none focus:ring-1.5 focus:ring-[#10B981]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#566861] hover:text-[#14211D]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-transparent"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-[#566861]">
                <p className="font-semibold">No options found</p>
                <p className="text-[11px] text-[#566861]/80 mt-0.5">
                  Try searching for something else
                </p>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={opt.value + '_' + idx}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF5F0] text-[#0B3326] font-bold'
                        : isHighlighted
                        ? 'bg-[#F2FBF6] text-[#14211D]'
                        : 'text-[#14211D] hover:bg-[#F8FAF8]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && (
                        <span className="text-[#10B981] shrink-0">
                          {React.createElement(opt.icon, { className: 'w-3.5 h-3.5' })}
                        </span>
                      )}
                      <div className="truncate">
                        <span className="block truncate">{opt.label}</span>
                        {opt.subtext && (
                          <span className="block text-[10px] text-[#566861] truncate font-normal">
                            {opt.subtext}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#E5EDE8] text-[#566861] rounded">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
