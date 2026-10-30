// AgroLnk Isolated Interactive Sandbox Engine (100% Client-Side & Zero Database Pollution)

const STORAGE_KEY = 'agrolnk_demo_sandbox_state_v1';

export const DEMO_PERSONAS = {
  farmer: {
    id: 'demo_user_farmer',
    name: 'Suresh Sharma',
    role: 'farmer',
    badge: 'Farmer / Producer',
    organization: 'Salem Organic Producers FPO',
    location: 'Salem, Tamil Nadu',
    avatar: '👨‍🌾',
    color: '#0B3326',
    bankAccount: 'State Bank of India •••• 4892',
    ifsc: 'SBIN0004128',
  },
  buyer: {
    id: 'demo_user_buyer',
    name: 'Maran S',
    role: 'buyer',
    badge: 'Food Processor / Wholesale Buyer',
    organization: 'Global Agro Milling Terminal',
    location: 'Chennai, Tamil Nadu',
    avatar: '🏢',
    color: '#10B981',
    walletBalance: 2500000,
  },
  transporter: {
    id: 'demo_user_transporter',
    name: 'Ravi Kumar',
    role: 'transporter',
    badge: 'Fleet Logistics Operator',
    organization: 'TN Agri Logistics & Express Fleet',
    location: 'Namakkal, Tamil Nadu',
    avatar: '🚚',
    color: '#1E40AF',
    vehicleNumber: 'TN-30-BF-8421',
    driverName: 'Murugan S',
    driverPhone: '+91 98421 55678',
  },
  escrow: {
    id: 'demo_user_escrow',
    name: 'Priya Raman',
    role: 'admin',
    badge: 'AgroLnk Escrow Trust Officer',
    organization: 'AgroLnk Nodal Custody Operations',
    location: 'Bengaluru Trust Hub',
    avatar: '🏛️',
    color: '#6B21A8',
  },
};

export const DEMO_TEMPLATES = [
  {
    id: 'tpl_paddy',
    commodity: 'Paddy (Sona Masoori)',
    variety: 'Milled Grade A',
    grade: 'A',
    quantity: 20,
    unit: 'MT',
    startingBid: 32,
    reservePrice: 35,
    bidStep: 1,
    estimatedDistanceKm: 340,
    origin: 'Salem Farmgate Hub, Tamil Nadu',
    destination: 'Global Mills Receiving Silo, Chennai',
  },
  {
    id: 'tpl_tomato',
    commodity: 'Tomato (Hybrid Shivam)',
    variety: 'Table / Processing Grade',
    grade: 'A',
    quantity: 5,
    unit: 'MT',
    startingBid: 28,
    reservePrice: 34,
    bidStep: 1,
    estimatedDistanceKm: 180,
    origin: 'Dharmapuri Aggregation Depot, Tamil Nadu',
    destination: 'Kissan Pure Processing Mill, Chennai',
  },
  {
    id: 'tpl_mustard',
    commodity: 'Mustard Seed (Pusa Bold)',
    variety: 'High Oil Content (42%)',
    grade: 'A',
    quantity: 10,
    unit: 'MT',
    startingBid: 52,
    reservePrice: 58,
    bidStep: 2,
    estimatedDistanceKm: 220,
    origin: 'Erode Mandi Yard, Tamil Nadu',
    destination: 'Southern Edible Oils Refinery, Coimbatore',
  },
];

