# AgroLnk Standalone Interactive Demo Sandbox

This folder contains the complete, isolated **AgroLnk 5-Stage End-to-End Demo Sandbox**. It is decoupled from the main AgroLnk application codebase so it does not mix with production code or database schemas.

## 📁 Included Files:
- `DemoCenter.jsx`: Full interactive UI featuring the 4-persona switcher, 5-stage workflow stepper, 60-second auto-play tour with floating cloud instructions, animated pointing arrow, bid counters, 2-OTP transit consoles, and assay payout certificate.
- `demoEngine.js`: 100% client-side mock engine (`sessionStorage`) with zero Supabase or backend mutations. Pre-seeded with 4 personas, auction templates, vehicle tariffs, assay disputes, and bank UTR generators.

## 🌾 Stages Covered in the Sandbox:
1. **Stage 1**: Farmgate produce auction lot launch (2,000 KG Paddy, 1,000 KG Tomato, 1,500 KG Mustard Seed).
2. **Stage 2**: Live floor bidding arena with competitor bot outbids and early farmer knockdown.
3. **Stage 3**: Buyer IDBI Bank nodal escrow trust account deposit with 3 payment channel options.
4. **Stage 4**: Logistics carrier assignment with Two-Step Anti-Theft OTP verification (Farmgate Pickup OTP & Mill Delivery OTP).
5. **Stage 5**: Destination quality moisture assay certification, mutual discount dispute resolution, and final instant IMPS bank payout with authoritative UTR generation.
