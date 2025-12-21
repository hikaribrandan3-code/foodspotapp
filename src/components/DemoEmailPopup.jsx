/**
 * DemoEmailPopup - Soft conversion nudge
 * Shows after 5 minutes of demo usage
 * Non-blocking, dismissable, once per session
 */

import { useState, useEffect, useCallback } from 'react'
import { markEmailSent } from '../utils/demoTimer.js'

export default function DemoEmailPopup({ isOpen, onClose }) {
    const [email, setEmail] = useState('')
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [showEmailInput, setShowEmailInput] = useState(false)

    // Close on ESC key
    useEffect(() => {
        if (!isOpen) return

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose])

    // Handle email submission
    const handleSubmit = useCallback((e) => {
        e.preventDefault()

        if (!email.trim()) return

        // Create mailto link with pre-filled content
        const subject = encodeURIComponent('Demo Activation Request')
        const body = encodeURIComponent(
            `Email: ${email}\n` +
            `Timestamp: ${new Date().toISOString()}\n` +
            `Source: FoodSpot Demo Mode\n\n` +
            `Este usuario quiere activar su app desde el modo demo.`
        )

        // Open email client
        window.open(`mailto:hikaristudioai@gmail.com?subject=${subject}&body=${body}`, '_blank')

        // Mark as sent and show confirmation
        markEmailSent()
        setShowConfirmation(true)

        // Auto-close after 2 seconds
        setTimeout(() => {
            onClose()
        }, 2000)
    }, [email, onClose])

    // Handle "Activar tu app" click - show email input
    const handleActivateClick = () => {
        setShowEmailInput(true)
    }

    // Handle "Seguir probando" click - dismiss
    const handleContinueClick = () => {
        onClose()
    }

    // Click outside to close
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: 20,
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
            }}
        >
            <div style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: 32,
                maxWidth: 380,
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'none',
                        border: 'none',
                        fontSize: 24,
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        padding: 4,
                        lineHeight: 1
                    }}
                    aria-label="Cerrar"
                >
                    ×
                </button>

                {showConfirmation ? (
                    // Confirmation state
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                        <p style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: '#1F2937',
                            margin: 0
                        }}>
                            Listo. Te contactamos.
                        </p>
                    </div>
                ) : showEmailInput ? (
                    // Email input state
                    <>
                        <h2 style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: '#1F2937',
                            margin: '0 0 12px',
                            lineHeight: 1.3
                        }}>
                            Este ya es tu app.
                        </h2>

                        <p style={{
                            fontSize: 15,
                            color: '#6B7280',
                            margin: '0 0 24px',
                            lineHeight: 1.5
                        }}>
                            Lo estás personalizando como si fuera tuyo.
                            Si querés activarlo para tu negocio, dejá tu email.
                        </p>

                        <form onSubmit={handleSubmit}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                required
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    fontSize: 16,
                                    border: '2px solid #E5E7EB',
                                    borderRadius: 12,
                                    outline: 'none',
                                    marginBottom: 16,
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#22C55E'}
                                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                            />

                            <button
                                type="submit"
                                style={{
                                    width: '100%',
                                    padding: '14px 20px',
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: '#FFFFFF',
                                    background: '#22C55E',
                                    border: 'none',
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                            >
                                Enviar
                            </button>
                        </form>

                        <button
                            onClick={handleContinueClick}
                            style={{
                                width: '100%',
                                marginTop: 12,
                                padding: '10px',
                                fontSize: 14,
                                color: '#9CA3AF',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Seguir probando
                        </button>
                    </>
                ) : (
                    // Initial state - show main CTA
                    <>
                        <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>🚀</div>

                        <h2 style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: '#1F2937',
                            margin: '0 0 12px',
                            lineHeight: 1.3,
                            textAlign: 'center'
                        }}>
                            Este ya es tu app.
                        </h2>

                        <p style={{
                            fontSize: 15,
                            color: '#6B7280',
                            margin: '0 0 24px',
                            lineHeight: 1.5,
                            textAlign: 'center'
                        }}>
                            Lo estás personalizando como si fuera tuyo.
                            <br />
                            Si querés activarlo para tu negocio, dejá tu email.
                        </p>

                        <button
                            onClick={handleActivateClick}
                            style={{
                                width: '100%',
                                padding: '14px 20px',
                                fontSize: 16,
                                fontWeight: 600,
                                color: '#FFFFFF',
                                background: '#22C55E',
                                border: 'none',
                                borderRadius: 12,
                                cursor: 'pointer',
                                marginBottom: 12,
                                transition: 'background 0.2s'
                            }}
                        >
                            Activar tu app
                        </button>

                        <button
                            onClick={handleContinueClick}
                            style={{
                                width: '100%',
                                padding: '10px',
                                fontSize: 14,
                                color: '#9CA3AF',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Seguir probando
                        </button>
                    </>
                )}
            </div>

            {/* Keyframe animation */}
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    )
}