const INITIAL_DEMO_STATE = {
  currentStage: 1, // 1: Setup & Launch | 2: Live Floor Bidding | 3: Escrow Deposit | 4: Logistics & 2-OTP Transit | 5: Inspection & Settlement
  activePersonaKey: 'farmer',
  auction: {
    id: 'demo_auc_101',
    commodity: 'Paddy (Sona Masoori)',
    variety: 'Milled Grade A',
    grade: 'A',
    quantity: 20,
    unit: 'MT',
    startingBid: 32,
    reservePrice: 35,
    currentBid: 34,
    bidStep: 1,
    totalBids: 3,
    farmerId: DEMO_PERSONAS.farmer.id,
    farmerName: DEMO_PERSONAS.farmer.name,
    highestBidderId: 'bot_trader_1',
    highestBidderName: 'Deccan Grain Corporation',
    status: 'live', // 'draft' | 'live' | 'completed' | 'reserve_not_met'
    remainingSeconds: 150,
    origin: 'Salem Farmgate Hub, Tamil Nadu',
    destination: 'Global Mills Receiving Silo, Chennai',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  bids: [
    {
      id: 'demo_bid_1',
      bidderId: 'bot_trader_2',
      bidderName: 'Kaveri Agro Traders',
      amount: 32,
      timestamp: '5m ago',
    },
    {
      id: 'demo_bid_2',
      bidderId: DEMO_PERSONAS.buyer.id,
      bidderName: DEMO_PERSONAS.buyer.name,
      amount: 33,
      timestamp: '3m ago',
    },
    {
      id: 'demo_bid_3',
      bidderId: 'bot_trader_1',
      bidderName: 'Deccan Grain Corporation',
      amount: 34,
      timestamp: '1m ago',
    },
  ],
  order: null, // Initialized when won or early knockdown
  delivery: null, // Initialized alongside order
  qualityAssay: {
    moisturePercentage: 12.8,
    maxAllowedMoisture: 14.0,
    foreignMatterPct: 0.6,
    germinationPct: 98,
    status: 'pending', // 'pending' | 'passed' | 'disputed'
    inspectedAt: null,
  },
  escrowLedger: [],
  logs: [
    {
      id: 'log_init',
      time: 'Just now',
      role: 'System',
      text: 'AgroLnk Demo Sandbox initialized with Paddy (Sona Masoori) 20 MT lot.',
    },
  ],
};

function readState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Sandbox storage read notice:', err);
  }
  return JSON.parse(JSON.stringify(INITIAL_DEMO_STATE));
}

function writeState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('agrolnk_demo_state_updated', { detail: state }));
  } catch (err) {
    console.warn('Sandbox storage write notice:', err);
  }
}

/**
 * Get current demo state
 */
export function getDemoState() {
  return readState();
}

/**
 * Switch persona in the sandbox
 */
export function setDemoPersona(personaKey) {
  if (!DEMO_PERSONAS[personaKey]) return;
  const state = readState();
  state.activePersonaKey = personaKey;
  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: DEMO_PERSONAS[personaKey].name,
    text: `Perspective switched to ${DEMO_PERSONAS[personaKey].badge} (${DEMO_PERSONAS[personaKey].name}).`,
  });
  writeState(state);
}

/**
 * Reset sandbox environment to initial state
 */
export function resetDemoState() {
  const fresh = JSON.parse(JSON.stringify(INITIAL_DEMO_STATE));
  writeState(fresh);
  return fresh;
}

/**
 * Launch an auction from a template
 */
export function createDemoAuction(templateId) {
  const tpl = DEMO_TEMPLATES.find((t) => t.id === templateId) || DEMO_TEMPLATES[0];
  const state = readState();

  state.auction = {
    id: `demo_auc_${Date.now().toString().slice(-4)}`,
    commodity: tpl.commodity,
    variety: tpl.variety,
    grade: tpl.grade,
    quantity: tpl.quantity,
    unit: tpl.unit,
    startingBid: tpl.startingBid,
    reservePrice: tpl.reservePrice,
    currentBid: tpl.startingBid,
    bidStep: tpl.bidStep,
    totalBids: 0,
    farmerId: DEMO_PERSONAS.farmer.id,
    farmerName: DEMO_PERSONAS.farmer.name,
    highestBidderId: null,
    highestBidderName: null,
    status: 'live',
    remainingSeconds: 180,
    origin: tpl.origin,
    destination: tpl.destination,
    createdAt: new Date().toISOString(),
  };

  state.bids = [];
  state.order = null;
  state.delivery = null;
  state.currentStage = 2; // Jump to live floor
  state.activePersonaKey = 'buyer'; // Switch to buyer to bid

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Farmer',
    text: `Launched live auction for ${tpl.quantity} ${tpl.unit} of ${tpl.commodity}. Reserve: ₹${tpl.reservePrice}/${tpl.unit}.`,
  });

  writeState(state);
  return state;
}

