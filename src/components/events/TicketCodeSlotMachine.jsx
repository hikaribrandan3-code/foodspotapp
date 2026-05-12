import { useMemo } from 'react'
import { motion } from 'framer-motion'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const NUMBERS = '0123456789'.split('')
const ITEM_H = 80 // px — matches Tailwind h-20

/**
 * Build a vertical strip that ends with the target character.
 * The reel will land exactly on this last character.
 */
function buildStrip(target, pool, count = 30) {
  const s = []
  for (let i = 0; i < count - 1; i++) {
    s.push(pool[Math.floor(Math.random() * pool.length)])
  }
  s.push(target)
  return s
}

/**
 * Parse the ticket code into 3 letters + 3 numbers.
 * Expected format: "TKT-ABC-123" or "ABC123" → { letters: ['A','B','C'], numbers: ['1','2','3'] }
 *
 * If the code is malformed, returns null so the parent can show a fallback.
 */
function parseCode(ticketCode) {
  const raw = (ticketCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (raw.length < 6) return null

  const segment = raw.slice(-6)
  const letters = segment.slice(0, 3).split('')
  const numbers = segment.slice(3, 6).split('')

  // Validate: first 3 should be letters, last 3 should be digits
  const validLetters = letters.every((ch) => /[A-Z]/.test(ch))
  const validNumbers = numbers.every((ch) => /\d/.test(ch))

  if (!validLetters || !validNumbers) return null
  return { letters, numbers }
}

/**
 * TicketCodeSlotMachine
 *
 * Spins 3 letter reels + 3 number reels for 3 seconds,
 * then lands on the actual ticket code.
 *
 * @param {Object} props
 * @param {string} props.ticketCode — e.g. "TKT-ABC-123"
 * @param {boolean} props.revealed  — true after parent triggers 3s reveal
 */
export default function TicketCodeSlotMachine({ ticketCode, revealed }) {
  const parsed = useMemo(() => parseCode(ticketCode), [ticketCode])

  const letterStrips = useMemo(() => {
    if (!parsed) return null
    return parsed.letters.map((ch) => buildStrip(ch, LETTERS, 28 + Math.floor(Math.random() * 12)))
  }, [parsed])

  const numberStrips = useMemo(() => {
    if (!parsed) return null
    return parsed.numbers.map((ch) => buildStrip(ch, NUMBERS, 28 + Math.floor(Math.random() * 12)))
  }, [parsed])

  // If we can't parse a valid code, show the raw code plainly instead of spinning garbage
  if (!parsed || !letterStrips || !numberStrips) {
    console.warn('[TicketCodeSlotMachine] Failed to parse ticket code:', ticketCode);
    return (
      <div className="mx-auto w-full max-w-[400px] rounded-2xl border border-emerald-200 p-6 shadow-lg bg-gradient-to-br from-emerald-50 to-blue-50 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
        <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">
          CHECK-IN CODE
        </p>
        <p className="text-center text-lg font-black tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
          {ticketCode || 'NO CODE'}
        </p>
        <p className="mt-2 text-center text-[10px] text-slate-500 dark:text-slate-400">
          Present this code at check-in
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[400px] rounded-2xl border border-emerald-100 p-6 shadow-lg bg-gradient-to-br from-emerald-50 to-blue-50 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
      {/* Reels row */}
      <div className="flex items-center justify-center gap-3 h-24">
        {/* 3 Letter reels */}
        {letterStrips.map((strip, idx) => (
          <Reel
            key={`L-${idx}`}
            strip={strip}
            isLetter
            revealed={revealed}
          />
        ))}

        {/* Divider */}
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* 3 Number reels */}
        {numberStrips.map((strip, idx) => (
          <Reel
            key={`N-${idx}`}
            strip={strip}
            isLetter={false}
            revealed={revealed}
          />
        ))}
      </div>

      {/* Label fades in once revealed */}
      <motion.div
        className="mt-3 text-center"
        initial={{ opacity: 0, y: 6 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-60">
          CHECK-IN CODE
        </p>
      </motion.div>
    </div>
  )
}

function Reel({ strip, isLetter, revealed }) {
  const finalY = -(strip.length - 1) * ITEM_H

  return (
    <div
      className={`relative overflow-hidden rounded-lg border-2 shadow-md bg-white dark:bg-slate-900 h-20 ${
        isLetter
          ? 'w-16 border-emerald-400 dark:border-emerald-600'
          : 'w-14 border-blue-400 dark:border-blue-600'
      }`}
    >
      {/* Glow overlay when revealed */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 rounded-lg"
        initial={{ opacity: 0 }}
        animate={revealed ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          boxShadow: isLetter
            ? 'inset 0 0 12px rgba(16,185,129,0.35)'
            : 'inset 0 0 12px rgba(59,130,246,0.35)',
        }}
      />

      <motion.div
        className="absolute left-0 top-0 flex w-full flex-col will-change-transform"
        initial={{ y: revealed ? finalY : 0 }}
        animate={{ y: finalY }}
        transition={
          revealed
            ? { duration: 0 }
            : { duration: 3, ease: [0.34, 1.56, 0.64, 1] }
        }
      >
        {strip.map((ch, i) => (
          <div
            key={i}
            className={`flex w-full items-center justify-center font-mono font-black text-slate-800 dark:text-slate-100 h-20 ${
              isLetter ? 'text-3xl' : 'text-2xl'
            }`}
          >
            {ch}
          </div>
        ))}
      </motion.div>

      {/* Top / bottom depth masks */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute left-0 right-0 top-0 h-2 bg-gradient-to-b from-black/10 to-transparent dark:from-black/30" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-black/10 to-transparent dark:from-black/30" />
      </div>
    </div>
  )
}
