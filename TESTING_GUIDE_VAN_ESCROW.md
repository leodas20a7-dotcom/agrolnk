# AgroLnk Manual Testing & QA Guide: Dual-Tier Escrow & VAN Banking Architecture

This testing guide provides step-by-step instructions for the Quality Assurance (QA) and manual testing team to verify the newly implemented **Virtual Account Number (VAN) Banking Provision and Dual-Tier Escrow Workflow**.

---

## 🎯 Architecture Summary for QA

1. **Dual-Tier Checkout Threshold**:
   - **Orders `< ₹50,000`**: Both **Instant Razorpay UPI** and **Escrow VAN (NEFT/RTGS)** options are available.
   - **Orders `≥ ₹50,000`**: Instant gateway is **hidden** (to eliminate high gateway percentage fees and limits); only **AgroLnk Escrow Virtual Account (NEFT/RTGS)** is available.
2. **Submitting a UTR does NOT mean payment is confirmed**:
   - When a buyer submits a bank UTR number, the order enters a pending state: `⏳ Awaiting Bank Verification`.
   - The produce dispatch buttons for the farmer remain **strictly locked**.
3. **Admin Verification via Bank Statement**:
   - The Admin logs into the platform, reviews the buyer's claimed UTR against the corporate bank statement, and clicks **"Verify Deposit"**.
   - Only after this confirmation does the order become `Confirmed / Funded`, and dispatch unlocks for the farmer.
4. **Final Settlement**:
   - Once produce is delivered, Admin performs telephonic quality verification and releases funds to the farmer's registered bank account.

---

## 📋 Prerequisites & Test Setup

1. **Environment Variables**:
   Ensure `.env` or `.env.example` has the bank details defined:
   ```env
   VITE_AGROLNK_ESCROW_ACCOUNT_NAME="AgroLnk Technologies Private Limited"
   VITE_AGROLNK_ESCROW_ACCOUNT_NUMBER="50200088991122"
   VITE_AGROLNK_ESCROW_IFSC="HDFC0000040"
   VITE_AGROLNK_ESCROW_BANK_NAME="HDFC Bank"
   VITE_AGROLNK_ESCROW_BRANCH="Agro-Commerce Branch"
   VITE_AGROLNK_VAN_PREFIX="AGRO"
   ```
2. **Run Local Server**:
   ```bash
   npm run dev
   ```
3. **Test Users Needed**:
   - **Admin User**: Log in with role `admin` (e.g. `admin@agrolnk.com`).
   - **Buyer User**: Log in with role `buyer` or `processor` (e.g. enterprise buyer).
   - **Farmer / Seller User**: Log in with role `farmer` (producing lot inventory).

---

## 🧪 Test Suite Overview

| Test Case ID | Test Flow | Target Module |
| :--- | :--- | :--- |
| **TC-01** | Admin User Profile VAN Provisioning | Module A |
| **TC-02** | Buyer Profile VAN Visibility & Copy Check | Module A |
| **TC-03** | Buyer Retail Checkout (< ₹50,000) Dual-Option | Module B |
| **TC-04** | Buyer Bulk Checkout (≥ ₹50,000) Escrow VAN Only & UTR Submission | Module B |
| **TC-05** | Farmer Dispatch Lock Protection (Pending UTR Check) | Module C |
| **TC-06** | Admin Real-World Bank Statement Check & Deposit Verification | Module D |
| **TC-07** | Farmer Dispatch Unlocking Post-Verification | Module C & D |
| **TC-08** | Order Delivery & Admin Call Desk Settlement Release to Farmer | Module D |

---

## 📝 Detailed Step-by-Step Test Execution

---

### TC-01: Admin Assigning / Generating User VAN
**Objective**: Verify Admin can view, assign, or auto-generate a Nodal Virtual Account Number (VAN) for registered users.

1. **Action**: Log in as **Admin**.
2. **Action**: Navigate to **Admin Dashboard** ➔ Click on **"User Verification"** (`/admin/users` or `UserVerificationQueue`).
3. **Action**: In the user table or grid, click on any user row or click **"Inspect KYC"**.
4. **Expected Result**: An inspection drawer slides open from the right.
5. **Action**: Scroll down to the **"AgroLnk Virtual Account Number (VAN) Provisioning"** card.
6. **Action**: 
   - If the user has no VAN yet, click the emerald button: **"Auto-Generate AgroLnk Nodal VAN"**.
   - Select Bank Status: Change to **"Active / Bank Verified"**.
7. **Action**: Click **"Save VAN Provision"**.
8. **Expected Result**:
   - Success toast appears: `"User Virtual Account Number (VAN) details updated"`.
   - The user card updates with an assigned VAN (e.g. `AGRO...`) and IFSC.
   - The status pill in the main queue changes to green `VAN: AGRO...`.