/**
 * Launch an auction with custom parameters
 */
export function createDemoAuctionCustom(customData) {
  const state = readState();
  const commodity = customData.commodity || 'Paddy (Sona Masoori)';
  const quantity = Number(customData.quantity) || 10;
  const unit = customData.unit || 'MT';
  const startBid = Number(customData.startingBid) || 30;
  const reserve = Number(customData.reservePrice) || Math.round(startBid * 1.15);
  const step = Number(customData.bidStep) || 1;
  const origin = customData.origin || 'Salem Farmgate Hub, Tamil Nadu';
  const destination = customData.destination || 'Global Mills Receiving Silo, Chennai';

  state.auction = {
    id: `demo_auc_${Date.now().toString().slice(-4)}`,
    commodity,
    variety: customData.variety || 'Standard Grade',
    grade: customData.grade || 'A',
    quantity,
    unit,
    startingBid: startBid,
    reservePrice: reserve,
    currentBid: startBid,
    bidStep: step,
    totalBids: 0,
    farmerId: DEMO_PERSONAS.farmer.id,
    farmerName: DEMO_PERSONAS.farmer.name,
    highestBidderId: null,
    highestBidderName: null,
    status: 'live',
    remainingSeconds: 180,
    origin,
    destination,
    createdAt: new Date().toISOString(),
  };

  state.bids = [];
  state.order = null;
  state.delivery = null;
  state.currentStage = 2; // Jump to live floor
  state.activePersonaKey = 'buyer'; // Switch to buyer to bid

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Farmer',
    text: `Created and launched custom auction: ${quantity} ${unit} of ${commodity}. Reserve: ₹${reserve}/${unit}.`,
  });

  writeState(state);
  return state;
}

/**
 * Place a bid in the live room
 */
export function placeDemoBid(amount) {
  const state = readState();
  const buyer = DEMO_PERSONAS.buyer;
  const numAmount = Number(amount);

  if (numAmount <= state.auction.currentBid) {
    throw new Error(`Bid must exceed current bid of ₹${state.auction.currentBid}/${state.auction.unit}.`);
  }

  state.auction.currentBid = numAmount;
  state.auction.highestBidderId = buyer.id;
  state.auction.highestBidderName = buyer.name;
  state.auction.totalBids += 1;

  state.bids.unshift({
    id: `bid_${Date.now()}`,
    bidderId: buyer.id,
    bidderName: buyer.name,
    amount: numAmount,
    timestamp: 'Just now',
  });

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Buyer',
    text: `${buyer.name} placed leading bid of ₹${numAmount}/${state.auction.unit}.`,
  });

  writeState(state);
  return state;
}

/**
 * Simulate an automated competitor counter-bid
 */
export function simulateCompetitorBid() {
  const state = readState();
  if (state.auction.status !== 'live') return;

  const competitors = [
    'Apex Agro Mills',
    'Deccan Grain Corp',
    'Kaveri Foods Ltd',
    'Chennai Commodity Terminal',
  ];
  const compName = competitors[Math.floor(Math.random() * competitors.length)];
  const compAmount = state.auction.currentBid + state.auction.bidStep;

  state.auction.currentBid = compAmount;
  state.auction.highestBidderId = `comp_${Date.now()}`;
  state.auction.highestBidderName = compName;
  state.auction.totalBids += 1;

  state.bids.unshift({
    id: `bid_${Date.now()}`,
    bidderId: `comp_${Date.now()}`,
    bidderName: compName,
    amount: compAmount,
    timestamp: 'Just now',
  });

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Competitor',
    text: `${compName} outbid with ₹${compAmount}/${state.auction.unit}!`,
  });

  writeState(state);
  return state;
}

