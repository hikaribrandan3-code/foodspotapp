-- NUKE USER: hikaristudioai@gmail.com / UUID 77106f57-0816-4224-b25a-2a56f78857ec
-- Deletes ALL data linked to this user across all tables
-- Each DELETE is wrapped so one missing table/column doesn't stop the nuke

DO $$
DECLARE
    v_bid UUID;
    v_uid UUID := '77106f57-0816-4224-b25a-2a56f78857ec';
BEGIN
    FOR v_bid IN
        SELECT id FROM businesses WHERE owner_id = v_uid
        UNION
        SELECT business_id FROM profiles WHERE id = v_uid
    LOOP
        RAISE NOTICE 'Nuking business_id: %', v_bid;

        -- Helper: safely delete from a table by business_id
        -- Skips tables that don't exist or don't have the column
        BEGIN DELETE FROM audit_log WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip audit_log: %', SQLERRM; END;
        BEGIN DELETE FROM language_settings WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip language_settings: %', SQLERRM; END;
        BEGIN DELETE FROM staff_shifts WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip staff_shifts: %', SQLERRM; END;
        BEGIN DELETE FROM staff WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip staff: %', SQLERRM; END;
        BEGIN DELETE FROM inventory_transactions WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip inventory_transactions: %', SQLERRM; END;
        BEGIN DELETE FROM inventory WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip inventory: %', SQLERRM; END;
        BEGIN DELETE FROM inventory_suppliers WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip inventory_suppliers: %', SQLERRM; END;
        BEGIN DELETE FROM event_checkins WHERE event_id IN (SELECT id FROM events WHERE business_id = v_bid); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip event_checkins: %', SQLERRM; END;
        BEGIN DELETE FROM event_orders WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip event_orders: %', SQLERRM; END;
        BEGIN DELETE FROM event_promo_codes WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip event_promo_codes: %', SQLERRM; END;
        BEGIN DELETE FROM event_leads WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip event_leads: %', SQLERRM; END;
        BEGIN DELETE FROM events WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip events: %', SQLERRM; END;
        BEGIN DELETE FROM order_transitions WHERE order_id IN (SELECT id FROM orders WHERE business_id = v_bid); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip order_transitions: %', SQLERRM; END;
        BEGIN DELETE FROM orders WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip orders: %', SQLERRM; END;
        BEGIN DELETE FROM order_sessions WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip order_sessions: %', SQLERRM; END;
        BEGIN DELETE FROM transaction_ledger WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip transaction_ledger: %', SQLERRM; END;
        BEGIN DELETE FROM split_payments WHERE ledger_id IN (SELECT id FROM table_ledgers WHERE business_id = v_bid); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip split_payments: %', SQLERRM; END;
        BEGIN DELETE FROM table_ledgers WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip table_ledgers: %', SQLERRM; END;
        BEGIN DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE business_id = v_bid); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip wallet_transactions: %', SQLERRM; END;
        BEGIN DELETE FROM wallets WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip wallets: %', SQLERRM; END;
        BEGIN DELETE FROM el_momento_hearts WHERE photo_id IN (SELECT id FROM el_momento_photos WHERE business_id = v_bid); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip el_momento_hearts: %', SQLERRM; END;
        BEGIN DELETE FROM creator_attribution WHERE photo_id IN (SELECT id FROM el_momento_photos WHERE business_id = v_bid); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip creator_attribution: %', SQLERRM; END;
        BEGIN DELETE FROM el_momento_photos WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip el_momento_photos: %', SQLERRM; END;
        BEGIN DELETE FROM expenses WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip expenses: %', SQLERRM; END;
        BEGIN DELETE FROM image_generation_logs WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip image_generation_logs: %', SQLERRM; END;
        BEGIN DELETE FROM image_usage WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip image_usage: %', SQLERRM; END;
        BEGIN DELETE FROM ai_master_memory WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip ai_master_memory: %', SQLERRM; END;
        BEGIN DELETE FROM agent_registry WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip agent_registry: %', SQLERRM; END;
        BEGIN DELETE FROM captain_laws WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip captain_laws: %', SQLERRM; END;
        BEGIN DELETE FROM ai_conversations WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip ai_conversations: %', SQLERRM; END;
        BEGIN DELETE FROM ai_knowledge WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip ai_knowledge: %', SQLERRM; END;
        BEGIN DELETE FROM ai_strategies WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip ai_strategies: %', SQLERRM; END;
        BEGIN DELETE FROM owner_notifications WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip owner_notifications: %', SQLERRM; END;
        BEGIN DELETE FROM categories WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip categories: %', SQLERRM; END;
        BEGIN DELETE FROM menu_items WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip menu_items: %', SQLERRM; END;
        BEGIN DELETE FROM branding WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip branding: %', SQLERRM; END;
        BEGIN DELETE FROM business_secrets WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip business_secrets: %', SQLERRM; END;
        BEGIN DELETE FROM profiles WHERE business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip profiles: %', SQLERRM; END;
        BEGIN DELETE FROM tenants WHERE owner_id = v_uid OR business_id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip tenants: %', SQLERRM; END;
        BEGIN DELETE FROM businesses WHERE id = v_bid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip businesses: %', SQLERRM; END;
    END LOOP;

    BEGIN DELETE FROM auth.users WHERE id = v_uid; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip auth.users: %', SQLERRM; END;

    RAISE NOTICE 'Nuke complete for user: %', v_uid;
END $$;
