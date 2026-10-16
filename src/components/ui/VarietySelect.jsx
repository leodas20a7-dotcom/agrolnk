import React, { useState, useEffect, useMemo } from 'react';
import SearchableSelect from './SearchableSelect';
import { X } from 'lucide-react';
import { getVarietiesWithDetails } from '../../data/commodityTaxonomy';

/**
 * VarietySelect Component
 * Context-aware variety dropdown dynamically driven by the selected commodity.
 * Defaults to commercial varieties with fallback to custom entry.
 */
export default function VarietySelect({
  commodity = '',
  value = '',
  onChange,
  disabled = false,
  placeholder = 'Select Variety / Cultivar',
  className = '',
  required = false,
  id = null,
}) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Fetch detailed varieties for the selected commodity
  const detailedVarieties = useMemo(() => {
    if (!commodity) return [];
    return getVarietiesWithDetails(commodity);
  }, [commodity]);

  const rawVarieties = useMemo(() => {
    return ['None', ...detailedVarieties.map((v) => v.name)];
  }, [detailedVarieties]);

  // Build select options with default "None" option at the top
  const options = useMemo(() => {
    const list = [
      {
        value: 'None',
        label: 'None',
        subtext: 'No specific variety / cultivar (hide variety)',
      },
      ...detailedVarieties
        .filter((v) => v.name && v.name !== 'Standard / FAQ Lot')
        .map((v) => ({
          value: v.name,
          label: v.name,
          image: v.imageUrl || null,
          subtext: 'Commercial Variety',
        })),
    ];

    // Add option to enter custom variety
    list.push({
      value: '__custom__',
      label: '+ Enter Custom Variety...',
      subtext: 'Type a regional or new seed cultivar',
    });

    return list;
  }, [detailedVarieties]);

  // Synchronize custom mode when commodity or external value changes
  useEffect(() => {
    if (!commodity) {
      setIsCustomMode(false);
      setCustomValue('');
      return;
    }

    if (!value || value === 'None') {
      setIsCustomMode(false);
      setCustomValue('');
    } else if (rawVarieties.includes(value)) {
      setIsCustomMode(false);
    } else if (value && !rawVarieties.includes(value)) {
      // If value was previously typed or not in list
      setIsCustomMode(true);
      setCustomValue(value);
    }
  }, [commodity, value, rawVarieties]);

  if (!commodity) {
    return (
      <div className={`relative ${className}`}>
        <input
          type="text"
          disabled
          placeholder="Select a commodity first..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold text-[#566861]/40 cursor-not-allowed select-none"
        />
      </div>
    );
  }

  if (isCustomMode) {
    return (
      <div className={`relative flex items-center gap-1.5 ${className}`}>
        <div className="relative flex-1">
          <input
            id={id}
            type="text"
            value={customValue}
            autoFocus
            onChange={(e) => {
              const val = e.target.value;
              setCustomValue(val);
              onChange?.(val);
            }}
            placeholder="Type custom variety name..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#10B981] text-xs font-semibold text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCustomMode(false);
            setCustomValue('');
            onChange?.('None');
          }}
          title="Back to standard varieties"
          className="p-2.5 rounded-xl text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <SearchableSelect
        id={id}
        options={options}
        value={value || 'None'}
        onChange={(val) => {
          if (val === '__custom__') {
            setIsCustomMode(true);
            setCustomValue('');
            onChange?.('');
          } else {
            onChange?.(val);
          }
        }}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        searchPlaceholder="Search variety..."
        buttonClassName="py-2.5 text-xs font-semibold bg-[#F8FAF8] border-[#E5EDE8] text-[#14211D]"
      />
    </div>
  );
}