---

### TC-02: User Profile VAN Display & Copy
**Objective**: Verify the user sees their allocated Virtual Escrow Account in their profile.

1. **Action**: Switch to the user account that was assigned a VAN in **TC-01**.
2. **Action**: Click on the user's name/avatar in the top navigation bar ➔ Click **"Profile"**.
3. **Expected Result**:
   - Inside the **Profile Modal**, look for the card titled: **"Virtual Escrow Account (VAN)"**.
   - It displays:
     - Account Number: `AGRO...`
     - IFSC: e.g. `HDFC0000040`
     - Bank Name: e.g. `HDFC Bank`
     - Status Badge: `Active / Bank Verified` (Green) or `Pending Allocation` (Amber).
4. **Action**: Click the copy icon next to the VAN number.
5. **Expected Result**: Toast or feedback confirms `"Account number copied!"`.

---

### TC-03: Buyer Checkout < ₹50,000 (Dual Options Available)
**Objective**: Verify orders under ₹50,000 allow both Instant UPI and Bank Escrow Transfer.

1. **Action**: Log in as a **Buyer**.
2. **Action**: Go to **Marketplace** (`/marketplace`).
3. **Action**: Select a listing where the total price will be **less than ₹50,000** (e.g., 200 kg @ ₹100/kg = ₹20,000).
4. **Action**: Click **"Instant Order"** or **"Buy Now"**.
5. **Expected Result in Modal**:
   - You should see **two payment mode cards**:
     1. `⚡ Instant UPI / NetBanking (Razorpay Route)`
     2. `🏛️ AgroLnk Escrow Virtual Account (NEFT/RTGS)`
   - Both options are selectable.

---

### TC-04: Buyer Bulk Checkout ≥ ₹50,000 (Exclusively Escrow VAN + UTR Submission)
**Objective**: Verify bulk orders over ₹50,000 hide Razorpay and enforce Escrow VAN payment with UTR submission.

1. **Action**: In the Marketplace, select a lot or adjust quantity so the total is **≥ ₹50,000** (e.g., 10 MT @ ₹40,000/MT = ₹4,00,000).
2. **Action**: Click **"Buy Now"**.
3. **Expected Result**:
   - The **Razorpay Instant UPI option is completely HIDDEN**.
   - Only **"AgroLnk Escrow Virtual Account (NEFT/RTGS)"** is visible and pre-selected.
   - A blue/emerald callout card displays the official bank account details:
     - Beneficiary Name: (from `.env`)
     - Virtual / Collection Account Number: (from `.env` or user VAN)
     - IFSC Code: (from `.env`)
     - Bank & Branch: (from `.env`)
   - Below the bank card, an input field appears: **"Bank Transfer Reference (UTR Number)"**.
4. **Validation Test**:
   - Try to click "Confirm & Submit Escrow Transfer" with empty UTR ➔ Should trigger error: *"Please enter valid bank reference/UTR number"*.
   - Type fewer than 6 characters (e.g. `123`) ➔ Should trigger error: *"UTR must be at least 6 characters"*.
5. **Action**: Enter a valid test UTR (e.g., `UTRN9876543210`) and click **"Confirm & Submit Escrow Transfer"**.
6. **Expected Result**:
   - Order confirmation modal or toast appears: `"Order placed! UTR submitted for admin bank statement check."`
   - Navigate to **Buyer Orders** (`/buyer-orders`).
   - The new order displays status badge: `⏳ Awaiting Bank Verification`.
   - The status text reads: `"Bank UTR (UTRN9876543210) submitted. Awaiting Admin bank statement check."`
   - Click **"View Invoice"** ➔ Verify the invoice specifies:
     - Payment Method: `Escrow Virtual Account (NEFT/RTGS)`
     - UTR: `UTRN9876543210`

---

### TC-05: Farmer Dispatch Safety Lock Verification
**Objective**: Ensure that a submitted UTR does NOT unlock produce dispatch for the farmer until Admin confirms funds.

1. **Action**: Log in as the **Farmer / Seller** of the ordered produce.
2. **Action**: Navigate to **Farmer Orders** (`/farmer-orders`).
3. **Action**: Find the order placed in **TC-04**.
4. **Expected Result (CRITICAL SECURITY CHECK)**:
   - Status badge shows: `Bank UTR Verifying` (Amber pulsating pill).
   - A prominent amber alert box appears above the order:
     > *"⚠️ Escrow Deposit Under Bank Statement Check. The buyer submitted Bank UTR [UTR]. AgroLnk Admin is currently checking the corporate bank statement. Dispatch will be automatically unlocked once the credit is verified."*
   - The fulfillment buttons **"Request Platform Carrier"** and **"Self-Arranged Transport"** are **COMPLETELY HIDDEN / LOCKED**.
   - The farmer cannot dispatch goods without actual received funds.

