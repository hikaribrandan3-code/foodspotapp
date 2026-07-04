import React, { useMemo, useState } from 'react'
import { mockFineDiningData } from './mockData.js'

/**
 * SiteEngine — Fine Dining template (seventh template built).
 *
 * Static visual pass from mockFineDiningData. Design reference: finedining.png
 * (dark/black background, warm amber accent lighting, elegant serif type,
 * upscale plated-dish photography, 3-step process icons, featured dish grid).
 *
 * This is an ONLINE ORDERING site like every other template — menu items
 * have real prices and an "Add to Order" action (not just a brochure menu).
 */
export default function FineDiningTemplate({ data = mockFineDiningData }) {
  const { business, process, categories, items, featured } = data
  const [activeCategory, setActiveCategory] = useState(categories[0].id)
  const [orderCount, setOrderCount] = useState(0)

  const visibleItems = useMemo(
    () => items.filter((i) => i.category === activeCategory),
    [items, activeCategory]
  )

  return (
    <div className="min-h-screen bg-[#141110] text-[#f0e9e0]">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 bg-[#141110] border-b border-[#c9995c]/20">
        <span className="text-2xl font-bold italic" style={{ fontFamily: 'Georgia, serif', color: '#c9995c' }}>
          {business.name}
        </span>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide uppercase">
          <a href="#home" className="hover:text-[#c9995c]">Home</a>
          <a href="#menu" className="hover:text-[#c9995c]">Menu</a>
          <a href="#about" className="hover:text-[#c9995c]">About</a>
          <a href="#contact" className="hover:text-[#c9995c]">Contact</a>
        </nav>
        <button className="relative px-6 py-2.5 rounded-sm bg-[#c9995c] text-[#141110] text-sm font-bold uppercase tracking-wide hover:bg-[#d9a968]">
          Order Now
          {orderCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-[#141110] border border-[#c9995c] text-[#c9995c] text-[10px] font-bold">
              {orderCount}
            </span>
          )}
        </button>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        id="home"
        className="relative min-h-[560px] md:min-h-[640px] flex items-center justify-center bg-cover bg-center px-6"
        style={{ backgroundImage: `linear-gradient(rgba(20,17,16,0.55), rgba(20,17,16,0.85)), url(${business.heroImage})` }}
      >
        <div className="relative z-10 text-center max-w-xl">
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#c9995c' }}>{business.heroEyebrow}</span>
          <h1 className="mt-4 text-5xl md:text-6xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>
            {business.heroHeadline}
          </h1>
          <p className="text-[#f0e9e0]/70 mt-5 max-w-md mx-auto">{business.heroSub}</p>
          <button className="mt-8 px-9 py-3.5 rounded-sm bg-[#c9995c] text-[#141110] font-bold uppercase tracking-wide hover:bg-[#d9a968]">
            View Menu
          </button>
        </div>
      </section>

      {/* ── PROCESS (3-step) ────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16 max-w-6xl mx-auto text-center">
        <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#c9995c' }}>How It Works</span>
        <h2 className="text-3xl md:text-4xl font-bold italic mt-3" style={{ fontFamily: 'Georgia, serif' }}>
          Excellence In Every Step
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {process.map((step) => (
            <div key={step.id} className="bg-[#1c1815] rounded-lg p-8 border border-[#c9995c]/15">
              <div
                className="w-12 h-12 mx-auto rounded-full border flex items-center justify-center text-sm font-bold mb-4"
                style={{ borderColor: '#c9995c', color: '#c9995c' }}
              >
                {step.number}
              </div>
              <h3 className="font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>{step.title}</h3>
              <p className="text-sm text-[#f0e9e0]/60 mt-2">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MENU / ORDERING ─────────────────────────────────────────────── */}
      <section id="menu" className="px-6 md:px-10 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#c9995c' }}>Order Online</span>
          <h2 className="text-3xl md:text-4xl font-bold italic mt-3" style={{ fontFamily: 'Georgia, serif' }}>Our Menu</h2>
        </div>

        {/* category tabs */}
        <div className="flex justify-center flex-wrap gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-sm text-sm font-semibold uppercase tracking-wide border transition ${
                activeCategory === cat.id
                  ? 'bg-[#c9995c] text-[#141110] border-[#c9995c]'
                  : 'bg-transparent text-[#f0e9e0]/70 border-[#f0e9e0]/20 hover:border-[#c9995c]/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleItems.map((item) => (
            <article key={item.id} className="bg-[#1c1815] rounded-lg overflow-hidden border border-[#c9995c]/15">
              <img src={item.image} alt={item.name} className="w-full h-44 object-cover" loading="lazy" />
              <div className="p-5">
                <h3 className="font-bold" style={{ fontFamily: 'Georgia, serif' }}>{item.name}</h3>
                <p className="text-xs text-[#f0e9e0]/55 mt-1.5">{item.desc}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="font-bold" style={{ color: '#c9995c' }}>${item.price}</span>
                  <button
                    onClick={() => setOrderCount((c) => c + 1)}
                    className="px-4 py-1.5 rounded-sm bg-[#c9995c] text-[#141110] text-xs font-bold uppercase tracking-wide hover:bg-[#d9a968]"
                  >
                    Add to Order
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── CHEF'S TABLE + ABOUT ────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div className="bg-[#1c1815] rounded-lg p-8 md:p-10 border border-[#c9995c]/15">
          <h2 className="text-2xl md:text-3xl font-bold italic" style={{ fontFamily: 'Georgia, serif', color: '#c9995c' }}>
            {featured.aboutTitle}
          </h2>
          <p className="text-[#f0e9e0]/70 mt-4 text-sm">{featured.aboutText}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {featured.dishes.map((dish) => (
            <div key={dish.id} className="relative rounded-lg overflow-hidden">
              <img src={dish.image} alt={dish.name} className="w-full h-56 object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Georgia, serif' }}>{dish.name}</h3>
                <span className="text-xs" style={{ color: '#c9995c' }}>${dish.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#0d0b0a] text-[#f0e9e0]/40 text-sm text-center py-8 border-t border-[#c9995c]/15">
        © {new Date().getFullYear()} {business.name} — Powered by FoodSpot
      </footer>
    </div>
  )
}
