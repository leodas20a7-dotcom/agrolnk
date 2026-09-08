# 🏢 AgroLnk — Complete Warehouse & e-NWR Workflow Testing Manual

This manual provides an end-to-end testing blueprint for the **WDRA-Accredited e-NWR Warehousing, Multi-Chamber Cold Storage, and Commodity Collateral Financing** workflows in AgroLnk.

---

## 👥 1. Actors & Roles in the Warehouse Ecosystem

| Role | Test User Email | Password | Primary Workflow Actions |
| :--- | :--- | :--- | :--- |
| **Warehouse Operator** | `warehouse@agrolnk.com` | `pass123` *(or any)* | View multi-chamber occupancy, audit storage receipts, inspect temperature zones, manage inward/outward gatepasses. |
| **Verified Farmer** | `farmer@agrolnk.com` | `farmer123` | Deposit harvested produce, receive digital **e-NWR titles**, apply for 75% LTV commodity loans, list for sale directly from storage. |
| **Financier / NBFC** | `financier@agrolnk.com` | `pass123` | Underwrite working capital against e-NWR receipts, place collateral liens in the **Collateral Vault**, disburse credit. |
| **Wholesale Buyer** | `buyer@agrolnk.com` | `buyer123` | Procure warehouse-stored produce with verified assay certificates and immediate delivery/title transfer. |

---

## 🧭 2. Warehouse Life-Cycle Architecture

```
                                 [ 1. Inward Physical Deposit ]
                                                ⬇️
                                 [ 2. e-NWR Title Issuance ]
                                 (Assay, Moisture, Chamber)
                                           /          \
                                          /            \
                [ 3. Collateral Pledge / Loan ]    [ 4. Sell from Storage ]
                     (75% LTV Working Capital)          (Spot Market / Auction)
                                         \              /
                                          \            /
                                  [ 5. Outward Delivery / Release ]
```

---

## 🧪 3. Master Step-by-Step Test Scenarios

---

### 🔹 SCENARIO 1: Farmer Inward Deposit & e-NWR Receipt Creation
**Objective:** Validate that a farmer can choose an accredited warehouse facility, specify produce assay parameters, calculate monthly storage costs, and generate a WDRA electronic Negotiable Warehouse Receipt (e-NWR).

#### Steps for Tester:
1. **Login as Farmer** (`farmer@agrolnk.com`).
2. Navigate to **Warehouse & e-NWR Vault** (`#/farmer-inventory` or click `Inventory` in the sidebar).
3. Click the **➕ Deposit Produce** button in the header banner.
4. In the **Deposit to Accredited Warehouse Modal**:
   * **Select Warehouse:** `Salem Agri Cold Storage Hub (WDRA/2024/TN/0892)`
   * **Commodity:** `Tomato`
   * **Variety:** `Hybrid Shivam`
   * **Grade:** `Grade A Premium`
   * **Quantity:** `1000 kg` (1.0 MT)
   * **Estimated Value:** `₹42 / kg` (`₹42,000 Total Valuation`)
   * **Assigned Chamber:** `Chamber B4 (Ultra Cold: 2°C - 4°C)`
   * **Storage Duration:** `60 Days`
5. **Verify Cost Estimation Display:**
   * Observe the automated monthly storage fee calculation: `1.0 MT × ₹350/MT = ₹350 / month`.
6. Click **Confirm & Generate e-NWR Receipt**.

* **Expected Outcome:**
  * A new electronic receipt (e.g. `eNWR-2024-8841`) is generated instantly.
  * The receipt is added to the farmer's active inventory with status `Stored`.
  * Total stored metric and valuation counters update automatically.

---

### 🔹 SCENARIO 2: Inspecting e-NWR Title Certificate & Assay Parameters
**Objective:** Confirm that the generated e-NWR contains full legal title ownership, QR/WDRA accreditation, and quality assay data.

#### Steps for Tester:
1. On the **Farmer Inventory** page (`#/farmer-inventory`), locate the newly created receipt card.
2. Click **View e-NWR Certificate**.
3. **Verify the Electronic Title Modal:**
   * **Title Header:** `Electronic Negotiable Warehouse Receipt (WDRA Accredited Title)`
   * **Receipt ID:** Formatted as `eNWR-2024-XXXX` with an emerald badge.
   * **Chamber & Temperature Specs:** Displays exact room temp (e.g., `Chamber B4 (2°C - 4°C)`).
   * **Assay Parameters:** Moisture %, foreign matter %, and grade classification.
   * **Action CTAs Available:**
     * `[ 🏷️ Sell from Storage ]`
     * `[ 💳 Apply for Working Capital ]`

* **Expected Outcome:** High-fidelity, bankable electronic title document viewable on any device.

---

### 🔹 SCENARIO 3: Warehouse Operator Dashboard & Multi-Chamber Auditing
**Objective:** Verify that the warehouse operator has complete oversight of capacity, chamber temperatures, and stored receipts.

#### Steps for Tester:
1. **Login as Warehouse Operator** (`warehouse@agrolnk.com`).
2. Land on the **Warehouse Management & e-NWR Terminal** (`#/warehouse-dashboard`).
3. **Verify Metric Cards:**
   * **Total Capacity:** `5,000 Tonnes`
   * **Occupancy %:** Dynamically calculated based on active stored tonnes.
   * **Active e-NWRs:** Count of valid receipts in custody.
   * **Total Custody Valuation:** Aggregated rupee valuation of all stored commodities.
