-- ============================================================================
-- AGROLNK: PURGE DUMMY ACCOUNTS, TRANSACTIONS, AUCTIONS & RECORDS (FAULT-TOLERANT)
-- PRESERVED ACCOUNTS:
--   1. Kanikho FPO (kanikho@gmail.com / feffe6e5-f8fa-4bfc-9ad0-b9cdfb944aa9)
--   2. Platform Administrator (admin@agrolnk.com / usr_admin_master / role='admin')
--   3. Commodities master reference catalog
-- ============================================================================

DO $$
DECLARE
    v_kept_count INT := 0;
    v_deleted_count INT := 0;
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
    BEGIN
        INSERT INTO temp_kept_users (id, email, role)
        SELECT DISTINCT u.id::text, u.email, COALESCE(p.role, 'authenticated')
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id::text
        WHERE (LOWER(u.email) IN ('kanikho@gmail.com', 'admin@agrolnk.com') OR p.role = 'admin')
          AND NOT EXISTS (SELECT 1 FROM temp_kept_users t WHERE t.id = u.id::text);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice reading auth.users: %', SQLERRM;
    END;

    SELECT COUNT(*) INTO v_kept_count FROM temp_kept_users;
    RAISE NOTICE 'Preserved Accounts Count: %', v_kept_count;

    -- 2. Delete Notifications (safe block)
    BEGIN
        DELETE FROM public.notifications
        WHERE recipient_id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy notifications: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped notifications (%): %', SQLSTATE, SQLERRM;
    END;

    -- 3. Delete Chat Messages (safe block - matches sender_id)
    BEGIN
        DELETE FROM public.chat_messages
        WHERE sender_id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy chat messages: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped chat_messages (%): %', SQLSTATE, SQLERRM;
    END;

    -- 4. Delete Demand Offers & Buyer Demands (safe block)
    BEGIN
        DELETE FROM public.demand_offers
        WHERE farmer_id NOT IN (SELECT id FROM temp_kept_users)
           OR demand_id IN (
               SELECT id FROM public.buyer_demands 
               WHERE buyer_id NOT IN (SELECT id FROM temp_kept_users)
           );
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy demand offers: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped demand_offers (%): %', SQLSTATE, SQLERRM;
    END;

    BEGIN
        DELETE FROM public.buyer_demands
        WHERE buyer_id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy buyer demands: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped buyer_demands (%): %', SQLSTATE, SQLERRM;
    END;

    -- 5. Delete Financing Requests (safe block)
    BEGIN
        DELETE FROM public.financing_requests
        WHERE applicant_id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy financing requests: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped financing_requests (%): %', SQLSTATE, SQLERRM;
    END;

    -- 6. Delete Orders & Escrow Transactions (safe block)
    BEGIN
        DELETE FROM public.orders
        WHERE buyer_id IS NULL 
           OR buyer_id NOT IN (SELECT id FROM temp_kept_users)
           OR farmer_id IS NULL 
           OR farmer_id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy orders/transactions: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped orders (%): %', SQLSTATE, SQLERRM;
    END;

    -- 7. Delete Deliveries (safe block - clean orphans from deleted orders)
    BEGIN
        DELETE FROM public.deliveries
        WHERE order_id NOT IN (SELECT id FROM public.orders)
           OR farmer_id NOT IN (SELECT id FROM temp_kept_users)
           OR buyer_id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy deliveries: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped deliveries (%): %', SQLSTATE, SQLERRM;
    END;

    -- 8. Delete Inspections (safe block)
    BEGIN
        DELETE FROM public.inspections
        WHERE (order_number IS NOT NULL AND order_number NOT IN (SELECT order_number FROM public.orders))
           OR (order_id IS NOT NULL AND order_id NOT IN (SELECT id FROM public.orders));
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy inspections: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped inspections (%): %', SQLSTATE, SQLERRM;
    END;

    -- 9. Delete Auction Bids (safe block)
    BEGIN
        DELETE FROM public.auction_bids
        WHERE bidder_id IS NULL
           OR bidder_id NOT IN (SELECT id FROM temp_kept_users)
           OR auction_id IN (
               SELECT id FROM public.auctions 
               WHERE farmer_id IS NULL OR farmer_id NOT IN (SELECT id FROM temp_kept_users)
           );
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy auction bids: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped auction_bids (%): %', SQLSTATE, SQLERRM;
    END;

    -- 10. Delete Auctions (safe block)
    BEGIN
        DELETE FROM public.auctions
        WHERE farmer_id IS NULL OR farmer_id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy auctions: %', v_deleted_count;

        -- Clean reset for preserved Kanikho auctions
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
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped auctions (%): %', SQLSTATE, SQLERRM;
    END;

    -- 11. Delete Produce Listings (safe block)
    BEGIN
        DELETE FROM public.listings
        WHERE farmer_id IS NULL OR farmer_id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy listings: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped listings (%): %', SQLSTATE, SQLERRM;
    END;

    -- 12. Delete Warehouse Receipts (safe block)
    BEGIN
        DELETE FROM public.warehouse_receipts
        WHERE farmer_id IS NULL OR farmer_id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy warehouse receipts: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped warehouse_receipts (%): %', SQLSTATE, SQLERRM;
    END;

    -- 13. Delete Dummy Profiles from public.profiles
    BEGIN
        DELETE FROM public.profiles
        WHERE id NOT IN (SELECT id FROM temp_kept_users);
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy profiles: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped profiles (%): %', SQLSTATE, SQLERRM;
    END;

    -- 14. Delete Dummy Auth Users from auth.users (prevents dummy logins via Supabase Auth)
    BEGIN
        DELETE FROM auth.users
        WHERE id::text NOT IN (SELECT id FROM temp_kept_users)
          AND LOWER(email) NOT IN ('kanikho@gmail.com', 'admin@agrolnk.com');
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted dummy auth users: %', v_deleted_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped auth.users (%): %', SQLSTATE, SQLERRM;
    END;

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
