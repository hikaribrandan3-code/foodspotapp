/**
 * PromosComingSoon.jsx
 * Simple placeholder for Promos tab pre-launch
 * Clean "Coming Soon" message - May 2026
 */

import React from 'react';

export default function PromosComingSoon() {
  return (
    <div style={{
      height: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      {/* Simple Coming Soon Message */}
      <div style={{
        fontSize: 'clamp(32px, 10vw, 56px)',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        marginBottom: '16px'
      }}>
        Coming Soon
      </div>
      
      <div style={{
        fontSize: 'clamp(18px, 5vw, 28px)',
        fontWeight: 600,
        color: '#888',
        marginBottom: '8px'
      }}>
        May 2026
      </div>
      
      <div style={{
        fontSize: '14px',
        color: '#555',
        marginTop: '32px',
        maxWidth: '280px',
        lineHeight: 1.5
      }}>
        Exclusive events, free cover & deals you won't want to miss
      </div>
    </div>
  );
}
