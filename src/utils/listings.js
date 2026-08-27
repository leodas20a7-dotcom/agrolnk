// AGRAMAZ Prototype Listings Engine (LocalStorage)
// Stores marketplace produce lots ready for future Supabase DB integration.

const LISTINGS_STORAGE_KEY = 'agramazListings';

// Initial pre-seeded listings so the farmer dashboard is immediately lively
const DEFAULT_DEMO_LISTINGS = [
  {
    id: 'lot_demo_01',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Tomato',
    variety: 'Hybrid Shivam',
    grade: 'A',
    quantity: 500,
    unit: 'kg',
    price: 42,
    state: 'Tamil Nadu',
    district: 'Salem',
    village: 'Attur Mandi',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'lot_demo_02',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Potato',
    variety: 'Kufri Jyoti',
    grade: 'A',
    quantity: 1000,
    unit: 'kg',
    price: 35,
    state: 'Tamil Nadu',
    district: 'Dindigul',
    village: 'Oddanchatram',
    saleType: 'auction',
    auctionEndsIn: '02:14:32',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'lot_demo_03',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Onion',
    variety: 'Nasik Red',
    grade: 'B',
    quantity: 800,
    unit: 'kg',
    price: 28,
    state: 'Maharashtra',
    district: 'Nashik',
    village: 'Lasalgaon',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'lot_demo_04',
    farmerId: 'usr_farmer_02',
    farmerName: 'Himachal Apple Growers',
    commodity: 'Apple',
    variety: 'Royal Delicious',
    grade: 'A',
    quantity: 300,
    unit: 'kg',
    price: 120,
    state: 'Himachal Pradesh',
    district: 'Shimla',
    village: 'Kotkhai',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
  {
    id: 'lot_demo_05',
    farmerId: 'usr_farmer_03',
    farmerName: 'Sehore FPO',
    commodity: 'Wheat',
    variety: 'Sharbati Gold',
    grade: 'A',
    quantity: 4500,
    unit: 'kg',
    price: 29,
    state: 'Madhya Pradesh',
    district: 'Sehore',
    village: 'Ashta',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

/**
 * Get all listings from localStorage
 */
export function getListings() {
  try {
    const raw = localStorage.getItem(LISTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_LISTINGS));
      return DEFAULT_DEMO_LISTINGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_DEMO_LISTINGS;
  } catch {
    return DEFAULT_DEMO_LISTINGS;
  }
}

/**
 * Save listings array
 */
function saveListings(listings) {
  try {
    localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
  } catch (err) {
    console.error('Failed to save listings to localStorage:', err);
  }
}

/**
 * Get listings for a specific farmer (or all active listings if no id)
 */
export function getFarmerListings(farmerId) {
  const all = getListings();
  if (!farmerId) return all;
  return all.filter((item) => item.farmerId === farmerId || !item.farmerId);
}

/**
 * Get active marketplace listings for buyers
 */
export function getActiveMarketplaceListings() {
  const all = getListings();
  return all.filter((item) => item.status === 'active' && item.quantity > 0);
}

/**
 * Create and publish a new produce listing
 */
export function createListing(listingData) {
  const currentListings = getListings();

  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return `lot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  };

  const newListing = {
    id: generateId(),
    farmerId: listingData.farmerId || 'usr_farmer_01',
    farmerName: listingData.farmerName || 'Sakthi Vel',
    commodity: listingData.commodity || 'Tomato',
    variety: listingData.variety || 'Standard',
    grade: listingData.grade || 'A',
    quantity: Number(listingData.quantity) || 500,
    unit: listingData.unit || 'kg',
    price: Number(listingData.price) || 40,
    state: listingData.state || 'Tamil Nadu',
    district: listingData.district || 'Salem',
    village: listingData.village || '',
    saleType: listingData.saleType || 'direct',
    status: 'active',
    images: listingData.images && listingData.images.length > 0
      ? listingData.images
      : ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'],
    createdAt: new Date().toISOString(),
  };

  const updatedListings = [newListing, ...currentListings];
  saveListings(updatedListings);
  return newListing;
}

/**
 * Deduct purchased quantity from listing
 */
export function deductListingQuantity(listingId, quantityToDeduct) {
  const listings = getListings();
  const index = listings.findIndex((l) => l.id === listingId);
  if (index === -1) return;

  const current = listings[index];
  const newQty = Math.max(0, current.quantity - Number(quantityToDeduct));
  
  listings[index] = {
    ...current,
    quantity: newQty,
    status: newQty === 0 ? 'sold' : 'active',
  };

  saveListings(listings);
}

/**
 * Get listing by ID
 */
export function getListingById(id) {
  const listings = getListings();
  return listings.find((l) => l.id === id) || null;
}
