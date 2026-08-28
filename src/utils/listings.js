// AGRAMAZ Prototype Listings Engine (LocalStorage)
// Stores marketplace produce lots ready for future Supabase DB integration.

const LISTINGS_STORAGE_KEY = 'agramazListings';

export const COMMODITY_IMAGES = {
  Tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
  Onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop&q=80',
  Potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80',
  Chilli: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80',
  'Red Chilli': 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80',
  Mango: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
  Turmeric: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80',
  Rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
  'Basmati Rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
  Wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80',
  Cotton: 'https://images.unsplash.com/photo-1594897030560-ab279cf66def?w=800&auto=format&fit=crop&q=80',
  Apple: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&auto=format&fit=crop&q=80',
  Ginger: 'https://images.unsplash.com/photo-1635363638580-c2809d049eee?w=800&auto=format&fit=crop&q=80',
  Maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&auto=format&fit=crop&q=80',
  Banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80',
  Soybean: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e53799?w=800&auto=format&fit=crop&q=80',
  Other: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80',
};

// Initial pre-seeded listings with rich commodity variety for demo farmer & exchange
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
    images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'lot_demo_02',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Onion',
    variety: 'Nasik Red (Export)',
    grade: 'A',
    quantity: 1200,
    unit: 'kg',
    price: 32,
    state: 'Maharashtra',
    district: 'Nashik',
    village: 'Lasalgaon APMC',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'lot_demo_03',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Mango',
    variety: 'Ratnagiri Alphonso',
    grade: 'Export',
    quantity: 450,
    unit: 'kg',
    price: 180,
    state: 'Maharashtra',
    district: 'Ratnagiri',
    village: 'Devgad Orchard Gate',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'lot_demo_04',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Red Chilli',
    variety: 'Guntur Sannam S4',
    grade: 'A',
    quantity: 750,
    unit: 'kg',
    price: 195,
    state: 'Andhra Pradesh',
    district: 'Guntur',
    village: 'Mirchi Yard Terminal',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'lot_demo_05',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Turmeric',
    variety: 'Salem Golden Finger (Curcumin 4%)',
    grade: 'A',
    quantity: 900,
    unit: 'kg',
    price: 145,
    state: 'Tamil Nadu',
    district: 'Salem',
    village: 'Omalur Hub',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
  },
  {
    id: 'lot_demo_06',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Potato',
    variety: 'Kufri Jyoti',
    grade: 'A',
    quantity: 1500,
    unit: 'kg',
    price: 28,
    state: 'Tamil Nadu',
    district: 'Dindigul',
    village: 'Oddanchatram Terminal',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'lot_demo_07',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Basmati Rice',
    variety: '1121 Extra Long Grain',
    grade: 'Export',
    quantity: 3000,
    unit: 'kg',
    price: 88,
    state: 'Haryana',
    district: 'Karnal',
    village: 'Taraori Grain Silo',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'lot_demo_08',
    farmerId: 'usr_farmer_01',
    farmerName: 'Sakthi Vel',
    commodity: 'Wheat',
    variety: 'Sharbati Gold MP Grain',
    grade: 'A',
    quantity: 4500,
    unit: 'kg',
    price: 34,
    state: 'Madhya Pradesh',
    district: 'Sehore',
    village: 'Ashta Silo Terminal',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
  },
  {
    id: 'lot_demo_09',
    farmerId: 'usr_farmer_02',
    farmerName: 'Himachal Apple Growers',
    commodity: 'Apple',
    variety: 'Royal Delicious',
    grade: 'A',
    quantity: 800,
    unit: 'kg',
    price: 125,
    state: 'Himachal Pradesh',
    district: 'Shimla',
    village: 'Kotkhai Valley',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
  {
    id: 'lot_demo_10',
    farmerId: 'usr_farmer_03',
    farmerName: 'Sehore FPO',
    commodity: 'Wheat',
    variety: 'Lokwan Premium Durum',
    grade: 'Export',
    quantity: 5000,
    unit: 'kg',
    price: 36,
    state: 'Madhya Pradesh',
    district: 'Sehore',
    village: 'Ashta Mandi',
    saleType: 'direct',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80'],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

const LISTINGS_DATA_VERSION = 'v7_remove_ginger_cotton';

/**
 * Get all listings from localStorage with automatic version migration
 */
export function getListings() {
  try {
    const storedVersion = localStorage.getItem('agramazListings_version');
    const raw = localStorage.getItem(LISTINGS_STORAGE_KEY);

    // If no data or older version or data is homogeneous (only tomato), reset to rich diverse demo data
    if (!raw || storedVersion !== LISTINGS_DATA_VERSION) {
      localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_LISTINGS));
      localStorage.setItem('agramazListings_version', LISTINGS_DATA_VERSION);
      return DEFAULT_DEMO_LISTINGS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_LISTINGS));
      return DEFAULT_DEMO_LISTINGS;
    }

    // Check if the current cached data has only 1 commodity repeated
    const distinctCommodities = new Set(parsed.map((p) => p.commodity));
    if (distinctCommodities.size <= 1 && parsed.length >= 2) {
      localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_LISTINGS));
      return DEFAULT_DEMO_LISTINGS;
    }

    return parsed;
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
