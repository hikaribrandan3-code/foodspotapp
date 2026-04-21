import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { clearAuth } from '../../utils/storage.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'

// ============================================
// 🎯 REWARDS MANAGER — CLOUD-FIRST (P0 #10)
// ============================================
// All config persists to Supabase branding.app_config
// No localStorage. No local config. No amnesia.
// ============================================

function RewardsManager() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { businessId, tenantData, refreshTenantData } = useTenant()
    const { t } = useLanguage()
    const appConfig = tenantData?.app_config || {}

    // Hydrate from cloud
    const [stampsRequired, setStampsRequired] = useState(appConfig?.rewards?.stampsRequired || 10)
    const [rewardDescription, setRewardDescription] = useState(appConfig?.rewards?.rewardDescription || '¡Café gratis!')
    const [rewardsEnabled, setRewardsEnabled] = useState(appConfig?.features?.rewardsEnabled ?? false)
    const [saving, setSaving] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = `/${tenantSlug}`
    }

    // ☁️ CLOUD SAVE: Atomic update to branding.app_config
    const handleSave = async () => {
        if (saving) return
        setSaving(true)

        const updatedConfig = {
            ...appConfig,
            rewards: {
                stampsRequired: parseInt(stampsRequired) || 10,
                rewardDescription: rewardDescription || '¡Café gratis!'
            },
            features: {
                ...appConfig?.features,
                rewardsEnabled
            }
        }

        const { error } = await supabase
            .from('branding')
            .update({ app_config: updatedConfig })
            .eq('business_id', businessId)

        if (error) {
            console.error('Save failed:', error)
            alert('❌ Error al guardar: ' + error.message)
        } else {
            await refreshTenantData()
            alert('✅ ¡Cambios guardados en la nube!')
        }
        setSaving(false)
    }

    // Toggle updates local state (saved on "Guardar")
    const handleToggleRewards = () => {
        setRewardsEnabled(prev => !prev)
    }

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <BackendHeader
                title="Recompensas"
                onLogout={handleLogout}
            />

            <div style={{ padding: 16, paddingBottom: 100 }}>
                {/* Enable/Disable */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    padding: 16,
                    marginBottom: 16
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <p style={{ fontWeight: 500, fontSize: 14, color: '#1E293B', margin: 0 }}>{t('active_rewards')}</p>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                                {rewardsEnabled ? '✓ Activo' : '✗ Inactivo'}
                            </p>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={rewardsEnabled}
                                onChange={handleToggleRewards}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                {/* Configuration */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    padding: 16
                }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16, marginTop: 0 }}>{t('rewards_config')}</h3>

                    <div className="form-group">
                        <label className="form-label">Sellos necesarios</label>
                        <input
                            type="number"
                            className="form-input"
                            value={stampsRequired}
                            onChange={(e) => setStampsRequired(e.target.value)}
                            min="1"
                            max="20"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Descripción del premio</label>
                        <input
                            type="text"
                            className="form-input"
                            value={rewardDescription}
                            onChange={(e) => setRewardDescription(e.target.value)}
                            placeholder="Ej: ¡Café gratis!"
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-block"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ opacity: saving ? 0.6 : 1 }}
                    >
                        {saving ? '☁️ Guardando...' : '☁️ Guardar en la nube'}
                    </button>
                </div>

                {/* Preview */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    padding: 16,
                    marginTop: 16,
                    textAlign: 'center'
                }}>
                    <p style={{ color: '#64748B', fontSize: 12, marginBottom: 8, marginTop: 0 }}>
                        Vista previa
                    </p>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#1E293B', margin: 0 }}>
                        Juntá {stampsRequired} sellos = {rewardDescription || '¡Café gratis!'}
                    </p>
                </div>
            </div>

        </div>
    )
}

export default RewardsManager
