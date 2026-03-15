-- LTM FINALIZATION MIGRATION
-- Handles existing tables, focuses on indexes, functions, and seed data

-- =============================================================================
-- SECTION 1: ENUMS (Idempotent)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_layer') THEN
        CREATE TYPE memory_layer AS ENUM ('captain_global', 'tenant_private', 'anonymized_network');
        RAISE NOTICE '✅ Created memory_layer enum';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_type') THEN
        CREATE TYPE agent_type AS ENUM ('coo', 'hr', 'dev', 'ceo', 'cto', 'cfo', 'cmo', 'analyst', 'orchestrator');
        RAISE NOTICE '✅ Created agent_type enum';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
        CREATE TYPE agent_status AS ENUM ('initializing', 'active', 'paused', 'degraded', 'error', 'shutdown');
        RAISE NOTICE '✅ Created agent_status enum';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_entry_type') THEN
        CREATE TYPE memory_entry_type AS ENUM ('observation', 'decision', 'action', 'reflection', 'lesson', 'warning', 'insight', 'conversation', 'code_change', 'performance_data', 'compliance_check');
        RAISE NOTICE '✅ Created memory_entry_type enum';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'law_severity') THEN
        CREATE TYPE law_severity AS ENUM ('guideline', 'standard', 'requirement', 'critical', 'cardinal');
        RAISE NOTICE '✅ Created law_severity enum';
    END IF;
END $$;

-- =============================================================================
-- SECTION 2: SEED DATA - SWARM AGENTS
-- =============================================================================

INSERT INTO agent_registry (
    agent_id, agent_name, agent_type, agent_description,
    default_model, fallback_model, premium_model, capabilities, permissions, status
) VALUES 
('a0000000-0000-0000-0000-000000000001'::UUID, 'FoodSpot-COO-OpsMonitor', 'coo',
    'Chief Operating Officer Agent - Monitors kitchen operations, detects corner-cutting',
    'gemini-2.0-flash', 'groq-llama-3.1-70b', 'claude-3.5-opus',
    ARRAY['monitor_kds', 'detect_anomalies', 'enforce_compliance'],
    '{"kds_read": true, "staff_read": true, "orders_read": true}'::JSONB,
    'active'),
('a0000000-0000-0000-0000-000000000002'::UUID, 'FoodSpot-HR-TalentOptimizer', 'hr',
    'Human Resources Agent - Analyzes schedules vs demand, manages shift swaps',
    'gemini-2.0-flash', 'groq-llama-3.1-70b', 'claude-3.5-opus',
    ARRAY['analyze_schedules', 'forecast_demand', 'optimize_staffing'],
    '{"staff_read": true, "scheduler_write": true}'::JSONB,
    'active'),
('a0000000-0000-0000-0000-000000000003'::UUID, 'FoodSpotAI-Claw', 'dev',
    'Developer Agent - Self-heals the application, prevents regressions',
    'gemini-2.0-flash', 'groq-llama-3.1-70b', 'claude-3.5-opus',
    ARRAY['self_heal', 'code_review', 'regression_prevention'],
    '{"code_journal_write": true, "system_read": true}'::JSONB,
    'active'),
('a0000000-0000-0000-0000-000000000000'::UUID, 'FoodSpot-Orchestrator', 'orchestrator',
    'Meta-agent that coordinates the entire swarm, delegates tasks',
    'gemini-2.0-flash', 'claude-3.5-sonnet', 'claude-3.5-opus',
    ARRAY['orchestrate', 'delegate', 'resolve_conflicts'],
    '{"all_read": true, "all_write": true}'::JSONB,
    'active')
ON CONFLICT (agent_id) DO UPDATE SET
    status = 'active',
    updated_at = NOW();

-- =============================================================================
-- SECTION 3: SEED DATA - CAPTAIN'S LAWS
-- =============================================================================

