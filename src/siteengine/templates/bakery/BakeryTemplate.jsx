import React, { useMemo, useState } from 'react'
import { mockBakeryData } from './mockData.js'

/**
 * SiteEngine — Bakery template (third template built).
 *
 * Static visual pass from mockBakeryData — same contract pattern as
 * coffee-cafe and burger-qsr. Design reference: elegant artisanal bakery
 * (bakerymain.png hero + "why choose us" cards, bakerymenu.png serif
 * "Pastry Collection" categorized menu grid). Warm cream/tan/brown palette,
 * serif display type for headings — a deliberate contrast to the bold
 * burger-qsr template.
 */
export default function BakeryTemplate({ data = mockBakeryData }) {
  const { business, whyChooseUs, categories, items, gallery } = data
  const [activeCategory, setActiveCategory] = useState(categories[0].id)

  const visibleItems = useMemo(
    () => items.filter((i) => i.category === activeCategory),
    [items, activeCategory]
  )

  return (
    <div className="min-h-screen bg-[#faf3ea] text-[#3a2a1d]">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 bg-[#faf3ea] border-b border-[#3a2a1d]/10">
        <div>
          <span className="text-2xl font-bold tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>BAKERY</span>
          <div className="text-[10px] tracking-[0.2em] text-[#3a2a1d]/50 uppercase -mt-1">{business.tagline}</div>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#home" className="hover:text-[#8a5a3b]">Home</a>
          <a href="#menu" className="hover:text-[#8a5a3b]">Menu</a>
          <a href="#about" className="hover:text-[#8a5a3b]">About Us</a>
          <a href="#contact" className="hover:text-[#8a5a3b]">Contact Us</a>
        </nav>
        <button className="px-6 py-2.5 rounded-full bg-[#8a5a3b] text-white text-sm font-semibold hover:bg-[#734a2f]">
          Order Now
        </button>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        id="home"
        className="relative min-h-[440px] md:min-h-[560px] flex items-center justify-center bg-cover bg-center px-6"
        style={{ backgroundImage: `linear-gradient(rgba(250,243,234,0.15), rgba(250,243,234,0.15)), url(${business.heroImage})` }}
      >
        <div className="relative bg-[#faf3ea]/95 rounded-2xl shadow-xl px-10 py-10 md:px-16 md:py-12 text-center max-w-lg">
          <span className="text-xs tracking-[0.25em] text-[#8a5a3b] font-semibold uppercase">Baked Fresh Every Morning</span>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            {business.heroHeadline}<br />{business.heroHeadline2}
          </h1>
          <p className="text-[#3a2a1d]/70 mt-4">{business.heroSub}</p>
          <button className="mt-6 px-8 py-3 rounded-full bg-[#8a5a3b] text-white font-semibold hover:bg-[#734a2f]">
            Order Now
          </button>
        </div>
      </section>

      {/* ── WHY CHOOSE US ───────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16 max-w-6xl mx-auto text-center">
        <span className="text-2xl">🥐</span>
        <h2 className="text-3xl md:text-4xl font-bold mt-2" style={{ fontFamily: 'Georgia, serif' }}>Why Choose Us?</h2>
        <p className="text-[#3a2a1d]/60 max-w-xl mx-auto mt-3">
          Every item is made from scratch with simple ingredients, traditional technique, and no shortcuts.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-10 text-left">
          {whyChooseUs.map((card) => (
            <article key={card.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <img src={card.image} alt={card.title} className="w-full h-44 object-cover" loading="lazy" />
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>{card.title}</h3>
                <p className="text-sm text-[#3a2a1d]/60 mt-2">{card.desc}</p>
                <button className="mt-4 px-5 py-2 rounded-full border-2 border-[#8a5a3b] text-[#8a5a3b] text-sm font-semibold hover:bg-[#8a5a3b] hover:text-white transition">
                  View More
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── MENU (Pastry Collection style) ─────────────────────────────── */}
      <section id="menu" className="px-6 md:px-10 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs tracking-[0.25em] text-[#8a5a3b] font-semibold uppercase">Signature Selection</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2" style={{ fontFamily: 'Georgia, serif' }}>Pastry Collection</h2>
        </div>

        {/* category tabs */}
        <div className="flex justify-center flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition ${
                activeCategory === cat.id
                  ? 'bg-[#8a5a3b] text-white border-[#8a5a3b]'
                  : 'bg-transparent text-[#3a2a1d] border-[#3a2a1d]/20 hover:border-[#8a5a3b]/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {visibleItems.map((item) => (
            <article key={item.id} className="text-left">
              <div className="relative rounded-xl overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-56 object-cover" loading="lazy" />
                {item.badge && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#faf3ea] text-[#8a5a3b] text-[10px] font-bold uppercase tracking-wide">
                    {item.badge}
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between mt-3">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-xs text-[#3a2a1d]/55 mt-1 max-w-[220px]">{item.desc}</p>
                </div>
                <span className="font-bold text-[#8a5a3b] whitespace-nowrap ml-3">${item.price.toFixed(2)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── VISIT US TODAY ──────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-16 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>Visit Us Today</h2>
          <p className="text-[#3a2a1d]/65 mt-4 max-w-md">
            Stop by for the smell of fresh bread in the morning, a slice of cake in the afternoon, or a custom order for your next celebration.
          </p>
          <button className="mt-6 px-7 py-3 rounded-full bg-[#8a5a3b] text-white font-semibold hover:bg-[#734a2f]">
            Visit Us Today
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {gallery.slice(0, 4).map((img, i) => (
            <img key={i} src={img} alt="" className={`rounded-xl object-cover w-full ${i === 0 ? 'h-48' : 'h-32'}`} loading="lazy" />
          ))}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer id="contact" className="bg-[#3a2a1d] text-white/60 text-sm text-center py-8">
        © {new Date().getFullYear()} {business.name} — Powered by FoodSpot
      </footer>
    </div>
  )
}
