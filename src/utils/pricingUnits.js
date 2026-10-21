/**
 * Agricultural Unit Conversion & Pricing Engine
 * 
 * Standard Indian Mandi & Bulk Trade Multipliers:
 * - 1 MT (Metric Tonne) = 1,000 kg = 10 Quintals
 * - 1 Quintal (Qtl)     = 100 kg   = 0.1 MT
 * - 1 kg (Kilogram)     = 1 kg     = 0.01 Quintal = 0.001 MT
 */

export const UNIT_KG_FACTORS = {
  kg: 1,
  Quintal: 100,
  MT: 1000,
};

export const PRICING_UNIT_OPTIONS = [
  { value: 'Quintal', label: 'Quintal (Qtl - Mandi standard)' },
  { value: 'MT', label: 'Metric Tonne (MT - Bulk)' },
  { value: 'kg', label: 'Kilogram (kg - Retail/Sample)' },
];

/**
 * Computes exact agricultural pricing breakdowns across all canonical units.
 * 
 * Example:
 *   quantity = 30, unit = 'MT'
 *   quotedPrice = 1850, priceUnit = 'Quintal'
 * 
 * Results in:
 *   totalKg = 30,000 kg (300 Qtl)
 *   pricePerKg = ₹18.50 / kg
 *   pricePerQuintal = ₹1,850 / Qtl
 *   pricePerMT = ₹18,500 / MT
 *   totalEscrowValue = ₹5,55,000
 * 
 * @param {Object} params
 * @param {number|string} params.quantity - Batch volume amount
 * @param {string} [params.unit='kg'] - Volume unit ('kg' | 'Quintal' | 'MT')
 * @param {number|string} params.price - Quoted price amount
 * @param {string} [params.priceUnit] - Basis unit of the quoted price (defaults to params.unit)
 * @returns {Object} Comprehensive pricing breakdown
 */
export function computePricingBreakdown({
  quantity = 0,
  unit = 'kg',
  price = 0,
  priceUnit = null,
}) {
  const qtyNum = Math.max(0, Number(quantity) || 0);
  const priceNum = Math.max(0, Number(price) || 0);
  const volUnit = UNIT_KG_FACTORS[unit] ? unit : 'kg';
  const rateUnit = UNIT_KG_FACTORS[priceUnit] ? priceUnit : volUnit;

  // 1. Total Mass in Kilograms
  const factorVolumeToKg = UNIT_KG_FACTORS[volUnit] || 1;
  const totalKg = qtyNum * factorVolumeToKg;

  // 2. Base Price in ₹ per Kilogram
  const factorPriceToKg = UNIT_KG_FACTORS[rateUnit] || 1;
  const pricePerKg = factorPriceToKg > 0 ? priceNum / factorPriceToKg : 0;

  // 3. Normalized Rates Across Canonical Units
  const pricePerMT = Math.round(pricePerKg * 1000 * 100) / 100;
  const pricePerQuintal = Math.round(pricePerKg * 100 * 100) / 100;
  const pricePerKgClean = Math.round(pricePerKg * 100) / 100;

  // 4. Canonical Price per Listing Unit (for DB storage & buyer cart calculation)
  const canonicalPricePerListingUnit = Math.round(pricePerKg * factorVolumeToKg * 100) / 100;

  // 5. Total Escrow Transaction Value
  const totalEscrowValue = Math.round(totalKg * pricePerKg);

  // 6. Equivalent Quantities in Other Units
  const totalQuintals = totalKg / 100;
  const totalMT = totalKg / 1000;

  return {
    quantity: qtyNum,
    unit: volUnit,
    quotedPrice: priceNum,
    priceUnit: rateUnit,
    totalKg,
    totalQuintals,
    totalMT,
    pricePerKg: pricePerKgClean,
    pricePerQuintal,
    pricePerMT,
    canonicalPricePerListingUnit,
    totalEscrowValue,
  };
}

/**
 * Formats a clean dual-price badge for display in product cards and listings.
 * Example: "₹1,850/Qtl (₹18,500/MT)"
 */
