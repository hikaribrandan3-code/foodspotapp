/**
 * 🛡️ OPERATION VAULT-SEAL: STRIKE 1.5
 * CameraIcon.jsx — The Gold Standard Asset
 * 
 * ONE Icon. ONE Source of Truth.
 * Automatically adapts to: var(--nav-icon-color)
 */

import React from 'react';

/**
 * 🎯 THE GOLD STANDARD
 * The single, definitive Camera Icon for FoodSpot OS.
 * No variants. No logic. Just pure, brand-aware SVG.
 */
export default function CameraIcon({ className = 'camera-icon', style = {} }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            // 🛡️ AUTO-ADAPTIVE: Inherits the Contrast Color from Strike 1
            stroke="var(--nav-icon-color, currentColor)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
        >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

// 🔄 BACKWARDS COMPAT: Named exports for existing imports
export { CameraIcon as DefaultCameraIcon };
export const getCameraIcon = () => CameraIcon;
