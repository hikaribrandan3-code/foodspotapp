import React, { useState } from 'react'
import { mockBurgerDarkData } from './mockData.js'

/**
 * SiteEngine — Burger Dark template (fourth template built).
 *
 * Static visual pass from mockBurgerDarkData. Design reference: burgerdark.png
 * (dark moody burger place with fiery red/green accents, floating hero burger
 * carousel, ingredient-focused styling). Sharp contrast to burger-qsr's bold
 * QSR energy — this is premium, dramatic, sophisticated.
 */
export default function BurgerDarkTemplate({ data = mockBurgerDarkData }) {
  const { business, burgers, sides } = data
  const [carouselIndex, setCarouselIndex] = useState(0)

  const handlePrev = () => setCarouselIndex((i) => (i - 1 + burgers.length) % burgers.length)
  const handleNext = () => setCarouselIndex((i) => (i + 1) % burgers.length)

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white overflow-hidden">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 bg-[#2a2a2a] border-b border-[#d63031]/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#d63031] flex items-center justify-center text-xs font-bold">ΨP</div>
          <span className="text-lg font-bold">{business.name}</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#home" className="hover:text-[#d63031]">Home</a>
          <a href="#menu" className="hover:text-[#d63031]">Menu</a>
          <a href="#contact" className="hover:text-[#d63031]">Contact</a>
        </nav>
        <div className="flex items-center gap-4">
          <button aria-label="Cart" className="relative hover:text-[#d63031]">🛒</button>
          <button className="px-4 py-2 rounded-full bg-[#d63031] text-white text-sm font-bold hover:bg-[#c41e3a]">
            Do Koszyka
          </button>
        </div>
      </header>

      {/* ── HERO: FLOATING BURGER CAROUSEL ─────────────────────────────── */}
      <section
        id="home"
        className="relative min-h-[500px] md:min-h-[600px] flex items-center justify-center px-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)' }}
      >
        {/* floating garnish elements (tomato slices, lime) */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-[#d63031]/20 opacity-50 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-[#27ae60]/10 opacity-40 blur-3xl" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          {/* hero burger image carousel */}
          <div className="relative mb-8 flex justify-center items-center h-64 md:h-80">
            <img
              src={burgers[carouselIndex].image}
              alt={burgers[carouselIndex].name}
              className="h-full w-auto object-contain drop-shadow-2xl"
              loading="lazy"
            />
            {/* carousel nav */}
            <button
              onClick={handlePrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-2xl text-white/50 hover:text-[#d63031]"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-2xl text-white/50 hover:text-[#d63031]"
            >
              →
            </button>
          </div>

          {/* carousel index */}
          <span className="text-sm tracking-widest text-white/50 uppercase">{String(carouselIndex + 1).padStart(2, '0')} / {String(burgers.length).padStart(2, '0')}</span>

          {/* hero text */}
          <span className="inline-block mt-3 px-4 py-1 rounded-full text-xs font-semibold text-[#d63031] bg-[#d63031]/10 uppercase tracking-wide">
            {business.heroEyebrow}
          </span>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mt-4">
            {business.heroHeadline}<br />{business.heroHeadline2}
          </h1>
          <p className="text-white/70 mt-6 max-w-lg mx-auto text-lg">{business.heroSub}</p>

          {/* CTAs */}
          <div className="flex gap-4 justify-center mt-8">
            <button className="px-8 py-3 rounded-full bg-[#d63031] text-white font-bold hover:bg-[#c41e3a]">
              Do Koszyka 🛒
            </button>
            <button className="px-8 py-3 rounded-full border border-white/30 text-white font-bold hover:border-[#d63031] hover:text-[#d63031]">
              Zobacz menu
            </button>
          </div>
        </div>
      </section>

      {/* ── MENU GRID ──────────────────────────────────────────────────── */}
      <section id="menu" className="px-6 md:px-10 py-16 max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-black mb-12 text-center">MENU</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {burgers.map((burger, i) => (
            <article key={i} className="bg-[#2a2a2a] rounded-xl overflow-hidden hover:bg-[#333] transition border border-[#d63031]/20">
              <div className="relative h-40 bg-[#1a1a1a]">
                <img src={burger.image} alt={burger.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold">{burger.name}</h3>
                  <span className="text-[#d63031] font-bold whitespace-nowrap">{burger.price.toFixed(2)} zł</span>
                </div>
                <p className="text-xs text-white/50 mb-4">{burger.desc}</p>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20">
                    –
                  </button>
                  <span className="w-8 flex items-center justify-center text-sm font-bold bg-[#27ae60]/80 rounded-lg">1</span>
                  <button className="flex-1 py-2 rounded-lg bg-[#27ae60] text-white text-xs font-bold hover:bg-[#229954]">
                    +
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── SIDES / SALADS ─────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center bg-[#2a2a2a]/50 rounded-2xl p-10">
        <div>
          <span className="text-xs tracking-widest text-[#d63031] font-bold uppercase">Spróbuj naszych</span>
          <h2 className="text-4xl md:text-5xl font-black mt-2 mb-6">{sides.title}</h2>
          <p className="text-white/70 mb-6">{sides.description}</p>
          <div className="space-y-4">
            {sides.items.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#d63031]/20 flex items-center justify-center text-[#d63031] text-xl">
                  🌿
                </div>
                <div>
                  <div className="text-sm font-bold">{item.label}</div>
                  <div className="text-xs text-white/50">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <img src={sides.image} alt="Salads" className="w-full rounded-2xl object-cover shadow-2xl" loading="lazy" />
          <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-[#27ae60]/20 blur-3xl" />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#1a1a1a] text-white/40 text-sm text-center py-8 mt-10 border-t border-[#d63031]/20">
        © {new Date().getFullYear()} {business.name} — Powered by FoodSpot
      </footer>
    </div>
  )
}