/**
 * Early Knockdown or Timer Expiry: Finalize Auction & Create Escrow Order
 */
export function finalizeDemoAuction(isEarlyKnockdown = false) {
  const state = readState();
  const auction = state.auction;

  // Verify reserve price
  const isReserveMet = auction.highestBidderId && auction.currentBid >= auction.reservePrice;
  if (!isReserveMet && auction.highestBidderId) {
    auction.status = 'reserve_not_met';
    state.logs.unshift({
      id: `log_${Date.now()}`,
      time: 'Just now',
      role: 'System',
      text: `Auction ended. Highest bid ₹${auction.currentBid} did not meet reserve price ₹${auction.reservePrice}. No order created.`,
    });
    writeState(state);
    return state;
  }

  auction.status = 'completed';
  const totalValuation = auction.quantity * 1000 * auction.currentBid; // MT to kg

  // 1. Create Escrow Order
  state.order = {
    id: 'demo_ord_1001',
    orderNumber: '#AGM-DEMO-1001',
    auctionId: auction.id,
    buyerId: auction.highestBidderId || DEMO_PERSONAS.buyer.id,
    buyerName: auction.highestBidderName || DEMO_PERSONAS.buyer.name,
    farmerId: DEMO_PERSONAS.farmer.id,
    farmerName: DEMO_PERSONAS.farmer.name,
    commodity: auction.commodity,
    variety: auction.variety,
    grade: auction.grade,
    quantity: auction.quantity,
    unit: auction.unit,
    pricePerUnit: auction.currentBid,
    totalAmount: totalValuation,
    escrowStatus: 'pending_deposit', // 'pending_deposit' | 'funded' | 'released'
    status: 'order_placed', // 'order_placed' | 'confirmed' | 'dispatched' | 'completed'
    createdAt: new Date().toISOString(),
    bankUtr: null,
  };

  // 2. Create Delivery Consignment
  state.delivery = {
    id: 'demo_del_501',
    deliveryNumber: 'DEL-DEMO-501',
    orderNumber: state.order.orderNumber,
    transporterId: DEMO_PERSONAS.transporter.id,
    transporterName: DEMO_PERSONAS.transporter.organization,
    vehicleType: 'medium_lcv',
    vehicleNumber: DEMO_PERSONAS.transporter.vehicleNumber,
    driverName: DEMO_PERSONAS.transporter.driverName,
    driverPhone: DEMO_PERSONAS.transporter.driverPhone,
    distanceKm: 340,
    freightAmount: 900 + 340 * 24, // Medium LCV: 900 base + 24/km = ₹9,060
    pickupLocation: auction.origin,
    deliveryLocation: auction.destination,
    pickupOtp: '8492', // Pre-seeded secure code
    deliveryOtp: '3175', // Pre-seeded secure code
    status: 'pending_escrow', // 'pending_escrow' | 'assigned' | 'in_transit' | 'delivered'
  };

  state.currentStage = 3; // Advance to Escrow Deposit stage
  state.activePersonaKey = 'buyer'; // Hand off to buyer to fund escrow

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: isEarlyKnockdown ? 'Farmer' : 'System',
    text: isEarlyKnockdown
      ? `Farmer accepted early bid of ₹${auction.currentBid}/${auction.unit}. Order #AGM-DEMO-1001 generated.`
      : `Auction timer expired. Won by ${auction.highestBidderName} at ₹${auction.currentBid}/${auction.unit}. Order #AGM-DEMO-1001 generated.`,
  });

  writeState(state);
  return state;
}

/**
 * Step 3: Fund Escrow Deposit
 */