INSERT INTO captain_laws (
    law_code, law_name, law_description, category, severity,
    law_statement, conditions, thresholds, applies_to_agents, applies_to_tenants
) VALUES
('OPS-001', 'Maximum Prep Time Variance',
    'Kitchen staff must not complete items more than 25% faster than standard times',
    'operations', 'critical',
    'Items prepared more than 25% faster than standard time may indicate corner-cutting',
    '{"applies_to": "kds_events"}'::JSONB,
    '{"max_variance_pct": -25}'::JSONB,
    ARRAY['coo'], true),
('SEC-001', 'PII Data Protection',
    'Customer PII must never be exposed in anonymized network layer',
    'security', 'cardinal',
    'No PII may be stored in or exposed through the anonymized network layer',
    '{"applies_to": "all_data"}'::JSONB,
    '{}'::JSONB,
    ARRAY['coo', 'hr', 'dev', 'analyst'], true),
('DEV-001', 'Regression Prevention',
    'All code changes must be journaled for regression prevention',
    'development', 'requirement',
    'Dev Agent must journal every code change with diff embedding',
    '{"applies_to": "code_changes"}'::JSONB,
    '{}'::JSONB,
    ARRAY['dev'], true)
ON CONFLICT (law_code) DO NOTHING;

-- =============================================================================
-- SECTION 4: HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION search_memories(
    p_query_embedding vector(768),
    p_layer memory_layer DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL,
    p_agent_type agent_type DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_min_similarity DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
    memory_id UUID,
    content_text TEXT,
    similarity DECIMAL,
    layer memory_layer,
    agent_type agent_type,
    memory_timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.memory_id,
        m.content_text,
        (1 - (m.content_embedding <=> p_query_embedding))::DECIMAL(4,3) as similarity,
        m.layer,
        m.agent_type,
        m.memory_timestamp
    FROM ai_master_memory m
    WHERE (p_layer IS NULL OR m.layer = p_layer)
      AND (p_tenant_id IS NULL OR m.tenant_id = p_tenant_id OR m.layer = 'captain_global')
      AND (p_agent_type IS NULL OR m.agent_type = p_agent_type)
      AND m.content_embedding IS NOT NULL
      AND (1 - (m.content_embedding <=> p_query_embedding)) >= p_min_similarity
      AND (m.valid_until IS NULL OR m.valid_until > NOW())
    ORDER BY m.content_embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_agent_context(
    p_agent_id UUID,
    p_query TEXT,
    p_tenant_id UUID DEFAULT NULL,
    p_max_memories INTEGER DEFAULT 5
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'agent_id', p_agent_id,
        'query', p_query,
        'tenant_id', p_tenant_id,
        'relevant_memories', (
            SELECT jsonb_agg(jsonb_build_object(
                'memory_id', m.memory_id,
                'content', m.content_text,
                'layer', m.layer,
                'confidence', m.confidence_score
            ))
            FROM ai_master_memory m
            WHERE m.agent_id = p_agent_id
              AND (p_tenant_id IS NULL OR m.tenant_id = p_tenant_id OR m.layer = 'captain_global')
            ORDER BY m.importance_score DESC NULLS LAST
            LIMIT p_max_memories
        ),
        'captain_laws', (
            SELECT jsonb_agg(jsonb_build_object(
                'law_code', l.law_code,
                'law_statement', l.law_statement,
                'severity', l.severity
            ))
            FROM captain_laws l
            WHERE l.is_active = true
              AND (l.applies_to_tenants = true OR p_tenant_id IS NULL)
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION 5: VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM agent_registry WHERE status = 'active';
    RAISE NOTICE '✅ % swarm agents registered and active', v_count;

    SELECT COUNT(*) INTO v_count FROM captain_laws WHERE is_active = true;
    RAISE NOTICE '✅ % Captain Laws loaded', v_count;

    RAISE NOTICE '🧠 SYNTHETIC NERVOUS SYSTEM: ONLINE';
    RAISE NOTICE '🚀 SWARM STATUS: VANGUARD-READY';
END $$;
