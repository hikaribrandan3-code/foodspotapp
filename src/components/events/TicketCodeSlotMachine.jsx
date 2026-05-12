import { useMemo } from 'react'
import { motion } from 'framer-motion'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const NUMBERS = '0123456789'.split('')
const ITEM_H = 80 // px — matches Tailwind h-20

function buildStrip(pool, count) {
  const s = []
  for (let i = 0; i < count; i++) {
    s.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return s
}

/**
 * TicketCodeSlotMachine
 *
 * @param {Object} props
 * @param {string} props.ticketCode — Full check-in code (e.g. "TKT-ABC-NNN")
 * @param {boolean} props.revealed  — true after parent triggers 3s reveal
 */
export default function TicketCodeSlotMachine({ ticketCode, revealed }) {
  // Stable strips — generated once per mount so animation isn't reset on re-renders
  const strips = useMemo(
    () => ({
      l1: buildStrip(LETTERS, 32),
      l2: buildStrip(LETTERS, 36),
      l3: buildStrip(LETTERS, 30),
      n1: buildStrip(NUMBERS, 28),
      n2: buildStrip(NUMBERS, 26),
      n3: buildStrip(NUMBERS, 30),
    }),
    []
  )

  return (
    <div className="mx-auto w-full max-w-[400px] rounded-2xl border border-emerald-100 p-6 shadow-lg bg-gradient-to-br from-emerald-50 to-blue-50 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
      {!revealed ? (
        <div className="flex items-center justify-center gap-3 h-24">
          <Reel strip={strips.l1} isLetter />
          <Reel strip={strips.l2} isLetter />
          <Reel strip={strips.l3} isLetter />

          {/* Divider dots */}
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>

          <Reel strip={strips.n1} isLetter={false} />
          <Reel strip={strips.n2} isLetter={false} />
          <Reel strip={strips.n3} isLetter={false} />
        </div>
      ) : (
        <motion.div
          className="text-center py-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-60 mb-3">
            YOUR CHECK-IN CODE
          </p>
          <p className="text-5xl font-black tracking-widest text-transparent bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text mb-2">
            {ticketCode}
          </p>
          <p className="text-[8px] text-[var(--text-secondary)] opacity-50">
            Show this code at entry
          </p>
        </motion.div>
      )}
    </div>
  )
}

function Reel({ strip, isLetter }) {
  const finalY = -(strip.length - 1) * ITEM_H

  return (
    <div
      className={`relative overflow-hidden rounded-lg border-2 shadow-md bg-white dark:bg-slate-900 h-20 ${
        isLetter
          ? 'w-16 border-emerald-400 dark:border-emerald-600'
          : 'w-14 border-blue-400 dark:border-blue-600'
      }`}
    >
      <motion.div
        className="absolute left-0 top-0 flex w-full flex-col will-change-transform"
        initial={{ y: 0 }}
        animate={{ y: finalY }}
        transition={{
          duration: 3,
          ease: [0.34, 1.56, 0.64, 1],
        }}
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
    </div>
  )
}