export function fundDemoEscrow(depositMethod = 'rtgs_escrow') {
  const state = readState();
  if (!state.order) return;

  const txnId = `TXN-ESCROW-${Date.now().toString().slice(-6)}`;
  state.order.escrowStatus = 'funded';
  state.order.status = 'confirmed';
  state.order.escrowTxnId = txnId;
  state.order.depositMethod = depositMethod;
  state.delivery.status = 'assigned';
  state.currentStage = 4; // Advance to logistics & OTP transit
  state.activePersonaKey = 'transporter'; // Hand off to transporter

  state.escrowLedger.unshift({
    id: txnId,
    type: 'deposit',
    amount: state.order.totalAmount,
    from: DEMO_PERSONAS.buyer.name,
    to: 'AgroLnk Escrow Trust Account (IDBI Bank)',
    status: 'LOCKED_IN_TRUST',
    method: depositMethod,
    timestamp: new Date().toLocaleTimeString(),
  });

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Buyer',
    text: `Buyer deposited ₹${state.order.totalAmount.toLocaleString('en-IN')} via ${depositMethod.toUpperCase()}. Funds locked in Escrow Trust (${txnId}). Transporter authorized for pickup.`,
  });

  writeState(state);
  return state;
}

/**
 * Update Vehicle Tariff Dynamically
 */
export function updateDemoFreightTariff(vehicleType) {
  const state = readState();
  if (!state.delivery) return;

  const rates = {
    mini_truck: { base: 400, perKm: 14, name: 'Mini Truck (Tata Ace)' },
    medium_lcv: { base: 900, perKm: 24, name: 'Medium LCV (14ft Eicher)' },
    reefer_truck: { base: 1600, perKm: 34, name: 'Reefer Cold-Chain Truck' },
  };

  const rate = rates[vehicleType] || rates.medium_lcv;
  const dist = state.delivery.distanceKm || 340;
  const fare = rate.base + dist * rate.perKm;

  state.delivery.vehicleType = vehicleType;
  state.delivery.freightAmount = fare;

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Logistics',
    text: `Updated transport vehicle to ${rate.name}. Tariff: Base ₹${rate.base} + ₹${rate.perKm}/km (${dist} km) = ₹${fare.toLocaleString('en-IN')}.`,
  });

  writeState(state);
  return state;
}

/**
 * Step 4A: Verify Farmgate Pickup OTP
 */
export function verifyDemoPickupOtp(otpInput) {
  const state = readState();
  if (!state.delivery) return;

  if (String(otpInput).trim() !== String(state.delivery.pickupOtp)) {
    throw new Error(`Invalid Pickup OTP. Correct code from Farmer screen is ${state.delivery.pickupOtp}.`);
  }

  state.delivery.status = 'in_transit';
  state.order.status = 'in_transit';

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Transporter',
    text: `Pickup OTP (${state.delivery.pickupOtp}) verified at farmgate. Produce loaded on truck ${state.delivery.vehicleNumber}. In transit to destination.`,
  });

  writeState(state);
  return state;
}

/**
 * Step 4B: Verify Destination Delivery OTP
 */
export function verifyDemoDeliveryOtp(otpInput) {
  const state = readState();
  if (!state.delivery) return;

  if (String(otpInput).trim() !== String(state.delivery.deliveryOtp)) {
    throw new Error(`Invalid Delivery OTP. Correct code from Buyer screen is ${state.delivery.deliveryOtp}.`);
  }

  state.delivery.status = 'delivered';
  state.order.status = 'delivered';
  state.currentStage = 5; // Advance to Inspection & Settlement
  state.activePersonaKey = 'buyer'; // Hand off to buyer to inspect

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Buyer',
    text: `Truck arrived at mill depot. Delivery OTP (${state.delivery.deliveryOtp}) verified. Cargo unloaded for moisture assay inspection.`,
  });

  writeState(state);
  return state;
}

/**
 * Step 5A: Submit Quality Assay Inspection
 */
