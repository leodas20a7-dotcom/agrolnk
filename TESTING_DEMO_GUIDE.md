# 🌾 AgroLnk — Complete Production Demo & Testing Manual
**A Step-by-Step Interactive Guide for QA Testers & Stakeholder Demonstrations**

---

## 📋 Executive Overview
AgroLnk is an end-to-end B2B Agri-Trade Platform integrating **Spot Commerce, Live Reverse-English Auctions, 100% Escrow & 0.50% Commission, Multi-Axle Logistics, WDRA e-NWR Warehouses, 30-Day Working Capital Financing, Assayer Quality Inspections, and Anti-Circumvention Privacy Chat**.

This manual guides you step-by-step through every user role and business flow with exact account credentials, navigation paths, actions to perform, and expected results.

---

## 👥 1. Test Accounts & Role Access Matrix

| User Role | Persona Name | Login Email | Password | Primary Portal Route | Key Testing Responsibilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | Platform Admin | `admin@agrolnk.com` | `admin123` *(or any)* | `#/admin-dashboard` | 1-Click KYC Approvals, Escrow Ledger Auditing, Assayer Dispatch, Dispute Arbitration |
| **Verified Farmer** | Veerappan / Sakthi Vel | `farmer@agrolnk.com` | `farmer123` | `#/farmer-dashboard` | Spot Lot Creation, Live Auctions, e-NWR Warehouse Deposits, 75% LTV Loans |
| **Wholesale Buyer** | Maran S / Global Agro | `buyer@agrolnk.com` | `buyer123` | `#/buyer-dashboard` | Direct Spot Buying, 100% Escrow Funding, Live Bidding, Pre-Dispatch Assayer Requests |
| **Transporter** | Apex Fleet Logistics | `transporter@agrolnk.com` | `pass123` | `#/transporter-dashboard` | Multi-Axle Fleet Allocation, Corridor Checkpoint Updates, 6-Digit Delivery OTP |
| **Financier / NBFC**| Samunnati Capital | `financier@agrolnk.com` | `pass123` | `#/financier-dashboard` | 30-Day Credit Underwriting, Collateral Vault Liens, 1-Click Capital Disbursement |
| **Warehouse Operator**| Salem Agri Cold Hub | `warehouse@agrolnk.com` | `pass123` | `#/warehouse-dashboard` | 5,000 MT Storage Auditing, Multi-Chamber Temperature Zones, e-NWR Digital Titles |

---

## 🧭 2. Step-by-Step Assistant Testing Scenarios

---

### 🧪 SCENARIO 1: Identity KYC Gate & 1-Click Admin Approval
> **Goal:** Test that unverified accounts are prevented from posting trades until Admin verifies their identity documents.

* **Step 1.1 — Login as Farmer & Attempt Listing:**
  * **Role:** Farmer (`farmer@agrolnk.com`)
  * **Navigation:** Open sidebar ➡️ Click **Post Produce** (`#/farmer-create-listing`).
  * **Action:** If unverified, observe the **Verification Required Modal** blocking unauthorized submission.
  * **Action:** Click **Submit KYC Documents** and upload an Aadhaar / GST document (Image or PDF).

* **Step 1.2 — Switch to Platform Admin:**
  * **Role:** Admin (`admin@agrolnk.com`)
  * **Navigation:** Go to **Admin Dashboard** ➡️ **KYC Verification Queue** (`#/admin-verification`).
  * **Action:** Locate the farmer in the pending queue.
  * **Action:** Click the **👁️ View Document** button to preview the uploaded PDF/Image in the modal.
  * **Action:** Click the green **✓ Approve** button.

* **Step 1.3 — Verify Instant Privilege Grant:**
  * **Role:** Switch back to Farmer (`farmer@agrolnk.com`).
  * **Visual Check:** Notice the farmer now displays the emerald **Verified Producer** shield badge.
  * **Action:** Reopen **Post Produce**; the form is now 100% unlocked for trading.

**✅ Expected Outcome:** Secure role-gated onboarding where only KYC-approved producers can initiate commercial trades.

---

### 🧪 SCENARIO 2: Spot Produce Listing & 0.50% Escrow Procurement
> **Goal:** Test listing creation and verify transparent 0.50% take-rate fee math (0.25% Buyer + 0.25% Farmer).

* **Step 2.1 — Farmer Creates a Produce Lot:**
  * **Role:** Farmer (`farmer@agrolnk.com`)
  * **Navigation:** Go to **Post Produce** (`#/farmer-create-listing`).
  * **Form Values:**
    * **Commodity:** `Tomato`
    * **Variety:** `Hybrid Shivam`
    * **Grade:** `Grade A Premium`
    * **Quantity:** `500 kg` | **Unit Price:** `₹42 / kg`
    * **Location:** `Attur Farmgate Hub, Salem, Tamil Nadu`
  * **Action:** Click **Publish Listing**.

