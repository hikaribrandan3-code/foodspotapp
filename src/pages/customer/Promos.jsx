import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext.jsx'
import PromosComingSoon from './PromosComingSoon.jsx'

export default function Promos() {
    const { tenantData } = useTenant()
    const appConfig = tenantData?.app_config || {}
    const flyers = appConfig?.promos?.items || []
    
    // Show coming soon if no promos configured
    if (flyers.length === 0) {
        return <PromosComingSoon />
    }
    return (
        <div style={{ height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
            <div ref={containerRef} style={{ height: '100vh', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                {flyers.map((flyer, i) => (
                    <div key={i} style={{ height: '100vh', width: '100vw', scrollSnapAlign: 'start', position: 'relative', overflow: 'hidden', background: '#0a0a0a' }}>
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                            {flyer.image ? (
                                <img src={flyer.image} alt={flyer.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }} loading={i === 0 ? "eager" : "lazy"} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#fff', fontSize: 24, opacity: 0.5 }}>Sin imagen</span>
                                </div>
                            )}
                        </div>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%), linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)', zIndex: 2, pointerEvents: 'none' }} />

                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 24px 100px', zIndex: 10, color: '#fff' }}>
                            <h2 style={{ fontSize: 'clamp(28px, 8vw, 42px)', fontWeight: 900, margin: '0 0 8px 0', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.5)', letterSpacing: '-0.02em' }}>
                                {flyer.title || 'Promo Especial'}
                            </h2>
                            <p style={{ fontSize: 'clamp(16px, 4vw, 20px)', opacity: 0.9, margin: 0, fontWeight: 500, textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
                                {flyer.subtitle || ''}
                            </p>
                            {flyer.price && (
                                <div style={{ marginTop: 16, fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, color: '#FFD700' }}>{flyer.price}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {flyers.length > 1 && (
                <div style={{ position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 100 }}>
                    {flyers.map((_, i) => (
                        <button key={i} onClick={() => scrollToFlyer(i)} style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', background: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} aria-label={`Flyer ${i + 1}`} />
                    ))}
                </div>
            )}
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        </div>
    )
}