export function submitDemoQualityInspection(isPass = true) {
  const state = readState();
  state.qualityAssay = {
    moisturePercentage: isPass ? 12.4 : 16.2,
    maxAllowedMoisture: 14.0,
    foreignMatterPct: isPass ? 0.4 : 2.5,
    germinationPct: isPass ? 98 : 84,
    status: isPass ? 'passed' : 'disputed',
    inspectedAt: new Date().toLocaleTimeString(),
  };

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Inspector',
    text: isPass
      ? `Moisture assay 12.4% passed (within 14% limit). Quality Grade A certified.`
      : `Moisture assay 16.2% exceeds standard threshold. Quality dispute flagged.`,
  });

  writeState(state);
  return state;
}

/**
 * Resolve Quality Assay Dispute Mutually
 */
export function resolveDemoQualityDispute(discountPerUnit = 2) {
  const state = readState();
  if (!state.order) return;

  const originalAmt = state.order.totalAmount;
  const unitKg = state.order.unit === 'MT' ? 1000 : 1;
  const totalDeduction = state.order.quantity * unitKg * discountPerUnit;
  const revisedAmt = Math.max(1000, originalAmt - totalDeduction);

  state.order.totalAmount = revisedAmt;
  state.qualityAssay.status = 'passed';
  state.qualityAssay.disputeSettled = true;
  state.qualityAssay.notes = `Settled with mutually agreed allowance of ₹${discountPerUnit}/${state.order.unit} for moisture variance. Revised payout: ₹${revisedAmt.toLocaleString('en-IN')}.`;

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Quality Desk',
    text: `Moisture dispute resolved! Agreed ₹${discountPerUnit}/${state.order.unit} adjustment. Total payout revised from ₹${originalAmt.toLocaleString('en-IN')} to ₹${revisedAmt.toLocaleString('en-IN')}.`,
  });

  writeState(state);
  return state;
}

/**
 * Step 5B: Release Escrow Payment to Farmer Bank Account
 */
export function releaseDemoEscrow() {
  const state = readState();
  if (!state.order) return;

  const utrNumber = `UTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10000 + Math.random() * 90000)}`;

  state.order.escrowStatus = 'released';
  state.order.status = 'completed';
  state.order.bankUtr = utrNumber;
  state.activePersonaKey = 'farmer'; // Switch back to farmer to view payout

  state.escrowLedger.unshift({
    id: `txn_${Date.now()}`,
    type: 'disbursement',
    amount: state.order.totalAmount,
    from: 'AgroLnk Escrow Trust Account',
    to: `${DEMO_PERSONAS.farmer.bankAccount} (${DEMO_PERSONAS.farmer.name})`,
    status: 'PAID_TO_BANK',
    utr: utrNumber,
    timestamp: new Date().toLocaleTimeString(),
  });

  state.logs.unshift({
    id: `log_${Date.now()}`,
    time: 'Just now',
    role: 'Escrow Desk',
    text: `Escrow released! ₹${state.order.totalAmount.toLocaleString('en-IN')} disbursed to Farmer bank account. Bank UTR: ${utrNumber}. Trade settled 100%.`,
  });

  writeState(state);
  return state;
}

/**
 * Instant Jump: Fast-Forward to any stage
 */
export function fastForwardStage(targetStage) {
  const state = readState();
  if (targetStage < 1 || targetStage > 5) return;

  if (targetStage === 1) {
    return resetDemoState();
  }

  if (targetStage >= 2 && !state.auction) {
    createDemoAuction('tpl_paddy');
  }

  if (targetStage >= 3 && !state.order) {
    placeDemoBid(36);
    finalizeDemoAuction(true);
  }

  if (targetStage >= 4 && state.order?.escrowStatus !== 'funded') {
    fundDemoEscrow();
  }

  if (targetStage >= 5 && state.delivery?.status !== 'delivered') {
    verifyDemoPickupOtp(state.delivery.pickupOtp);
    verifyDemoDeliveryOtp(state.delivery.deliveryOtp);
    submitDemoQualityInspection(true);
  }

  const updated = readState();
  updated.currentStage = targetStage;
  writeState(updated);
  return updated;
}

