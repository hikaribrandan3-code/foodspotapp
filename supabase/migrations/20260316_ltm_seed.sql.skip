-- LTM SEED DATA ONLY
-- Minimal migration to populate swarm agents and laws

-- Seed Agents (simplified)
INSERT INTO agent_registry (agent_id, agent_name, agent_type, agent_description, default_model, status)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'FoodSpot-COO-OpsMonitor', 'coo',
    'Chief Operating Officer Agent - Monitors kitchen operations, detects corner-cutting',
    'gemini-2.0-flash', 'active'),
('a0000000-0000-0000-0000-000000000002', 'FoodSpot-HR-TalentOptimizer', 'hr',
    'Human Resources Agent - Analyzes schedules vs demand',
    'gemini-2.0-flash', 'active'),
('a0000000-0000-0000-0000-000000000003', 'FoodSpotAI-Claw', 'dev',
    'Developer Agent - Self-heals the application, prevents regressions',
    'gemini-2.0-flash', 'active'),
('a0000000-0000-0000-0000-000000000000', 'FoodSpot-Orchestrator', 'orchestrator',
    'Meta-agent that coordinates the entire swarm',
    'gemini-2.0-flash', 'active')
ON CONFLICT (agent_id) DO UPDATE SET status = 'active', updated_at = NOW();

-- Seed Captain's Laws
INSERT INTO captain_laws (law_code, law_name, law_description, category, severity, law_statement, applies_to_agents, applies_to_tenants)
VALUES
('OPS-001', 'Maximum Prep Time Variance', 'Kitchen staff must not complete items more than 25% faster than standard times', 'operations', 'critical', 'Items prepared more than 25% faster than standard time may indicate corner-cutting', ARRAY['coo'], true),
('SEC-001', 'PII Data Protection', 'Customer PII must never be exposed in anonymized network layer', 'security', 'cardinal', 'No PII may be stored in or exposed through the anonymized network layer', ARRAY['coo', 'hr', 'dev', 'analyst'], true),
('DEV-001', 'Regression Prevention', 'All code changes must be journaled for regression prevention', 'development', 'requirement', 'Dev Agent must journal every code change with diff embedding', ARRAY['dev'], true)
ON CONFLICT (law_code) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ SYNTHETIC NERVOUS SYSTEM SEEDED';
    RAISE NOTICE '🚀 SWARM STATUS: VANGUARD-READY';
END $$;
