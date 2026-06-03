// useKDSAudio.js — Production-grade KDS audio
// Works on iOS Safari, Android Chrome, desktop, PWA
// 3-layer: HTML5 Audio → Web Audio API → Vibration

import { useState, useEffect, useRef, useCallback } from 'react'
import { generateChimeWav } from '../assets/kdsChime.js'

const VOLUME_LEVELS = { low: 0.3, med: 0.6, high: 1.0 }
const LS_MUTED = 'kds_muted'
const LS_VOLUME = 'kds_volume'

// Singleton — AudioContext lives beyond component unmounts
let _audioCtx = null
let _chimeDataUrl = null

function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return _audioCtx
}

function getChimeDataUrl() {
  if (!_chimeDataUrl) _chimeDataUrl = generateChimeWav()
  return _chimeDataUrl
}

export function useKDSAudio() {
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(LS_MUTED) === 'true')
  const [volume, setVolume] = useState(() => localStorage.getItem(LS_VOLUME) || 'high')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const audioElRef = useRef(null)
  const unlockAttemptedRef = useRef(false)

  // ── iOS/Android unlock — must happen inside a user gesture ──────
  const unlockAudio = useCallback(() => {
    if (unlockAttemptedRef.current) return
    unlockAttemptedRef.current = true

    try {
      const ctx = getAudioCtx()

      // Step 1: Play silent buffer (wakes iOS audio engine)
      const silentBuffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = silentBuffer
      source.connect(ctx.destination)
      source.start(0)

      // Step 2: Resume suspended context (iOS suspends after inactivity)
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => setIsUnlocked(true)).catch(() => {})
      } else {
        setIsUnlocked(true)
      }

      // Step 3: Pre-load HTML5 Audio element
      if (!audioElRef.current) {
        const audio = new Audio(getChimeDataUrl())
        audio.preload = 'auto'
        audio.volume = VOLUME_LEVELS[volume] || 1.0
        audioElRef.current = audio
      }
    } catch (e) {
      // Still mark as unlocked so we don't keep blocking
      setIsUnlocked(true)
    }
  }, [volume])

  // ── Listen for first user gesture ──────────────────────────────
  useEffect(() => {
    const events = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click']
    const handler = () => {
      unlockAudio()
      // Don't remove listeners — AudioContext can suspend again
      // and we need to resume on next interaction
    }
    events.forEach(e => document.addEventListener(e, handler, { passive: true }))
    return () => events.forEach(e => document.removeEventListener(e, handler))
  }, [unlockAudio])

  // ── Auto-resume suspended AudioContext ─────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (_audioCtx && _audioCtx.state === 'suspended') {
        _audioCtx.resume().catch(() => {})
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // ── Persist settings ───────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev
      localStorage.setItem(LS_MUTED, String(next))
      return next
    })
  }, [])

  const cycleVolume = useCallback(() => {
    setVolume(prev => {
      const order = ['low', 'med', 'high']
      const next = order[(order.indexOf(prev) + 1) % order.length]
      localStorage.setItem(LS_VOLUME, next)
      if (audioElRef.current) audioElRef.current.volume = VOLUME_LEVELS[next]
      return next
    })
  }, [])

  // ── Play chime ─────────────────────────────────────────────────
  const playChime = useCallback(() => {
    if (isMuted) return

    const gain = VOLUME_LEVELS[volume] || 1.0

    // Layer 1: HTML5 Audio (most reliable on mobile)
    try {
      if (audioElRef.current) {
        audioElRef.current.volume = gain
        audioElRef.current.currentTime = 0
        audioElRef.current.play().catch(() => {
          // Autoplay blocked — try AudioContext fallback
          playChimeFallback(gain)
        })
      } else {
        // Audio element not ready, use fallback
        playChimeFallback(gain)
      }
    } catch (e) {
      playChimeFallback(gain)
    }

    // Layer 3: Vibration (mobile backup — works even on silent mode on Android)
    if (navigator.vibrate) {
      navigator.vibrate([150, 80, 150])
    }
  }, [isMuted, volume])

  return { isMuted, volume, isUnlocked, toggleMute, cycleVolume, playChime }
}

// ── Web Audio API fallback ─────────────────────────────────────
function playChimeFallback(gain) {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => scheduleChime(ctx, gain)).catch(() => {})
    } else {
      scheduleChime(ctx, gain)
    }
  } catch (e) {}
}

function scheduleChime(ctx, gain) {
  // 💰 CHA CHINGGG! - Money sounds for every new order
  const now = ctx.currentTime
  const masterGain = ctx.createGain()
  masterGain.connect(ctx.destination)

  // CHA! - Cash register "cha" (1320Hz square wave, bright & energetic)
  const osc1 = ctx.createOscillator()
  const env1 = ctx.createGain()
  osc1.connect(env1)
  env1.connect(masterGain)
  osc1.frequency.value = 1320
  osc1.type = 'square'
  env1.gain.setValueAtTime(0, now)
  env1.gain.linearRampToValueAtTime(gain * 0.7, now + 0.02)
  env1.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
  osc1.start(now)
  osc1.stop(now + 0.13)

  // CHING! - First coin (1100Hz sine, high pitch)
  const osc2 = ctx.createOscillator()
  const env2 = ctx.createGain()
  osc2.connect(env2)
  env2.connect(masterGain)
  osc2.frequency.value = 1100
  osc2.type = 'sine'
  env2.gain.setValueAtTime(0, now + 0.13)
  env2.gain.linearRampToValueAtTime(gain * 0.5, now + 0.14)
  env2.gain.exponentialRampToValueAtTime(0.001, now + 0.30)
  osc2.start(now + 0.13)
  osc2.stop(now + 0.31)

  // CHING! - Second coin (880Hz sine, medium)
  const osc3 = ctx.createOscillator()
  const env3 = ctx.createGain()
  osc3.connect(env3)
  env3.connect(masterGain)
  osc3.frequency.value = 880
  osc3.type = 'sine'
  env3.gain.setValueAtTime(0, now + 0.28)
  env3.gain.linearRampToValueAtTime(gain * 0.5, now + 0.29)
  env3.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
  osc3.start(now + 0.28)
  osc3.stop(now + 0.46)

  // CHINGGG! - Descending cascade (740Hz triangle)
  const osc4 = ctx.createOscillator()
  const env4 = ctx.createGain()
  osc4.connect(env4)
  env4.connect(masterGain)
  osc4.frequency.value = 740
  osc4.type = 'triangle'
  env4.gain.setValueAtTime(0, now + 0.42)
  env4.gain.linearRampToValueAtTime(gain * 0.4, now + 0.43)
  env4.gain.exponentialRampToValueAtTime(0.001, now + 0.62)
  osc4.start(now + 0.42)
  osc4.stop(now + 0.63)

  // Final coin drop (587Hz sine, warm finish)
  const osc5 = ctx.createOscillator()
  const env5 = ctx.createGain()
  osc5.connect(env5)
  env5.connect(masterGain)
  osc5.frequency.value = 587
  osc5.type = 'sine'
  env5.gain.setValueAtTime(0, now + 0.52)
  env5.gain.linearRampToValueAtTime(gain * 0.4, now + 0.53)
  env5.gain.exponentialRampToValueAtTime(0.001, now + 0.75)
  osc5.start(now + 0.52)
  osc5.stop(now + 0.76)
}
