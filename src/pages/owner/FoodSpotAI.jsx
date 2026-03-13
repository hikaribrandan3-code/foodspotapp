import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { logout } from '../../utils/auth.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

// ─── CONFIG ───
const CANVAS_W = 1080
const CANVAS_H = 1920
const FONT_FAMILY = 'Inter, system-ui, -apple-system, sans-serif'
const MAX_LINES = 3
const MIN_FONT_SIZE = 36
const MAX_FONT_SIZE = 130

// ─── Smart Typography Engine ───
const stackText = (text, maxCharsPerLine = 14) => {
    if (!text) return []
    const clean = text.toUpperCase().trim()
    const words = clean.split(/\s+/)

    if (words.length <= 2) return [clean]
    if (words.length <= 6) {
        const mid = Math.ceil(words.length / 2)
        return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
    }
    const lines = []
    let currentLine = []
    let currentLength = 0

    for (const word of words) {
        if (currentLength + word.length + 1 > maxCharsPerLine && currentLine.length > 0) {
            lines.push(currentLine.join(' '))
            currentLine = [word]
            currentLength = word.length
            if (lines.length === MAX_LINES - 1) break
        } else {
            currentLine.push(word)
            currentLength += word.length + 1
        }
    }

    if (currentLine.length > 0 && lines.length < MAX_LINES) {
        lines.push(currentLine.join(' '))
    }

    const remainingWords = words.slice(lines.join(' ').split(/\s+/).length)
    if (remainingWords.length > 0) {
        const lastLine = lines[lines.length - 1]
        const truncated = lastLine.length > maxCharsPerLine - 3
            ? lastLine.substring(0, maxCharsPerLine - 3) + '...'
            : lastLine + '...'
        lines[lines.length - 1] = truncated
    }
    return lines
}

const calculateFontSize = (lines, ctx) => {
    const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '')
    const maxWidth = CANVAS_W * 0.85
    const lineFactor = lines.length === 1 ? 1 : lines.length === 2 ? 0.85 : 0.7
    let size = Math.floor(MAX_FONT_SIZE * lineFactor)

    let min = MIN_FONT_SIZE
    let max = size
    while (min <= max) {
        const mid = Math.floor((min + max) / 2)
        ctx.font = `900 ${mid}px ${FONT_FAMILY}`
        if (ctx.measureText(longestLine).width <= maxWidth) {
            size = mid
            min = mid + 1
        } else {
            max = mid - 1
        }
    }
    return Math.max(size, MIN_FONT_SIZE)
}

