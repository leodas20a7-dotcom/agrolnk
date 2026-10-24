# AgroLnk — Reverse Auction Testing Guide

This guide gives you simple, step-by-step instructions to test both **Reverse Auction workflows** in AgroLnk:

---

## Method 1: Farmer Creates Reverse Auction (Downward Bidding on Harvest Lot)

In this mode, a farmer puts up a produce lot with a ceiling price, and competing buyers bid the price downward in step decrements (ideal for quick clearances, wholesale lots, or institutional tenders).

### Step 1: Farmer Lists Produce for Reverse Auction
1. **Log in as a Farmer** (or switch to farmer profile):
   - Email: `suresh@farmer.com` (or your registered farmer account).
2. Go to **Farmer Dashboard** -> Click **+ List Produce** or **Create Auction**.
3. Under **Trading Method**, select **Live Auction** (with the Gavel icon).
4. **Step 1 — Produce Specifications**:
   - Choose **Commodity** (e.g., *Yellow Maize*, *Basmati Rice*, or *Soya Bean*).
   - Enter **Quantity** and **Unit** (e.g., `100` `Quintal`).
   - Select **Quality Grade** (e.g., `Grade A`).
5. **Step 2 — Auction Type & Pricing**:
   - Under **Auction Type**, click the **Reverse Auction** button (marked in Amber with a 📉 icon).
   - **Starting Bid (Ceiling Price)**: Enter the starting top price (e.g., `₹4,500/Quintal`).
   - **Reserve Price (Floor Price)**: Enter the minimum price you are willing to accept (e.g., `₹3,800/Quintal`).
   - **Bid Step**: Select or type your decrement step (e.g., `-₹25` or `-₹50`).
6. **Step 3 — Duration & Location**:
   - Select **Duration** (e.g., `15 Minutes` or `1 Hour` for quick testing).
   - Select your **State** and **District**.
7. Click **🚀 Publish Live Auction**.

---

### Step 2: Buyer Discovers & Participates in the Reverse Auction
1. **Open a new incognito window** (or sign out and log in as a Buyer, e.g., `buyer@example.com` or create a new buyer).
2. In the Buyer Dashboard / Top Navigation:
   - Click **Live Auctions** (or navigate to `/#/live-auctions`).
3. You will see the auction lot with an amber **"Live Reverse Auction"** badge and downward trend icon.
4. Click **Enter Auction Room** (or click on the card).
5. **Inside the Auction Room**:
   - Notice the banner shows **Reverse Auction Mode** with the required decrement step (e.g., `-₹25/Quintal`).
   - The **Bid Form** on the right automatically calculates the next valid lower bid:
     - Example: If current offer is `₹4,500`, the 1x step button shows `₹4,475` (`-₹25`).
     - Quick buttons allow: `1x (-₹25)`, `2x (-₹50)`, `3x (-₹75)`, `4x (-₹100)`.
6. Click **Place Bid (₹4,475)**.
7. A confirmation popup appears displaying the bid rate, total lot value, and buyer deposit details.
8. Click **Confirm Bid**.
9. The auction room updates in real time:
   - Current lowest offer drops to `₹4,475`.
   - Your name appears in the **Live Bid History** ledger.

---

## Method 2: Buyer Posts Reverse Procurement Tender (Farmers Compete Downward)

In this mode, a corporate buyer / mill posts a bulk buying demand, and farmers submit competing downward bids.

### Step 1: Buyer Posts a Reverse Tender Demand
1. **Log in as a Buyer** (`buyer@example.com`).
2. Go to **Hybrid Procurement Desk** -> Click **Procurement Demands** (`/#/buyer-demands`).
3. Click the green button: **+ Post Buy Requirement**.
4. In the modal:
   - **Produce**: Select or type the commodity (e.g., *Wheat* or *Soya Bean*).
   - **Quantity**: e.g., `200 Quintal`.
   - **Procurement Mode**: Select **Live Reverse Auction (Competitive Downward Bidding)**.
   - **Ceiling Target Price**: Enter the maximum price you are willing to pay (e.g., `₹2,600/Quintal`).
   - **Minimum Bid Step**: Enter decrement step (e.g., `₹25`).
   - **Tender Duration**: Select duration (e.g., `24 Hours`).
   - **Delivery Destination**: Fill district/state (e.g., *Indore, Madhya Pradesh*).
5. Click **Publish Tender Requirement**.

---

### Step 2: Farmer Bids on the Buyer's Tender
1. **Log in as a Farmer** (`suresh@farmer.com`).
2. Navigate to **Buyer Requests** (`/#/farmer-demands`).
3. Click the **Live Reverse Bidding** tab at the top.
4. Find the demand card/row. Notice:
   - It displays the **Lowest Offer**, **Bid Decrement (-₹25)**, and required volume.
5. Click the primary button: **[ 📉 Place Bid ]**.
6. In the bidding dialog:
   - You can use the **1-Click Quick Bid** (e.g., `Quick Bid: ₹2,575/Quintal`) OR enter a custom quantity & quote.
7. Click **Submit Bid**.
8. The demand updates immediately with your new lower bid, and you become the **Leading Bidder**!

---

## Validation Checklist During Testing
- [ ] Bids strictly enforce step increments/decrements (e.g., cannot bid arbitrary amounts like `₹4,499` when step is `₹25`).
- [ ] Bids cannot go below the farmer's reserve floor price.
- [ ] Farmers cannot bid on their own listings.
- [ ] Real-time updates reflect in the bid history ledger.
