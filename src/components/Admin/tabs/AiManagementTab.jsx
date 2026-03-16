import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient.js';

const cardStyle = { background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 16 };
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' };
const statusBadge = (status) => ({
    active: { bg: '#DCFCE7', color: '#166534' },
    initializing: { bg: '#FEF3C7', color: '#92400E' },
    degraded: { bg: '#FEE2E2', color: '#991B1B' },
    error: { bg: '#FEE2E2', color: '#991B1B' },
    paused: { bg: '#E5E7EB', color: '#374151' }
}[status] || { bg: '#E5E7EB', color: '#374151' });

export default function AiManagementTab({ businessId }) {
    const [agents, setAgents] = useState([]);
    const [laws, setLaws] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState(null);

    useEffect(() => {
        loadAgentData();
    }, [businessId]);

    const loadAgentData = async () => {
        setLoading(true);
        try {
            // Load agents from agent_registry
            const { data: agentData, error: agentError } = await supabase
                .from('agent_registry')
                .select('*')
                .or(`tenant_id.eq.${businessId},tenant_id.is.null`)
                .order('agent_type', { ascending: true });

            if (!agentError && agentData) {
                setAgents(agentData);
            }

            // Load Captain's Laws
            const { data: lawData, error: lawError } = await supabase
                .from('captain_laws')
                .select('*')
                .eq('is_active', true)
                .order('severity', { ascending: false });

            if (!lawError && lawData) {
                setLaws(lawData);
            }
        } catch (err) {
            console.error('[AiManagementTab] Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const recordHeartbeat = async (agentId) => {
        try {
            await supabase.rpc('record_agent_heartbeat', {
                p_agent_id: agentId,
                p_health_score: 1.0
            });
            loadAgentData();
        } catch (err) {
            console.error('[AiManagementTab] Heartbeat error:', err);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>🤖</div>
                <p style={{ color: '#6B7280' }}>Cargando Swarm...</p>
            </div>
        );
    }

    return (
        <>
            <h3 style={labelStyle}>🤖 AGENTES DEL SWARM</h3>
            <div style={cardStyle}>
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
                    {agents.length} agentes activos en la red neuronal
                </p>
                
                {agents.map(agent => {
                    const badge = statusBadge(agent.status);
                    return (
                        <div key={agent.agent_id} style={{ 
                            border: '1px solid #E5E7EB', 
                            borderRadius: 8, 
                            padding: 12, 
                            marginBottom: 12,
                            cursor: 'pointer',
                            background: selectedAgent?.agent_id === agent.agent_id ? '#F3F4F6' : 'white'
                        }} onClick={() => setSelectedAgent(agent)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{agent.agent_name}</p>
                                    <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
                                        {agent.agent_type.toUpperCase()} • {agent.default_model}
                                    </p>
                                </div>
                                <span style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: 4, 
                                    fontSize: 10, 
                                    fontWeight: 600,
                                    background: badge.bg,
                                    color: badge.color
                                }}>
                                    {agent.status}
                                </span>
                            </div>
                            
                            {selectedAgent?.agent_id === agent.agent_id && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                                    <p style={{ fontSize: 12, color: '#374151', margin: '0 0 8px' }}>{agent.agent_description}</p>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                        {agent.capabilities?.map(cap => (
                                            <span key={cap} style={{ fontSize: 10, padding: '2px 6px', background: '#E0E7FF', borderRadius: 4, color: '#3730A3' }}>{cap}</span>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280' }}>
                                        <span>Acciones: {agent.total_actions?.toLocaleString()}</span>
                                        <span>Éxito: {agent.successful_actions ? Math.round((agent.successful_actions / agent.total_actions) * 100) : 0}%</span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); recordHeartbeat(agent.agent_id); }}
                                        style={{ 
                                            marginTop: 8, 
                                            padding: '6px 12px', 
                                            fontSize: 11, 
                                            borderRadius: 6, 
                                            border: 'none', 
                                            background: '#22C55E', 
                                            color: 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        💓 Heartbeat
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <h3 style={labelStyle}>⚖️ LEYES DEL CAPITÁN</h3>
            <div style={cardStyle}>
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
                    {laws.length} leyes constitucionales activas
                </p>
                
                {laws.map(law => (
                    <div key={law.law_id} style={{ 
                        border: '1px solid #E5E7EB', 
                        borderRadius: 8, 
                        padding: 12, 
                        marginBottom: 12,
                        borderLeft: law.severity === 'cardinal' ? '4px solid #DC2626' : 
                                   law.severity === 'critical' ? '4px solid #F97316' : 
                                   law.severity === 'requirement' ? '4px solid #EAB308' : '4px solid #6B7280'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{law.law_code}</p>
                                <p style={{ fontSize: 12, color: '#374151', margin: '4px 0' }}>{law.law_name}</p>
                            </div>
                            <span style={{ 
                                padding: '2px 6px', 
                                borderRadius: 4, 
                                fontSize: 9, 
                                fontWeight: 600,
                                background: law.severity === 'cardinal' ? '#FEE2E2' : 
                                           law.severity === 'critical' ? '#FFEDD5' : 
                                           law.severity === 'requirement' ? '#FEF3C7' : '#E5E7EB',
                                color: law.severity === 'cardinal' ? '#991B1B' : 
                                      law.severity === 'critical' ? '#9A3412' : 
                                      law.severity === 'requirement' ? '#92400E' : '#374151'
                            }}>
                                {law.severity}
                            </span>
                        </div>
                        <p style={{ fontSize: 11, color: '#6B7280', margin: '8px 0 0' }}>{law.law_statement}</p>
                        {law.violation_count > 0 && (
                            <p style={{ fontSize: 10, color: '#DC2626', margin: '4px 0 0' }}>
                                ⚠️ {law.violation_count} violaciones detectadas
                            </p>
                        )}
                    </div>
                ))}
            </div>

            <h3 style={labelStyle}>🧠 MEMORIA LTM</h3>
            <div style={cardStyle}>
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                    Memoria de largo plazo del sistema
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#F3F4F6', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <p style={{ fontSize: 24, fontWeight: 700, color: '#7C3AED', margin: 0 }}>∞</p>
                        <p style={{ fontSize: 11, color: '#6B7280', margin: '4px 0 0' }}>Capacidad</p>
                    </div>
                    <div style={{ background: '#F3F4F6', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <p style={{ fontSize: 24, fontWeight: 700, color: '#7C3AED', margin: 0 }}>768</p>
                        <p style={{ fontSize: 11, color: '#6B7280', margin: '4px 0 0' }}>Dimensiones</p>
                    </div>
                </div>
                <button 
                    onClick={loadAgentData}
                    style={{ 
                        width: '100%', 
                        marginTop: 12, 
                        padding: '10px', 
                        fontSize: 12, 
                        borderRadius: 8, 
                        border: '1px solid #7C3AED', 
                        background: 'white', 
                        color: '#7C3AED',
                        cursor: 'pointer'
                    }}
                >
                    🔄 Refrescar Estado
                </button>
            </div>
        </>
    );
}
