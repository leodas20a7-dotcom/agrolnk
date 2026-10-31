-- ============================================================================
-- AGROLNK: PURGE DUMMY ACCOUNTS, TRANSACTIONS, AUCTIONS & RECORDS
-- PRESERVED ACCOUNTS:
--   1. Kanikho FPO (kanikho@gmail.com / feffe6e5-f8fa-4bfc-9ad0-b9cdfb944aa9)
--   2. Platform Administrator (admin@agrolnk.com / usr_admin_master / role='admin')
--   3. Commodities master reference catalog
-- ============================================================================

DO $$
DECLARE
    v_kept_count INT;
    v_profiles_deleted INT;
    v_auth_deleted INT;
    v_auctions_deleted INT;
    v_bids_deleted INT;
    v_orders_deleted INT;
    v_deliveries_deleted INT;
    v_inspections_deleted INT;
    v_financing_deleted INT;
    v_listings_deleted INT;
    v_receipts_deleted INT;
    v_demands_deleted INT;
    v_offers_deleted INT;
    v_messages_deleted INT;
    v_notifications_deleted INT;
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Starting AgroLnk dummy data cleanup...';
    RAISE NOTICE '==================================================';

    -- 1. Create temporary table of preserved user IDs
    CREATE TEMP TABLE IF NOT EXISTS temp_kept_users ON COMMIT DROP AS
    SELECT DISTINCT id::text AS id, email, role
    FROM public.profiles
    WHERE role = 'admin'
       OR LOWER(email) = 'kanikho@gmail.com'
       OR id = 'feffe6e5-f8fa-4bfc-9ad0-b9cdfb944aa9'
       OR LOWER(email) = 'admin@agrolnk.com'
       OR id = 'usr_admin_master';

    -- Also check auth.users in case admin or kanikho has an auth row
    INSERT INTO temp_kept_users (id, email, role)
    SELECT DISTINCT u.id::text, u.email, COALESCE(p.role, 'authenticated')
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id::text
    WHERE (LOWER(u.email) IN ('kanikho@gmail.com', 'admin@agrolnk.com') OR p.role = 'admin')
      AND NOT EXISTS (SELECT 1 FROM temp_kept_users t WHERE t.id = u.id::text);

    SELECT COUNT(*) INTO v_kept_count FROM temp_kept_users;
    RAISE NOTICE 'Preserved Accounts Count: %', v_kept_count;

    -- 2. Delete Notifications
    DELETE FROM public.notifications
    WHERE recipient_id NOT IN (SELECT id FROM temp_kept_users);
    GET DIAGNOSTICS v_notifications_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy notifications: %', v_notifications_deleted;

    -- 3. Delete Chat Messages
    DELETE FROM public.chat_messages
    WHERE sender_id NOT IN (SELECT id FROM temp_kept_users)
       OR (recipient_id IS NOT NULL AND recipient_id NOT IN (SELECT id FROM temp_kept_users));
    GET DIAGNOSTICS v_messages_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy chat messages: %', v_messages_deleted;

    -- 4. Delete Demand Offers & Buyer Demands
    DELETE FROM public.demand_offers
    WHERE farmer_id NOT IN (SELECT id FROM temp_kept_users)
       OR demand_id IN (
           SELECT id FROM public.buyer_demands 
           WHERE buyer_id NOT IN (SELECT id FROM temp_kept_users)
       );
    GET DIAGNOSTICS v_offers_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy demand offers: %', v_offers_deleted;

    DELETE FROM public.buyer_demands
    WHERE buyer_id NOT IN (SELECT id FROM temp_kept_users);
    GET DIAGNOSTICS v_demands_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy buyer demands: %', v_demands_deleted;

    -- 5. Delete Financing Requests
    DELETE FROM public.financing_requests
    WHERE applicant_id NOT IN (SELECT id FROM temp_kept_users);
    GET DIAGNOSTICS v_financing_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy financing requests: %', v_financing_deleted;

    -- 6. Delete Inspections (dummy buyers or dummy orders)
    DELETE FROM public.inspections
    WHERE (buyer_id IS NOT NULL AND buyer_id NOT IN (SELECT id FROM temp_kept_users))
       OR (order_id IS NOT NULL AND order_id IN (
           SELECT id FROM public.orders 
           WHERE (buyer_id IS NOT NULL AND buyer_id NOT IN (SELECT id FROM temp_kept_users))
              OR (farmer_id IS NOT NULL AND farmer_id NOT IN (SELECT id FROM temp_kept_users))
       ));
    GET DIAGNOSTICS v_inspections_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy inspections: %', v_inspections_deleted;

    -- 7. Delete Deliveries (dummy transporters or dummy orders)
    DELETE FROM public.deliveries
    WHERE (transporter_id IS NOT NULL AND transporter_id NOT IN (SELECT id FROM temp_kept_users))
       OR (order_id IS NOT NULL AND order_id IN (
           SELECT id FROM public.orders 
           WHERE (buyer_id IS NOT NULL AND buyer_id NOT IN (SELECT id FROM temp_kept_users))
              OR (farmer_id IS NOT NULL AND farmer_id NOT IN (SELECT id FROM temp_kept_users))
       ));
    GET DIAGNOSTICS v_deliveries_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy deliveries: %', v_deliveries_deleted;

    -- 8. Delete Orders & Escrow Transactions
    DELETE FROM public.orders
    WHERE buyer_id IS NULL 
       OR buyer_id NOT IN (SELECT id FROM temp_kept_users)
       OR farmer_id IS NULL 
       OR farmer_id NOT IN (SELECT id FROM temp_kept_users);
    GET DIAGNOSTICS v_orders_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy orders/transactions: %', v_orders_deleted;

    -- 9. Delete Auction Bids (any bids made by dummy users OR bids on dummy auctions)
    DELETE FROM public.auction_bids
    WHERE bidder_id IS NULL
       OR bidder_id NOT IN (SELECT id FROM temp_kept_users)
       OR auction_id IN (
           SELECT id FROM public.auctions 
           WHERE farmer_id IS NULL OR farmer_id NOT IN (SELECT id FROM temp_kept_users)
       );
    GET DIAGNOSTICS v_bids_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy auction bids: %', v_bids_deleted;

    -- 10. Delete Auctions (except auctions created by preserved accounts)
    DELETE FROM public.auctions
    WHERE farmer_id IS NULL OR farmer_id NOT IN (SELECT id FROM temp_kept_users);
    GET DIAGNOSTICS v_auctions_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy auctions: %', v_auctions_deleted;

    -- Clean reset for any preserved auctions (e.g., Kanikho auctions where dummy bids were removed)
    UPDATE public.auctions a
    SET 
        current_bid = a.starting_price,
        highest_bidder_id = NULL,
        highest_bidder_name = NULL,
        total_bids = 0,
        status = 'live'
    WHERE a.farmer_id IN (SELECT id FROM temp_kept_users)
      AND NOT EXISTS (
          SELECT 1 FROM public.auction_bids b WHERE b.auction_id = a.id
      );

    -- 11. Delete Produce Listings (except listings belonging to preserved accounts)
    DELETE FROM public.listings
    WHERE farmer_id IS NULL OR farmer_id NOT IN (SELECT id FROM temp_kept_users);
    GET DIAGNOSTICS v_listings_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy listings: %', v_listings_deleted;

    -- 12. Delete Warehouse Receipts (except receipts belonging to preserved accounts)
    DELETE FROM public.warehouse_receipts
    WHERE farmer_id IS NULL OR farmer_id NOT IN (SELECT id FROM temp_kept_users);
    GET DIAGNOSTICS v_receipts_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy warehouse receipts: %', v_receipts_deleted;

    -- 13. Delete Dummy Profiles from public.profiles
    DELETE FROM public.profiles
    WHERE id NOT IN (SELECT id FROM temp_kept_users);
    GET DIAGNOSTICS v_profiles_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy profiles: %', v_profiles_deleted;

    -- 14. Delete Dummy Auth Users from auth.users (prevents dummy logins via Supabase Auth)
    DELETE FROM auth.users
    WHERE id::text NOT IN (SELECT id FROM temp_kept_users)
      AND LOWER(email) NOT IN ('kanikho@gmail.com', 'admin@agrolnk.com');
    GET DIAGNOSTICS v_auth_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted dummy auth users: %', v_auth_deleted;

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'CLEANUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'Preserved Accounts:';
    RAISE NOTICE '  - Kanikho FPO (kanikho@gmail.com)';
    RAISE NOTICE '  - Admin Ombudsman (admin@agrolnk.com)';
    RAISE NOTICE '==================================================';
END $$;

-- Verify Remaining Accounts in public.profiles
SELECT id, name, email, phone, role, company_name, kyc_status 
FROM public.profiles;
