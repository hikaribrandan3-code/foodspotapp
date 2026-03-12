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

    const [messages, setMessages] = useState([
        { role: 'assistant', content: '¿Qué promoción querés crear hoy? Decime algo como "2x1 en hamburguesas $1500" o "Noche de cocktails 20% off"' }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const chatEndRef = useRef(null)
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
            const businessContext = { name: tenantData?.business_name || 'Tu Negocio', category: tenantData?.category || 'restaurant' }
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
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
            <BackendHeader title="FoodSpot AI" />
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 200px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map((msg, i) => {
                    // Update Strategy Card Styling for Dark Mode
                    const isStrategyCard = msg.content && msg.content.includes('Estrategia');
                    return (
                        <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeIn 0.3s ease' }}>
                            <div style={{
                                maxWidth: msg.generatedImage ? '100%' : '85%',
                                padding: msg.generatedImage ? 0 : '14px 18px',
                                borderRadius: 20,
                                background: msg.role === 'user' ? '#2563EB' : '#1f1f1f',
                                color: isStrategyCard ? '#E0E7FF' : '#fff', // White/Light Blue text for strategy cards
                                border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.1)' : 'none'
                            }}>
                                {msg.content}
                                {msg.generatedImage && (
                                    <LazyImage src={msg.generatedImage} category={tenantData?.category} businessName={tenantData?.business_name} style={{ marginTop: 12 }} />
                                )}
                            </div>
                        </div>
                    )
                })}
                {isLoading && (
                    <div style={{ display: 'flex', gap: 8, padding: '12px 18px', width: 'fit-content', background: '#1f1f1f', borderRadius: 20 }}>
                        <span style={{ animation: 'bounce 0.6s infinite', animationDelay: '0ms' }}>.</span>
                        <span style={{ animation: 'bounce 0.6s infinite', animationDelay: '150ms' }}>.</span>
                        <span style={{ animation: 'bounce 0.6s infinite', animationDelay: '300ms' }}>.</span>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px 32px', background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 100 }}>
                {messages.length < 3 && (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 8, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                        {quickPrompts.map((prompt, i) => (
                            <button key={i} onClick={() => handleSend(prompt)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: '#aaa', fontSize: 13, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                                {prompt}
                            </button>
                        ))}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Describí tu promo..." style={{ flex: 1, borderRadius: 24, padding: '14px 20px', background: '#1f1f1f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 16, resize: 'none', outline: 'none', minHeight: 52, maxHeight: 120 }} rows={1} />
                    <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} style={{ width: 52, height: 52, borderRadius: '50%', background: input.trim() ? '#2563EB' : '#333', border: 'none', color: '#fff', fontSize: 20, cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
                </div>
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`}</style>
        </div>
    )
}
