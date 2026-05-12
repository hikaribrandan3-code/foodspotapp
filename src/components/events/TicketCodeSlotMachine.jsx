import { motion } from 'framer-motion'

export default function TicketCodeSlotMachine({ ticketCode, revealed }) {
  if (!ticketCode) {
    return (
      <div className="mx-auto w-full max-w-[400px] rounded-2xl border border-red-200 p-6 shadow-lg bg-gradient-to-br from-red-50 to-orange-50 dark:border-red-900 dark:from-slate-800 dark:to-slate-900">
        <p className="text-center text-sm font-semibold text-red-600 dark:text-red-400">
          No ticket code
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={revealed ? { opacity: 1, scale: 1 } : { opacity: 0.6, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto w-full max-w-[400px]"
    >
      <div className="rounded-3xl border-2 border-emerald-400 dark:border-emerald-600 p-8 shadow-2xl bg-gradient-to-br from-emerald-50 via-blue-50 to-emerald-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-400">
            CHECK-IN CODE
          </p>

          <div className="bg-white dark:bg-slate-950 rounded-2xl px-8 py-6 border-2 border-emerald-200 dark:border-emerald-800 shadow-md">
            <p className="text-center text-3xl font-black tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
              {ticketCode}
            </p>
          </div>

          <p className="text-center text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-2">
            Show this code at the gate or to staff
          </p>
        </div>
      </div>
    </motion.div>
  )
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
