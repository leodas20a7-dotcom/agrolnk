# 🌾 AgroLnk — Complete Production Demo & Testing Manual

This document provides step-by-step testing workflows, role credentials, test case scenarios, expected outcomes, and edge-case validation rules for testers and demo evaluators.

---

## 👥 1. Demo Credentials & User Roles

| Role | Name | Email | Password | Primary Functions & Test Scenarios |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | Platform Admin | `admin@agrolnk.com` | `admin123` *(or any)* | KYC Approval, 0.50% Commission Auditing, Quality Dispute Arbitration, Assayer Dispatch |
| **Verified Farmer** | Veerappan / Sakthi Vel | `farmer@agrolnk.com` | `farmer123` | Spot Commodity Lot Creation, Live Auctions, e-NWR Warehouse Storage, Working Capital |
| **Wholesale Buyer** | Maran S / Global Agro | `buyer@agrolnk.com` | `buyer123` | Spot Procurement, 100% Escrow Funding, Live Bidding, Pre-Buy Assayer Requests, 30-Day Credit |
| **Transporter** | Apex Fleet Logistics | `transporter@agrolnk.com` | `pass123` | Multi-Axle Fleet Allocation, Corridor Checkpoint Updates, 6-Digit Delivery OTP |
| **Financier / NBFC** | Samunnati Capital | `financier@agrolnk.com` | `pass123` | Credit Limit Underwriting, 30-Day Invoice Financing, Collateral Vault Liens |
| **Warehouse Operator**| CWC Agri Hub | `warehouse@agrolnk.com` | `pass123` | e-NWR Digital Receipts, Inward/Outward Moisture & Grade Auditing |

---

## 🧭 2. End-to-End Master Testing Scenarios

```
[ 1. KYC Verification ] ➡️ [ 2. Farmer Lot Creation ] ➡️ [ 3. Buyer Pre-Buy Assayer ]
                                                                       ⬇️
[ 6. Anti-Circumvention Chat ] ⬅️ [ 5. Logistics & OTP ] ⬅️ [ 4. 100% Escrow Checkout ]
```

---

### 🧪 TEST SCENARIO 1: Identity & KYC Gate Verification
**Objective:** Verify that unverified users cannot post trades, and Admin can approve documents with 1-click.

#### Steps for Tester:
1. **Login as Farmer** (`farmer@agrolnk.com` or register a new user).
2. Click **Create Listing** or **Create Auction**.
   * *If unverified:* A verification gate modal will appear preventing submission.
   * Upload identity proof (Aadhaar / GST / Land Record as image or PDF) and submit.
3. **Switch to Admin** (`admin@agrolnk.com`).
4. Navigate to **Admin Dashboard** ➡️ **KYC Verification Queue** (`#/admin-verification`).
5. Click **View Document** to preview the uploaded PDF or image in the high-fidelity modal.
6. Click **Approve**.
7. **Switch back to Farmer**:
   * Observe that the verified shield badge (`Verified Producer`) is awarded.
   * Farmer can now publish listings and host auctions immediately.

* **Expected Outcome:** Verification gate strictly enforces KYC compliance; Admin 1-click approval instantaneously grants platform privileges.

---

### 🧪 TEST SCENARIO 2: Spot Produce Listing & Escrow Procurement
**Objective:** Test agricultural commodity listing creation and 0.50% take-rate escrow calculation.

#### Steps for Tester:
1. **Login as Farmer** (`farmer@agrolnk.com`).
2. Go to **Post Produce** (`#/farmer-create-listing`).
3. Fill in the 5-step form:
   * Commodity: `Tomato` (Hybrid Shivam, Grade A)
   * Quantity: `500 kg` | Unit Price: `₹42 / kg`
   * Hub: `Attur Farmgate Hub, Salem, Tamil Nadu`