export function formatDualPriceRate(price, unit) {
  const p = Number(price) || 0;
  if (!p) return '₹0';

  if (unit === 'MT') {
    const perQtl = Math.round(p / 10);
    return `₹${perQtl.toLocaleString('en-IN')}/Qtl (₹${p.toLocaleString('en-IN')}/MT)`;
  }

  if (unit === 'Quintal' || unit === 'Qtl') {
    const perMT = Math.round(p * 10);
    return `₹${p.toLocaleString('en-IN')}/Qtl (₹${perMT.toLocaleString('en-IN')}/MT)`;
  }

  return `₹${p.toLocaleString('en-IN')} per ${unit}`;
}

/**
 * Converts a volume quantity from one agricultural unit to another.
 * Example:
 *   convertVolume(50, 'Quintal', 'MT') => 5
 *   convertVolume(5, 'MT', 'Quintal')  => 50
 *   convertVolume(5000, 'kg', 'MT')    => 5
 */
export function convertVolume(quantity, fromUnit = 'kg', toUnit = 'kg') {
  const q = Number(quantity) || 0;
  if (q <= 0) return 0;
  const factorFrom = UNIT_KG_FACTORS[fromUnit] || 1;
  const factorTo = UNIT_KG_FACTORS[toUnit] || 1;
  const inKg = q * factorFrom;
  const result = inKg / factorTo;
  // Round cleanly up to 4 decimal places for clean display
  return Math.round(result * 10000) / 10000;
}

/**
 * Calculates the exact price rate per target unit given a listing's price and listing unit.
 * Example:
 *   getRateInUnit(18500, 'MT', 'Quintal') => 1850
 *   getRateInUnit(1850, 'Quintal', 'MT')  => 18500
 *   getRateInUnit(1850, 'Quintal', 'kg')  => 18.5
 */
export function getRateInUnit(price, listingUnit = 'kg', targetUnit = 'kg') {
  const p = Number(price) || 0;
  if (p <= 0) return 0;
  const factorListing = UNIT_KG_FACTORS[listingUnit] || 1;
  const factorTarget = UNIT_KG_FACTORS[targetUnit] || 1;
  // Price per kg
  const pricePerKg = p / factorListing;
  const targetRate = pricePerKg * factorTarget;
  return Math.round(targetRate * 100) / 100;
}

/**
 * Formats a clean dual-unit volume description.
 * Example:
 *   formatDualVolume(50, 'Quintal') => "50 Quintal (5 MT)"
 *   formatDualVolume(5, 'MT')       => "5 MT (50 Qtl)"
 *   formatDualVolume(500, 'kg')     => "500 kg (5 Qtl)"
 */
export function formatDualVolume(quantity, unit) {
  const q = Number(quantity) || 0;
  if (!q) return `0 ${unit || 'kg'}`;
  const u = String(unit || 'kg').toLowerCase().trim();

  if (u === 'quintal' || u === 'qtl') {
    const mt = convertVolume(q, 'Quintal', 'MT');
    return `${q.toLocaleString('en-IN')} Quintal (${mt.toLocaleString('en-IN')} MT)`;
  }
  if (u === 'mt' || u === 'ton' || u === 'tonne') {
    const qtl = convertVolume(q, 'MT', 'Quintal');
    return `${q.toLocaleString('en-IN')} MT (${qtl.toLocaleString('en-IN')} Qtl)`;
  }
  if (u === 'kg') {
    if (q >= 1000) {
      const mt = convertVolume(q, 'kg', 'MT');
      return `${q.toLocaleString('en-IN')} kg (${mt.toLocaleString('en-IN')} MT)`;
    }
    if (q >= 100) {
      const qtl = convertVolume(q, 'kg', 'Quintal');
      return `${q.toLocaleString('en-IN')} kg (${qtl.toLocaleString('en-IN')} Qtl)`;
    }
    return `${q.toLocaleString('en-IN')} kg`;
  }
  return `${q.toLocaleString('en-IN')} ${unit}`;
}
