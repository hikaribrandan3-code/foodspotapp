// Demo Backend Dashboard
// Uses SAME UI layout as production, but with demo session + mock data
// NO authentication required - only demo session check

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
// NOTE: demoSession.js imports are loaded dynamically at runtime to avoid Safari circular import crash
// DO NOT add static imports from demoSession.js or demoEvents.js here
import { getConfig, HERO_DEFAULT } from '../../config/appConfig.js'
import { getMenu } from '../../config/menuData.js'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'
import { verifyDeliveryCode, getPhoneLast4 } from '../../utils/deliveryUtils.js'

// ============================================
// SAFARI CRASH FIX: Lazy-load demoSession functions
// These are loaded dynamically at runtime instead of module init
// ============================================
let demoSessionModule = null
let demoEventsModule = null

async function loadDemoModules() {
    if (!demoSessionModule) {
        demoSessionModule = await import('../../utils/demoSession.js')
    }
    if (!demoEventsModule) {
        demoEventsModule = await import('../../utils/demoEvents.js')
    }
    return { demoSession: demoSessionModule, demoEvents: demoEventsModule }
}

// Wrapper functions that use lazy-loaded modules
const getDemoSession = () => demoSessionModule?.getDemoSession?.() || null
const clearDemoSession = () => demoSessionModule?.clearDemoSession?.()
const getDemoRole = () => demoSessionModule?.getDemoRole?.() || 'owner'
const toggleDemoRole = () => demoSessionModule?.toggleDemoRole?.()
const getDemoConfig = () => demoSessionModule?.getDemoConfig?.() || {}
const updateDemoConfig = (updates) => demoSessionModule?.updateDemoConfig?.(updates)
const getDemoMenu = () => demoSessionModule?.getDemoMenu?.() || { categories: [] }
const saveDemoMenu = (menu) => demoSessionModule?.saveDemoMenu?.(menu)
const updateDemoMenuItem = (id, updates) => demoSessionModule?.updateDemoMenuItem?.(id, updates)
const addDemoCategory = (name) => demoSessionModule?.addDemoCategory?.(name)
const applyDemoToFrontend = () => demoSessionModule?.applyDemoToFrontend?.()
const clearAllDemoData = () => demoSessionModule?.clearAllDemoData?.()
const getDemoEvents = () => demoEventsModule?.getDemoEvents?.() || []
const clearDemoEvents = () => demoEventsModule?.clearDemoEvents?.()


// Import existing branding components (REUSE)
import BrandingColorPicker from '../../components/BrandingColorPicker.jsx'
import HeroIconPicker from '../../components/HeroIconPicker.jsx'
import CoverImageEditor from '../../components/CoverImageEditor.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import DemoEmailPopup from '../../components/DemoEmailPopup.jsx'

// Timer utilities for email popup
import {
    startDemoTimer,
    pauseDemoTimer,
    resumeDemoTimer,
    shouldShowPopup,
    markPopupShown
} from '../../utils/demoTimer.js'

// Mock data for demo (inline to avoid touching production services)
const MOCK_ORDERS = [
    {
        id: 'demo-1',
        orderNumber: '101',
        status: 'preparacion',
        items: [{ name: 'Flat White', quantity: 2, price: 1800 }],
        total: 3600,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        paymentConfirmed: false
    },
    {
        id: 'demo-2',
        orderNumber: '102',
        status: 'listo',
        items: [{ name: 'Cappuccino', quantity: 1, price: 1600 }, { name: 'Brownie', quantity: 1, price: 2200 }],
        total: 3800,
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        paymentConfirmed: true,
        paymentMethod: 'mercado_pago'
    },
    {
        id: 'demo-3',
        orderNumber: '103',
        status: 'en_camino',
        orderType: 'delivery',
        items: [{ name: 'Avocado Toast', quantity: 1, price: 2800 }],
        total: 2800,
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        paymentConfirmed: true,
        customerInfo: {
            name: 'Demo User',
            address: 'Calle Falsa 123',
            phone: '+5491112345678'
        }
    }
]

const MOCK_ANALYTICS = {
    today: { orders: 12, revenue: 28500 },
    week: { orders: 67, revenue: 156000 },
    month: { orders: 245, revenue: 612000 }
}

// ============================================
// EVENT LOG UI HELPERS (Presentation-layer only)
// ============================================

/**
 * Get human-readable relative time from timestamp
 * Computed at render time, no timers needed
 */
function getRelativeTime(timestamp) {
    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diffMs = now - then
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 10) return 'just now'
    if (diffSec < 60) return `${diffSec}s ago`
    if (diffMin < 60) return `${diffMin} min ago`
    if (diffHour < 24) return `${diffHour}h ago`
    return `${diffDay}d ago`
}

/**
 * Group events by orderId for UI display
 * Only groups consecutive events with the same orderId
 * Returns array of { type: 'group'|'single', orderId?, orderNumber?, events: [] }
 */
function groupEventsByOrder(events) {
    if (!events || events.length === 0) return []

    const groups = []
    let currentGroup = null

    events.forEach(event => {
        const orderId = event.payload?.orderId
        const orderNumber = event.payload?.orderNumber

        // Check if this event has an orderId and can be grouped
        if (orderId) {
            // If current group has same orderId, add to it
            if (currentGroup && currentGroup.orderId === orderId) {
                currentGroup.events.push(event)
            } else {
                // Close previous group if exists
                if (currentGroup) groups.push(currentGroup)
                // Start new group
                currentGroup = {
                    type: 'group',
                    orderId,
                    orderNumber,
                    events: [event]
                }
            }
        } else {
            // Non-order event - close current group and add as single
            if (currentGroup) {
                groups.push(currentGroup)
                currentGroup = null
            }
            groups.push({ type: 'single', events: [event] })
        }
    })

    // Don't forget the last group
    if (currentGroup) groups.push(currentGroup)

    return groups
}

/**
 * Camera Icon SVG component for backend preview
 * Renders professional SVG icons instead of emojis
 */
function CameraIcon({ type = 'default', size = 20, color = '#FFFFFF' }) {
    const icons = {
        default: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
            </svg>
        ),
        camera: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
                <circle cx="18" cy="8" r="1" fill={color} />
            </svg>
        ),
        aperture: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
                <line x1="9.69" y1="8" x2="21.17" y2="8" />
                <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
                <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
                <line x1="14.31" y1="16" x2="2.83" y2="16" />
                <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
            </svg>
        ),
        webcam: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="8" />
                <circle cx="12" cy="10" r="3" />
                <path d="M7 22h10" />
                <path d="M12 18v4" />
            </svg>
        )
    }
    return icons[type] || icons.default
}