---

### TC-06: Admin Bank Statement Verification & Escrow Locking
**Objective**: Verify Admin can cross-reference the bank statement and unlock the escrow deposit.

1. **Action**: Log in as **Admin**.
2. **Action**: Navigate to **Admin Dashboard** ➔ Click on **"Escrow & 0.50% Commission Ledger"** (`/admin/escrow`).
3. **Expected Result**:
   - The tab **"Pending Bank UTR (1)"** is highlighted in amber with the count of orders awaiting statement cross-checking.
4. **Action**: Click on the **"Pending Bank UTR"** tab.
5. **Expected Result**:
   - The order from TC-04 is listed.
   - Status column shows: `Bank UTR Pending` with `UTR: UTRN9876543210`.
   - Action column displays button: `[ Verify Deposit ]`.
6. **Action**: Click **"Verify Deposit"**.
7. **Expected Result**:
   - A modal opens: **"Verify Bank Statement Deposit"**.
   - Displays Order Number, Buyer Name, Farmer Name, and Claimed Bank UTR.
   - Prominent notice instructs Admin to verify credit in corporate NetBanking before proceeding.
8. **Action**: Click **"Yes, Credit Verified — Lock Escrow"**.
9. **Expected Result**:
   - Modal closes.
   - Order moves from `Pending Bank UTR` tab to `Locked Escrow` tab.
   - Escrow status updates to `Locked in Escrow` (`funded`).

---

### TC-07: Farmer Dispatch Unlocked Post-Verification
**Objective**: Verify that after Admin confirms bank statement credit, the Farmer's order unlocks for fulfillment.

1. **Action**: Return to the **Farmer Orders** screen (`/farmer-orders`).
2. **Expected Result**:
   - The amber "Under Bank Statement Check" banner is **gone**.
   - Status badge now shows: `Confirmed / Escrow Secured` (Emerald).
   - Fulfillment buttons **"Request Platform Carrier"** and **"Self-Arranged Transport"** are now **ACTIVE and CLICKABLE**.
3. **Action**: Click **"Request Platform Carrier"** or advance the delivery status to `dispatched` ➔ `in_transit` ➔ `delivered`.
4. **Expected Result**: Delivery pipeline proceeds normally.

---

### TC-08: Order Delivery & Admin Settlement Release to Farmer
**Objective**: Verify Admin buyer call desk releases funds to the farmer's registered bank account while hiding the farmer's bank account from the buyer.

1. **Action**: Advance the order status to `delivered`.
2. **Action**: Log in as **Admin** and open **Escrow & Commission Ledger** (`/admin/escrow`).
3. **Expected Result**:
   - In the top section **"Admin Supervised Escrow: Buyer Call & Payout Clearance Desk"**, the order appears with an amber badge: `Arrived (Call Buyer)`.
4. **Action**: Click **"Call & Release"** or **"Call Buyer & Release"**.
5. **Expected Result**:
   - Modal **"Buyer Verification & Escrow Release Desk"** opens.
   - Displays Buyer contact details for the admin to initiate a call.
   - Displays Farmer Payout destination card (**visible only to Admin**):
     - Producer Name
     - Bank Name & Masked Account Number
     - IFSC Code
     - Net Farmer Payout amount (Total minus 0.25% commission).
6. **Action**: Review checklist:
   - Spoke with Buyer
   - Weight slip verified
   - Quality assay matches
   - Packaging intact
7. **Action**: Click **"Confirm Call & Release Escrow to Farmer"**.
8. **Expected Result**:
   - Order transitions to `completed` (`escrow_status: released`).
   - Ledger reflects payout disbursed to the farmer.
   - Buyer and Farmer dashboards show the trade successfully settled.

---

## 🛑 Bug / Issue Reporting Checklist for Testers

If any test fails during your manual walkthrough, please log the issue with the following details:

1. **Test Case ID** (e.g. TC-04, TC-05)
2. **User Role** (Admin / Buyer / Farmer)
3. **Order Value** (e.g. ₹25,000 or ₹2,50,000)
4. **Observed Behavior** (e.g. "Fulfillment button was visible before Admin verified deposit")
5. **Expected Behavior** (e.g. "Fulfillment button must stay hidden until Admin confirms deposit")
6. **Browser Console Log** (Press `F12` ➔ Console tab for any red errors)