4. **Switch to Chamber Overview Tab:**
   * Verify all 4 temperature zones:
     * `Chamber A1 (Dry Storage)` — `Ambient (24°C)` (Turmeric, Grains)
     * `Chamber B2 (Cold Cell)` — `4°C - 8°C` (Potatoes, Carrots)
     * `Chamber B4 (Ultra Cold)` — `2°C - 4°C` (Hybrid Tomatoes, Fruits)
     * `Chamber C1 (CA Controlled)` — `0°C - 2°C` (Export Apples, Grapes)
5. **Switch to Inventory & Receipts Tab:**
   * Search for the farmer's receipt `eNWR-2024-XXXX`.
   * Click **Audit e-NWR** to review physical custody specs.

* **Expected Outcome:** Real-time visibility into multi-chamber utilization and commodity custody.

---

### 🔹 SCENARIO 4: 75% LTV Working Capital Loan against e-NWR
**Objective:** Validate that farmers can pledge stored commodities to unlock instant working capital without selling early.

#### Steps for Tester:
1. **Login as Farmer** (`farmer@agrolnk.com`) and go to **e-NWR Vault** (`#/farmer-inventory`).
2. On any stored receipt card, click **Apply for Working Capital** (or open the receipt detail modal and click **Apply for Working Capital**).
3. In the **e-NWR Collateral Financing Modal**:
   * Selected Commodity & Valuation: `₹42,000`
   * **Maximum Loan Facility (75% LTV):** `₹31,500`
   * Enter Requested Amount: `₹25,000`
   * Select Tenor: `30 Days` (1.2% monthly interest)
   * Note: `Pre-harvest liquidity for input fertilizers.`
4. Click **Submit Working Capital Request**.

* **Expected Outcome:** Financing request is routed directly to the Financier / NBFC underwriting queue.

---

### 🔹 SCENARIO 5: NBFC Credit Approval & Collateral Vault Lien
**Objective:** Confirm that the financier reviews the warehouse receipt, places a legal lien on the commodity, and disburses credit.

#### Steps for Tester:
1. **Login as Financier / NBFC** (`financier@agrolnk.com`).
2. Go to **Financier Portal** ➡️ **Underwriting Desk** (`#/financier-underwriting`).
3. Locate the submitted loan application for the farmer (`₹25,000` backed by `eNWR-2024-XXXX`).
4. Click **Review & Underwrite**:
   * Inspect WDRA warehouse accreditation code.
   * Inspect commodity valuation buffer.
5. Click **Approve & Disburse Funds**.
6. **Navigate to Collateral Vault** (`#/financier-collateral-vault`):
   * Verify that the receipt is now listed in the **Collateral Vault** with an active **Lien / Pledge Badge**.
   * Commodity quantity is locked from unauthorized farmer withdrawal.

* **Expected Outcome:** Seamless institutional credit underwriting backed by digital agri-collateral.

---

### 🔹 SCENARIO 6: Listing for Sale Directly from Warehouse (Zero Transit Latency)
**Objective:** Verify that farmers can list all or part of their stored commodity on the Spot Marketplace or Live Auction directly from the warehouse.

#### Steps for Tester:
1. **Login as Farmer** (`farmer@agrolnk.com`) and go to **e-NWR Vault** (`#/farmer-inventory`).
2. On the receipt card, click **Sell from Storage**.
3. In the **List from Warehouse Modal**:
   * Choose Sale Type: **Direct Spot Listing** (or **Live Auction**)
   * Available Stored: `1000 kg`
   * Quantity to List: `500 kg` (Partial listing test)
   * Selling Price: `₹45 / kg`
4. Click **Publish to Marketplace**.
5. **Verify System Updates:**
   * The receipt's available quantity decreases to `500 kg`, and status reflects `partially_listed`.
   * **Login as Buyer** (`buyer@agrolnk.com`) and open **Marketplace** (`#/buyer-marketplace`).
   * The newly published lot appears on the marketplace marked with a **🏢 Warehouse-Stored (WDRA Certified)** badge, enabling buyers to purchase pre-stored, pre-assayed goods with zero delay.

* **Expected Outcome:** Frictionless transition from storage into digital commerce without double handling or freight wastage.

---

## 🛡️ 4. Warehouse & e-NWR QA Verification Checklist

| Test Item | Verification Criteria | Status |
| :--- | :--- | :---: |
| **Accredited Facility Selection** | Only WDRA verified hubs appear in the deposit selector. | ✅ Pass |
| **Storage Fee Formula** | `(Weight in Tonnes) × (Rate/Tonne/Month) × (Months)` calculated accurately. | ✅ Pass |
| **e-NWR Receipt Numbering** | Clean sequential/timestamped format (`eNWR-YYYY-XXXX`). | ✅ Pass |
| **Temperature Zone Mapping** | Produce types correctly mapped to designated cold chain chambers. | ✅ Pass |
| **Partial Quantity Listing** | Stored inventory decrements correctly when a portion is listed on the marketplace. | ✅ Pass |
| **Collateral Lien Protection** | Financier pledge locks receipt from being listed or withdrawn until loan settlement. | ✅ Pass |
| **Multi-Role Synchronization** | Updates made by Farmer/Operator/Financier reflect in real time. | ✅ Pass |