// Event Log Item Component - Displays a single webhook event
function EventLogItem({ event, compact = false }) {
    const [expanded, setExpanded] = useState(false)

    const eventTypeColors = {
        'order.created': '#22C55E',
        'order.status_updated': '#3B82F6',
        'order.completed': '#8B5CF6',
        'menu.updated': '#F59E0B'
    }

    const formatTimestamp = (ts) => {
        const date = new Date(ts)
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }) + ' ' + date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <div style={{
            background: compact ? '#FAFAFA' : 'white',
            borderRadius: compact ? 8 : 10,
            marginBottom: compact ? 4 : 8,
            border: `1px solid ${compact ? '#F3F4F6' : '#E5E7EB'}`,
            overflow: 'hidden'
        }}>
            {/* Event Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    padding: compact ? '8px 12px' : '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: expanded ? '#F9FAFB' : 'transparent'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Event Type Badge */}
                    <span style={{
                        padding: '3px 6px',
                        background: eventTypeColors[event.type] || '#6B7280',
                        color: 'white',
                        borderRadius: 4,
                        fontSize: compact ? 10 : 11,
                        fontWeight: 600,
                        fontFamily: 'monospace'
                    }}>
                        {event.type}
                    </span>

                    {/* Relative Time (Primary) */}
                    <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>
                        {getRelativeTime(event.timestamp)}
                    </span>

                    {/* Exact Timestamp (Secondary) */}
                    <span style={{ fontSize: 10, color: '#D1D5DB' }}>
                        {formatTimestamp(event.timestamp)}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Status Badge */}
                    <span style={{
                        padding: '2px 5px',
                        background: '#DCFCE7',
                        color: '#166534',
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 600
                    }}>
                        {event.delivery?.status || 200} OK
                    </span>

                    {/* Expand Icon */}
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                        {expanded ? '▲' : '▼'}
                    </span>
                </div>
            </div>

            {/* Payload Preview (Expanded) */}
            {expanded && (
                <div style={{
                    padding: '10px 12px',
                    background: '#1F2937',
                    borderTop: '1px solid #E5E7EB'
                }}>
                    <pre style={{
                        margin: 0,
                        fontSize: 10,
                        color: '#A5F3FC',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        lineHeight: 1.4
                    }}>
                        {JSON.stringify(event.payload, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}

// Event Group Component - Collapsible group of events for same order
function EventGroup({ group }) {
    const [expanded, setExpanded] = useState(true) // Default expanded for visibility

    // Single event in group = don't show group header
    if (group.events.length === 1) {
        return <EventLogItem event={group.events[0]} />
    }

    return (
        <div style={{
            background: 'white',
            borderRadius: 10,
            marginBottom: 10,
            border: '1px solid #E5E7EB',
            overflow: 'hidden'
        }}>
            {/* Group Header */}
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: '#F9FAFB',
                    borderBottom: expanded ? '1px solid #E5E7EB' : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>📦</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        Order #{group.orderNumber || '—'}
                    </span>
                    <span style={{
                        padding: '2px 6px',
                        background: '#E5E7EB',
                        color: '#6B7280',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 500
                    }}>
                        {group.events.length} events
                    </span>
                </div>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {expanded ? '▼' : '▶'}
                </span>
            </div>

            {/* Grouped Events */}
            {expanded && (
                <div style={{ padding: '8px 10px' }}>
                    {group.events.map(event => (
                        <EventLogItem key={event.id} event={event} compact />
                    ))}
                </div>
            )}
        </div>
    )
}

// ============================================
// ORDER LIFECYCLE PLAYBACK (Demo-only, Read-only)
// ============================================

/**
 * Get order events from demo events, filtered by orderId
 * Returns events sorted ascending by timestamp
 */
function getOrderEvents(orderId) {
    if (!orderId) return []
    const allEvents = getDemoEvents()
    return allEvents
        .filter(e => e.payload?.orderId === orderId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

/**
 * Check if an order has any demo events
 */
function orderHasEvents(orderId) {
    return getOrderEvents(orderId).length > 0
}

/**
 * Map event types to timeline steps
 */
const TIMELINE_STEPS = [
    { id: 'created', label: 'Order Placed', eventType: 'order.created', icon: '📝' },
    { id: 'preparing', label: 'Preparing', eventType: 'order.status_updated', statusValue: 'preparacion', icon: '👨‍🍳' },
    { id: 'ready', label: 'Ready', eventType: 'order.status_updated', statusValue: 'listo', icon: '✅' },
    { id: 'delivery', label: 'Out for Delivery', eventType: 'order.status_updated', statusValue: 'en_camino', icon: '🚗', deliveryOnly: true },
    { id: 'completed', label: 'Delivered', eventType: 'order.completed', icon: '🎉' }
]

/**
 * OrderPlaybackModal - Shows animated timeline of order lifecycle
 * Read-only, uses existing demo events only
 */
function OrderPlaybackModal({ order, isOpen, onClose }) {
    const [currentStepIndex, setCurrentStepIndex] = useState(-1)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playbackComplete, setPlaybackComplete] = useState(false)
    const timerRef = useRef(null)

    // Get events for this order
    const orderEvents = getOrderEvents(order?.id)

    // Determine which steps apply based on events
    const applicableSteps = TIMELINE_STEPS.filter(step => {
        // Skip delivery step if not a delivery order
        if (step.deliveryOnly && !order?.deliveryMode) return false

        // Check if we have an event matching this step
        return orderEvents.some(event => {
            if (event.type === step.eventType) {
                if (step.statusValue) {
                    return event.payload?.newStatus === step.statusValue
                }
                return true
            }
            return false
        })
    })

    // Start playback
    const startPlayback = () => {
        setCurrentStepIndex(0)
        setIsPlaying(true)
        setPlaybackComplete(false)
    }

    // Auto-advance steps
    useEffect(() => {
        if (!isPlaying || currentStepIndex >= applicableSteps.length) {
            if (currentStepIndex >= applicableSteps.length && isPlaying) {
                setIsPlaying(false)
                setPlaybackComplete(true)
            }
            return
        }

        timerRef.current = setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1)
        }, 1000) // 1 second per step

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [isPlaying, currentStepIndex, applicableSteps.length])

    // Cleanup on close
    useEffect(() => {
        if (!isOpen) {
            setCurrentStepIndex(-1)
            setIsPlaying(false)
            setPlaybackComplete(false)
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [isOpen])

    // Start playback automatically when modal opens
    useEffect(() => {
        if (isOpen && applicableSteps.length > 0 && !isPlaying && !playbackComplete) {
            setTimeout(startPlayback, 500) // Small delay for visual effect
        }
    }, [isOpen])

    if (!isOpen || !order) return null

    const formatTime = (ts) => {
        return new Date(ts).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
        }}>
            <div style={{
                background: 'white',
                borderRadius: 16,
                width: '100%',
                maxWidth: 380,
                maxHeight: '85vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: 0 }}>
                            Order Journey
                        </h3>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
                            Order #{order.orderNumber}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 20,
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            padding: 4
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Order Summary */}
                <div style={{
                    padding: '16px 20px',
                    background: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB'
                }}>
                    <div style={{ marginBottom: 12 }}>
                        {order.items.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 13,
                                color: '#374151',
                                marginBottom: 4
                            }}>
                                <span>{item.quantity}× {item.name}</span>
                                <span>${(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        borderTop: '1px dashed #D1D5DB'
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#22C55E' }}>
                            ${order.total.toLocaleString()}
                        </span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF' }}>
                        {order.deliveryMode ? '🚗 Delivery' : '🏠 Pickup'} • {formatTime(order.createdAt)}
                    </div>
                </div>

                {/* Timeline */}
                <div style={{ padding: '20px 20px 16px' }}>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 16, letterSpacing: 0.5 }}>
                        ORDER TIMELINE
                    </h4>

                    {applicableSteps.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>
                            <p>No events recorded for this order</p>
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            {/* Vertical line */}
                            <div style={{
                                position: 'absolute',
                                left: 15,
                                top: 8,
                                bottom: 8,
                                width: 2,
                                background: '#E5E7EB'
                            }} />

                            {/* Steps */}
                            {applicableSteps.map((step, idx) => {
                                const isActive = idx <= currentStepIndex
                                const isCurrent = idx === currentStepIndex
                                const event = orderEvents.find(e => {
                                    if (e.type === step.eventType) {
                                        if (step.statusValue) {
                                            return e.payload?.newStatus === step.statusValue
                                        }
                                        return true
                                    }
                                    return false
                                })

                                return (
                                    <div
                                        key={step.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 14,
                                            marginBottom: idx === applicableSteps.length - 1 ? 0 : 20,
                                            position: 'relative',
                                            opacity: isActive ? 1 : 0.4,
                                            transform: isCurrent ? 'scale(1.02)' : 'scale(1)',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        {/* Step indicator */}
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            background: isActive ? '#22C55E' : '#E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 14,
                                            flexShrink: 0,
                                            boxShadow: isCurrent ? '0 0 0 4px rgba(34, 197, 94, 0.2)' : 'none',
                                            transition: 'all 0.3s ease',
                                            zIndex: 1
                                        }}>
                                            {step.icon}
                                        </div>

                                        {/* Step content */}
                                        <div style={{ flex: 1, paddingTop: 4 }}>
                                            <p style={{
                                                fontSize: 14,
                                                fontWeight: isActive ? 600 : 400,
                                                color: isActive ? '#1F2937' : '#9CA3AF',
                                                margin: 0
                                            }}>
                                                {step.label}
                                            </p>
                                            {event && isActive && (
                                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
                                                    {formatTime(event.timestamp)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 20px 20px',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 12
                }}>
                    {playbackComplete && (
                        <button
                            onClick={startPlayback}
                            style={{
                                padding: '10px 20px',
                                background: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            ▶ Replay
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: '#F3F4F6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

// Event Log Tab Component - Contains full event log UI with auto-scroll
function EventLogTab({ cardStyle, labelStyle }) {
    const scrollContainerRef = useRef(null)
    const events = getDemoEvents()
    const prevEventCountRef = useRef(events.length)

    // Auto-scroll to top when new events arrive
    useEffect(() => {
        if (events.length > prevEventCountRef.current) {
            scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }
        prevEventCountRef.current = events.length
    }, [events.length])

    // Group events by orderId at render time
    const groupedEvents = groupEventsByOrder(events)

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={labelStyle}>🔗 WEBHOOK EVENT LOG</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {events.length > 0 && (
                        <span style={{ fontSize: 11, color: '#6B7280' }}>
                            {events.length} event{events.length !== 1 ? 's' : ''}
                        </span>
                    )}
                    <button
                        onClick={() => {
                            clearDemoEvents()
                            alert('✅ Event log cleared')
                        }}
                        style={{
                            padding: '6px 12px',
                            fontSize: 11,
                            background: '#EF4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer'
                        }}
                    >
                        Clear Log
                    </button>
                </div>
            </div>

            <div style={cardStyle}>
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 0 }}>
                    Simulated webhook events — what your backend would receive in production
                </p>
            </div>

            {/* Scrollable Event Container */}
            <div
                ref={scrollContainerRef}
                style={{
                    maxHeight: 'calc(100vh - 380px)',
                    overflowY: 'auto',
                    paddingTop: 8,
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {events.length === 0 ? (
                    <div style={{ ...cardStyle, textAlign: 'center', padding: 32 }}>
                        <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>No events yet</p>
                        <p style={{ fontSize: 12, color: '#D1D5DB', margin: '8px 0 0' }}>
                            Place an order or update menu to see events
                        </p>
                    </div>
                ) : (
                    groupedEvents.map((group, idx) => (
                        group.type === 'group' ? (
                            <EventGroup key={group.orderId + '-' + idx} group={group} />
                        ) : (
                            <EventLogItem key={group.events[0].id} event={group.events[0]} />
                        )
                    ))
                )}
            </div>
        </>
    )
}

// ============================================
// ACTIVITY DASHBOARD (Demo-only, Read-only)
// ============================================

/**
 * Compute activity metrics from demo events and orders
 * All computations are read-only and derived at render time
 */
function computeActivityMetrics(events, orders) {
    const now = Date.now()
    const todayStart = new Date().setHours(0, 0, 0, 0)

    // Filter today's events
    const todayEvents = events.filter(e => new Date(e.timestamp).getTime() >= todayStart)

    // Order counts
    const ordersToday = todayEvents.filter(e => e.type === 'order.created').length
    const completedOrders = todayEvents.filter(e => e.type === 'order.completed').length

    // Revenue from completed orders
    const completedOrderPayloads = todayEvents
        .filter(e => e.type === 'order.completed')
        .map(e => e.payload)
    const totalRevenue = completedOrderPayloads.reduce((sum, p) => sum + (p.total || 0), 0)
    const avgOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0

    // Prep time calculation (order.created → first order.status_updated)
    const prepTimes = []
    const createdEvents = todayEvents.filter(e => e.type === 'order.created')

    createdEvents.forEach(created => {
        const orderId = created.payload?.orderId
        const firstUpdate = todayEvents.find(e =>
            e.type === 'order.status_updated' &&
            e.payload?.orderId === orderId
        )
        if (firstUpdate) {
            const prepMs = new Date(firstUpdate.timestamp) - new Date(created.timestamp)
            prepTimes.push(prepMs)
        }
    })

    const avgPrepTimeMs = prepTimes.length > 0
        ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length
        : 0
    const avgPrepTimeMin = Math.round(avgPrepTimeMs / 60000)

    // Delivery vs Pickup split
    const deliveryCount = createdEvents.filter(e => e.payload?.deliveryMode).length
    const pickupCount = createdEvents.filter(e => !e.payload?.deliveryMode).length

    return {
        ordersToday,
        completedOrders,
        totalRevenue,
        avgOrderValue,
        avgPrepTimeMin,
        deliveryCount,
        pickupCount
    }
}

/**
 * ActivityTab - Demo-only activity dashboard
 * Read-only metrics derived from demo events
 */
function ActivityTab({ cardStyle, labelStyle, orders }) {
    const events = getDemoEvents()
    const metrics = computeActivityMetrics(events, orders)

    // Metric Card Component
    const MetricCard = ({ icon, label, value, subtext, color = '#22C55E' }) => (
        <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{label}</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color, margin: 0 }}>
                {value}
            </p>
            {subtext && (
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
                    {subtext}
                </p>
            )}
        </div>
    )

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={labelStyle}>📊 ACTIVITY DASHBOARD</h3>
                <span style={{
                    padding: '4px 8px',
                    background: '#FEF3C7',
                    color: '#92400E',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600
                }}>
                    DEMO DATA
                </span>
            </div>

            <div style={{ ...cardStyle, marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                    Today's activity summary — derived from demo events
                </p>
            </div>

            {/* Orders Section */}
            <h4 style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 10, letterSpacing: 0.5 }}>
                ORDERS
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <MetricCard
                    icon="📋"
                    label="Orders Today"
                    value={metrics.ordersToday}
                    color="#3B82F6"
                />
                <MetricCard
                    icon="✅"
                    label="Completed"
                    value={metrics.completedOrders}
                    color="#22C55E"
                />
            </div>

            {/* Revenue Section */}
            <h4 style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 10, letterSpacing: 0.5 }}>
                REVENUE (DEMO)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <MetricCard
                    icon="💰"
                    label="Total Revenue"
                    value={`$${metrics.totalRevenue.toLocaleString()}`}
                    color="#22C55E"
                />
                <MetricCard
                    icon="📊"
                    label="Avg Order"
                    value={`$${metrics.avgOrderValue.toLocaleString()}`}
                    color="#8B5CF6"
                />
            </div>

            {/* Operations Section */}
            <h4 style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 10, letterSpacing: 0.5 }}>
                OPERATIONS
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <MetricCard
                    icon="⏱️"
                    label="Avg Prep Time"
                    value={metrics.avgPrepTimeMin > 0 ? `${metrics.avgPrepTimeMin} min` : '—'}
                    subtext="Order placed → first update"
                    color="#F59E0B"
                />
                <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>🚗</span>
                        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Order Type</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div>
                            <p style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6', margin: 0 }}>
                                {metrics.deliveryCount}
                            </p>
                            <p style={{ fontSize: 10, color: '#9CA3AF', margin: '2px 0 0' }}>Delivery</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 20, fontWeight: 700, color: '#6B7280', margin: 0 }}>
                                {metrics.pickupCount}
                            </p>
                            <p style={{ fontSize: 10, color: '#9CA3AF', margin: '2px 0 0' }}>Pickup</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Note */}
            <div style={{
                background: '#F3F4F6',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center'
            }}>
                <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>
                    💡 Metrics update automatically as you demo the app
                </p>
            </div>
        </>
    )
}

// ============================================
// LAUNCH READINESS PANEL (Demo-only, Read-only)
// ============================================

/**
 * LaunchTab - Demo-only launch readiness panel
 * Static UI explaining post-demo next steps
 * No storage writes, no backend calls
 */
function LaunchTab({ cardStyle, labelStyle }) {
    const [showLaunchModal, setShowLaunchModal] = useState(false)

    // Static checklist items
    const readyItems = [
        { icon: '✅', label: 'Menu configured', done: true },
        { icon: '✅', label: 'Branding applied', done: true },
        { icon: '✅', label: 'Orders tested', done: true },
        { icon: '✅', label: 'Staff workflow validated', done: true }
    ]

    const nextItems = [
        { icon: '⏳', label: 'Payments setup' },
        { icon: '⏳', label: 'Notifications' },
        { icon: '⏳', label: 'Delivery integrations' }
    ]

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={labelStyle}>🚀 LAUNCH READINESS</h3>
                <span style={{
                    padding: '4px 8px',
                    background: '#D1FAE5',
                    color: '#065F46',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600
                }}>
                    READY
                </span>
            </div>

            {/* Readiness Checklist */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginBottom: 12 }}>
                    ✅ Demo Complete
                </h4>
                {readyItems.map((item, idx) => (
                    <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 0',
                        borderBottom: idx < readyItems.length - 1 ? '1px solid #F3F4F6' : 'none'
                    }}>
                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                        <span style={{ fontSize: 13, color: '#374151' }}>{item.label}</span>
                    </div>
                ))}
            </div>

            {/* Next Steps */}
            <div style={{ ...cardStyle, marginBottom: 16, background: '#FFFBEB', border: '1px solid #FCD34D' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 12 }}>
                    ⏳ After Launch
                </h4>
                {nextItems.map((item, idx) => (
                    <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 0',
                        borderBottom: idx < nextItems.length - 1 ? '1px solid #FDE68A' : 'none'
                    }}>
                        <span style={{ fontSize: 14 }}>{item.icon}</span>
                        <span style={{ fontSize: 12, color: '#78350F' }}>{item.label}</span>
                    </div>
                ))}
            </div>

            {/* Time to Launch Card */}
            <div style={{
                ...cardStyle,
                background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
                color: 'white',
                marginBottom: 16,
                textAlign: 'center'
            }}>
                <span style={{ fontSize: 32, marginBottom: 8, display: 'block' }}>🚀</span>
                <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>
                    Launch-Ready Setup
                </h4>
                <p style={{ fontSize: 12, color: '#D1D5DB', margin: 0, lineHeight: 1.5 }}>
                    This demo represents a complete, launch-ready configuration.
                    Typical onboarding takes 1–3 days.
                </p>
            </div>

            {/* Continue to Launch Button */}
            <button
                onClick={() => setShowLaunchModal(true)}
                style={{
                    width: '100%',
                    padding: 16,
                    background: '#22C55E',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                }}
            >
                🚀 Continue to Launch
            </button>

            {/* Launch Modal */}
            {showLaunchModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 16
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 360,
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 20px 16px',
                            textAlign: 'center',
                            borderBottom: '1px solid #E5E7EB'
                        }}>
                            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🎉</span>
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', margin: 0 }}>
                                Ready to Launch?
                            </h3>
                        </div>

                        {/* Modal Content */}
                        <div style={{ padding: 20 }}>
                            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, margin: '0 0 16px' }}>
                                When you're ready to go live, here's what happens next:
                            </p>

                            <div style={{ marginBottom: 16 }}>
                                {[
                                    { num: '1', text: 'We schedule a quick setup call' },
                                    { num: '2', text: 'Your menu and branding are migrated' },
                                    { num: '3', text: 'Staff training (15 min)' },
                                    { num: '4', text: "You're live!" }
                                ].map((step, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        marginBottom: 12
                                    }}>
                                        <span style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            background: '#22C55E',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            flexShrink: 0
                                        }}>
                                            {step.num}
                                        </span>
                                        <span style={{ fontSize: 13, color: '#374151' }}>{step.text}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                background: '#F3F4F6',
                                borderRadius: 8,
                                padding: 12,
                                textAlign: 'center',
                                marginBottom: 16
                            }}>
                                <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>
                                    ℹ️ This is a demo — no action will be taken.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => setShowLaunchModal(false)}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    background: '#F3F4F6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    alert('📧 In production, this would capture your contact info. Demo mode — no action taken.')
                                    setShowLaunchModal(false)
                                }}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    background: '#22C55E',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function DemoBackend() {
    const navigate = useNavigate()

    // ============================================
    // ALL HOOKS MUST BE DECLARED BEFORE ANY EARLY RETURN
    // (React Error #310 - hooks order must be consistent)
    // ============================================
    const [isModulesLoaded, setIsModulesLoaded] = useState(false)
    const [demoSession, setDemoSession] = useState(null)
    const [activeTab, setActiveTab] = useState('summary')
    const [demoOrders, setDemoOrders] = useState(MOCK_ORDERS)
    const orders = demoOrders // Alias for compatibility
    const [deliveryConfirmCode, setDeliveryConfirmCode] = useState({})
    const [paymentMethodSelect, setPaymentMethodSelect] = useState({})
    const [role, setRole] = useState('owner')
    const [demoConfig, setDemoConfig] = useState({})
    const [demoMenu, setDemoMenu] = useState({ categories: [] })
    const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false)
    const [applyFeedback, setApplyFeedback] = useState('')
    const [coverEditorOpen, setCoverEditorOpen] = useState(false)
    const [showEmailPopup, setShowEmailPopup] = useState(false)
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategoryIcon, setNewCategoryIcon] = useState('📦')
    const [playbackOrder, setPlaybackOrder] = useState(null)
    const [playbackOpen, setPlaybackOpen] = useState(false)

    // Derived editing state (add more editors here if needed)
    const isEditing = coverEditorOpen

    // ============================================
    // SAFARI CRASH FIX: Load modules then initialize state
    // ============================================
    useEffect(() => {
        loadDemoModules().then(() => {
            setIsModulesLoaded(true)
            // Initialize state from loaded modules
            setDemoSession(getDemoSession())
            setRole(getDemoRole())
            setDemoConfig(getDemoConfig())
            setDemoMenu(getDemoMenu() || getMenu())
        })
    }, [])

    // Show loading until modules are ready
    if (!isModulesLoaded) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f4f6f8',
                fontFamily: 'system-ui'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
                    <p style={{ color: '#666' }}>Loading Demo Backend...</p>
                </div>
            </div>
        )
    }

    // Redirect if no valid demo session
    useEffect(() => {
        if (!demoSession) {
            navigate('/')
        }
    }, [demoSession, navigate])

    // Check session expiry periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const session = getDemoSession()
            if (!session) {
                navigate('/')
            }
        }, 5000)
        return () => clearInterval(interval)
    }, [navigate])

    // Start demo timer on mount
    useEffect(() => {
        startDemoTimer()
    }, [])

    // Pause/resume timer when editing state changes
    useEffect(() => {
        if (isEditing) {
            pauseDemoTimer()
        } else {
            resumeDemoTimer()
        }
    }, [isEditing])

    // Poll for popup eligibility
    useEffect(() => {
        const checkPopup = setInterval(() => {
            if (!isEditing && shouldShowPopup()) {
                setShowEmailPopup(true)
                markPopupShown()
            }
        }, 1000)
        return () => clearInterval(checkPopup)
    }, [isEditing])

    const handleExitDemo = () => {
        clearDemoSession()
        navigate('/', { replace: true })
    }

    const handleResetDemo = () => {
        if (confirm('Reset all demo customizations? This cannot be undone.')) {
            clearAllDemoData()
            alert('✅ Demo data reset!')
            window.location.href = '/'
        }
    }

    const handleApplyToFrontend = () => {
        applyDemoToFrontend()
        setHasUnappliedChanges(false)
        setApplyFeedback('✅ Applied!')
        setTimeout(() => setApplyFeedback(''), 2000)
    }

    // Config update helpers
    const handleConfigChange = (updates) => {
        const newConfig = updateDemoConfig(updates)
        setDemoConfig(newConfig)
        setHasUnappliedChanges(true)
    }

    // Menu edit helpers
    const handleMenuItemEdit = (categoryId, itemId, updates) => {
        const newMenu = updateDemoMenuItem(demoMenu, categoryId, itemId, updates)
        setDemoMenu(newMenu)
        setHasUnappliedChanges(true)
    }

    if (!demoSession) {
        return null // Will redirect
    }

    // Tabs based on role - NEW STRUCTURE
    const ownerTabs = [
        { id: 'summary', label: 'Summary' },
        { id: 'menu', label: 'Menu' },
        { id: 'branding', label: 'Branding' },
        { id: 'orders', label: 'Orders' },
        { id: 'analytics', label: 'Analytics' }
    ]

    const staffTabs = [
        { id: 'orders', label: 'Orders' },
        { id: 'delivery', label: 'Delivery' },
        { id: 'history', label: 'History' }
    ]

    const tabs = role === 'owner' ? ownerTabs : staffTabs

    // Badge counts for nav
    const pendingDeliveries = orders.filter(o => o.orderType === 'delivery' && o.status !== 'entregado' && o.status !== 'cancelado')
    const navBadges = {
        orders: activeOrders.length,
        delivery: pendingDeliveries.length
    }

    // Ensure active tab is valid for current role
    useEffect(() => {
        if (!tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id)
        }
    }, [role, tabs, activeTab])

    // Styles (matching Super Admin baseline)
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
    const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }

    const activeOrders = orders.filter(o => o.status !== 'entregado')
    const todayOrders = orders

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F5F2EE', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 80 }}>
            <BackendHeader
                title={demoConfig.businessName || 'FoodSpot'}
                onLogout={handleExitDemo}
                showDateSelector={false}
                extraActions={
                    <>
                        {/* Demo Badge */}
                        <span style={{
                            padding: '4px 10px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600
                        }}>
                            DEMO
                        </span>
                        {/* Role Toggle */}
                        <select
                            value={role}
                            onChange={(e) => {
                                const newRole = e.target.value
                                toggleDemoRole()
                                setRole(newRole)
                            }}
                            style={{
                                padding: '6px 24px 6px 10px',
                                fontSize: 11,
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: 5,
                                cursor: 'pointer',
                                background: role === 'owner' ? '#22C55E' : '#6366F1',
                                color: 'white',
                                minWidth: 80
                            }}
                        >
                            <option value="owner">👔 Owner</option>
                            <option value="staff">👷 Staff</option>
                        </select>
                    </>
                }
            />
            {/* Apply to Frontend Button - REQUIRED */}
            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleApplyToFrontend}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: hasUnappliedChanges ? '#22C55E' : '#3B82F6',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                        }}
                    >
                        {applyFeedback || (hasUnappliedChanges ? '⚡ Apply to Frontend' : '✅ Apply to Frontend')}
                    </button>
                    <button
                        onClick={handleResetDemo}
                        style={{
                            padding: '10px 16px',
                            fontSize: 13,
                            fontWeight: 500,
                            border: '1px solid #E5E7EB',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: 'white',
                            color: '#6B7280'
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Horizontal tabs removed - using bottom navigation */}

            {/* Content - with bottom padding for BackendNav */}
            <div style={{ padding: 16, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>

                {/* SUMMARY TAB (Owner only) */}
                {activeTab === 'summary' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>💳 TODAY'S PAYMENTS</h3>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E0F2F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
                                    <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Mercado Pago</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>5 orders</p></div>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>$18,500</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💵</div>
                                    <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Cash</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>7 orders</p></div>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>$10,000</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                                <div><p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>Today's Total</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>12 orders</p></div>
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>$28,500</span>
                            </div>
                        </div>

                        <h3 style={labelStyle}>📊 SESSIONS</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{MOCK_ANALYTICS.week.orders}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>This week</p></div>
                            <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{MOCK_ANALYTICS.month.orders}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>This month</p></div>
                        </div>
                    </>
                )}

                {/* BRANDING TAB (Owner only) - REUSES EXISTING COMPONENTS */}
                {activeTab === 'branding' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>🎨 BRANDING</h3>

                        {/* Business Name */}
                        <div style={cardStyle}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Business Name</label>
                            <input
                                type="text"
                                value={demoConfig.businessName || ''}
                                onChange={(e) => handleConfigChange({ businessName: e.target.value })}
                                placeholder="Your business name"
                                style={inputStyle}
                            />
                        </div>

                        {/* Hero Cover Image - FULL EDITOR (same as Owner/SuperAdmin) */}
                        <div style={cardStyle}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>Hero Cover Image</label>
                            {demoConfig.coverImage ? (
                                <div style={{ marginBottom: 12 }}>
                                    <img src={demoConfig.coverImage} alt="Cover" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                        <button
                                            onClick={() => setCoverEditorOpen(true)}
                                            style={{ flex: 1, padding: '8px 12px', fontSize: 12, background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                        >
                                            ✏️ Edit Position
                                        </button>
                                        <button
                                            onClick={() => handleConfigChange({ coverImage: null })}
                                            style={{ padding: '8px 12px', fontSize: 12, background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setCoverEditorOpen(true)}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: '#F3F4F6',
                                        border: '2px dashed #D1D5DB',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        color: '#6B7280'
                                    }}
                                >
                                    📷 Add Cover Image (with guide points)
                                </button>
                            )}
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Same editor as Owner/SuperAdmin — drag to position, pinch to zoom</p>
                        </div>

                        {/* CoverImageEditor Modal - SAME AS PRODUCTION */}
                        <CoverImageEditor
                            isOpen={coverEditorOpen}
                            onClose={() => setCoverEditorOpen(false)}
                            onSave={(data) => {
                                handleConfigChange({ coverImage: data.image })
                                setCoverEditorOpen(false)
                            }}
                            initialData={{ image: demoConfig.coverImage }}
                            demoMode={true}
                            config={getConfig()}
                        />

                        {/* Color Picker - REUSE EXISTING */}
                        <BrandingColorPicker
                            primaryColor={demoConfig.primaryColor || '#8B7355'}
                            iconColorMode={demoConfig.iconColorMode || 'white'}
                            iconColorLabel="Navbar Icon Color"
                            onColorChange={(color) => handleConfigChange({ primaryColor: color })}
                            onIconModeChange={(mode) => handleConfigChange({ iconColorMode: mode })}
                        />

                        {/* Hero Icons - REUSE EXISTING */}
                        <h3 style={labelStyle}>🎯 HERO ICONS</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Customize the color and icon style for home tiles</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {['menu', 'delivery', 'rewards', 'game'].map(iconId => {
                                    const iconConfig = demoConfig.heroIcons?.[iconId] || HERO_DEFAULT
                                    const labels = { menu: 'Menu', delivery: 'Delivery', rewards: 'Rewards', game: 'Game' }
                                    return (
                                        <HeroIconPicker
                                            key={iconId}
                                            label={labels[iconId]}
                                            iconId={iconId}
                                            color={iconConfig.color}
                                            iconColorMode={iconConfig.iconColorMode}
                                            onColorChange={(newColor) => {
                                                handleConfigChange({
                                                    heroIcons: {
                                                        ...demoConfig.heroIcons,
                                                        [iconId]: { ...iconConfig, color: newColor }
                                                    }
                                                })
                                            }}
                                            onIconModeChange={(mode) => {
                                                handleConfigChange({
                                                    heroIcons: {
                                                        ...demoConfig.heroIcons,
                                                        [iconId]: { ...iconConfig, iconColorMode: mode }
                                                    }
                                                })
                                            }}
                                        />
                                    )
                                })}
                            </div>
                        </div>

                        {/* Powered By Color - REUSE EXISTING PATTERN */}
                        <h3 style={labelStyle}>✨ POWERED BY BUTTON</h3>
                        <div style={cardStyle}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>"Powered by FoodSpot" Button Color</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                    type="color"
                                    value={demoConfig.poweredByColor || '#C4856A'}
                                    onChange={(e) => handleConfigChange({ poweredByColor: e.target.value })}
                                    style={{ width: 60, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                />
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 500, color: demoConfig.poweredByColor || '#C4856A', margin: 0 }}>@foodspotapp</p>
                                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{demoConfig.poweredByColor?.toUpperCase() || '#C4856A'}</p>
                                </div>
                            </div>
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Color only — text and position cannot be changed</p>
                        </div>

                        {/* INFO PILL COLORS — Demo sandbox for pill customization */}
                        <h3 style={labelStyle}>🔘 INFO PILL COLORS</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Customize button colors on the Info page. Tap a pill to edit.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[
                                    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                                    { id: 'mercadoPago', label: 'Mercado Pago', icon: '💳' },
                                    { id: 'rappi', label: 'Rappi', icon: '🛵' },
                                    { id: 'pedidosYa', label: 'PedidosYa', icon: '🍕' },
                                    { id: 'demo', label: 'Demo', icon: '🎮' },
                                    { id: 'adminAccess', label: 'Admin', icon: '🔒' },
                                ].map(pill => {
                                    const pillConfig = demoConfig.infoPills?.[pill.id] || {}
                                    const bgColor = pillConfig.bgColor || (pill.id === 'whatsapp' ? '#C4856A' : pill.id === 'mercadoPago' ? '#FFE600' : pill.id === 'rappi' ? '#FF5A00' : pill.id === 'pedidosYa' ? '#E31837' : pill.id === 'demo' ? '#84CC16' : '#FFFFFF')
                                    const textColor = pillConfig.textColor || (pill.id === 'mercadoPago' ? '#009EE3' : pill.id === 'adminAccess' ? '#9CA3AF' : '#FFFFFF')
                                    return (
                                        <label
                                            key={pill.id}
                                            htmlFor={`pill-color-${pill.id}`}
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
                                            {/* Color input - use visibility hidden to maintain layout but still be clickable via label */}
                                            <input
                                                id={`pill-color-${pill.id}`}
                                                type="color"
                                                value={bgColor}
                                                onChange={(e) => handleConfigChange({
                                                    infoPills: {
                                                        ...demoConfig.infoPills,
                                                        [pill.id]: { ...pillConfig, bgColor: e.target.value }
                                                    }
                                                })}
                                                style={{
                                                    position: 'absolute',
                                                    width: 1,
                                                    height: 1,
                                                    padding: 0,
                                                    margin: -1,
                                                    overflow: 'hidden',
                                                    clip: 'rect(0,0,0,0)',
                                                    border: 0
                                                }}
                                            />
                                        </label>
                                    )
                                })}
                            </div>
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Tap any pill to change its background color</p>
                        </div>

                        {/* CAMERA BRANDING — Icon and color customization */}
                        <h3 style={labelStyle}>📷 CAMERA BUTTON</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Customize the center camera button in the navigation bar</p>

                            {/* Enable toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Custom camera styling</label>
                                <button
                                    onClick={() => handleConfigChange({
                                        camera: { ...demoConfig.camera, enabled: !demoConfig.camera?.enabled }
                                    })}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 16,
                                        border: 'none',
                                        backgroundColor: demoConfig.camera?.enabled ? '#22C55E' : '#E5E7EB',
                                        color: demoConfig.camera?.enabled ? 'white' : '#6B7280',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {demoConfig.camera?.enabled ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            {/* Icon selector (only when enabled) */}
                            {demoConfig.camera?.enabled && (
                                <>
                                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>Camera Icon</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                                        {[
                                            { id: 'default', label: 'Default' },
                                            { id: 'camera', label: 'Camera' },
                                            { id: 'aperture', label: 'Aperture' },
                                            { id: 'webcam', label: 'Webcam' }
                                        ].map(icon => {
                                            const isSelected = (demoConfig.camera?.icon || 'default') === icon.id
                                            return (
                                                <button
                                                    key={icon.id}
                                                    onClick={() => handleConfigChange({
                                                        camera: { ...demoConfig.camera, icon: icon.id }
                                                    })}
                                                    style={{
                                                        padding: '12px 8px',
                                                        borderRadius: 12,
                                                        border: isSelected ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                                        backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    <CameraIcon type={icon.id} size={20} color="#6B7280" />
                                                    <span style={{ fontSize: 10, color: '#6B7280' }}>{icon.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Color picker */}
                                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>Camera Button Color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <input
                                            type="color"
                                            value={demoConfig.camera?.color || '#8B7355'}
                                            onChange={(e) => handleConfigChange({
                                                camera: { ...demoConfig.camera, color: e.target.value }
                                            })}
                                            style={{ width: 48, height: 48, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                        />
                                        <div style={{
                                            width: 48, height: 48, borderRadius: '50%',
                                            backgroundColor: demoConfig.camera?.color || '#8B7355',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                        }}>
                                            <CameraIcon
                                                type={demoConfig.camera?.icon || 'default'}
                                                size={22}
                                                color={demoConfig.camera?.textColor === 'black' ? '#1F2937' : demoConfig.camera?.textColor === 'white' ? '#FFFFFF' : '#FFFFFF'}
                                            />
                                        </div>
                                        <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                                            {(demoConfig.camera?.color || '#8B7355').toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Text color toggle */}
                                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>Icon Color</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['auto', 'white', 'black'].map(mode => {
                                            const isSelected = (demoConfig.camera?.textColor || 'auto') === mode
                                            return (
                                                <button
                                                    key={mode}
                                                    onClick={() => handleConfigChange({
                                                        camera: { ...demoConfig.camera, textColor: mode }
                                                    })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        borderRadius: 8,
                                                        border: isSelected ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                                        backgroundColor: mode === 'black' ? '#1F2937' : mode === 'white' ? '#FFFFFF' : '#F3F4F6',
                                                        color: mode === 'black' ? '#FFFFFF' : mode === 'white' ? '#1F2937' : '#6B7280',
                                                        fontSize: 12,
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        textTransform: 'capitalize'
                                                    }}
                                                >
                                                    {mode}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Featured Food Photos - 4 SLOTS */}
                        <h3 style={labelStyle}>📸 FEATURED PHOTOS (Home)</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>These 4 images appear on the Home screen below the hero tiles</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[0, 1, 2, 3].map(slotIndex => {
                                    const slot = demoConfig.featuredPhotos?.[slotIndex] || {}
                                    return (
                                        <div key={slotIndex} style={{ background: '#F9FAFB', borderRadius: 12, padding: 12 }}>
                                            {/* Image Preview */}
                                            <div style={{
                                                width: '100%',
                                                height: 80,
                                                borderRadius: 8,
                                                overflow: 'hidden',
                                                background: slot.image ? 'none' : '#E5E7EB',
                                                marginBottom: 8,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {slot.image ? (
                                                    <img src={slot.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: 24, color: '#9CA3AF' }}>📷</span>
                                                )}
                                            </div>
                                            {/* Name Input */}
                                            <input
                                                type="text"
                                                value={slot.name || ''}
                                                onChange={(e) => {
                                                    const newPhotos = [...(demoConfig.featuredPhotos || [{}, {}, {}, {}])]
                                                    newPhotos[slotIndex] = { ...newPhotos[slotIndex], name: e.target.value }
                                                    handleConfigChange({ featuredPhotos: newPhotos })
                                                }}
                                                placeholder="Item name"
                                                style={{ ...inputStyle, fontSize: 12, marginBottom: 6 }}
                                            />
                                            {/* Upload / Remove */}
                                            {slot.image ? (
                                                <button
                                                    onClick={() => {
                                                        const newPhotos = [...(demoConfig.featuredPhotos || [{}, {}, {}, {}])]
                                                        newPhotos[slotIndex] = { ...newPhotos[slotIndex], image: null }
                                                        handleConfigChange({ featuredPhotos: newPhotos })
                                                    }}
                                                    style={{ padding: '4px 8px', fontSize: 11, background: '#EF4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', width: '100%' }}
                                                >
                                                    Remove
                                                </button>
                                            ) : (
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) {
                                                            const reader = new FileReader()
                                                            reader.onload = (event) => {
                                                                const newPhotos = [...(demoConfig.featuredPhotos || [{}, {}, {}, {}])]
                                                                newPhotos[slotIndex] = { ...newPhotos[slotIndex], image: event.target?.result }
                                                                handleConfigChange({ featuredPhotos: newPhotos })
                                                            }
                                                            reader.readAsDataURL(file)
                                                        }
                                                    }}
                                                    style={{ fontSize: 10, width: '100%' }}
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Modo Oscuro - Light/Dark Toggle */}
                        <h3 style={labelStyle}>🌙 MODO OSCURO</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Tema de la aplicación</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => handleConfigChange({ canvasMode: 'light' })}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: 10,
                                        border: (demoConfig.canvasMode === 'light' || !demoConfig.canvasMode) ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                        background: '#FFFFFF',
                                        color: '#1F2937',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ☀️ Claro
                                </button>
                                <button
                                    onClick={() => handleConfigChange({ canvasMode: 'dark' })}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: 10,
                                        border: demoConfig.canvasMode === 'dark' ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                        background: '#1F2937',
                                        color: '#FFFFFF',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    🌙 Oscuro
                                </button>
                            </div>
                        </div>

                        {/* Divider Preset (Menu/Orders header image) - REUSE EXISTING */}
                        <h3 style={labelStyle}>🖼️ HEADER IMAGE (Menu/Orders)</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Decorative image below business name on Menu and Orders pages</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {DIVIDER_PRESETS.slice(0, 9).map(preset => (
                                    <div
                                        key={preset.id}
                                        onClick={() => handleConfigChange({ dividerPresetId: preset.id })}
                                        style={{
                                            cursor: 'pointer',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            border: demoConfig.dividerPresetId === preset.id ? '3px solid #22C55E' : '2px solid #E5E7EB',
                                            opacity: demoConfig.dividerPresetId === preset.id ? 1 : 0.7
                                        }}
                                    >
                                        <img src={preset.url} alt={preset.name} style={{ width: '100%', height: 40, objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                                Selected: {DIVIDER_PRESETS.find(p => p.id === demoConfig.dividerPresetId)?.name || 'None'}
                            </p>
                            {/* Option to clear/remove */}
                            {demoConfig.dividerPresetId && (
                                <button
                                    onClick={() => handleConfigChange({ dividerPresetId: null })}
                                    style={{ marginTop: 8, padding: '6px 12px', fontSize: 11, background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                >
                                    Remove Header Image
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* MENU TAB (Owner only) - FUNCTIONAL EDITING */}
                {activeTab === 'menu' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>🍽️ MENU MANAGEMENT</h3>

                        {/* Add Category Button / Form */}
                        {!showAddCategory ? (
                            <button
                                onClick={() => setShowAddCategory(true)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    marginBottom: 16,
                                    background: '#F3F4F6',
                                    border: '2px dashed #D1D5DB',
                                    borderRadius: 10,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: '#6B7280',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                }}
                            >
                                ➕ Add Category
                            </button>
                        ) : (
                            <div style={{ ...cardStyle, marginBottom: 16, border: '2px solid #22C55E' }}>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                    <input
                                        type="text"
                                        placeholder="Category name"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        autoFocus
                                        style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="📦"
                                        value={newCategoryIcon}
                                        onChange={(e) => setNewCategoryIcon(e.target.value)}
                                        style={{ ...inputStyle, width: 60, marginBottom: 0, textAlign: 'center' }}
                                        maxLength={2}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button
                                        onClick={() => {
                                            if (newCategoryName.trim()) {
                                                const updated = addDemoCategory(newCategoryName.trim(), newCategoryIcon || '📦')
                                                setDemoMenu(updated)
                                                setHasUnappliedChanges(true)
                                                setNewCategoryName('')
                                                setNewCategoryIcon('📦')
                                                setShowAddCategory(false)
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '10px 16px',
                                            background: '#22C55E',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 8,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Create Category
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddCategory(false)
                                            setNewCategoryName('')
                                            setNewCategoryIcon('📦')
                                        }}
                                        style={{
                                            padding: '10px 16px',
                                            background: '#F3F4F6',
                                            color: '#6B7280',
                                            border: 'none',
                                            borderRadius: 8,
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {demoMenu?.categories?.map(category => (
                            <div key={category.id} style={{ marginBottom: 20 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>{category.icon} {category.name}</h4>
                                {category.items?.map(item => (
                                    <div key={item.id} style={{ ...cardStyle, marginBottom: 8 }}>
                                        <div style={{ marginBottom: 8 }}>
                                            <label style={{ fontSize: 11, color: '#9CA3AF' }}>Name</label>
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => handleMenuItemEdit(category.id, item.id, { name: e.target.value })}
                                                style={{ ...inputStyle, marginBottom: 4, fontWeight: 500 }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: 11, color: '#9CA3AF' }}>Price ($)</label>
                                                <input
                                                    type="number"
                                                    value={item.price || 0}
                                                    onChange={(e) => handleMenuItemEdit(category.id, item.id, { price: parseFloat(e.target.value) || 0 })}
                                                    style={{ ...inputStyle, marginBottom: 0 }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: 11, color: '#9CA3AF' }}>Status</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={item.outOfStock || false}
                                                        onChange={(e) => handleMenuItemEdit(category.id, item.id, { outOfStock: e.target.checked })}
                                                        style={{ accentColor: '#EF4444' }}
                                                    />
                                                    <span style={{ fontSize: 12, color: '#6B7280' }}>Out of stock</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Pill Image - Menu Item Image */}
                                        <div style={{ marginTop: 8 }}>
                                            <label style={{ fontSize: 11, color: '#9CA3AF' }}>Item Image (Pill)</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                {item.image ? (
                                                    <>
                                                        <img src={item.image} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                                                        <button
                                                            onClick={() => handleMenuItemEdit(category.id, item.id, { image: null })}
                                                            style={{ padding: '4px 8px', fontSize: 11, background: '#EF4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                ) : (
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (file) {
                                                                const reader = new FileReader()
                                                                reader.onload = (event) => {
                                                                    handleMenuItemEdit(category.id, item.id, { image: event.target?.result })
                                                                }
                                                                reader.readAsDataURL(file)
                                                            }
                                                        }}
                                                        style={{ fontSize: 11 }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 16 }}>
                            💡 Click "Apply to Frontend" to see changes in customer view
                        </p>
                    </>
                )}

                {/* INFO TAB (Owner only) - PRESENCE MODE */}
                {activeTab === 'info' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>📍 BUSINESS INFO</h3>
                        <div style={cardStyle}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Hours</label>
                            <input
                                type="text"
                                value={demoConfig.businessInfo?.hours || ''}
                                onChange={(e) => handleConfigChange({
                                    businessInfo: { ...demoConfig.businessInfo, hours: e.target.value }
                                })}
                                placeholder="Add your hours (e.g., Mon-Fri 9am-6pm)"
                                style={inputStyle}
                            />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Address</label>
                            <input
                                type="text"
                                value={demoConfig.businessInfo?.address || ''}
                                onChange={(e) => handleConfigChange({
                                    businessInfo: { ...demoConfig.businessInfo, address: e.target.value }
                                })}
                                placeholder="Add your address"
                                style={inputStyle}
                            />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Phone</label>
                            <input
                                type="text"
                                value={demoConfig.businessInfo?.phone || ''}
                                onChange={(e) => handleConfigChange({
                                    businessInfo: { ...demoConfig.businessInfo, phone: e.target.value }
                                })}
                                placeholder="Add your phone number"
                                style={inputStyle}
                            />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>WhatsApp</label>
                            <input
                                type="text"
                                value={demoConfig.businessInfo?.whatsapp || ''}
                                onChange={(e) => handleConfigChange({
                                    businessInfo: { ...demoConfig.businessInfo, whatsapp: e.target.value }
                                })}
                                placeholder="Add your WhatsApp number"
                                style={inputStyle}
                            />
                        </div>
                        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
                            These fields show presence in the Info screen
                        </p>
                    </>
                )}

                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                    <>
                        <h3 style={labelStyle}>📋 ACTIVE ORDERS</h3>
                        {activeOrders.length === 0 ? (
                            <div style={{ ...cardStyle, textAlign: 'center', padding: 32 }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                                <p style={{ color: '#6B7280' }}>No active orders</p>
                            </div>
                        ) : (
                            activeOrders.map(order => (
                                <div key={order.id} style={{ ...cardStyle, borderLeft: `4px solid ${order.status === 'listo' ? '#22C55E' : '#F59E0B'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 20, fontWeight: 700 }}>#{order.orderNumber}</span>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            fontWeight: 500,
                                            background: order.status === 'listo' ? '#D1FAE5' : '#FEF3C7',
                                            color: order.status === 'listo' ? '#065F46' : '#92400E'
                                        }}>
                                            {order.status === 'preparacion' ? 'Preparing' : order.status === 'listo' ? 'Ready' : order.status}
                                        </span>
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        {order.items.map((item, idx) => (
                                            <p key={idx} style={{ fontSize: 13, color: '#374151', margin: '2px 0' }}>{item.quantity}× {item.name}</p>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#22C55E' }}>${order.total.toLocaleString()}</span>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {/* Replay Order Button - only show if order has events */}
                                            {orderHasEvents(order.id) && (
                                                <button
                                                    onClick={() => {
                                                        setPlaybackOrder(order)
                                                        setPlaybackOpen(true)
                                                    }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: '#8B5CF6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    ▶ Replay
                                                </button>
                                            )}
                                            <button
                                                onClick={() => alert('ℹ️ Demo Mode — Order status changes are simulated')}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: '#3B82F6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {order.status === 'preparacion' ? 'Mark Ready' : 'Deliver'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        <div style={{ ...cardStyle, textAlign: 'center', marginTop: 8 }}>
                            <p style={{ color: '#6B7280', fontSize: 13 }}>Orders today</p>
                            <p style={{ fontSize: 28, fontWeight: 700, color: '#22C55E', margin: '4px 0' }}>{todayOrders.length}</p>
                        </div>
                    </>
                )}

                {/* ANALYTICS TAB (Owner only) */}
                {activeTab === 'analytics' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>📈 ANALYTICS</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={cardStyle}>
                                <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>This Week</p>
                                <p style={{ fontSize: 20, fontWeight: 700, color: '#22C55E', margin: '4px 0' }}>${MOCK_ANALYTICS.week.revenue.toLocaleString()}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{MOCK_ANALYTICS.week.orders} orders</p>
                            </div>
                            <div style={cardStyle}>
                                <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>This Month</p>
                                <p style={{ fontSize: 20, fontWeight: 700, color: '#22C55E', margin: '4px 0' }}>${MOCK_ANALYTICS.month.revenue.toLocaleString()}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{MOCK_ANALYTICS.month.orders} orders</p>
                            </div>
                        </div>

                        {/* Demo Chart Placeholder */}
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Revenue Trend (30 days)</p>
                            <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 4 }}>
                                {[45, 60, 35, 80, 55, 70, 90, 65, 75, 85, 50, 95, 70, 60, 80].map((h, i) => (
                                    <div key={i} style={{ flex: 1, height: `${h}%`, background: i % 2 === 0 ? '#B8A089' : '#C9B89A', borderRadius: '3px 3px 0 0', minHeight: 6 }} />
                                ))}
                            </div>
                            <p style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>⚠️ Demo data</p>
                        </div>
                    </>
                )}

                {/* DELIVERY TAB - Filtered view of delivery orders only */}
                {/* DELIVERY TAB - Interactive view matching Production Owner/Staff */}
                {activeTab === 'delivery' && (
                    <>
                        <h3 style={labelStyle}>🚚 DELIVERY ORDERS</h3>
                        {/* Business Disclaimers for Demo */}
                        <div style={{
                            background: '#FEF3C7',
                            border: '1px solid #F59E0B',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 16,
                            fontSize: 11
                        }}>
                            <p style={{ fontWeight: 600, color: '#92400E', marginBottom: 4 }}>⚠️ Delivery Reminders:</p>
                            <ul style={{ margin: 0, paddingLeft: 16, color: '#92400E' }}>
                                <li>FoodSpot is software, not a delivery company</li>
                                <li>The business is responsible for drivers and insurance</li>
                                <li>Cash payments must be confirmed BEFORE preparation</li>
                            </ul>
                        </div>

                        {(() => {
                            const deliveryOrders = demoOrders.filter(o => o.orderType === 'delivery' || o.id === 'demo-3')

                            if (deliveryOrders.length === 0) {
                                return (
                                    <div style={{ ...cardStyle, textAlign: 'center', padding: 32 }}>
                                        <div style={{ fontSize: 32, marginBottom: 8 }}>🚚</div>
                                        <p style={{ color: '#6B7280' }}>No delivery orders in demo</p>
                                    </div>
                                )
                            }

                            // Simulated Logic Handlers
                            const getDeliveryStatusInfo = (status) => {
                                const config = {
                                    pendiente: { label: 'Pending', next: 'confirmado', nextLabel: 'Confirm →', class: 'pending' },
                                    confirmado: { label: 'Confirmed', next: 'preparacion', nextLabel: 'Start Prep →', class: 'confirmed' },
                                    preparacion: { label: 'Preparing', next: 'listo', nextLabel: 'Ready →', class: 'preparing' },
                                    listo: { label: 'Ready', next: 'en_camino', nextLabel: 'Out for Delivery →', class: 'ready' },
                                    en_camino: { label: 'On the way', next: 'entregado', nextLabel: 'Mark Delivered', class: 'on-way' }
                                }
                                return config[status] || { label: status, next: null, nextLabel: null, class: '' }
                            }

                            const handleDemoStatusChange = (orderId, newStatus) => {
                                const order = demoOrders.find(o => o.id === orderId)
                                if (!order.paymentConfirmed && (newStatus === 'preparacion' || newStatus === 'en_camino')) {
                                    alert('❌ Payment must be confirmed before preparation or dispatch for delivery orders.')
                                    return
                                }
                                setDemoOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
                            }

                            const handleDemoPaymentConfirm = (orderId) => {
                                const method = paymentMethodSelect[orderId] || 'cash'
                                setDemoOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentConfirmed: true, paymentMethod: method } : o))
                            }

                            return deliveryOrders.map(order => {
                                const statusInfo = getDeliveryStatusInfo(order.status)
                                return (
                                    <div key={order.id} style={{ ...cardStyle, marginBottom: 10, borderLeft: '4px solid #F97316' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: 18, fontWeight: 700 }}>#{order.orderNumber} 🚚</span>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: 4,
                                                fontSize: 11,
                                                fontWeight: 500,
                                                background: order.status === 'en_camino' ? '#FFEDD5' : order.status === 'listo' ? '#DCFCE7' : '#E0E7FF',
                                                color: order.status === 'en_camino' ? '#9A3412' : order.status === 'listo' ? '#166534' : '#3730A3'
                                            }}>
                                                {statusInfo.label}
                                            </span>
                                        </div>

                                        {/* Customer Info */}
                                        {order.customerInfo && (
                                            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, background: '#F8FAFC', padding: 8, borderRadius: 6 }}>
                                                <p style={{ margin: 0, fontWeight: 600 }}>📍 {order.customerInfo.name}</p>
                                                <p style={{ margin: 0 }}>{order.customerInfo.address}</p>
                                                <p style={{ margin: 0 }}>📞 {order.customerInfo.phone}</p>
                                            </div>
                                        )}

                                        <div style={{ marginBottom: 8 }}>
                                            {order.items.map((item, idx) => (
                                                <p key={idx} style={{ fontSize: 13, color: '#374151', margin: '2px 0' }}>{item.quantity}× {item.name}</p>
                                            ))}
                                        </div>

                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#22C55E', marginBottom: 12 }}>
                                            ${order.total.toLocaleString()}
                                        </div>

                                        {/* Interactive Actions for Demo */}
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {/* Phone confirmation input for en_camino */}
                                            {order.status === 'en_camino' && order.customerInfo && (
                                                <div style={{ width: '100%', marginBottom: 8 }}>
                                                    <input
                                                        type="text"
                                                        maxLength={4}
                                                        placeholder="Code (last 4 digits)"
                                                        value={deliveryConfirmCode[order.id] || ''}
                                                        onChange={(e) => setDeliveryConfirmCode(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '') }))}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            border: '1px solid #E5E7EB',
                                                            borderRadius: 8,
                                                            fontSize: 14,
                                                            textAlign: 'center'
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Status advance button */}
                                            {statusInfo.next && (
                                                <button
                                                    onClick={() => {
                                                        if (statusInfo.next === 'entregado' && order.customerInfo) {
                                                            const code = deliveryConfirmCode[order.id] || ''
                                                            if (!verifyDeliveryCode(order.customerInfo.phone, code)) {
                                                                alert('❌ Incorrect code. Demo code is last 4 of phone.')
                                                                return
                                                            }
                                                        }
                                                        handleDemoStatusChange(order.id, statusInfo.next)
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        background: '#3B82F6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        fontWeight: 600,
                                                        fontSize: 12,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {statusInfo.nextLabel}
                                                </button>
                                            )}

                                            {/* Payment Actions */}
                                            {!order.paymentConfirmed && (
                                                <select
                                                    value={paymentMethodSelect[order.id] || 'cash'}
                                                    onChange={(e) => setPaymentMethodSelect(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                    style={{
                                                        padding: '8px',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: 8,
                                                        fontSize: 12
                                                    }}
                                                >
                                                    <option value="cash">💵 Cash</option>
                                                    <option value="mercado_pago">📱 MP</option>
                                                </select>
                                            )}

                                            <button
                                                onClick={() => handleDemoPaymentConfirm(order.id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: order.paymentConfirmed ? '#22C55E' : '#F59E0B',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    fontWeight: 600,
                                                    fontSize: 12,
                                                    cursor: 'pointer',
                                                    flex: 1
                                                }}
                                            >
                                                {order.paymentConfirmed ? '✅ Paid' : '💳 Confirm'}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        })()}
                    </>
                )}

                {/* STOCK TAB (Staff) */}
                {activeTab === 'stock' && role === 'staff' && (
                    <>
                        <h3 style={labelStyle}>🍽️ ITEM AVAILABILITY</h3>
                        {demoMenu?.categories?.slice(0, 2).map(category => (
                            <div key={category.id} style={{ marginBottom: 16 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{category.icon} {category.name}</h4>
                                <div style={cardStyle}>
                                    {category.items?.slice(0, 4).map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{item.name}</p>
                                                <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>${item.price?.toLocaleString()}</p>
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                                <input type="checkbox" defaultChecked style={{ accentColor: '#22C55E' }} onChange={() => alert('ℹ️ Demo Mode — Availability toggle simulated')} />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* REWARDS TAB (Staff) */}
                {activeTab === 'rewards' && role === 'staff' && (
                    <>
                        <h3 style={labelStyle}>⭐ STAMP VALIDATION</h3>
                        <div style={cardStyle}>
                            <h3 style={{ textAlign: 'center', marginBottom: 12 }}>Validate Stamp</h3>
                            <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                                Use this to add a stamp when a customer visits or shares on Instagram
                            </p>
                            <button
                                onClick={() => alert('ℹ️ Demo Mode — Stamp added (simulated)')}
                                style={{
                                    width: '100%',
                                    padding: 14,
                                    background: '#22C55E',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                ⭐ Add Stamp
                            </button>
                        </div>
                    </>
                )}

                {/* Deprecated tabs removed: activity, launch, events */}

            </div>

            {/* Bottom Navigation */}
            <BackendNav
                role={role === 'owner' ? 'owner' : 'staff'}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                badges={navBadges}
            />

            {/* Demo Footer - positioned above nav */}
            <div style={{
                position: 'fixed',
                bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
                left: 10,
                right: 10,
                padding: '8px 16px',
                background: '#FEF3C7',
                borderRadius: '8px 8px 0 0',
                textAlign: 'center',
                pointerEvents: 'none',
                zIndex: 999
            }}>
                <p style={{ fontSize: 11, color: '#92400E', margin: 0 }}>
                    🔒 Demo Mode — Demo data resets automatically
                </p>
            </div>

            {/* Email Popup (shows after 5 minutes) */}
            <DemoEmailPopup
                isOpen={showEmailPopup}
                onClose={() => setShowEmailPopup(false)}
            />

            {/* Order Lifecycle Playback Modal (demo-only) */}
            <OrderPlaybackModal
                order={playbackOrder}
                isOpen={playbackOpen}
                onClose={() => {
                    setPlaybackOpen(false)
                    setPlaybackOrder(null)
                }}
            />
        </div>
    )
}

export default DemoBackend