* **Step 2.2 — Buyer Browses & Places Escrow Order:**
  * **Role:** Wholesale Buyer (`buyer@agrolnk.com`)
  * **Navigation:** Go to **Marketplace** (`#/buyer-marketplace`).
  * **Action:** Search for `Tomato` or filter by `Tamil Nadu`.
  * **Action:** Click on the listing card to view details (`#/buyer-listing-detail`).
  * **Action:** Click **Direct Purchase / Buy Now**.

* **Step 2.3 — Audit Fee Breakdown in Order Modal:**
  * **Quantity to Buy:** Enter `100 kg`.
  * **Check Numbers:**
    * Commodity Subtotal: `100 kg × ₹42 = ₹4,200`
    * Buyer Platform Escrow Fee (0.25%): `₹10.50`
    * Total Buyer Deposit: `₹4,210.50`
  * **Action:** Click **Confirm & Deposit to Escrow**.

**✅ Expected Outcome:** Order status moves to `confirmed` with funds securely held in escrow.

---

### 🧪 SCENARIO 3: Pre-Dispatch Assayer Quality Check & Certification
> **Goal:** Test buyer quality protection where certified assayers inspect moisture and grade before dispatch.

* **Step 3.1 — Buyer Requests Assayer Inspection:**
  * **Role:** Wholesale Buyer (`buyer@agrolnk.com`)
  * **Navigation:** Go to **My Orders** (`#/buyer-orders`) and click on the newly placed tomato order.
  * **Action:** Locate the **Quality Inspection Desk** card inside the order summary modal.
  * **Action:** Click **Inspect Quality (Pre-Dispatch)**.
  * **Action:** Check parameters (`Moisture Content`, `Grade Assaying`) and click **Submit Quality Inspection Request**.

* **Step 3.2 — Admin Assayer Completes Physical Assay:**
  * **Role:** Platform Admin (`admin@agrolnk.com`)
  * **Navigation:** Go to **Dispute & Inspection Desk** (`#/admin-disputes`).
  * **Action:** Find the inspection request for Order #ORD-XXXX and click **Dispatch / Complete Assay**.
  * **Fill Assay Report:**
    * **Assay Grade:** `Grade A Premium`
    * **Moisture Content:** `10.8%` (Optimal)
    * **Foreign Matter:** `0.3%`
  * **Action:** Click **Approve & Dispatch Assay Report to Buyer**.

* **Step 3.3 — Buyer Views Certified Assay Sheet:**
  * **Role:** Switch back to Buyer (`buyer@agrolnk.com`).
  * **Visual Check:** Reopen the order. The inspection button is now replaced by a permanent **Readonly Certified Assay Report** showing all certified parameters.

**✅ Expected Outcome:** Zero quality risk for wholesale buyers through independent pre-dispatch certification.

---

### 🧪 SCENARIO 4: Real-Time Live Reverse-English Auction Arena
> **Goal:** Test live bidding floor with real-time countdown, reserve price checks, and instant win settlement.

* **Step 4.1 — Farmer Launches Live Auction Floor:**
  * **Role:** Farmer (`farmer@agrolnk.com`)
  * **Navigation:** Go to **Create Auction** (`#/farmer-create-auction`).
  * **Parameters:** `Basmati Rice (Pusa 1121)` | `20 Tonnes` | Starting Bid: `₹38 / kg` | Reserve: `₹45 / kg`.
  * **Action:** Click **Start Live Auction Floor**.

* **Step 4.2 — Buyer Enters Arena & Places Competitive Bid:**
  * **Role:** Wholesale Buyer (`buyer@agrolnk.com`)
  * **Navigation:** Go to **Live Auctions** (`#/buyer-live-auctions`) ➡️ Click **Enter Auction Arena** (`#/auction-room`).
  * **Action:** Place a bid above reserve price (e.g. `₹46 / kg`).
  * **Visual Check:**
    * Live bid log records the bid timestamp and bidder alias.
    * Status transitions from `Reserve Not Met` to `Reserve Met ✓` in emerald green.
    * Real-time timer decrements towards auction close.

**✅ Expected Outcome:** Dynamic, competitive price discovery with automated win conversion into an escrow contract.

---

### 🧪 SCENARIO 5: Multi-Axle Logistics Manifest & Delivery Confirmation OTP
> **Goal:** Test corridor GPS milestone tracking and secure milestone-based escrow fund release.

* **Step 5.1 — Transporter Updates Corridor Milestones:**
  * **Role:** Transporter (`transporter@agrolnk.com`)
  * **Navigation:** Go to **Logistics Corridor Hub** (`#/transporter-dashboard`).
  * **Action:** Select the assigned freight lot.
  * **Action:** Assign Truck Type: `Multi-Axle 16T Reefer (TN-28-AC-4091)`.
  * **Action:** Advance transit status: `Picked Up` ➡️ `In Transit` ➡️ `Arrived at Hub`.

