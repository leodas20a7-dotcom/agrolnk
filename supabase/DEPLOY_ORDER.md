# AgroLnk Supabase Migration Runbook (Deterministic Execution Order)

Running migrations on a fresh staging or production Supabase project requires executing files in the **dependency stages below**. All storage and security hardening scripts have also been made idempotent and order-safe so re-running them will never drop upload policies or resurrect `USING (true)` permissions.

---

## Stage 1 — Core Schema & Helper Functions
1. `supabase_schema.sql` *(creates core tables, `public.is_admin()`, baseline RLS policies, indexes, and realtime publications)*
2. `supabase/fix_supabase_schema.sql` *(if upgrading an older schema snapshot without a rebuild)*

## Stage 2 — Role, Column & Feature Schema Expansions
Run in order:
1. `supabase/add_fpo_role_migration.sql`
2. `supabase/add_food_processor_role_migration.sql`
3. `supabase/commodities_rls_and_columns.sql`
4. `supabase/run_today_all_migrations.sql` *(consolidates VAN banking columns, transport freight escrow columns, and warehouse direct commission columns; supersedes running `add_van_banking_provision_columns.sql` and `add_transport_escrow_columns.sql` individually)*
5. `supabase/add_orders_van_and_webhook_utr.sql`
6. `supabase/update_financing_schema.sql`
7. `supabase/step1_moq_and_competitive_freight_rfq.sql`

## Stage 3 — Production Atomic Stored Procedures (RPCs)
1. `supabase/atomic_functions.sql`
2. `supabase/step5_security_hardening_patch.sql`
3. `supabase/fix_reverse_demand_accept_atomic.sql`
4. `supabase/fix_early_auction_accept_atomic.sql`
5. `supabase/fix_pledged_collateral_unlock_bypass.sql`
6. `supabase/secure_delivery_verification_rpc.sql`
7. `supabase/secure_escrow_release_rpc.sql`
8. `supabase/fix_dispute_freeze_state_guard.sql`

## Stage 4 — Production RLS, Triggers & Privilege Lockdown
1. `supabase/production_rls_policies.sql`
2. `supabase/fix_profiles_listings_commodities_rls.sql` *(replaces earlier `fix_profiles_rls_registration.sql`, `fix_profiles_permission_denied.sql`, `fix_self_admin_and_kyc_escalation.sql`, `lock_down_profiles_rls.sql`)*
3. `supabase/fix_inspections_rls_and_tampering.sql` *(hardens `allow_inspection_deletion_policy.sql`)*
4. `supabase/lock_warehouse_receipts_on_loan.sql`
5. `supabase/fix_unpaid_escrow_funding_bypass.sql`
6. `supabase/secure_delivery_pins_and_verification.sql`
7. `supabase/apply_audit_remediation_triggers_and_rls.sql`
8. `supabase/consolidated_production_security_rls.sql` *(drops any remaining open write policies across `public` schema)*

## Stage 5 — Storage Buckets & Canonical `storage.objects` Policies
Any of these scripts now converge on the exact same 5 canonical `agrolnk_*` policies (`listings` public, `proof` and `kyc` private):
1. `supabase/storage_buckets_setup.sql`
2. `supabase/lock_down_storage_objects_security.sql`
3. *(Optional / Superseded equivalents kept order-independent: `lock_down_storage_proof_bucket.sql`, `secure_storage_upload_policies.sql`)*

## Stage 6 — Admin Identity & Verification Audit
1. `supabase/create_master_admin.sql` *(or `supabase/update_admin_email_to_agrolnkadmin.sql`)*
2. `supabase/fix_migration_order_and_storage_idempotency.sql` *(final safety check: guarantees canonical storage policies and `0` open `USING (true)` write policies)*
