import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { supabase, updateBranding } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { clearAuth } from '../../utils/storage.js'
import { updateConfig, CURATED_FONTS, FONT_WEIGHTS, CONFIRMATION_COLORS, HERO_DEFAULT } from '../../config/appConfig.v2.js'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'
import BrandingColorPicker from '../../components/BrandingColorPicker.jsx'
import HeroIconPicker from '../../components/HeroIconPicker.jsx'
import CoverImageEditor from '../../components/CoverImageEditor.jsx'
import ColorPickerModal from '../../components/ColorPickerModal.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

// Section Header Component
function SectionHeader({ title }) {
    return (
        <h3 style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#64748B',
            marginBottom: 10,
            marginTop: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.025em'
        }}>{title}</h3>
    )
}

// Card Component
function Card({ children, style = {} }) {
    return (
        <div style={{
            background: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            padding: 16,
            ...style
        }}>
            {children}
        </div>
    )
}

// INVARIANT: Settings receives config via prop from App.jsx (single source of truth)
// Do NOT call getConfig() locally - breaks invariant during saves
function Settings({ config: configProp, demoMode = false }) {
    const config = configProp || {};
    const navigate = useNavigate()
    const { tenantSlug } = useParams() // 🏢 Get tenant from URL for logout redirect
    const [showCoverEditor, setShowCoverEditor] = useState(false)

    // 🎨 MONARCH PICKERS: State for custom ColorPickerModal (replaces native X pickers)
    const [activeColorPicker, setActiveColorPicker] = useState(null) // 'primary' | 'secondary' | 'confirmation' | 'poweredBy' | null

    // 🏢 CLOUD-FIRST: Get businessId from tenant context
    const { businessId } = useTenant() || {}
    const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'

    // NOTE: Auth check removed - ProtectedRoute handles authentication
    // demoMode components bypass ProtectedRoute entirely via separate routes

    // =========================================================
    // 🌐 CLOUD-FIRST WRITE HANDLER
    // Maps frontend fields to Supabase columns and persists to cloud
    // =========================================================
    const updateSettingsCloud = async (updates, cloudOverrides = {}) => {
        // 1. 🚀 OPTIMISTIC UPDATE (ZERO LATENCY)
        // Update local storage and UI immediately. Do not wait for network.
        updateConfig(updates)
        window.dispatchEvent(new CustomEvent('frontendSync'))

        // 2. PREPARE NETWORK PAYLOAD
        const columnMap = {
            businessName: 'business_name',
            'branding.primaryColor': 'primary_color',
            'branding.fontFamily': 'font_family',
            'branding.fontWeight': 'font_weight',
            'branding.iconColorMode': 'icon_color_mode',
            'branding.poweredByColor': 'powered_by_color',
            dividerPresetId: 'divider_preset_id',
            heroIcons: 'hero_icons',
            colors: 'colors',
            camera: 'camera',
            infoPills: 'info_pills'
        }

        const supabasePayload = { ...cloudOverrides }

        for (const [frontendKey, column] of Object.entries(columnMap)) {
            const keys = frontendKey.split('.')
            let value = updates
            for (const k of keys) {
                value = value?.[k]
            }
            if (value !== undefined) {
                supabasePayload[column] = value
            }
        }

        // 3. ☁️ BACKGROUND SYNC (The "Save" happens silently)
        if (businessId && Object.keys(supabasePayload).length > 0) {
            setSaveStatus('saving')
            try {
                const { error } = await updateBranding(supabasePayload, businessId)
                if (error) {
                    console.error('[Settings] Cloud write failed:', error)
                    setSaveStatus('error')
                    setTimeout(() => setSaveStatus(null), 2000)
                } else {
                    setSaveStatus('saved')
                    setTimeout(() => setSaveStatus(null), 1500)
                }
            } catch (e) {
                console.error('[Settings] Cloud write exception:', e)
                setSaveStatus('error')
                setTimeout(() => setSaveStatus(null), 2000)
            }
        }
    }

    // 🚀 SILO-AWARE LOGOUT: Redirect to customer-facing view of THIS tenant
    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = demoMode ? '/' : `/${tenantSlug}`
    }

    return (
        <div className="backend-surface" data-theme="light" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <BackendHeader
                title={demoMode ? "Demo Branding" : "Config"}
                onLogout={handleLogout}
            />
            {/* Sync Button - Settings specific */}
            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('frontendSync'))
                        alert('✅ ¡Frontend sincronizado!')
                    }}
                    style={{
                        width: '100%',
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: '#3B82F6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                    }}
                >
                    🔄 Actualizar Frontend
                </button>
            </div>

            <div style={{ padding: 16, paddingBottom: 100 }}>
                {/* Super Admin Parity: Numbered Section Architecture */}

                {/* SECTION 1: BASE DEL SISTEMA */}
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Base del Sistema</h3>
                <Card>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Nombre del Negocio</label>
                    <input
                        type="text"
                        value={config.businessName || ''}
                        onChange={(e) => {
                            updateSettingsCloud({ businessName: e.target.value })
                        }}
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }}
                    />

                    <div className="form-group">
                        <label className="form-label">Tipografía</label>
                        <select
                            className="form-input"
                            value={config.branding?.fontFamily || 'Inter'}
                            onChange={(e) => {
                                updateSettingsCloud({
                                    branding: {
                                        ...config.branding,
                                        fontFamily: e.target.value
                                    }
                                })
                                // 🚀 TYPOGRAPHY SNAP: Immediate UI update
                                window.dispatchEvent(new CustomEvent('frontendSync'))
                            }}
                            style={{ fontFamily: config.branding?.fontFamily || 'Inter' }}
                        >
                            {CURATED_FONTS.map(font => (
                                <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                    {font.label}
                                </option>
                            ))}
                        </select>
                        <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                            Aplicado a todo el texto del negocio
                        </p>
                    </div>

                    {/* Font Weight Selector (Parity with Super Admin) */}
                    <div className="form-group">
                        <label className="form-label">Peso de fuente</label>
                        <select
                            className="form-input"
                            value={config.branding?.fontWeight || '400'}
                            onChange={(e) => {
                                updateSettingsCloud({
                                    branding: {
                                        ...config.branding,
                                        fontWeight: e.target.value
                                    }
                                })
                                // 🚀 TYPOGRAPHY SNAP: Immediate UI update
                                window.dispatchEvent(new CustomEvent('frontendSync'))
                            }}
                            style={{ fontWeight: config.branding?.fontWeight || '400' }}
                        >
                            {FONT_WEIGHTS.map(weight => (
                                <option key={weight.value} value={weight.value}>
                                    {weight.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </Card>

                {/* SECTION 2: PORTADA (SUPER ADMIN DARK "FIRE" BOX) */}
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, marginTop: 24, textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Portada (Inicio)</h3>
                <Card>
                    {/* Dark Preview Box */}
                    <div style={{ background: '#111827', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <div style={{ width: '100%', height: 80, border: '2px solid #374151', borderRadius: 6, overflow: 'hidden', background: '#1F2937', position: 'relative' }}>
                            {config.headerCover?.image ? (
                                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${config.headerCover.image})`, backgroundSize: `${(config.headerCover?.scale || 1) * 100}%`, backgroundPosition: `${50 + (config.headerCover?.offsetX || 0)}% ${50 + (config.headerCover?.offsetY || 0)}%`, backgroundRepeat: 'no-repeat' }} />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#9CA3AF', fontSize: 13 }}>Sin imagen de portada</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setShowCoverEditor(true)} style={{ width: '100%', padding: '12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        {config.headerCover?.image ? '✏️ Editar Portada' : '📷 Subir Portada'}
                    </button>
                    {config.headerCover?.image && (
                        <button
                            onClick={() => { updateSettingsCloud({ headerCover: { image: null, scale: 1, offsetX: 0, offsetY: 0 } }); }}
                            style={{ width: '100%', marginTop: 8, padding: '8px', background: 'white', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                            🗑️ Eliminar Portada
                        </button>
                    )}
                </Card>

                {/* SECTION 3: COLORES Y TEMA */}
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, marginTop: 24, textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Colores y Tema</h3>
                <Card>
                    {/* 🎨 MONARCH PICKERS: Custom ColorPickerModal (no native X) */}
                    <div className="form-group">
                        <label className="form-label">Colores del tema</label>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                            {/* Primary Color Swatch */}
                            <div>
                                <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Primario</p>
                                <button
                                    onClick={() => setActiveColorPicker('primary')}
                                    style={{
                                        width: 50, height: 40, border: '2px solid #E5E7EB', borderRadius: 8,
                                        backgroundColor: config.colors?.primary || '#B8956A', cursor: 'pointer'
                                    }}
                                    aria-label="Elegir color primario"
                                />
                            </div>
                            {/* Secondary Color Swatch */}
                            <div>
                                <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Secundario</p>
                                <button
                                    onClick={() => setActiveColorPicker('secondary')}
                                    style={{
                                        width: 50, height: 40, border: '2px solid #E5E7EB', borderRadius: 8,
                                        backgroundColor: config.colors?.primaryLight || '#A89070', cursor: 'pointer'
                                    }}
                                    aria-label="Elegir color secundario"
                                />
                            </div>
                            {/* Confirmation Color Swatch */}
                            <div>
                                <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Confirmación</p>
                                <button
                                    onClick={() => setActiveColorPicker('confirmation')}
                                    style={{
                                        width: 50, height: 40, border: '2px solid #E5E7EB', borderRadius: 8,
                                        backgroundColor: config.colors?.confirmation || '#22C55E', cursor: 'pointer'
                                    }}
                                    aria-label="Elegir color de confirmación"
                                />
                            </div>
                            {/* Powered By Color Swatch */}
                            <div>
                                <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Powered by</p>
                                <button
                                    onClick={() => setActiveColorPicker('poweredBy')}
                                    style={{
                                        width: 50, height: 40, border: '2px solid #E5E7EB', borderRadius: 8,
                                        backgroundColor: config.branding?.poweredByColor || '#C4856A', cursor: 'pointer'
                                    }}
                                    aria-label="Elegir color de Powered by"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 🎨 COLOR PICKER MODALS (single instance, controlled by state) */}
                    {activeColorPicker === 'primary' && (
                        <ColorPickerModal
                            title="Color Primario"
                            initialColor={config.colors?.primary || '#B8956A'}
                            onLiveChange={(color) => updateSettingsCloud({ colors: { ...config.colors, primary: color } })}
                            onApply={(color) => {
                                updateSettingsCloud({ colors: { ...config.colors, primary: color } })
                                setActiveColorPicker(null)
                            }}
                        />
                    )}
                    {activeColorPicker === 'secondary' && (
                        <ColorPickerModal
                            title="Color Secundario"
                            initialColor={config.colors?.primaryLight || '#A89070'}
                            onLiveChange={(color) => updateSettingsCloud({ colors: { ...config.colors, primaryLight: color } })}
                            onApply={(color) => {
                                updateSettingsCloud({ colors: { ...config.colors, primaryLight: color } })
                                setActiveColorPicker(null)
                            }}
                        />
                    )}
                    {activeColorPicker === 'confirmation' && (
                        <ColorPickerModal
                            title="Color de Confirmación"
                            initialColor={config.colors?.confirmation || '#22C55E'}
                            onLiveChange={(color) => updateSettingsCloud({ colors: { ...config.colors, confirmation: color } })}
                            onApply={(color) => {
                                updateSettingsCloud({ colors: { ...config.colors, confirmation: color } })
                                setActiveColorPicker(null)
                            }}
                        />
                    )}
                    {activeColorPicker === 'poweredBy' && (
                        <ColorPickerModal
                            title="Color Powered By"
                            initialColor={config.branding?.poweredByColor || '#C4856A'}
                            onLiveChange={(color) => updateSettingsCloud({ branding: { ...config.branding, poweredByColor: color } })}
                            onApply={(color) => {
                                updateSettingsCloud({ branding: { ...config.branding, poweredByColor: color } })
                                setActiveColorPicker(null)
                            }}
                        />
                    )}

                    <BrandingColorPicker
                        primaryColor={config.branding?.primaryColor || '#8B7355'}
                        iconColorMode={config.branding?.iconColorMode || 'white'}
                        onColorChange={(color) => {
                            updateSettingsCloud({
                                branding: { ...config.branding, primaryColor: color },
                                colors: { ...config.colors, primary: color }
                            })
                        }}
                        onIconModeChange={(mode) => {
                            updateSettingsCloud({ branding: { ...config.branding, iconColorMode: mode } })
                        }}
                    />

                    <div className="form-group">
                        <label className="form-label">Hero Icons (Inicio)</label>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                            Color de fondo e ícono para cada tile
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {['menu', 'delivery', 'promos', 'game'].map(iconId => {
                                const iconConfig = config.heroIcons?.[iconId] || HERO_DEFAULT
                                const labels = { menu: 'Menú', delivery: 'Envíos', promos: 'Promos', game: 'Juego' }
                                return (
                                    <HeroIconPicker
                                        key={iconId}
                                        label={labels[iconId]}
                                        iconId={iconId}
                                        color={iconConfig.color}
                                        iconColorMode={iconConfig.iconColorMode}
                                        onColorChange={(newColor) => {
                                            updateSettingsCloud({
                                                heroIcons: {
                                                    ...config.heroIcons,
                                                    [iconId]: { ...iconConfig, color: newColor },
                                                    ...(iconId === 'promos' ? { rewards: { ...iconConfig, color: newColor } } : {})
                                                }
                                            })
                                        }}
                                        onIconModeChange={(mode) => {
                                            updateSettingsCloud({
                                                heroIcons: {
                                                    ...config.heroIcons,
                                                    [iconId]: { ...iconConfig, iconColorMode: mode },
                                                    ...(iconId === 'promos' ? { rewards: { ...iconConfig, iconColorMode: mode } } : {})
                                                }
                                            })
                                        }}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {/* 🚫 MODO OSCURO DEPRECATED FOR OWNERS
                     * Dark mode toggle is now Super Admin only.
                     * Owner dashboards force light mode for UX consistency.
                     * See SuperAdmin.jsx for the active implementation.
                     */}

                    {/* INFO PILL COLORS — Pill customization */}
                    <div className="form-group">
                        <label className="form-label">🔘 Info Pill Colors</label>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                            Personaliza los colores de los botones en la página Info
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                                { id: 'mercadoPago', label: 'Mercado Pago', icon: '💳' },
                                { id: 'rappi', label: 'Rappi', icon: '🛵' },
                                { id: 'pedidosYa', label: 'PedidosYa', icon: '🍕' },
                                { id: 'instagram', label: 'Instagram', icon: '📸' },
                                { id: 'adminAccess', label: 'Admin', icon: '🔒' },
                            ].map(pill => {
                                const pillConfig = config.infoPills?.[pill.id] || {}
                                const bgColor = pillConfig.bgColor || (pill.id === 'whatsapp' ? '#C4856A' : pill.id === 'mercadoPago' ? '#FFE600' : pill.id === 'rappi' ? '#FF5A00' : pill.id === 'pedidosYa' ? '#E31837' : pill.id === 'instagram' ? '#E1306C' : '#FFFFFF')
                                const textColor = pillConfig.textColor || (pill.id === 'mercadoPago' ? '#009EE3' : pill.id === 'adminAccess' ? '#9CA3AF' : '#FFFFFF')
                                return (
                                    <button
                                        key={pill.id}
                                        onClick={() => {
                                            const input = document.getElementById(`owner-pill-color-${pill.id}`)
                                            if (input) input.click()
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            padding: '10px 12px',
                                            backgroundColor: bgColor,
                                            color: textColor,
                                            borderRadius: 20,
                                            border: pill.id === 'adminAccess' ? '1px solid #E5E7EB' : 'none',
                                            fontSize: 12,
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <span>{pill.icon}</span>
                                        <span>{pill.label}</span>
                                        <input
                                            id={`owner-pill-color-${pill.id}`}
                                            type="color"
                                            value={bgColor}
                                            onChange={(e) => {
                                                updateSettingsCloud({
                                                    infoPills: {
                                                        ...config.infoPills,
                                                        [pill.id]: { ...pillConfig, bgColor: e.target.value }
                                                    }
                                                })
                                            }}
                                            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* CAMERA BRANDING — Icon and color customization */}
                    <div className="form-group">
                        <label className="form-label">📷 Camera Button</label>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                            Personaliza el botón de cámara en la navegación
                        </p>

                        {/* Enable toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>Estilo personalizado</span>
                            <button
                                onClick={() => {
                                    updateSettingsCloud({ camera: { ...config.camera, enabled: !config.camera?.enabled } })
                                }}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 16,
                                    border: 'none',
                                    backgroundColor: config.camera?.enabled ? '#22C55E' : '#E2E8F0',
                                    color: config.camera?.enabled ? 'white' : '#64748B',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                {config.camera?.enabled ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {/* Icon selector (only when enabled) */}
                        {config.camera?.enabled && (
                            <>
                                <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Ícono de cámara</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                                    {[
                                        { id: 'default', label: 'Default' },
                                        { id: 'camera', label: 'Camera' },
                                        { id: 'aperture', label: 'Aperture' },
                                        { id: 'webcam', label: 'Webcam' }
                                    ].map(icon => {
                                        const isSelected = (config.camera?.icon || 'default') === icon.id
                                        return (
                                            <button
                                                key={icon.id}
                                                onClick={() => {
                                                    updateSettingsCloud({ camera: { ...config.camera, icon: icon.id } })
                                                }}
                                                style={{
                                                    padding: '12px 8px',
                                                    borderRadius: 12,
                                                    border: isSelected ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                                                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                {/* Camera SVG Icons */}
                                                {icon.id === 'default' && (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                        <circle cx="12" cy="13" r="4" />
                                                    </svg>
                                                )}
                                                {icon.id === 'camera' && (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                        <circle cx="12" cy="13" r="4" />
                                                        <circle cx="12" cy="13" r="1" />
                                                    </svg>
                                                )}
                                                {icon.id === 'aperture' && (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
                                                        <line x1="9.69" y1="8" x2="21.17" y2="8" />
                                                        <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
                                                        <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
                                                        <line x1="14.31" y1="16" x2="2.83" y2="16" />
                                                        <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
                                                    </svg>
                                                )}
                                                {icon.id === 'webcam' && (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="10" r="7" />
                                                        <circle cx="12" cy="10" r="3" />
                                                        <path d="M7 20h10" />
                                                        <path d="M12 17v3" />
                                                    </svg>
                                                )}
                                                <span style={{ fontSize: 10, color: '#64748B' }}>{icon.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Color picker */}
                                <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Color del botón</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <input
                                        type="color"
                                        value={config.camera?.color || '#8B7355'}
                                        onChange={(e) => {
                                            updateSettingsCloud({ camera: { ...config.camera, color: e.target.value } })
                                        }}
                                        style={{ width: 48, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                    />
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%',
                                        backgroundColor: config.camera?.color || '#8B7355',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                    }}>
                                        <span style={{ fontSize: 20 }}>📷</span>
                                    </div>
                                    <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
                                        {(config.camera?.color || '#8B7355').toUpperCase()}
                                    </span>
                                </div>

                                {/* Text color toggle */}
                                <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Color del ícono</p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {['auto', 'white', 'black'].map(mode => {
                                        const isSelected = (config.camera?.textColor || 'auto') === mode
                                        const labelMap = { auto: 'Automático', white: 'Blanco', black: 'Negro' }
                                        return (
                                            <button
                                                key={mode}
                                                onClick={() => {
                                                    updateSettingsCloud({ camera: { ...config.camera, textColor: mode } })
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    border: isSelected ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                                                    backgroundColor: mode === 'black' ? '#1E293B' : mode === 'white' ? '#FFFFFF' : '#F1F5F9',
                                                    color: mode === 'black' ? '#FFFFFF' : mode === 'white' ? '#1E293B' : '#64748B',
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {labelMap[mode]}
                                            </button>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Color de confirmación</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {CONFIRMATION_COLORS.map(color => (
                                <button
                                    key={color.value}
                                    onClick={() => {
                                        updateSettingsCloud({
                                            colors: {
                                                ...config.colors,
                                                confirmation: color.value
                                            }
                                        })
                                    }}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        backgroundColor: color.value,
                                        border: config.colors?.confirmation === color.value ? '3px solid #1E293B' : '2px solid #E2E8F0',
                                        cursor: 'pointer'
                                    }}
                                    title={color.label}
                                />
                            ))}
                        </div>
                        <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                            Para botones de confirmar pedido y acciones positivas
                        </p>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Color "Powered by"</label>
                        <input
                            type="color"
                            value={config.branding?.poweredByColor || '#C4856A'}
                            onChange={(e) => {
                                updateSettingsCloud({
                                    branding: {
                                        ...config.branding,
                                        poweredByColor: e.target.value
                                    }
                                })
                            }}
                            style={{
                                width: 60,
                                height: 36,
                                border: '2px solid #E2E8F0',
                                borderRadius: 8,
                                cursor: 'pointer',
                                padding: 2
                            }}
                        />
                    </div>

                    <div className="form-group" style={{ marginTop: 16 }}>
                        <label className="form-label">Imagen decorativa (Menú/Pedido)</label>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>
                            Aparece debajo del nombre del negocio
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {DIVIDER_PRESETS.map(preset => (
                                <div
                                    key={preset.id}
                                    onClick={() => {
                                        updateSettingsCloud({ dividerPresetId: preset.id })
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        border: config.dividerPresetId === preset.id ? '3px solid #3B82F6' : '2px solid #E2E8F0',
                                        opacity: config.dividerPresetId === preset.id ? 1 : 0.7
                                    }}
                                >
                                    <img src={preset.url} alt={preset.name} style={{ width: '100%', height: 40, objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>


            {/* Cover Image Editor Modal (Parity with Super Admin) */}
            <CoverImageEditor
                isOpen={showCoverEditor}
                onClose={() => setShowCoverEditor(false)}
                onSave={(coverData) => {
                    updateSettingsCloud({ headerCover: coverData })
                    setShowCoverEditor(false)
                }}
                initialData={config.headerCover}
                config={config}
            />

            {/* Backend Navigation */}
            <BackendNav
                role={demoMode ? 'demo' : 'owner'}
                useRoutes={true}
            />
        </div>
    )
}

export default Settings
