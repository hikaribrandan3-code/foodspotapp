import React, { useState, useEffect } from 'react'
import { updateConfig, CURATED_FONTS, FONT_WEIGHTS, HERO_DEFAULT } from '../../config/appConfig.v2.js'
import { processAndStoreImage, formatFileSize } from '../../utils/imageOptimizer.js'
import ColorPickerModal from '../ColorPickerModal'

/**
 * STORE BRANDING COMPONENT - VISUAL MIRROR v2.0
 * Unified branding settings for Owner and Demo modes.
 * 
 * FIXED: Now uses ColorPickerModal instead of native input[type=color]
 * to avoid iOS native Grid/Spectrum/Sliders picker.
 */

export default function StoreBranding({ config: configProp, isDemo = false }) {
    const config = configProp || {};
    const [localConfig, setLocalConfig] = useState(config || {})
    const [uploadStatus, setUploadStatus] = useState(null)

    // Color Picker Modal State
    const [colorPickerState, setColorPickerState] = useState({
        isOpen: false,
        title: '',
        path: [], // e.g., ['colors', 'primary'] or ['branding', 'primaryColor']
        currentColor: '#8B7355',
        originalColor: '#8B7355'
    })

    // Sync with parent config changes
    useEffect(() => {
        if (config) {
            setLocalConfig(config)
        }
    }, [config])

    // Body scroll lock when picker is open
    useEffect(() => {
        if (colorPickerState.isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [colorPickerState.isOpen]);

    // Helper to update config and sync
    const handleConfigUpdate = (updates) => {
        const newConfig = { ...localConfig, ...updates }
        updateConfig(newConfig)
        setLocalConfig(newConfig)
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    // Open color picker
    const openColorPicker = (title, path, defaultColor) => {
        // Get current color from path
        let currentColor = defaultColor;
        if (path.length === 2) {
            currentColor = config?.[path[0]]?.[path[1]] || defaultColor;
        }
        setColorPickerState({
            isOpen: true,
            title,
            path,
            currentColor,
            originalColor: currentColor
        });
    };

    // Handle color picker live change (instant preview)
    const handleColorPickerLiveChange = (newColor) => {
        const { path } = colorPickerState;
        if (path.length === 2) {
            const newConfig = {
                ...localConfig,
                [path[0]]: {
                    ...localConfig[path[0]],
                    [path[1]]: newColor
                }
            };
            setLocalConfig(newConfig);
        }
    };

    // Handle color picker apply (save to config)
    const handleColorPickerApply = (finalColor) => {
        const { path } = colorPickerState;
        if (path.length === 2) {
            handleConfigUpdate({
                [path[0]]: {
                    ...config[path[0]],
                    [path[1]]: finalColor
                }
            });
        }
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

    // Handle color picker close (revert)
    const handleColorPickerClose = () => {
        const { path, originalColor } = colorPickerState;
        if (path.length === 2) {
            setLocalConfig(prev => ({
                ...prev,
                [path[0]]: {
                    ...prev[path[0]],
                    [path[1]]: originalColor
                }
            }));
        }
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

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

    // Color Swatch Component (replaces native input)
    const ColorSwatch = ({ label, path, defaultColor }) => {
        let currentColor = defaultColor;
        if (path.length === 2) {
            currentColor = localConfig?.[path[0]]?.[path[1]] || defaultColor;
        }
        return (
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 6 }}>{label}</p>
                <div
                    onClick={() => openColorPicker(label, path, defaultColor)}
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: currentColor,
                        border: '2px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        margin: '0 auto'
                    }}
                />
            </div>
        );
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

                {/* Header Display Mode Toggle */}
                <label style={labelStyle}>Header Display Mode</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <button
                        onClick={() => handleConfigUpdate({ headerMode: 'logo' })}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: 8,
                            border: (config.headerMode === 'logo' || !config.headerMode)
                                ? '2px solid #3B82F6'
                                : '1px solid #E5E7EB',
                            background: '#FFFFFF',
                            color: '#1E293B',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                        }}
                    >
                        🖼️ Logo
                    </button>
                    <button
                        onClick={() => handleConfigUpdate({ headerMode: 'text' })}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: 8,
                            border: config.headerMode === 'text'
                                ? '2px solid #3B82F6'
                                : '1px solid #E5E7EB',
                            background: '#FFFFFF',
                            color: '#1E293B',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                        }}
                    >
                        ✍️ Solo Texto
                    </button>
                </div>
            </div>

            {/* ==================== SECTION 3: NAVIGATION & COLORS ==================== */}
            <div style={cardStyle}>
                <h3 style={sectionTitle}>🎨 Colors & Theme</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                    <ColorSwatch label="Primary" path={['colors', 'primary']} defaultColor="#B8956A" />
                    <ColorSwatch label="Secondary" path={['colors', 'primaryLight']} defaultColor="#A89070" />
                    <ColorSwatch label="Confirm" path={['colors', 'confirmation']} defaultColor="#22C55E" />
                    <ColorSwatch label="Nav Bar" path={['branding', 'primaryColor']} defaultColor="#8B7355" />
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
                    Tap an icon to change its background color.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {['menu', 'delivery', 'promos', 'game'].map(iconId => {
                        const iconConfig = config.heroIcons?.[iconId] || HERO_DEFAULT;
                        const currentColor = iconConfig.color || '#8B7355';
                        const labels = { menu: '🍔 Menu', delivery: '🚚 Delivery', promos: '⭐ Promos', game: '🎮 Game' };

                        return (
                            <div
                                key={iconId}
                                onClick={() => {
                                    setColorPickerState({
                                        isOpen: true,
                                        title: labels[iconId],
                                        path: ['heroIcons', iconId],
                                        currentColor: currentColor,
                                        originalColor: currentColor,
                                        isHeroIcon: true,
                                        iconId: iconId
                                    });
                                }}
                                style={{
                                    background: currentColor,
                                    borderRadius: 12,
                                    padding: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                                }}
                            >
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>{labels[iconId]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>


            {/* Color Picker Modal */}
            {colorPickerState.isOpen && (
                <ColorPickerModal
                    title={colorPickerState.title}
                    initialColor={colorPickerState.currentColor}
                    onLiveChange={(color) => {
                        // Handle hero icons separately
                        if (colorPickerState.isHeroIcon) {
                            const iconId = colorPickerState.iconId;
                            setLocalConfig(prev => ({
                                ...prev,
                                heroIcons: {
                                    ...prev.heroIcons,
                                    [iconId]: { ...(prev.heroIcons?.[iconId] || {}), color: color }
                                }
                            }));
                        } else {
                            handleColorPickerLiveChange(color);
                        }
                    }}
                    onApply={(color) => {
                        if (colorPickerState.isHeroIcon) {
                            const iconId = colorPickerState.iconId;
                            handleConfigUpdate({
                                heroIcons: {
                                    ...config.heroIcons,
                                    [iconId]: { ...(config.heroIcons?.[iconId] || {}), color: color }
                                }
                            });
                        } else {
                            handleColorPickerApply(color);
                        }
                        setColorPickerState(prev => ({ ...prev, isOpen: false }));
                    }}
                    onClose={() => {
                        if (colorPickerState.isHeroIcon) {
                            const iconId = colorPickerState.iconId;
                            setLocalConfig(prev => ({
                                ...prev,
                                heroIcons: {
                                    ...prev.heroIcons,
                                    [iconId]: { ...(prev.heroIcons?.[iconId] || {}), color: colorPickerState.originalColor }
                                }
                            }));
                        } else {
                            handleColorPickerClose();
                        }
                        setColorPickerState(prev => ({ ...prev, isOpen: false }));
                    }}
                />
            )}
        </div>
    );
}
