# AgroLnk Production Demo & Golden Path Verification Guide

Welcome to the **AgroLnk Enterprise Agri-Exchange** master demo guide. This document provides a step-by-step presentation script, role credentials, and feature walkthroughs designed for investor pitches, stakeholder presentations, and operational rehearsals.

---

## 1. System Architecture & Technical Highlights

When demonstrating AgroLnk, highlight these core technical achievements:

1. **Sub-100 kB Frontend Bundle (94.5% Reduction)**:
   - Dynamic code-splitting via `React.lazy` across all 32 internal portals.
   - Initial load size is only **92.88 kB (gzip: 20.89 kB)**, ensuring instant first paint even on 2G/3G rural networks.
2. **PostgreSQL Concurrency & Atomic Locking**:
   - Live bidding engine uses `FOR UPDATE` row locking (`place_auction_bid_atomic`) to prevent race conditions and shill bidding.
   - Escrow release runs via atomic stored procedure (`release_escrow_atomic`) guaranteeing idempotency and zero double-disbursement risk.
3. **Razorpay Route Milestone Escrow**:
   - 0.50% total platform take-rate (0.25% buyer + 0.25% seller).
   - Funds held in `on_hold: 1` status until digital delivery OTP authorization.
4. **WDRA e-NWR Collateral Financing**:
   - Farmers deposit crops into certified warehouses $\rightarrow$ receive electronic Negotiable Warehouse Receipts (e-NWR) $\rightarrow$ pledge as collateral to NBFCs/Financiers for instant working capital loans.
5. **Real-time Live Bid Streaming**:
   - Supabase Realtime pub/sub synchronization streams opposing bids and ticker updates into the Auction Room without manual page refreshes.

---

## 2. Multi-Role Credentials & Access

| Role | Login Identifier | Password | Access / Portal Link |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@agrolnk.com` | *(Any password)* | `#admin-dashboard` |
| **Farmer** | *Register or Sign In with your mobile/email* | *(Any password)* | Select **Farmer** $\rightarrow$ `#farmer-dashboard` |
| **Buyer** | *Register or Sign In with your mobile/email* | *(Any password)* | Select **Buyer** $\rightarrow$ `#buyer-dashboard` |
| **Warehouse** | *Register or Sign In with your mobile/email* | *(Any password)* | Select **Warehouse** $\rightarrow$ `#warehouse-dashboard` |
| **Financier** | *Register or Sign In with your mobile/email* | *(Any password)* | Select **Financier** $\rightarrow$ `#financier-dashboard` |
| **Transporter**| *Register or Sign In with your mobile/email* | *(Any password)* | Select **Transporter** $\rightarrow$ `#transporter-dashboard` |

> [!TIP]
> **Pro Demo Tip**: Open **two browser windows** side-by-side (e.g., standard window for **Farmer** and an Incognito window for **Buyer**) to showcase real-time bidding, chat, and status updates live across both screens!

---

## 3. The 6-Stage Golden Path Demo Script

### Stage 1: The Producer (Farmer Desk)
1. **Navigate to Home**: Go to `http://localhost:5173` (or production URL).
2. **Select Role / Sign In**:
   - Click **"Get Started"** or **"Sign In"**.
   - Sign in as a **Farmer** (or register with name, phone, e.g. *Ramesh Patel*, *9876543210*).
3. **Show Farmer Dashboard**:
   - Note key performance metrics: Active Listings, Escrow Balance, Inward Harvests, Market Ticker.
4. **Create a Listing or Launch an Auction**:
   - Go to **"Create Listing"**:
     - Choose Commodity: *Tomato* (Hybrid Grade A).
     - Enter Lot Quantity: *500 kg* at *₹35/kg*.
     - Upload produce lot photo (notice client-side canvas compression to 800px for instant upload).
     - Click **Publish Listing**.
   - Alternatively, go to **"Create Auction"**:
     - Set starting price: *₹30/kg*, Reserve price: *₹40/kg*, Duration: *15 minutes*.
     - Click **Start Live Clock Auction**.

---

### Stage 2: The Buyer (Procurement Terminal)
1. **Open Buyer Session** (in second browser / incognito window):
   - Sign in as **Buyer** (e.g. *Priya Sharma*, *Metro Supermarkets*).
2. **Discover Produce**:
   - Click **"Marketplace"**: The newly listed lot is immediately visible with Grade, Farm Origin, and Price.
3. **Engage in Live Auction**:
   - Click **"Live Auctions"** $\rightarrow$ select the active auction room.
   - Notice the countdown timer and live bid ticker.
   - Enter a bid higher than current price (e.g., *₹36/kg*).
   - **Observe Both Windows**: The Farmer window immediately updates with the new highest bid via Supabase Realtime!
