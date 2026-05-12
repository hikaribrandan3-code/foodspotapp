import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const NUMBERS = '0123456789'.split('')
const REEL_HEIGHT = 80 // px — matches Tailwind h-20
const REEL_WIDTH = 56  // px — matches Tailwind w-14

/**
 * Generate a vertical character strip for a single reel.
 * The target character is always the LAST item so the animation
 * lands exactly on it at the end of the spin.
 */
function generateStrip(target, charset, length = 42) {
  const strip = []
  for (let i = 0; i < length - 1; i++) {
    strip.push(charset[Math.floor(Math.random() * charset.length)])
  }
  strip.push(target)
  return strip
}

/**
 * SlotMachineAnimation
 *
 * @param {Object} props
 * @param {string} props.code            — Final 6-character code (e.g. "ABC123")
 * @param {function} props.onCodeRevealed — Callback fired when spin completes
 * @param {number} [props.duration=3000]  — Spin duration in milliseconds
 */
export default function SlotMachineAnimation({
  code,
  onCodeRevealed,
  duration = 3000,
}) {
  const [revealed, setRevealed] = useState(false)
  const [spinKey, setSpinKey] = useState(0)
  const callbackRef = useRef(onCodeRevealed)
  callbackRef.current = onCodeRevealed

  // Parse code: first 3 chars = letters, last 3 = numbers
  const cleanCode = (code || '').toUpperCase()

  // Generate strips — stable per code thanks to useMemo
  const { letterStrips, numberStrips } = useMemo(() => {
    const l = cleanCode.slice(0, 3).split('')
    const n = cleanCode.slice(3, 6).split('')
    return {
      letterStrips: l.map((ch) => generateStrip(ch, LETTERS, 42)),
      numberStrips: n.map((ch) => generateStrip(ch, NUMBERS, 36)),
    }
  }, [cleanCode])

  // Restart animation whenever code changes
  useEffect(() => {
    setRevealed(false)
    setSpinKey((k) => k + 1)
  }, [code])

  // Fire callback + confetti at exactly the 3-second mark
  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealed(true)
      callbackRef.current?.(cleanCode)

      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
        disableForReducedMotion: true,
      })
    }, duration)

    return () => clearTimeout(timer)
  }, [cleanCode, duration, spinKey])

  const durSeconds = duration / 1000
  const easePoint = 5 / 6 // 2.5s ÷ 3s

  return (
    <div
      className="relative mx-auto w-full max-w-[400px] rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-50 to-blue-50 p-4 shadow-2xl dark:from-slate-800 dark:to-slate-900"
      style={{ contain: 'layout paint' }}
    >
      {/* Header label */}
      <div className="mb-4 text-center">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
          Check-In Code
        </span>
      </div>

      {/* Reels row */}
      <div className="flex items-center justify-center gap-2" key={spinKey}>
        {/* Letter reels */}
        {letterStrips.map((strip, idx) => (
          <Reel
            key={`L-${idx}-${spinKey}`}
            strip={strip}
            isLetter
            duration={durSeconds}
            easePoint={easePoint}
          />
        ))}

        {/* Divider dot */}
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Number reels */}
        {numberStrips.map((strip, idx) => (
          <Reel
            key={`N-${idx}-${spinKey}`}
            strip={strip}
            isLetter={false}
            duration={durSeconds}
            easePoint={easePoint}
          />
        ))}
      </div>

      {/* Revealed code (fades in after spin) */}
      <motion.div
        className="mt-4 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <p className="font-mono text-xl font-black tracking-[0.2em] text-slate-800 dark:text-slate-100">
          {cleanCode.slice(0, 3)}
          <span className="mx-1 text-slate-400">·</span>
          {cleanCode.slice(3, 6)}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Show this at the entrance
        </p>
      </motion.div>
    </div>
  )
}

/**
 * Individual reel with overflow-hidden container.
 * The inner strip translates vertically; only the centred
 * character is visible through the window.
 */
function Reel({ strip, isLetter, duration, easePoint }) {
  const finalY = -(strip.length - 1) * REEL_HEIGHT
  const midY = -(strip.length - 5) * REEL_HEIGHT

  return (
    <div
      className={`relative overflow-hidden rounded-lg border-2 shadow-inner ${
        isLetter
          ? 'border-emerald-400 dark:border-emerald-600'
          : 'border-blue-400 dark:border-blue-600'
      } bg-white dark:bg-slate-800`}
      style={{ width: REEL_WIDTH, height: REEL_HEIGHT }}
    >
      {/* Spinning strip */}
      <motion.div
        className="absolute left-0 top-0 flex w-full flex-col will-change-transform"
        initial={{ y: 0 }}
        animate={{ y: [0, midY, finalY] }}
        transition={{
          duration,
          times: [0, easePoint, 1],
          ease: ['linear', [0.34, 1.56, 0.64, 1]],
        }}
      >
        {strip.map((char, i) => (
          <div
            key={i}
            className={`flex w-full items-center justify-center font-mono font-black text-slate-800 dark:text-slate-100 ${
              isLetter ? 'text-3xl' : 'text-2xl'
            }`}
            style={{ height: REEL_HEIGHT }}
          >
            {char}
          </div>
        ))}
      </motion.div>

      {/* Top / bottom fade masks for depth */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute left-0 right-0 top-0 h-2 bg-gradient-to-b from-black/10 to-transparent dark:from-black/30" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-black/10 to-transparent dark:from-black/30" />
      </div>

      {/* Subtle center highlight line */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[1px] bg-black/5 dark:bg-white/5" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[1px] bg-black/5 dark:bg-white/5" />
    </div>
  )
}
