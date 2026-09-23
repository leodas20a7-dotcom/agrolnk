# AgroLnk — Digital Agricultural Commodity Exchange & Escrow Settlement Engine

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20Realtime-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Razorpay](https://img.shields.io/badge/Payment-Razorpay%20Route-0C2340?logo=razorpay&logoColor=blue)](https://razorpay.com/)
[![Bundle Size](https://img.shields.io/badge/Main%20Bundle-92.88%20kB%20(Gzip:%2020.89%20kB)-brightgreen)](https://vitejs.dev/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Hardened-emerald)](#)

AgroLnk is a full-stack, multi-stakeholder digital agricultural exchange connecting **Farmers**, **Institutional Buyers**, **Certified Warehouses**, **Financial Institutions (NBFCs)**, and **Transporters** into a unified, transparent trading ecosystem with automated escrow settlements.

---

## 🌟 Core Value Proposition

* **Zero Middleman Deductions**: Direct trade between verified agricultural producers and wholesale buyers.
* **100% Escrow Protection**: Buyer deposits are locked in milestone escrow (`on_hold: 1`) and only released upon verified 6-digit delivery OTP.
* **Live Clock Auctions**: Real-time bidding engine with PostgreSQL `FOR UPDATE` row locking to prevent race conditions and shill bidding.
* **WDRA e-NWR Collateral Credit**: Electronic Negotiable Warehouse Receipts (e-NWR) issued by certified warehouses can be pledged for instant 70% LTV working capital advances from NBFC partners.
* **Sub-100 kB Rural Optimization**: Route-level code splitting ensures instant first paint (< 100 kB initial chunk) even on 2G/3G mobile networks.

---

## 👥 Multi-Stakeholder Portals

| Role | Key Capabilities | Portal Route |
| :--- | :--- | :--- |
| **🌾 Farmer Desk** | List produce lots, launch live clock auctions, track escrow orders, manage warehouse storage, request working capital credit. | `#/farmer-dashboard` |
| **🛒 Buyer Terminal** | Discover certified lots, participate in live auction rooms, fund orders with Razorpay escrow, request NABL quality assay inspections. | `#/buyer-dashboard` |
| **🏭 Warehouse Hub** | Manage inward/outward crop lots, record cold chain telemetry, issue electronic Negotiable Warehouse Receipts (e-NWR). | `#/warehouse-dashboard` |
| **💰 Financier Desk** | Institutional credit underwriting, inspect e-NWR collateral vaults, approve invoice discounting & working capital, track repayments. | `#/financier-underwriting` |
| **🚚 Transporter Fleet** | Accept farmgate freight dispatches, manage vehicle fleet, track weighbridge milestones, generate delivery OTP for instant freight payout. | `#/transporter-dashboard` |
| **🛡️ Admin Ombudsman** | Central platform governance, KYC document approval queue, 0.50% escrow take-rate ledger, dispute resolution desk. | `#/admin-dashboard` |

---

## 🏗️ Technical Architecture & Security Highlights

### 1. Atomic PostgreSQL Engine (`FOR UPDATE` Row Locking)
Concurrent bids and escrow payouts are executed inside authoritative PostgreSQL stored procedures:
* `place_auction_bid_atomic`: Prevents double-bids, verifies auction duration, blocks seller self-bidding, and triggers outbid notifications.
* `release_escrow_atomic`: Guarantees idempotency — eliminates double-disbursement risks during network retries or duplicate button clicks.
* `finalize_auction_atomic`: Validates reserve prices and automatically generates orders without duplicate rows.

### 2. High-Performance Frontend Code Splitting
* **Entry Bundle Reduction**: Reduced from **1,706 kB down to 92.88 kB (gzip: 20.89 kB)** — a **94.5% improvement**.
* All 32 internal portal pages are dynamically imported via `React.lazy` and wrapped in `Suspense` with a custom `FlashLoadingScreen`.
* Vendor chunk isolation (`vendor-react`, `vendor-supabase`, `vendor-icons`, `vendor-marked`) via Rollup `manualChunks`.

### 3. Realtime WebSockets & Tenant Privacy
* Bid updates and ticker movements stream live into `AuctionRoom.jsx` via Supabase Realtime channels without page refreshes.
* Chat message streams and notifications are tenant-authorized to prevent cross-account local storage leaks.

### 4. Supabase Storage Buckets & Access Security
* `listings` *(Public, 10MB limit)*: Producer lot photos with automatic canvas client-side compression (800px / 0.72 quality).
* `proof` *(Public, 15MB limit)*: Weighbridge slips, NABL assay certificates, and transport delivery receipts.
* `kyc` *(Private, 10MB limit)*: Encrypted identity documents strictly gated to the document owner and verified platform Admins.

---

## 📁 Repository Structure

```text
agrolnk/
├── DEMO_GUIDE.md             # Complete presentation script & smoke test guide
├── vercel.json               # Enterprise HTTP security headers & cache controls
├── vite.config.js            # Rollup code-splitting & build configurations
├── .env.example              # Public & secret environment keys template
├── src/
│   ├── App.jsx               # Route mapping, lazy loading & auth resolution
│   ├── components/           # Reusable UI primitives, badges, modals & drawers
│   │   ├── auction/          # Live clock auction components
│   │   ├── chat/             # Private tenant-scoped chat drawer
│   │   ├── financing/        # Underwriting rows, cards & term sheet modals
│   │   ├── warehouse/        # e-NWR receipt generation & inventory modals
│   │   └── ui/               # Buttons, Cards, Badges, Modals, ErrorBoundary
│   ├── pages/                # Multi-role portal pages (Code-Split)
│   │   ├── admin/            # Verification queue, commission ledger, settings
│   │   ├── auction/          # Shared real-time auction room
│   │   ├── buyer/            # Marketplace, order tracker, deliveries, financing
│   │   ├── farmer/           # Listings, auctions, e-NWR inventory, loan repayments
│   │   ├── financier/        # Underwriting desk, collateral vault, disbursements
│   │   ├── transporter/      # Freight dispatch jobs & vehicle fleet tracker
│   │   └── warehouse/        # Certified storage chambers & receipt manager
│   └── utils/                # Business logic, Supabase RPC wrappers & calculations
│       ├── auctions.js       # Atomic bidding & auction settlement logic
│       ├── auth.js           # Multi-role authentication & profile sync
│       ├── chat.js           # Private realtime messaging engine
│       ├── financing.js      # NBFC underwriting, loan terms & repayment math
│       ├── orders.js         # Milestone escrow lifecycle & OTP release
│       └── razorpayRouteClient.js # Gateway integration & on_hold transfers
└── supabase/
    ├── fix_supabase_schema.sql     # Schema tables, composite indexes & realtime pub
    ├── atomic_functions.sql        # PostgreSQL atomic stored procedures (FOR UPDATE)
    ├── storage_buckets_setup.sql   # Storage bucket policies (listings, proof, kyc)
    └── functions/
        └── razorpay-route/         # Authoritative Deno edge function & webhook handler
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* **Node.js** (v18.0 or later)
* **npm** (v9.0 or later)
* A **Supabase** account / project

### 1. Clone & Install
```bash
git clone https://github.com/leodas20a7-dotcom/agrolnk.git
cd agrolnk
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
# Client Keys (Browser-safe)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_RAZORPAY_KEY_ID=rzp_test_YourKeyHere

# Server-Side Secrets (Supabase Edge Functions / CLI only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RAZORPAY_KEY_ID=rzp_test_YourKeyHere
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Initialize Supabase Database
Run the following SQL migration scripts in your **Supabase SQL Editor**:
1. [`supabase/fix_supabase_schema.sql`](supabase/fix_supabase_schema.sql) — Provisions core tables, performance indexes, and Realtime publications.
2. [`supabase/atomic_functions.sql`](supabase/atomic_functions.sql) — Installs `place_auction_bid_atomic` and `release_escrow_atomic` stored procedures.
3. [`supabase/storage_buckets_setup.sql`](supabase/storage_buckets_setup.sql) — Configures `listings`, `proof`, and `kyc` storage buckets with RLS.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build & Verification
```bash
npm run build
```
Generates an optimized production bundle with zero warnings in `dist/`.

---

## 🧪 Live Demo & Testing Script

For a complete step-by-step presentation script, role credentials, and dual-window testing instructions, refer to **[`DEMO_GUIDE.md`](DEMO_GUIDE.md)**:

* **Instant Admin Access**: Log in with `admin@agrolnk.com` (no password required).
* **Dual-Window Bidding Demo**: Open a regular window (Farmer) and an incognito window (Buyer) side-by-side to experience live real-time bid streaming.

---

## 📄 License

This project is licensed under the MIT License — see the LICENSE file for details.