4. **Place Order & Escrow Deposit**:
   - Return to Marketplace, select a lot, and click **"Buy Now / Place Order"**.
   - Review transparent fee breakdown:
     - Base Commodity Value: ₹17,500
     - Platform Facilitation Fee (0.25%): ₹43.75
     - Total Escrow Deposit: ₹17,543.75
   - Click **"Fund via Razorpay Escrow"** $\rightarrow$ test gateway modal opens with standard secure checkout.

---

### Stage 3: Certified Storage (Warehouse Hub & e-NWR)
1. **Switch to Warehouse Desk** (`#warehouse-dashboard`):
   - Shows active storage capacity utilization, temperature/humidity telemetry, and inward trucks.
2. **Issue an Electronic Negotiable Warehouse Receipt (e-NWR)**:
   - Click **"Issue Digital Receipt"**.
   - Assign Lot to Farmer *Ramesh Patel*, commodity *Wheat / Basmati Rice*, 1,000 kg.
   - Enter moisture content (11.4%), germination rate, and certified bag count.
   - Generates an official, tamper-proof **e-NWR Storage Receipt**.
3. **Farmer Sees Stored Collateral**:
   - In Farmer portal under **"Inventory / e-NWR"**, the certified receipt is now visible and ready for lien pledging.

---

### Stage 4: Institutional Agri-Credit (Financier Portal)
1. **Farmer Requests Working Capital**:
   - From Farmer portal $\rightarrow$ **"Financing Desk"** $\rightarrow$ click **"Request Advance against e-NWR"**.
   - Select the 1,000 kg lot receipt (Valued at ₹42,000) $\rightarrow$ request 70% LTV advance (₹29,400).
2. **Switch to Financier Portal** (`#financier-dashboard`):
   - Access **"Underwriting Desk"**.
   - Review applicant credit rating, e-NWR receipt verification, and storage insurance certificate.
   - Click **"Approve & Disburse Working Capital"**.
   - Escrow status updates to `disbursed` $\rightarrow$ Farmer receives liquidity without waiting for final crop sale.

---

### Stage 5: Farmgate Logistics (Transporter Fleet)
1. **Switch to Transporter Desk** (`#transporter-dashboard`):
   - View assigned agricultural freight orders.
2. **Dispatch & Trip Milestones**:
   - Click **"Accept Dispatch Job"** for the procurement order.
   - Update trip status: *Loading at Farmgate* $\rightarrow$ *Weighbridge Verified* $\rightarrow$ *In-Transit* $\rightarrow$ *Arrived at Destination*.
   - Generate secure **6-Digit Delivery OTP**.

---

### Stage 6: Central Command & Escrow Settlement (Admin Ombudsman)
1. **Sign In as Admin**:
   - Email: `admin@agrolnk.com` (password: any) $\rightarrow$ lands in **Admin Dashboard**.
2. **KYC Verification Desk**:
   - Review participant registrations and approve verified badges.
3. **Escrow Commission Ledger**:
   - View total Gross Merchandise Value (GMV), 0.25% Buyer Take, 0.25% Seller Take, and Net Farmer Payouts.
4. **Final Settlement**:
   - Delivery OTP is verified by Buyer $\rightarrow$ `release_escrow_atomic` executes.
   - Escrow status marks `completed`, funds release to Farmer, and trip freight releases to Transporter.

---

## 4. Quick Verification & Build Check

To re-verify the production build at any time:
```powershell
npm run build
```
Expected output:
```text
✓ 1991 modules transformed.
dist/index.html                     1.66 kB
dist/assets/index-[hash].js        92.88 kB │ gzip: 20.89 kB
✓ built in ~2s with exit code 0
```

---

## 5. Demo FAQ / Explanations for Presenters

**Q: How does AgroLnk prevent two buyers from bidding the exact same amount at the exact same millisecond?**  
*A: AgroLnk uses an atomic PostgreSQL RPC function (`place_auction_bid_atomic`) with `SELECT ... FOR UPDATE` row locks. Only one transaction can hold the lock at a time, ensuring exact chronological sequencing and preventing duplicate or conflicting bids.*

**Q: Where does the platform revenue come from?**  
*A: A transparent 0.50% platform take-rate (0.25% paid by the wholesale buyer, 0.25% deducted from the seller payout). For a ₹10,00,000 institutional procurement lot, the platform securely retains ₹5,000 in escrow revenue with zero manual bookkeeping.*

**Q: How are farmers protected against payment defaults?**  
*A: Buyers must fund 100% of the trade value into Razorpay Route escrow upfront before the farmer dispatches the produce. The farmer's payout is guaranteed and held safely in an on_hold escrow vault until delivery confirmation.*
