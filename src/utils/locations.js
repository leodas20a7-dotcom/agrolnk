export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

/**
 * Returns a deduplicated, alphabetically sorted list of Indian states
 * combined with any custom state values present in active listings.
 */
export function getStateFilterOptions(listings = []) {
  const seen = new Map();

  for (const state of INDIAN_STATES) {
    seen.set(state.toLowerCase(), state);
  }

  if (Array.isArray(listings)) {
    for (const lot of listings) {
      const raw = typeof lot?.state === 'string' ? lot.state.trim() : '';
      if (raw && !seen.has(raw.toLowerCase())) {
        seen.set(raw.toLowerCase(), raw);
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}
