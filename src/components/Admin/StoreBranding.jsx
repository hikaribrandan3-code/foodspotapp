import React, { useState, useEffect } from 'react'
import { updateConfig, CURATED_FONTS, FONT_WEIGHTS, HERO_DEFAULT } from '../../config/appConfig.v2.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'

/**
 * STORE BRANDING COMPONENT
 * Unified branding settings for Owner and Demo modes.
 * 
 * ARCHITECTURAL INVARIANT: Config MUST come from props, NOT getConfig().
 * This ensures Single Source of Truth from App.jsx.
 * 
 * Visual Hierarchy:
 * 1. Hero/Cover Image (Top priority)
 * 2. Brand Identity (Logos/Icons)
 * 3. Navigation & Colors
 */

export default function StoreBranding({ config, isDemo = false }) {
    // Local copy for mutations (syncs back to parent via frontendSync)
    const [localConfig, setLocalConfig] = useState(config || {})
    const [uploadStatus, setUploadStatus] = useState(null)

    // Sync with parent config changes
    useEffect(() => {
        if (config) {
            setLocalConfig(config)
        }
    }, [config])

    // Helper to update config and sync
    const handleConfigUpdate = (updates) => {
        const newConfig = { ...localConfig, ...updates }
        updateConfig(newConfig)
        setLocalConfig(newConfig)
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    // Image upload handler
    const handleImageUpload = async (e, type) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadStatus({ loading: true, message: 'Optimizing...' });

        try {
            const result = await processAndStoreImage(file);

            if (type === 'cover') {
                handleConfigUpdate({
                    headerCover: {
                        ...config.headerCover,
                        imageURL: result.dataURI
                    }
                });
            } else if (type === 'logo') {
                handleConfigUpdate({
                    branding: {
                        ...config.branding,
                        logoURL: result.dataURI
                    }
                });
            }

            setUploadStatus({
                success: true,
                message: `✔ ${formatFileSize(result.originalSize)} → ${formatFileSize(result.optimizedSize)}`
            });
        } catch (error) {
            setUploadStatus({ success: false, message: error.message });
        }
    };

    // Styles
    const cardStyle = {
        background: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
    };
    const labelStyle = {
        fontSize: 12,
        fontWeight: 600,
        color: '#6B7280',
        marginBottom: 8,
        display: 'block',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };
    const inputStyle = {
        width: '100%',
        padding: '12px 14px',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        fontSize: 14,
        boxSizing: 'border-box',
        marginBottom: 16
    };
    const sectionTitle = {
        fontSize: 14,
        fontWeight: 700,
        color: '#1F2937',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* Demo Mode Notice */}
            {isDemo && (
                <div style={{
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 20,
                    fontSize: 13,
                    color: '#92400E'
                }}>
                    🚧 <strong>Demo Mode:</strong> Changes are stored locally and won't affect production.
                </div>
            )}

            {/* ==================== SECTION 1: HERO/COVER IMAGE ==================== */}
            <div style={cardStyle}>
                <h3 style={sectionTitle}>🖼️ Hero / Cover Image</h3>

                {/* Cover Preview */}
                <div style={{
                    width: '100%',
                    height: 160,
                    borderRadius: 12,
                    background: config.headerCover?.imageURL
                        ? `url(${config.headerCover.imageURL}) center/cover`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed #D1D5DB',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                    onClick={() => document.getElementById('cover-upload')?.click()}
                >
                    {!config.headerCover?.imageURL && (
                        <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>
                            📷 Click to upload cover image
                        </span>
                    )}
                </div>
                <input
                    id="cover-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleImageUpload(e, 'cover')}
                    style={{ display: 'none' }}
                />

                {/* Cover Options */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <button
                        onClick={() => document.getElementById('cover-upload')?.click()}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        📤 Upload Image
                    </button>
                    {config.headerCover?.imageURL && (
                        <button
                            onClick={() => handleConfigUpdate({ headerCover: { ...config.headerCover, imageURL: null } })}
                            style={{
                                padding: '10px 16px',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            🗑️ Remove
                        </button>
                    )}
                </div>

                {uploadStatus && (
                    <p style={{
                        fontSize: 12,
                        color: uploadStatus.success ? '#059669' : uploadStatus.loading ? '#6B7280' : '#DC2626',
                        margin: 0
                    }}>
                        {uploadStatus.message}
                    </p>
                )}
            </div>

            {/* ==================== SECTION 2: BRAND IDENTITY ==================== */}
            <div style={cardStyle}>
                <h3 style={sectionTitle}>🏪 Brand Identity</h3>

                <label style={labelStyle}>Business Name</label>
                <input
                    type="text"
                    value={config.businessName || ''}
                    onChange={(e) => handleConfigUpdate({ businessName: e.target.value })}
                    placeholder="Your Store Name"
                    style={inputStyle}
                />

                <label style={labelStyle}>Typography</label>
                <select
                    value={config.branding?.fontFamily || 'Inter'}
                    onChange={(e) => handleConfigUpdate({
                        branding: { ...config.branding, fontFamily: e.target.value }
                    })}
                    style={{ ...inputStyle, fontFamily: config.branding?.fontFamily || 'Inter' }}
                >
                    {CURATED_FONTS.map(font => (
                        <option key={font.name} value={font.name}>{font.label}</option>
                    ))}
                </select>

                <label style={labelStyle}>Font Weight</label>
                <select
                    value={config.branding?.fontWeight || '400'}
                    onChange={(e) => handleConfigUpdate({
                        branding: { ...config.branding, fontWeight: e.target.value }
                    })}
                    style={inputStyle}
                >
                    {FONT_WEIGHTS.map(weight => (
                        <option key={weight.value} value={weight.value}>{weight.label}</option>
                    ))}
                </select>
            </div>

            {/* ==================== SECTION 3: NAVIGATION & COLORS ==================== */}
            <div style={cardStyle}>
                <h3 style={sectionTitle}>🎨 Colors & Theme</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                    {/* Primary */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 6 }}>Primary</p>
                        <input
                            type="color"
                            value={config.colors?.primary || '#B8956A'}
                            onChange={(e) => handleConfigUpdate({
                                colors: { ...config.colors, primary: e.target.value }
                            })}
                            style={{ width: 48, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                        />
                    </div>
                    {/* Secondary */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 6 }}>Secondary</p>
                        <input
                            type="color"
                            value={config.colors?.primaryLight || '#A89070'}
                            onChange={(e) => handleConfigUpdate({
                                colors: { ...config.colors, primaryLight: e.target.value }
                            })}
                            style={{ width: 48, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                        />
                    </div>
                    {/* Confirmation */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 6 }}>Confirm</p>
                        <input
                            type="color"
                            value={config.colors?.confirmation || '#22C55E'}
                            onChange={(e) => handleConfigUpdate({
                                colors: { ...config.colors, confirmation: e.target.value }
                            })}
                            style={{ width: 48, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                        />
                    </div>
                    {/* Nav Color */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 6 }}>Nav Bar</p>
                        <input
                            type="color"
                            value={config.branding?.primaryColor || '#8B7355'}
                            onChange={(e) => handleConfigUpdate({
                                branding: { ...config.branding, primaryColor: e.target.value }
                            })}
                            style={{ width: 48, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                        />
                    </div>
                </div>

                {/* Dark Mode Toggle */}
                <label style={labelStyle}>Theme Mode</label>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => handleConfigUpdate({ canvasMode: 'light' })}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: 8,
                            border: (config.canvasMode === 'light' || !config.canvasMode)
                                ? '2px solid #3B82F6'
                                : '1px solid #E5E7EB',
                            background: '#FFFFFF',
                            color: '#1E293B',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        ☀️ Light
                    </button>
                    <button
                        onClick={() => handleConfigUpdate({ canvasMode: 'dark' })}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: 8,
                            border: config.canvasMode === 'dark'
                                ? '2px solid #3B82F6'
                                : '1px solid #E5E7EB',
                            background: '#1E293B',
                            color: '#FFFFFF',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        🌙 Dark
                    </button>
                </div>
            </div>

            {/* ==================== SECTION 4: HERO ICONS ==================== */}
            <div style={cardStyle}>
                <h3 style={sectionTitle}>🎯 Hero Icons (Home Page)</h3>
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
                    Customize the background color for each icon tile on the home page.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {['menu', 'delivery', 'rewards', 'game'].map(iconId => {
                        const iconConfig = config.heroIcons?.[iconId] || HERO_DEFAULT;
                        const labels = { menu: '🍔 Menu', delivery: '🚚 Delivery', rewards: '⭐ Rewards', game: '🎮 Game' };

                        return (
                            <div key={iconId} style={{
                                background: '#F9FAFB',
                                borderRadius: 10,
                                padding: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{labels[iconId]}</span>
                                <input
                                    type="color"
                                    value={iconConfig.color || '#8B7355'}
                                    onChange={(e) => handleConfigUpdate({
                                        heroIcons: {
                                            ...config.heroIcons,
                                            [iconId]: { ...iconConfig, color: e.target.value }
                                        }
                                    })}
                                    style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Apply Button */}
            <button
                onClick={() => {
                    window.dispatchEvent(new CustomEvent('frontendSync'));
                    alert('✅ Branding applied to frontend!');
                }}
                style={{
                    width: '100%',
                    padding: '16px',
                    background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                }}
            >
                ✨ Apply to Frontend
            </button>
        </div>
    );
}