4. Click **Publish Listing**.
5. **Login as Buyer** (`buyer@agrolnk.com`).
6. Go to **Marketplace** (`#/buyer-marketplace`), search for `Tomato` or filter by `Tamil Nadu`.
7. Click on the listing card to view details (`#/buyer-listing-detail`).
8. Click **Direct Purchase / Buy Now**.
9. In the Order Modal:
   * Enter quantity: `100 kg`.
   * **Verify Fee Calculation:**
     * Commodity Subtotal: `100 × ₹42 = ₹4,200`
     * Buyer Escrow Fee (0.25%): `₹10.50`
     * Total Buyer Escrow Deposit: `₹4,210.50`
10. Click **Confirm & Deposit to Escrow**.

* **Expected Outcome:** Order is created in `confirmed` status with funds held securely in escrow.

---

### 🧪 TEST SCENARIO 3: Pre-Dispatch Quality Assayer & Inspection Desk
**Objective:** Validate that buyers can request third-party lab assaying before goods leave the farmgate.

#### Steps for Tester:
1. **As Buyer** in **My Orders** (`#/buyer-orders`):
2. Click on the newly placed tomato order.
3. In the Order Detail modal, locate the **Quality Inspection Desk** card.
4. Click **Inspect Quality (Pre-Dispatch)**.
5. In the modal:
   * Select test parameters: `Moisture %`, `Grade Assaying`, `Pesticide Residue`.
   * Click **Submit Quality Inspection Request**.
6. **Switch to Admin** (`admin@agrolnk.com`).
7. Navigate to **Dispute & Inspection Desk** (`#/admin-disputes`).
8. Find the requested inspection and click **Dispatch / Complete Assay**:
   * Enter Moisture Content: `10.8%`
   * Enter Grade: `Grade A Premium`
   * Enter Foreign Matter: `0.3%`
   * Click **Approve & Dispatch Assay Report to Buyer**.
9. **Switch back to Buyer** (`buyer@agrolnk.com`):
   * Reopen the order.
   * Observe that the button has transitioned to a **Readonly Certified Assay Report** showing the verified parameters.
   * *Lifecycle Check:* Pre-dispatch button is automatically disabled once goods are in-transit/delivered.

* **Expected Outcome:** Clear, professional assay certification lifecycle protecting buyers from sub-standard quality.

---

### 🧪 TEST SCENARIO 4: Real-Time Live Reverse English Auction
**Objective:** Test real-time countdown, reserve price checks, bid increments, and auto-settlement.

#### Steps for Tester:
1. **As Farmer** (`farmer@agrolnk.com`), navigate to **Create Auction** (`#/farmer-create-auction`).
   * Commodity: `Basmati Rice (Pusa 1121)`
   * Quantity: `20 Tonnes`
   * Starting Bid: `₹38 / kg` | Reserve Price: `₹45 / kg`
   * Duration: `15 minutes`
2. Click **Start Live Auction Floor**.
3. **As Buyer** (`buyer@agrolnk.com`), navigate to **Live Auctions** (`#/buyer-live-auctions`).
4. Click **Enter Auction Arena** (`#/auction-room`).
5. Place a competitive bid (e.g. `₹46 / kg`).
6. Observe:
   * Real-time bid log updates with timestamp and bidder code.
   * Highest bidder badge turns emerald green.
   * Reserve price indicator transitions from `Reserve Not Met` to `Reserve Met ✓`.

* **Expected Outcome:** Instantaneous, low-latency auction bidding with automatic win settlement.

---

### 🧪 TEST SCENARIO 5: Logistics Manifest & Delivery Confirmation OTP
**Objective:** Test freight allocation, corridor GPS checkpoint milestones, and escrow fund release.

#### Steps for Tester:
1. **Login as Transporter** (`transporter@agrolnk.com`).
2. Go to **Logistics Corridor Hub** (`#/transporter-dashboard`).
3. View the assigned freight order:
   * Assign Truck Type: `Multi-Axle 16T Reefer`
   * Update status: `Picked Up` ➡️ `In Transit` ➡️ `Arrived at Hub`.