* **Step 5.2 — 6-Digit Delivery Confirmation OTP:**
  * **Role:** At the delivery location, Buyer shares the **6-digit delivery OTP**.
  * **Action:** Transporter enters OTP and clicks **Verify & Complete Delivery**.

* **Step 5.3 — Verify Automatic Escrow Release:**
  * **Role:** Platform Admin (`admin@agrolnk.com`) ➡️ **Escrow Ledger** (`#/admin-escrow`).
  * **Visual Check:** Order updates to `Completed / Escrow Released to Farmer` with the exact 0.50% fee retained by AgroLnk.

**✅ Expected Outcome:** 100% fraud-proof settlement; farmer receives payout only after verified delivery.

---

### 🧪 SCENARIO 6: Anti-Circumvention Privacy Chat & Smart Evasion Shield
> **Goal:** Test that contact evasion tactics (split phone digits, domain keywords, number words) are blocked in real time.

* **Step 6.1 — Open Direct Privacy Channel:**
  * **Role:** Wholesale Buyer (`buyer@agrolnk.com`).
  * **Navigation:** Open **My Orders** (`#/buyer-orders`) ➡️ Click the **💬 Privacy Chat** drawer button.
  * **Action:** Select channel: **Veerappan (Farmer) • Direct Channel**.

* **Step 6.2 — Test Circumvention Attack Vectors:**
  * Try typing the following messages to test the smart shield:

| Test Input Scenario | Message Content Typed | Expected Smart Shield Masking |
| :--- | :--- | :--- |
| **Standard Phone Number** | `Call me at 9840123456 for direct deal` | `Call me at 98*** ***56 [Protected Phone] for direct deal` |
| **Email Address** | `Send invoice to buyer.agro@gmail.com` | `Send invoice to [Protected Email]` |
| **Domain Fragment** | `Contact me on yahoo or dot com` | `Contact me on [Protected Domain] or [Protected Domain]` |
| **Split Number Evasion (Sliding Window)** | Msg 1: `98755`<br>Msg 2: `67890` | **Sliding Window Intercepts:** Masked to `98*** [Protected Fragment]` + **Security Warning Bot Alert** triggered! |
| **Number Words** | `call me at nine eight four zero...` | Words normalized to digits and masked safely. |

* **Step 6.3 — Verify Real-Time Bidirectional Sync:**
  * **Role:** Login as Farmer in another tab/browser (`farmer@agrolnk.com`).
  * **Visual Check:** Both parties see the synchronized conversation thread in real time.

**✅ Expected Outcome:** Zero PII leakage; traders communicate freely while platform revenue is safeguarded.

---

### 🧪 SCENARIO 7: e-NWR Warehouse Deposits & 30-Day Working Capital Financing
> **Goal:** Test electronic Negotiable Warehouse Receipts (e-NWR) and 75% LTV commodity-backed credit underwriting.

* **Step 7.1 — Farmer Deposits Produce into Cold Storage:**
  * **Role:** Farmer (`farmer@agrolnk.com`) ➡️ **e-NWR Vault** (`#/farmer-inventory`).
  * **Action:** Click **➕ Deposit Produce**, select `Salem Agri Cold Hub`, `1000 kg Tomato`, `Chamber B4`.
  * **Visual Check:** An electronic title `eNWR-2024-XXXX` is minted.

* **Step 7.2 — Farmer Applies for 75% LTV Working Capital:**
  * **Action:** Click **Apply for Working Capital** on the receipt card.
  * **Action:** Request `₹25,000` (Max ceiling: `75% of ₹42,000 = ₹31,500`) for `30 Days`.
  * **Action:** Click **Submit Working Capital Request**.

* **Step 7.3 — NBFC Financier Approves & Places Collateral Lien:**
  * **Role:** Financier (`financier@agrolnk.com`) ➡️ **Underwriting Desk** (`#/financier-underwriting`).
  * **Action:** Click **Review & Underwrite** ➡️ Click **Approve & Disburse Funds**.
  * **Visual Check:** Open **Collateral Vault** (`#/financier-collateral-vault`). The receipt is tagged with an active **Lien / Pledge Badge**, locking it from unauthorized withdrawal until repaid.

**✅ Expected Outcome:** Immediate working capital liquidity for farmers without predatory middleman loans.

---

## 🛡️ 3. Quick Sanity & Production Readiness Checklist

- [x] **Zero Build Errors:** `npm run build` compiles 1,946+ modules cleanly with 0 errors.
- [x] **Zero SQL Policy Collisions:** Supabase schema uses idempotent drop/create definitions.
- [x] **Responsive UI:** Tested across Desktop, Tablet, and Mobile viewports.
- [x] **Channel Deduplication:** Chat displays 1 entry per business partner regardless of order volume.
- [x] **Accurate Revenue Math:** 0.25% Buyer + 0.25% Farmer = 0.50% Total Platform Take-Rate.