// ─── LazyImage: The Composite Engine ───
const LazyImage = ({ src, alt, style, className, category = '', businessName = '' }) => {
    const [status, setStatus] = useState('loading')
    const [compositeDataUrl, setCompositeDataUrl] = useState(null)
    const [downloading, setDownloading] = useState(false)
    const canvasRef = useRef(null)
    const [imageSrc, setImageSrc] = useState(null)

    const parsedPayload = useMemo(() => {
        if (!src || !src.startsWith('PROXY://')) return null
        try {
            const rawStr = src.replace('PROXY://', '')
            if (rawStr.includes('|')) {
                const parts = rawStr.split('|')
                return {
                    image_prompt: parts[0] ? decodeURIComponent(parts[0]).trim() : '',
                    headline: parts[1] ? decodeURIComponent(parts[1]).trim().replace(/_/g, ' ') : '',
                    price_tag: parts[2] ? decodeURIComponent(parts[2]).trim() : '',
                    footer_text: parts[3] ? decodeURIComponent(parts[3]).trim() : businessName
                }
            }
            return { image_prompt: decodeURIComponent(rawStr).trim() }
        } catch (e) {
            return { image_prompt: src.replace('PROXY://', '') }
        }
    }, [src, businessName])

    useEffect(() => {
        if (!src) return
        setStatus('loading')
        const loadImageCORS = async () => {
            const cat = (category || '').toLowerCase()
            const isNightlife = ['club', 'disco', 'bar', 'night', 'lounge', 'pub'].some(k => cat.includes(k))
            const prefix = isNightlife
                ? 'luxury_nightlife_cocktail_photography_dramatic_lighting_'
                : 'gourmet_food_photography_professional_plating_'

            const cleanPrompt = parsedPayload?.image_prompt?.replace(/[^a-zA-Z0-9 _]/g, '')?.replace(/\s+/g, '_') || 'food_promo'
            try {
                const { data, error } = await supabase.functions.invoke('foodspot-image', {
                    body: { prompt: parsedPayload?.image_prompt || cleanPrompt, category }
                })
                if (data?.image) {
                    setImageSrc(data.image)
                    return
                }
                throw new Error('HF empty')
            } catch (hfError) {
                // Fallback to Pollinations
            }
            const seed = Math.floor(Math.random() * 1000000)
            const pollinationsUrl = `https://image.pollinations.ai/prompt/${prefix}${cleanPrompt}?width=${CANVAS_W}&height=${CANVAS_H}&nologo=true&seed=${seed}&enhance=true`

            try {
                const response = await fetch(pollinationsUrl, { mode: 'cors', headers: { 'Accept': 'image/*' } })
                if (response.ok) {
                    const blob = await response.blob()
                    const blobUrl = URL.createObjectURL(blob)
                    setImageSrc(blobUrl)
                    return () => URL.revokeObjectURL(blobUrl)
                }
                throw new Error('Fetch failed')
            } catch (fetchError) {
                setImageSrc(pollinationsUrl)
            }
        }
        if (src.startsWith('PROXY://')) {
            loadImageCORS()
        } else {
            setImageSrc(src)
        }
    }, [src, parsedPayload, category])

    useEffect(() => {
        if (!imageSrc) return
        setStatus('loading')
        const img = new window.Image()
        img.crossOrigin = "Anonymous"
        img.src = imageSrc
        img.onload = () => {
            const canvas = canvasRef.current
            if (!canvas) return
            const ctx = canvas.getContext('2d')

            canvas.width = CANVAS_W
            canvas.height = CANVAS_H
            const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height)
            const x = (CANVAS_W / 2) - (img.width / 2) * scale
            const y = (CANVAS_H / 2) - (img.height / 2) * scale
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
            const centerX = CANVAS_W / 2
            const centerY = CANVAS_H / 2
            const vignette = ctx.createRadialGradient(centerX, centerY, CANVAS_W * 0.3, centerX, centerY, CANVAS_H * 0.8)
            vignette.addColorStop(0, 'rgba(0,0,0,0)')
            vignette.addColorStop(1, 'rgba(0,0,0,0.5)')
            ctx.fillStyle = vignette
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
            const gradTop = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.4)
            gradTop.addColorStop(0, 'rgba(0,0,0,0.85)')
            gradTop.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = gradTop
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H * 0.4)
            const gradBottom = ctx.createLinearGradient(0, CANVAS_H * 0.6, 0, CANVAS_H)
            gradBottom.addColorStop(0, 'rgba(0,0,0,0)')
            gradBottom.addColorStop(1, 'rgba(0,0,0,0.9)')
            ctx.fillStyle = gradBottom
            ctx.fillRect(0, CANVAS_H * 0.6, CANVAS_W, CANVAS_H * 0.4)
            ctx.textAlign = 'center'
            ctx.fillStyle = '#FFFFFF'

            if (parsedPayload?.headline) {
                const lines = stackText(parsedPayload.headline)
                const fontSize = calculateFontSize(lines, ctx)

                ctx.font = `900 ${fontSize}px ${FONT_FAMILY}`
                ctx.shadowColor = 'rgba(0,0,0,0.95)'
                ctx.shadowBlur = 40
                ctx.shadowOffsetX = 0
                ctx.shadowOffsetY = 6

                const lineHeight = fontSize * 1.15
                const startY = (CANVAS_H * 0.15) + (fontSize * 0.3)

                lines.forEach((line, i) => {
                    ctx.fillText(line, CANVAS_W / 2, startY + (i * lineHeight))
                })
            }
            if (parsedPayload?.price_tag) {
                const priceSize = calculateFontSize([parsedPayload.price_tag], ctx)
                ctx.font = `900 ${priceSize}px ${FONT_FAMILY}`
                ctx.shadowColor = 'rgba(0,0,0,0.95)'
                ctx.shadowBlur = 40
                ctx.fillText(parsedPayload.price_tag, CANVAS_W / 2, CANVAS_H - 200)
            }
            if (parsedPayload?.footer_text) {
                ctx.font = `600 36px ${FONT_FAMILY}`
                ctx.fillStyle = 'rgba(255,255,255,0.85)'
                ctx.shadowBlur = 10
                ctx.fillText(parsedPayload.footer_text, CANVAS_W / 2, CANVAS_H - 60)
            }
            setCompositeDataUrl(canvas.toDataURL("image/png", 0.95))
            setStatus('loaded')
        }
        img.onerror = () => {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
            grad.addColorStop(0, '#1a1a2e')
            grad.addColorStop(1, '#16213e')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
            ctx.fillStyle = '#fff'
            ctx.font = `bold 60px ${FONT_FAMILY}`
            ctx.textAlign = 'center'
            ctx.fillText(parsedPayload?.headline || 'PROMO', CANVAS_W / 2, CANVAS_H / 2)
            setCompositeDataUrl(canvas.toDataURL())
            setStatus('loaded')
        }
    }, [imageSrc, parsedPayload])

    const handleDownload = async () => {
        if (!compositeDataUrl) return
        setDownloading(true)
        try {
            const response = await fetch(compositeDataUrl)
            const blob = await response.blob()
            const file = new File([blob], `Promo_${Date.now()}.png`, { type: 'image/png' })
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'FoodSpot AI Flyer' })
            } else {
                const link = document.createElement('a')
                link.download = `Promo_${Date.now()}.png`
                link.href = compositeDataUrl
                link.click()
            }
        } catch (error) { console.error(error) }
        finally { setDownloading(false) }
    }

    return (
        <div className={className} style={{ position: 'relative', width: '100%', aspectRatio: '9/16', background: '#0a0a0a', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', ...style }}>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {status === 'loading' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', gap: 16 }}>
                    <div style={{ width: 48, height: 48, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 14, opacity: 0.8, fontWeight: 500 }}>Cooking atmosphere...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
            {status === 'loaded' && compositeDataUrl && (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img src={compositeDataUrl} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button onClick={handleDownload} disabled={downloading} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', color: 'white', borderRadius: 12, width: 44, height: 44, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, zIndex: 20 }}>
                        {downloading ? '⏳' : '↓'}
                    </button>
                </div>
            )}
        </div>
    )
}