4. **At Delivery Location**:
5. Obtain the **6-digit Delivery Confirmation OTP** from the Buyer.
6. Enter OTP and click **Verify & Complete Delivery**.
7. **Audit Escrow Release**:
   * Go to **Admin Escrow Ledger** (`#/admin-escrow`).
   * Verify that the order status is updated to `Escrow Released to Farmer` with the exact 0.50% take-rate retained.

* **Expected Outcome:** 100% secure milestone-based fund release upon validated OTP delivery.

---

### 🧪 TEST SCENARIO 6: Anti-Circumvention Privacy Chat & Smart Evasion Shield
**Objective:** Prove that contact evasion tactics (split numbers, domain masking, spelling words) are blocked in real-time.

#### Steps for Tester:
1. **Login as Buyer** (`buyer@agrolnk.com`) and open **My Orders** (`#/buyer-orders`).
2. Click the **💬 Privacy Chat** floating button or channel link.
3. In the Chat Drawer, select the direct channel with **Veerappan (Farmer)**.
4. Try typing any of the following circumvention attempts:

| Circumvention Test Input | Expected Shield Behavior |
| :--- | :--- |
| `Call me at 9840123456 for direct deal` | Auto-masked to: `Call me at 98*** ***56 [Protected Phone] for direct deal` |
| `Send email to buyer.agro@gmail.com` | Auto-masked to: `Send email to [Protected Email]` |
| `My handle is maran trade on yahoo` | Auto-masked to: `My handle is maran trade on [Protected Domain]` |
| **Split Number Evasion:** Message 1: `98755`, Message 2: `67890` | **Sliding Window Shield Triggers:** Number fragments masked to `98*** [Protected Fragment]` + automated AgroLnk Security Warning bot alert! |
| **Word Numbers:** `call me at nine eight four zero one...` | Normalized & masked by smart word-number regex engine. |

5. **Bidirectional Verification:**
   * Login as Farmer in another tab or incognito window (`farmer@agrolnk.com`).
   * Open the Chat Drawer and select **Maran (Buyer)**.
   * Send a response (e.g. `Price is fixed at ₹42, quality is Grade A`).
   * Verify that both parties see messages in real time in the same synchronized thread.

* **Expected Outcome:** No PII leakage; traders communicate smoothly on-platform with automatic policy enforcement.

---

### 🧪 TEST SCENARIO 7: e-NWR Electronic Warehouse Receipt & 30-Day Financing
**Objective:** Store produce in accredited warehouse and unlock working capital loans.

#### Steps for Tester:
1. **As Farmer**, go to **e-NWR Vault** (`#/farmer-inventory`).
2. Create warehouse deposit: `15 Tonnes Maize` at `CWC Agri Hub`.
3. Receive **e-NWR Digital Warehouse Receipt**.
4. Click **Apply for Working Capital (75% LTV)** against the receipt.
5. **Switch to Financier** (`financier@agrolnk.com`).
6. Navigate to **Underwriting Desk** (`#/financier-underwriting`).
7. Review farmer risk score, commodity market value, and click **Approve 30-Day Credit Line**.
8. Verify collateral lien is registered in **Collateral Vault** (`#/financier-collateral-vault`).

* **Expected Outcome:** Instant liquidity against physical agricultural commodities without traditional bank friction.

---

## 🛡️ 3. Quick Sanity & Production Readiness Checklist

- [x] **Zero Build Errors:** `npm run build` cleanly transforms 1,946+ modules.
- [x] **Zero SQL Policy Collisions:** Supabase schema uses idempotent drop/create definitions.
- [x] **Responsive UI:** Tested across Desktop, Tablet, and Mobile viewport widths.
- [x] **No Ghost Timelines:** Redundant order modals consolidated into single clean badges.
- [x] **Channel Deduplication:** Chat displays 1 entry per business partner regardless of order volume.
- [x] **Accurate Revenue Math:** 0.25% Buyer + 0.25% Farmer = 0.50% Total Platform Take-Rate.
