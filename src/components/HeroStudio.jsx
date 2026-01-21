// src/components/HeroStudio.jsx
// 🎨 HERO STUDIO: Professional Image Editor for Multi-Tenant Hero Images
// Features: Pinch-to-Zoom, Drag-to-Pan, Crosshair Guidelines, Preview Mode
// Backend: Supabase Storage (branding bucket) with Tenant-Scoped Paths

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { uploadAsset, updateBranding } from '../lib/supabaseClient';

// ============================================
// HERO STUDIO COMPONENT
// ============================================
export default function HeroStudio({ onClose, onSave }) {
    const { tenantData, businessId, refreshTenant } = useTenant();

    // Studio State
    const [mode, setMode] = useState('select'); // 'select' | 'studio' | 'preview'
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Transform State (Zoom & Pan)
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // Gesture Tracking
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialPinchDistance, setInitialPinchDistance] = useState(null);
    const [initialScale, setInitialScale] = useState(1);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // Refs
    const containerRef = useRef(null);
    const canvasRef = useRef(null);

    // ============================================
    // FILE SELECTION
    // ============================================
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen');
            return;
        }

        // Create preview URL
        const url = URL.createObjectURL(file);
        setSelectedFile(file);
        setPreviewUrl(url);
        setMode('studio');

        // Reset transforms
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    // ============================================
    // GESTURE HANDLERS: DRAG (PAN)
    // ============================================
    const handlePointerDown = (e) => {
        if (mode !== 'studio') return;

        // Single touch/mouse - start drag
        if (e.touches?.length === 1 || !e.touches) {
            setIsDragging(true);
            const clientX = e.touches?.[0]?.clientX ?? e.clientX;
            const clientY = e.touches?.[0]?.clientY ?? e.clientY;
            setDragStart({ x: clientX - position.x, y: clientY - position.y });
        }

        // Two finger touch - start pinch
        if (e.touches?.length === 2) {
            const distance = getDistance(e.touches[0], e.touches[1]);
            setInitialPinchDistance(distance);
            setInitialScale(scale);
        }
    };

    const handlePointerMove = (e) => {
        if (mode !== 'studio') return;

        // Pinch-to-Zoom (Two Fingers)
        if (e.touches?.length === 2 && initialPinchDistance) {
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const scaleRatio = currentDistance / initialPinchDistance;
            const newScale = Math.min(Math.max(initialScale * scaleRatio, 1), 3);
            setScale(newScale);
            return;
        }

        // Drag-to-Pan (Single Finger/Mouse)
        if (isDragging && (e.touches?.length === 1 || !e.touches)) {
            const clientX = e.touches?.[0]?.clientX ?? e.clientX;
            const clientY = e.touches?.[0]?.clientY ?? e.clientY;
            setPosition({
                x: clientX - dragStart.x,
                y: clientY - dragStart.y
            });
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        setInitialPinchDistance(null);
    };

    // ============================================
    // UTILITY: Distance Calculator for Pinch
    // ============================================
    const getDistance = (touch1, touch2) => {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // ============================================
    // ZOOM CONTROLS (Button Fallback)
    // ============================================
    const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 3));
    const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 1));
    const handleResetTransform = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    // ============================================
    // PREVIEW MODE
    // ============================================
    const enterPreviewMode = () => {
        setMode('preview');
    };

    const exitPreviewMode = () => {
        setMode('studio');
    };

    // ============================================
    // COMMIT: Upload to Supabase
    // ============================================
    const handleCommit = async () => {
        if (!selectedFile || !businessId) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            // Upload with tenant-scoped path
            const { url, error } = await uploadAsset(selectedFile, businessId, 'branding');

            if (error) throw error;

            // Update branding table
            await updateBranding({
                hero_url: url,
                hero_mode: 'image'
            }, businessId);

            // Refresh context
            if (refreshTenant) await refreshTenant();

            // Notify parent
            if (onSave) onSave(url);
            if (onClose) onClose();

        } catch (err) {
            console.error('Hero upload failed:', err);
            setUploadError(err.message || 'Error al subir la imagen');
        } finally {
            setIsUploading(false);
        }
    };

    // ============================================
    // CANCEL / CLOSE
    // ============================================
    const handleCancel = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        setMode('select');
        if (onClose) onClose();
    };

    // ============================================
    // CLEANUP
    // ============================================
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // ============================================
    // RENDER: SELECT MODE
    // ============================================
    if (mode === 'select') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <span style={styles.title}>Hero Studio</span>
                    <button onClick={handleCancel} style={styles.closeBtn}>✕</button>
                </div>

                <div style={styles.selectZone}>
                    <label style={styles.uploadLabel}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <div style={styles.uploadIcon}>📷</div>
                        <span>Seleccionar Imagen</span>
                    </label>

                    {tenantData?.hero_url && (
                        <div style={styles.currentPreview}>
                            <span style={styles.currentLabel}>Imagen Actual:</span>
                            <img
                                src={tenantData.hero_url}
                                alt="Current hero"
                                style={styles.currentThumbnail}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER: STUDIO MODE (Edit)
    // ============================================
    if (mode === 'studio') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <button onClick={handleCancel} style={styles.backBtn}>← Atrás</button>
                    <span style={styles.title}>Ajustar Imagen</span>
                    <button onClick={enterPreviewMode} style={styles.previewBtn}>
                        Vista Previa →
                    </button>
                </div>

                {/* STUDIO CANVAS */}
                <div
                    ref={containerRef}
                    style={styles.studioCanvas}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                >
                    {/* CROSSHAIR GUIDELINES */}
                    <div style={styles.crosshairH} />
                    <div style={styles.crosshairV} />
                    <div style={styles.centerDot} />

                    {/* IMAGE */}
                    <img
                        ref={canvasRef}
                        src={previewUrl}
                        alt="Hero preview"
                        style={{
                            ...styles.studioImage,
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        }}
                        draggable={false}
                    />
                </div>

                {/* ZOOM CONTROLS */}
                <div style={styles.zoomControls}>
                    <button onClick={handleZoomOut} style={styles.zoomBtn}>−</button>
                    <span style={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
                    <button onClick={handleZoomIn} style={styles.zoomBtn}>+</button>
                    <button onClick={handleResetTransform} style={styles.resetBtn}>↺</button>
                </div>

                <div style={styles.hint}>
                    Arrastra para mover • Pellizca para zoom
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER: PREVIEW MODE (Confirm)
    // ============================================
    if (mode === 'preview') {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <button onClick={exitPreviewMode} style={styles.backBtn}>← Editar</button>
                    <span style={styles.title}>Vista Previa</span>
                    <div style={{ width: 60 }} /> {/* Spacer */}
                </div>

                {/* PREVIEW: Simulates Customer View */}
                <div style={styles.previewContainer}>
                    <div style={styles.previewFrame}>
                        <img
                            src={previewUrl}
                            alt="Preview"
                            style={{
                                ...styles.previewImage,
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            }}
                        />
                        <div style={styles.previewOverlay}>
                            <span style={styles.businessNamePreview}>
                                {tenantData?.business_name || 'Tu Negocio'}
                            </span>
                        </div>
                    </div>
                </div>

                {uploadError && (
                    <div style={styles.errorBanner}>{uploadError}</div>
                )}

                {/* COMMIT BUTTON */}
                <button
                    onClick={handleCommit}
                    disabled={isUploading}
                    style={{
                        ...styles.commitBtn,
                        opacity: isUploading ? 0.6 : 1
                    }}
                >
                    {isUploading ? 'Subiendo...' : '✓ Confirmar'}
                </button>
            </div>
        );
    }

    return null;
}

// ============================================
// STYLES
// ============================================
const styles = {
    container: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0A0A0A',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #333',
        flexShrink: 0,
    },
    title: {
        fontSize: '18px',
        fontWeight: '600',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: '20px',
        cursor: 'pointer',
        padding: '8px',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '14px',
        cursor: 'pointer',
    },
    previewBtn: {
        background: 'none',
        border: 'none',
        color: '#22C55E',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    selectZone: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        padding: '24px',
    },
    uploadLabel: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '48px',
        border: '2px dashed #444',
        borderRadius: '16px',
        cursor: 'pointer',
        color: '#888',
        fontSize: '16px',
        // 🛡️ iOS TOUCH FIX: Enable interaction
        WebkitTouchCallout: 'default',
        WebkitUserSelect: 'none',
        touchAction: 'auto',
        pointerEvents: 'auto',
    },
    uploadIcon: {
        fontSize: '48px',
    },
    currentPreview: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    currentLabel: {
        fontSize: '12px',
        color: '#666',
    },
    currentThumbnail: {
        width: '120px',
        height: '80px',
        objectFit: 'cover',
        borderRadius: '8px',
        border: '1px solid #333',
    },
    studioCanvas: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none',
    },
    crosshairH: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: '1px',
        background: 'rgba(255,255,255,0.3)',
        borderStyle: 'dashed',
        pointerEvents: 'none',
    },
    crosshairV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: '1px',
        background: 'rgba(255,255,255,0.3)',
        borderStyle: 'dashed',
        pointerEvents: 'none',
    },
    centerDot: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '12px',
        height: '12px',
        marginTop: '-6px',
        marginLeft: '-6px',
        background: 'rgba(255,255,255,0.5)',
        borderRadius: '50%',
        pointerEvents: 'none',
    },
    studioImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        transformOrigin: 'center center',
        transition: 'none',
    },
    zoomControls: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '16px',
        borderTop: '1px solid #333',
    },
    zoomBtn: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#222',
        border: 'none',
        color: '#fff',
        fontSize: '20px',
        cursor: 'pointer',
    },
    zoomLabel: {
        fontSize: '14px',
        color: '#888',
        minWidth: '50px',
        textAlign: 'center',
    },
    resetBtn: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#333',
        border: 'none',
        color: '#fff',
        fontSize: '18px',
        cursor: 'pointer',
        marginLeft: '8px',
    },
    hint: {
        textAlign: 'center',
        padding: '12px',
        fontSize: '12px',
        color: '#666',
    },
    previewContainer: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
    },
    previewFrame: {
        position: 'relative',
        width: '100%',
        maxWidth: '375px',
        aspectRatio: '9/16',
        background: '#1A1A1A',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    },
    previewImage: {
        width: '100%',
        height: '260px',
        objectFit: 'cover',
        transformOrigin: 'center center',
    },
    previewOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '260px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.4) 100%)',
    },
    businessNamePreview: {
        fontSize: '24px',
        fontWeight: '800',
        color: '#fff',
        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
    },
    errorBanner: {
        background: '#B91C1C',
        color: '#fff',
        padding: '12px',
        textAlign: 'center',
        fontSize: '14px',
    },
    commitBtn: {
        margin: '16px',
        padding: '16px 32px',
        background: '#22C55E',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '700',
        cursor: 'pointer',
    },
};
