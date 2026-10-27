# AgroLnk — Food Processor Simple Step-by-Step Testing Guide

A clear, friendly, and straightforward guide to test the **Food Processor & Milling** module in AgroLnk. 

Follow this simple walkthrough like a recipe: **Farmer sells raw crop → Food Processor buys it → Food Processor sells finished food → Retailer buys it and confirms with OTP!**

---

## 🎯 What We Are Testing:
1. **Farmer lists raw produce** (e.g., Apple).
2. **Food Processor buys it** from the Farmer with safe Escrow payment.
3. **Food Processor lists processed goods** (e.g., Packaged Apple Juice).
4. **Retailer buys the processed goods** from the Food Processor.
5. **Food Processor dispatches the goods** and confirms delivery with a **6-digit OTP** to get paid!
6. **(Optional) Food Processor applies for seasonal working capital credit.**

---

## 🟢 Step 1: Farmer Lists Raw Produce (e.g. Apple)

1. Open your browser at **`http://localhost:5173`**.
2. Click your profile icon at the top right → click **Switch Role** → choose **`Farmer`**.
3. On the Farmer Dashboard, click the green button: **`+ List Produce`** (or click `Create Listing`).
4. Fill in the simple form:
   - **Commodity**: Select **`Apple`**.
   - **Variety**: Select **`Royal Delicious`**.
   - **Quantity**: Type **`500`**, Unit: **`kg`**.
   - **Price**: Type **`80`** per kg.
   - **Grade**: Select **`Grade A`**.
   - **State / Location**: Type **`Himachal Pradesh`**.
5. Click the green button: **`Publish Listing`**.
   > *Done! The raw Apple lot is now published and available on the marketplace.*

---

## 🟡 Step 2: Food Processor Buys the Raw Crop

1. Click your profile icon at top right → click **Switch Role** → choose **`Food Processor & Miller`**.
2. You will arrive at the **Food Processing & Mill Terminal**. Notice how clean it is:
   - Top banner has just 2 clear buttons: **`Buy Raw Crops`** and **`Sell Processed Goods`**.
   - Top navbar has 4 clear links: **`Dashboard`**, **`Buy Raw Crops`**, **`Sell Products`**, and **`Orders & Dispatch`**.
3. In the top banner, click the white button: **`Buy Raw Crops`**.
   *(This opens the produce marketplace).*
4. You will see the **Apple (Royal Delicious)** listed by the farmer in Step 1!
5. Click **`Buy Now / Place Order`**:
   - Enter Quantity: **`500`** kg.
   - You will see the total: `₹40,000` + transparent escrow fee.
   - Select **`Instant Escrow`** (selected by default for 1-click test simulation) and click the green button: **`⚡ Deposit ₹... in Escrow`**.
     *(You can also test **Razorpay Route** for live gateway testing if configured)*.
6. Click **`Dashboard`** in the top navbar to return to your Food Processor Terminal:
   - Under Tab 1 (**Raw Crop Purchases**), your Apple purchase is now visible!
   - Payment status shows: **`Protected in Escrow`** *(The money is held securely and will only be released to the farmer once the crop reaches your mill).*

---

## 🟣 Step 3: Food Processor Lists Finished / Milled Product for Sale

Now your mill has processed the raw apples into packaged juice or jam. Let's list it for retailers!

1. On your Food Processor Dashboard, click the emerald button in the top banner: **`Sell Processed Goods`**.
2. Fill in the product details:
   - **Product Type**: Choose **`Processed / Milled Food`**.
   - **Product Name**: Type **`Fresh Packaged Apple Juice`**.
   - **Variety / Packaging**: Type **`1 Litre Glass Bottle`**.
   - **Quantity in Stock**: Type **`200`** Bottles.
   - **Selling Price**: Type **`120`** per Bottle.
   - **Mill Location**: Type **`Solan Mill, Himachal Pradesh`**.
3. Click **`Publish Listing`**.
4. Go back to your Food Processor Dashboard → click Tab 2: **`Products & Retail Sales`**:
   - Under **Milled & Finished Goods Stock**, you will see **Fresh Packaged Apple Juice** with **200 Bottles in Stock** and the purple badge **`Processed / Milled`**!

---

## 🔵 Step 4: Retailer Buys the Finished Product

Now simulate a supermarket or grocery retailer buying your juice!

1. Open an **Incognito Window** (or click your profile icon → **Switch Role** → choose **`Buyer`**).
2. Click **`Marketplace`** in the top navbar.
3. You will see **Fresh Packaged Apple Juice** listed by the Food Processor!
4. Click **`Buy Now / Place Order`**:
   - Quantity: Type **`50`** Bottles.
   - Total: `₹6,000`.
   - Click the green button: **`⚡ Deposit ₹... in Escrow`** (Instant Escrow mode).
   > *Done! The retailer's payment is safely deposited in Escrow.*

---

## 🟠 Step 5: Food Processor Dispatches Goods & Confirms with OTP

1. Return to your **Food Processor** window.
2. Click Tab 2: **`Products & Retail Sales`**.
3. Look at the lower table: **`Retailer & Buyer Orders Received`**:
   - You will see the new order for **50 Bottles of Apple Juice**!
   - Payment status shows: **`Funded in Escrow`**.
4. Click the button: **`Dispatch Order`**:
   - Enter Vehicle / Truck Number: **`HP-14-B-9988`** (or select Self Delivery).
   - Click **`Confirm Dispatch`**.
5. **The Delivery Handshake**:
   - When the truck arrives at the retail store, the retailer gives the driver their **6-digit delivery OTP** (e.g. `629140`).
   - Enter the OTP in the delivery screen to confirm receipt.
   - **Payment Released!** The escrow immediately releases the funds (`₹6,000`) to the Food Processor's bank balance!

---

## 💼 Step 6: Seasonal Working Capital Loan (Optional)

Need extra funds to buy bulk crops during the harvest peak?

1. On your Food Processor Dashboard, click the 3rd card: **`Working Capital & Godown`** (or click `Credit & Godown` in the top navbar).
2. Click **`Apply for Working Capital Advance`**:
   - Amount: Type **`₹5,00,000`** (5 Lakhs).
   - Reason: Choose **`Seasonal Raw Commodity Procurement`**.
   - Tenure: **`90 Days`**.
3. Click **`Submit Application`**.
4. Click Tab 3 (**Mill Profile & Licenses**) on your dashboard to see your active credit application!

---

## 📋 Quick Test Summary Table

| Step | What You Do | Screen / Button to Click | What You Should See |
| :---: | :--- | :--- | :--- |
| **1** | Farmer lists raw Apple | Farmer Dashboard → `+ List Produce` | Apple appears on Marketplace at ₹80/kg |
| **2** | Food Processor buys Apple | Processor Dashboard → `Buy Raw Crops` | Purchase shown under Tab 1 as `Protected in Escrow` |
| **3** | Food Processor lists Apple Juice | Processor Dashboard → `Sell Processed Goods` | Juice shown under Tab 2 with `Processed / Milled` tag |
| **4** | Retailer buys Apple Juice | Buyer Marketplace → `Buy Now` | Payment secured in Escrow |
| **5** | Food Processor dispatches & verifies OTP | Tab 2 Orders → `Dispatch Order` | Escrow releases ₹6,000 to Food Processor! |
| **6** | Apply for Working Capital | `Credit & Godown` navbar link | Application recorded in Tab 3 |
