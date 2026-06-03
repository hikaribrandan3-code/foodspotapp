/**
 * FoodSpot AI - Business Advisor for Restaurant Owners
 * Secure Gemini integration via Supabase edge functions
 * Multilingual support (ES, EN, PT)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TierGuard } from '../../components/TierGuard.jsx'
import { useTenant } from '../../contexts/TenantContext'
import { useStrategyDraft } from '../../contexts/StrategyDraftContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { supabase } from '../../lib/supabaseClient'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import Markdown from 'react-markdown'
import { useBlobUrlTracker } from '../../hooks/useBlobUrlTracker'

// ─── CONFIG ───
const CANVAS_W = 1080
const CANVAS_H = 1920
const FONT_FAMILY = 'Inter, system-ui, -apple-system, sans-serif'
const MAX_LINES = 3
const MIN_FONT_SIZE = 36
const MAX_FONT_SIZE = 130

// API key is now handled server-side via Supabase edge function
// Never expose VITE_GOOGLE_API_KEY to frontend

// Owner-focused business assistant (replaces kitchen prep agent)
const getOwnerSystemPrompt = (language = 'es', businessName = '', category = '') => {
  const prompts = {
    es: `Eres el Asesor de Negocios de FoodSpot. Tu rol es ayudar a dueños de pequeños restaurantes en Latinoamérica a crecer, optimizar y tomar decisiones estratégicas.

Tu expertise:
- Estrategia de menú (qué vender, precios, popularidad)
- Análisis de ventas y tendencias (horarios pico, platos estrella)
- Gestión de inventario y costos
- Optimización de márgenes y ganancias
- Estrategia de marketing local
- Gestión de personal y turnos
- Retroalimentación de clientes
- Cumplimiento normativo (impuestos, seguridad alimentaria)

Contexto del negocio: ${businessName || 'Tu restaurante'} (${category || 'comida'})

## PROTOCOLO EJECUTIVO (Para Estrategias)
1. **SIN RODEOS:** Comienza directamente con ### Título
2. **ESTRUCTURA CLARA:**
   ### [Nombre de la Estrategia]
   ### Por Qué
   * [Beneficio específico para tu negocio]
   ### Cómo Hacerlo
   * [Paso accionable]
3. **RESPUESTAS PRÁCTICAS:** Da números, porcentajes, ejemplos reales
4. **LENGUAJE:** Habla como asesor de negocio, no de chef. Piensa en dinero, clientes, crecimiento.
5. **JSON DRAFT:** Solo incluye JSON formateado (entre |||) si el usuario pide crear un plan formal`,

    en: `You are FoodSpot's Business Advisor. Your role is to help small restaurant owners in Pan America grow, optimize, and make strategic decisions.

Your expertise:
- Menu strategy (what to sell, pricing, popularity)
- Sales & trend analysis (peak hours, top dishes)
- Inventory management & cost control
- Margin optimization & profitability
- Local marketing strategies
- Staff management & scheduling
- Customer feedback analysis
- Regulatory compliance (taxes, food safety)

Business context: ${businessName || 'Your restaurant'} (${category || 'food'})

## EXECUTIVE PROTOCOL (For Strategies)
1. **NO FLUFF:** Start immediately with ### Title
2. **CLEAR STRUCTURE:**
   ### [Strategy Name]
   ### Why It Works
   * [Specific benefit to your business]
   ### How To Do It
   * [Actionable step]
3. **PRACTICAL ANSWERS:** Give numbers, percentages, real examples
4. **LANGUAGE:** Speak as a business advisor, not a chef. Think money, customers, growth.
5. **JSON DRAFT:** Only include formatted JSON (between |||) if user asks to create a formal plan`,

    pt: `Você é o Consultor de Negócios do FoodSpot. Seu papel é ajudar pequenos proprietários de restaurantes na América Latina a crescer, otimizar e tomar decisões estratégicas.

Sua expertise:
- Estratégia de cardápio (o que vender, preços, popularidade)
- Análise de vendas e tendências (horários de pico, pratos estrela)
- Gestão de inventário e controle de custos
- Otimização de margens e lucratividade
- Estratégias de marketing local
- Gestão de pessoal e agendamento
- Análise de feedback de clientes
- Conformidade regulatória (impostos, segurança alimentar)

Contexto do negócio: ${businessName || 'Seu restaurante'} (${category || 'comida'})

## PROTOCOLO EXECUTIVO (Para Estratégias)
1. **SEM RODEIOS:** Comece direto com ### Título
2. **ESTRUTURA CLARA:**
   ### [Nome da Estratégia]
   ### Por Que Funciona
   * [Benefício específico para seu negócio]
   ### Como Fazer
   * [Passo prático]
3. **RESPOSTAS PRÁTICAS:** Dê números, percentuais, exemplos reais
4. **LINGUAGEM:** Fale como consultor de negócios, não chef. Pense em dinheiro, clientes, crescimento.
5. **JSON DRAFT:** Inclua JSON formatado (entre |||) apenas se o usuário pedir um plano formal`
  };

  return prompts[language] || prompts.es;
};

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
    const { t } = useLanguage()

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

            // Try 1: Supabase Edge Function
            try {
                const { data, error } = await supabase.functions.invoke('foodspot-image', {
                    body: { prompt: parsedPayload?.image_prompt || cleanPrompt, category }
                })
                if (data?.image) {
                    setImageSrc(data.image)
                    return
                }
            } catch (hfError) { console.warn('Supabase generation failed, trying Pollinations...') }

            // Try 2: Pollinations AI (Primary)
            const seed = Math.floor(Math.random() * 1000000)
            const primaryUrl = `https://image.pollinations.ai/prompt/${prefix}${cleanPrompt}?width=${CANVAS_W}&height=${CANVAS_H}&nologo=true&seed=${seed}&enhance=true`

            try {
                const response = await fetch(primaryUrl, { mode: 'cors', headers: { 'Accept': 'image/*' } })
                if (response.ok) {
                    const blob = await response.blob()
                    const blobUrl = URL.createObjectURL(blob)
                    setImageSrc(blobUrl)
                    return
                }
            } catch (e) { console.warn('Pollinations Primary failed, trying fallback seed...') }

            const fallbackSeed = Math.floor(Math.random() * 9999)
            const fallbackUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}_high_quality_food_photography?width=${CANVAS_W}&height=${CANVAS_H}&nologo=true&seed=${fallbackSeed}`
            setImageSrc(fallbackUrl)
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
                    <span style={{ fontSize: 14, opacity: 0.8, fontWeight: 500 }}>{t('cooking_atmosphere')}</span>
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

export function FoodSpotAI() {
    const navigate = useNavigate()
    const { businessId, tenantData } = useTenant()

    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [pendingImage, setPendingImage] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const fileInputRef = useRef(null)
    const chatEndRef = useRef(null)
    const { ingestAIDraft, launchStudio } = useStrategyDraft()
    const { lang, t } = useLanguage()
    const businessName = tenantData?.business_name || 'tu negocio'
    
    const { createBlobUrl, revokeBlobUrl, revokeAllBlobUrls } = useBlobUrlTracker()

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async (text) => {
        const userText = text || input.trim()
        if (!userText && !pendingImage) return
        if (isLoading) return

        const newMessages = [...messages, { id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role: 'user', content: userText, attachedImage: previewUrl }]
        setMessages(newMessages)
        setInput(''); setIsLoading(true)

        const currentPendingImage = pendingImage
        setPendingImage(null)
        setPreviewUrl(null)

        try {
            // Edge function handles context fetching + system prompt building server-side
            const response = await supabase.functions.invoke('foodspot-ai', {
                body: {
                    messages: newMessages.map(m => {
                        const msg = { role: m.role, content: m.content };
                        if (m.attachedImage) {
                            msg.image = { data: m.attachedImage.split(',')[1], mimeType: 'image/jpeg' };
                        }
                        return msg;
                    }),
                    businessId: businessId,
                    businessName: businessName,
                    language: lang,
                }
            });

            const data = response.data;

            if (data?.error) throw new Error(data.detail || data.error);

            let aiResponse = data.reply ||
                            'No pude procesar eso. ¿Puedes reformular?';
            
            let draftPayload = null;

            // Scan for the ||| { JSON } ||| protocol
            const jsonMatch = aiResponse.match(/\|\|\|\s*(\{[\s\S]*?\})\s*\|\|\|/m)
            if (jsonMatch) {
                try {
                    draftPayload = JSON.parse(jsonMatch[1])
                    ingestAIDraft(draftPayload)
                } catch (err) {
                    console.error('Failed to parse AI Strategy block:', err)
                }
            }

            aiResponse = aiResponse.replace(/\|\|\|\s*\{[\s\S]*?\}\s*\|\|\|/g, '').trim()
            setMessages([...newMessages, { id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role: 'assistant', content: aiResponse, draftPayload }])

        } catch (e) {
            console.error('AI Error:', e)
            setMessages([...newMessages, { id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role: 'assistant', content: t('ai_error_reply') || 'Error de conexión con el asistente.' }])
        } finally { setIsLoading(false) }
    }

    const quickPrompts = [t('quick_prompt_1'), t('quick_prompt_2'), t('quick_prompt_3')]

    const getTimeGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return t('good_morning') || 'Buenos días'
        if (hour < 18) return t('good_afternoon') || 'Buenas tardes'
        return t('good_evening') || 'Buenas noches'
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff', color: '#111827', position: 'relative', paddingBottom: 'calc(var(--nav-height) + 1rem)' }}>
            <BackendHeader title={t('ai_header') || "FoodSpot AI"} />

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0 180px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: '800px', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {messages.length === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', animation: 'fadeIn 0.8s ease' }}>
                            <div style={{ fontSize: 42, fontWeight: 800, color: '#111827', marginBottom: 8, letterSpacing: '-0.02em' }}>
                                {getTimeGreeting()}, {businessName}
                            </div>
                            <div style={{ fontSize: 18, color: '#6b7280', maxWidth: '400px', lineHeight: 1.5 }}>
                                {t('ai_vision')} {t('strategy_assistant')}. {t('ai_challenge')}
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isAssistant = msg.role === 'assistant'
                        const isStrategyCard = msg.draftPayload

                        return (
                            <div key={msg.id} style={{ display: 'flex', justifyContent: isAssistant ? 'flex-start' : 'flex-end', animation: 'fadeIn 0.3s ease' }}>
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
                                    <Markdown components={{
                                        h3: ({ node, ...props }) => <h3 style={{ fontSize: 22, fontWeight: 800, color: isAssistant ? '#111827' : '#fff', marginTop: 16, marginBottom: 8, letterSpacing: '-0.02em' }} {...props} />,
                                        p: ({ node, ...props }) => <p style={{ marginBottom: 12 }} {...props} />,
                                        ul: ({ node, ...props }) => <ul style={{ paddingLeft: 20, marginBottom: 12, listStyleType: 'disc' }} {...props} />,
                                        li: ({ node, ...props }) => <li style={{ marginBottom: 6, fontWeight: 500 }} {...props} />,
                                        strong: ({ node, ...props }) => <strong style={{ fontWeight: 800 }} {...props} />
                                    }}>
                                        {msg.content}
                                    </Markdown>
                                    {msg.attachedImage && (
                                        <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
                                            <img src={msg.attachedImage} style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} alt="User upload" />
                                        </div>
                                    )}
                                    {msg.draftPayload && Object.keys(msg.draftPayload).length > 0 && (
                                        <div style={{
                                            marginTop: 16,
                                            padding: '20px 16px',
                                            background: '#fff',
                                            borderRadius: 16,
                                            border: '1px solid #e5e7eb',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 16,
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                                <div style={{ fontWeight: 800, fontSize: 13, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                    {msg.draftPayload.type === 'EVENT_DRAFT' ? t('event_strategy') : t('promo_strategy')}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => launchStudio()}
                                                style={{
                                                    width: '100%',
                                                    padding: '18px',
                                                    background: '#000',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    fontWeight: 900,
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    letterSpacing: '0.1em',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                {t('configure_strategy_btn')}
                                            </button>
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

            <div style={{
                position: 'fixed',
                bottom: 100,
                left: 'var(--sidebar-width, 0px)',
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 1000,
                padding: '0 16px'
            }}>
                <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {messages.length < 5 && (
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                            {quickPrompts.map((prompt) => (
                                <button key={prompt} onClick={() => handleSend(prompt)} style={{
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

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#ffffff',
                        borderRadius: 32,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        width: '100%',
                        overflow: 'hidden'
                    }}>
                        {previewUrl && (
                            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ position: 'relative', width: 60, height: 60, borderRadius: 12, overflow: 'hidden' }}>
                                    <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button onClick={() => { 
                                    if (previewUrl) URL.revokeObjectURL(previewUrl)
                                    setPendingImage(null); 
                                    setPreviewUrl(null); 
                                }} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer' }}>×</button>
                                </div>
                                <span style={{ fontSize: 13, color: '#6b7280' }}>{t('photo_selected_ready')}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '8px 8px 8px 20px' }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files[0]
                                    if (file) {
                                        setPendingImage(file)
                                        setPreviewUrl(createBlobUrl(file))
                                    }
                                }}
                            />
                            <button
                                onClick={() => fileInputRef.current.click()}
                                disabled
                                style={{
                                    width: 44,
                                    height: 44,
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: 28,
                                    cursor: 'not-allowed',
                                    display: 'none',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#6b7280',
                                    opacity: 0.8
                                }}
                            >
                                +
                            </button>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder={t('describe_promo_placeholder')}
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
                                    padding: '12px 10px',
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
            <BackendNav role="owner" useRoutes={true} />
        </div>
    )
}

function FoodSpotAIGated(props) {
  return (
    <TierGuard feature="ai">
      <FoodSpotAI {...props} />
    </TierGuard>
  )
}

export default FoodSpotAIGated;