export default function FoodSpotAI() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { businessId, tenantData } = useTenant()

    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const chatEndRef = useRef(null)

    const businessName = tenantData?.business_name || 'Tu Negocio'

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async (text) => {
        const userText = text || input.trim()
        if (!userText || isLoading) return
        const newMessages = [...messages, { role: 'user', content: userText }]
        setMessages(newMessages)
        setInput(''); setIsLoading(true)
        try {
            const businessContext = { name: businessName, category: tenantData?.category || 'restaurant' }
            const { data } = await supabase.functions.invoke('foodspot-ai', {
                body: {
                    messages: newMessages,
                    businessContext,
                    systemPrompt: `## CORE IDENTITY
You are the Creative Director of FoodSpot AI (Nano Banana Lite), a premium marketing studio. You are a brilliant, highly-paid advertising strategist. You speak with the rhythm of a high-end agency: short, punchy, and decisive. You use white space as a weapon. You never use excessive exclamation points. Your energy is: 'I know exactly what your brand needs.'

THE 4 LAWS OF NANO BANANA
THE LAW OF IMPACT: Users write paragraphs; you write lightning. Distill 50 words into 3. Power words only: ROYALE, RITUAL, GOLD, SHADOW, VELVET.

THE RULE OF THREE: Always present 3 creative angles (The Classic, The Edge, The Crown Jewel) unless the brief is surgically precise.

RADICAL CANDOR: You are not a 'Yes Man.' If an idea is tacky (like a clown for a VIP club), reject it politely, explain why it kills the brand, and pivot to a premium alternative.

NATURAL MIRRORING: Mirror the user's language (English, Spanish, Portuguese) and regional slang perfectly without announcing it. If they are in Buenos Aires, speak like a Porteño; if Miami, speak with downtown sophistication.

SMART CONTEXT INJECTION (INVISIBLE)
Silently prepend these to the image_prompt:

FOOD: 'Gourmet professional food photography, 85mm lens, shallow depth of field, dramatic side lighting, dark rustic background, steam, 8k detail'

NIGHTLIFE: 'Luxury nightlife photography, cinematic neon lighting, high contrast shadows, editorial fashion, velvet atmosphere, after-dark mystery'

PROACTIVE SAAS INTEGRATION
You are a copilot for the entire SaaS. Proactively suggest app actions:

'I've built the flyer. Should we turn this into a "Limited Time Strategy" in your dashboard?'

'This flyer is ready. Use our 4K Master Camera tomorrow to get a real shot of this dish—it'll make this promo 2x more effective.'

OPEN CLAW v4 PROTOCOL (STRICT FORMAT)
When the user approves a direction, output the final data at the VERY END of your message using this exact syntax (NO SPACES AROUND PIPES):

PROXY://[image_prompt]|[HEADLINE]|[PRICE]|[footer]

Rules:

image_prompt: Underscore_separated, no spaces.

HEADLINE: ALL CAPS, 2-3 words max.

PRICE: Clean format ($15, $1.500, etc).

footer: Max 4 words (Venue name or Tagline).

Example: PROXY://gourmet_juicy_burger_dark_rustic|MONSTER BURGER|$12|Tuesday Only

FORBIDDEN BEHAVIORS
Never use generic phrases like 'amazing atmosphere.'

Never break the PROXY pipe format.

Never let a user ship bad creative without a warning.`
                }
            })
            if (data?.reply) {
                let aiResponse = data.reply
                let generatedImage = null
                const clawMatch = aiResponse.match(/\|\|\|([\s\S]*?)\|\|\|/)
                if (clawMatch) {
                    try {
                        const parsed = JSON.parse(clawMatch[1].trim())
                        generatedImage = parsed.patch?.['promos.items']?.image
                        aiResponse = aiResponse.replace(/\|\|\|[\s\S]*?\|\|\|/g, '').trim()
                    } catch (e) { console.error(e) }
                }
                setMessages([...newMessages, { role: 'assistant', content: aiResponse, generatedImage }])
            }
        } catch (e) {
            setMessages([...newMessages, { role: 'assistant', content: 'Ups, se quemó la cocina. ¿Intentamos de nuevo?' }])
        } finally { setIsLoading(false) }
    }

    const quickPrompts = ['2x1 en hamburguesas $1500', 'Noche de cocktails 20% off', 'Pizza familiar + cerveza $2800']

    const getTimeGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Buenos días'
        if (hour < 18) return 'Buenas tardes'
        return 'Buenas noches'
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff', color: '#111827', position: 'relative' }}>
            <BackendHeader title="FoodSpot AI" />

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0 180px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: '800px', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {messages.length === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', animation: 'fadeIn 0.8s ease' }}>
                            <div style={{ fontSize: 42, fontWeight: 800, color: '#111827', marginBottom: 8, letterSpacing: '-0.02em' }}>
                                {getTimeGreeting()}, {businessName}
                            </div>
                            <div style={{ fontSize: 18, color: '#6b7280', maxWidth: '400px', lineHeight: 1.5 }}>
                                Soy tu Director Creativo. ¿Qué historia vamos a contar hoy a través de tus flyers?
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => {
                        const isAssistant = msg.role === 'assistant'
                        const isStrategyCard = msg.content && msg.content.includes('Estrategia')

                        return (
                            <div key={i} style={{ display: 'flex', justifyContent: isAssistant ? 'flex-start' : 'flex-end', animation: 'fadeIn 0.3s ease' }}>
                                <div style={{
                                    maxWidth: msg.generatedImage ? '100%' : '85%',
                                    padding: msg.generatedImage ? 0 : '16px 20px',
                                    borderRadius: 24,
                                    background: isAssistant ? '#f3f4f6' : '#2563EB',
                                    color: isAssistant ? (isStrategyCard ? '#1e3a8a' : '#111827') : '#fff',
                                    fontSize: 16,
                                    lineHeight: 1.5,
                                    border: isAssistant ? '1px solid #e5e7eb' : 'none',
                                    boxShadow: isAssistant ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}>
                                    {msg.content}
                                    {msg.generatedImage && (
                                        <div style={{ padding: 12, background: '#f3f4f6', borderRadius: 24, marginTop: 8 }}>
                                            <LazyImage src={msg.generatedImage} category={tenantData?.category} businessName={businessName} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {isLoading && (
                        <div style={{ display: 'flex', gap: 8, padding: '16px 24px', width: 'fit-content', background: '#f3f4f6', borderRadius: 24, border: '1px solid #e5e7eb' }}>
                            <div className="dot" style={{ width: 8, height: 8, background: '#9ca3af', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                            <div className="dot" style={{ width: 8, height: 8, background: '#9ca3af', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }} />
                            <div className="dot" style={{ width: 8, height: 8, background: '#9ca3af', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }} />
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>

            {/* Floating Centered Chatbox Container */}
            <div style={{
                position: 'fixed',
                bottom: 100, // Elevated to avoid mobile nav cutting
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 1000,
                padding: '0 16px'
            }}>
                <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Quick Prompts as Pills */}
                    {messages.length < 5 && (
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                            {quickPrompts.map((prompt, i) => (
                                <button key={i} onClick={() => handleSend(prompt)} style={{
                                    padding: '10px 18px',
                                    background: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 100,
                                    color: '#4b5563',
                                    fontSize: 14,
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}>
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Main Input Field (Claude/Gemini Style) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 12,
                        background: '#ffffff',
                        padding: '8px 8px 8px 20px',
                        borderRadius: 32,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        width: '100%'
                    }}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Describí tu promo..."
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: '#111827',
                                fontSize: 16,
                                resize: 'none',
                                outline: 'none',
                                minHeight: 44,
                                maxHeight: 150,
                                padding: '10px 0',
                                fontFamily: 'inherit'
                            }}
                            rows={1}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                background: input.trim() ? '#2563EB' : '#f3f4f6',
                                border: 'none',
                                color: input.trim() ? '#fff' : '#9ca3af',
                                fontSize: 20,
                                cursor: input.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            ↑
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } 
                @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                ::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </div>
    )
}
