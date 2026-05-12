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
 * TicketCodeSlotMachine
 *
 * Spins 6 reels for 3 seconds then lands on the actual ticket code.
 * Reels stay visible so staff can read & input the code for validation.
 *
 * @param {Object} props
 * @param {string} props.ticketCode — e.g. "TKT-ABC-NNN" or "ABC123"
 * @param {boolean} props.revealed  — true after parent triggers 3s reveal
 */
export default function TicketCodeSlotMachine({ ticketCode, revealed }) {
  // Extract last 6 alphanumeric chars, pad with '0' if needed
  const raw = (ticketCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const code = raw.padStart(6, '0').slice(-6)
  const chars = code.split('')

  // Build strips once per mount so animation isn't reset on re-renders
  const strips = useMemo(() => {
    return chars.map((ch) => {
      const isNum = /\d/.test(ch)
      const pool = isNum ? NUMBERS : LETTERS
      return buildStrip(ch, pool, 28 + Math.floor(Math.random() * 12))
    })
  }, [code])

  return (
    <div className="mx-auto w-full max-w-[400px] rounded-2xl border border-emerald-100 p-6 shadow-lg bg-gradient-to-br from-emerald-50 to-blue-50 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
      {/* Reels row — always visible */}
      <div className="flex items-center justify-center gap-3 h-24">
        {strips.map((strip, idx) => (
          <Reel
            key={`${code}-${idx}`}
            strip={strip}
            targetChar={chars[idx]}
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

function Reel({ strip, targetChar, revealed }) {
  const finalY = -(strip.length - 1) * ITEM_H
  const isLetter = !/\d/.test(targetChar)

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
