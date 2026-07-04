import React, { useMemo, useState } from 'react'
import { mockBakeryRusticData } from './mockData.js'

const FEATURE_ICON = {
  bread: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12c0-4 3.5-7 8-7s8 3 8 7v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4Z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </svg>
  ),
  oven: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16" />
      <circle cx="8" cy="7" r="0.8" fill="currentColor" />
      <circle cx="12" cy="7" r="0.8" fill="currentColor" />
      <path d="M8 15c1 1 2 1.5 4 1.5s3-.5 4-1.5" />
    </svg>
  ),
  delivery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="8" width="12" height="8" rx="1" />
      <path d="M14 11h4l3 3v2h-7z" />
      <circle cx="6.5" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
}

/**
 * SiteEngine — Bakery Rustic template (sixth template built).
 *
 * Static visual pass from mockBakeryRusticData. Design reference: bakery2.png
 * (rustic artisanal bread-focused bakery with warm brown/orange palette,
 * sourdough hero, hand-drawn wheat illustrations, quality & service messaging).
 * Sharp contrast to bakery #1's elegant pastry focus — this is craft bread.
 */
export default function BakeryRusticTemplate({ data = mockBakeryRusticData }) {
  const { business, features, categories, items, specialOffers, tagline, info } = data
  const [activeCategory, setActiveCategory] = useState(categories[0].id)
  const [cartCount, setCartCount] = useState(0)

  const visibleItems = useMemo(
    () => items.filter((i) => i.category === activeCategory),
    [items, activeCategory]
  )

  const addToCart = () => setCartCount((c) => c + 1)

  return (
    <div className="min-h-screen bg-white text-[#3a2a1d]">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 bg-[#E8DCC8] border-b-2 border-[#C9A878]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#8B6F47] flex items-center justify-center text-white font-bold text-sm">🍞</div>
          <span className="text-sm font-bold text-[#3a2a1d]">INSIDE INSANE</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#home" className="hover:text-[#C9A878]">Home</a>
          <a href="#about" className="hover:text-[#C9A878]">About Us</a>
          <a href="#menu" className="hover:text-[#C9A878]">Shop</a>
          <a href="#contact" className="hover:text-[#C9A878]">Contact</a>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#3a2a1d] hidden sm:inline">9:30 AM - 8:30 PM</span>
          <button aria-label="Cart" className="relative w-5 h-5 text-[#3a2a1d] hover:text-[#A0764A]">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M 7 4 V 3 h 2 l 1 5 h 9 l 1.5 -3 h 2 l -1.5 3 v 10 c 0 1.1 -0.9 2 -2 2 H 6 c -1.1 0 -2 -0.9 -2 -2 V 4 Z M 9 19 c 1.1 0 2 0.9 2 2 s -0.9 2 -2 2 s -2 -0.9 -2 -2 s 0.9 -2 2 -2 Z m 8 0 c 1.1 0 2 0.9 2 2 s -0.9 2 -2 2 s -2 -0.9 -2 -2 s 0.9 -2 2 -2 Z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-[#A0764A] text-white text-[10px] font-bold">
                {cartCount}
              </span>
            )}
          </button>
          <a href="#menu" className="px-4 py-2 rounded-full bg-[#A0764A] text-white text-xs font-bold hover:bg-[#8B6F47]">
            ORDER NOW
          </a>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        id="home"
        className="relative min-h-[500px] md:min-h-[580px] bg-gradient-to-r from-[#D4A574] to-[#E8DCC8] px-6 md:px-16 py-16 flex items-center overflow-hidden"
      >
        {/* Wheat illustration background (SVG pattern) */}
        <div className="absolute right-0 top-0 w-96 h-full opacity-30 pointer-events-none">
          <svg viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Simple wheat stalks */}
            <path d="M 200 50 Q 210 150 200 250" stroke="#8B6F47" strokeWidth="2" />
            <path d="M 250 80 Q 260 180 250 280" stroke="#8B6F47" strokeWidth="2" />
            <path d="M 320 100 Q 330 200 320 300" stroke="#8B6F47" strokeWidth="2" />
            <path d="M 150 60 Q 140 160 150 260" stroke="#8B6F47" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center max-w-6xl w-full">
          {/* Left: Text + CTAs */}
          <div>
            <span className="text-xs font-bold tracking-widest text-[#8B6F47] uppercase">{business.tagline}</span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mt-3 text-[#3a2a1d]">
              {business.heroHeadline}<br /><span className="text-[#A0764A]">{business.heroHeadline2}</span>
            </h1>
            <p className="text-[#3a2a1d]/70 mt-4 max-w-md">{business.heroSub}</p>
            <div className="flex gap-3 mt-8">
              <a href="#menu" className="px-6 py-3 rounded-lg bg-[#A0764A] text-white font-bold hover:bg-[#8B6F47]">
                Order Now
              </a>
              <a href="#about" className="px-6 py-3 rounded-lg border-2 border-[#8B6F47] text-[#8B6F47] font-bold hover:bg-[#8B6F47]/10">
                {business.heroCTA1}
              </a>
            </div>
          </div>

          {/* Right: Hero bread image */}
          <div className="relative flex justify-center">
            <img src={business.heroImage} alt="Fresh bread" className="max-w-sm h-auto object-contain drop-shadow-xl" loading="lazy" />
            {/* Promo badge */}
            <div className="absolute -bottom-4 -left-8 bg-[#E8A856] rounded-full w-20 h-20 flex items-center justify-center shadow-lg border-4 border-white">
              <div className="text-center">
                <div className="text-xl font-black text-white">{business.promoDiscount}</div>
                <div className="text-[10px] font-bold text-[#3a2a1d]">Off</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES BAND ───────────────────────────────────────────────── */}
      <section className="bg-[#F5E6D3] px-6 md:px-16 py-8 border-y-2 border-[#C9A878]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.id} className="flex items-center gap-3 text-center md:text-left">
              <div className="w-8 h-8 text-[#A0764A] flex-shrink-0">{FEATURE_ICON[f.icon]}</div>
              <div className="text-sm">
                <div className="font-bold text-[#3a2a1d]">{f.title}</div>
                <div className="text-xs text-[#3a2a1d]/60">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES / ABOUT ────────────────────────────────────────────── */}
      <section id="about" className="px-6 md:px-16 py-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#A0764A] uppercase">Why Choose Us</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2 text-[#3a2a1d]">Good quality & passion<br />with our services.</h2>
            <p className="text-[#3a2a1d]/70 mt-4 text-sm">We are the bread experts that have been baking the finest quality breads for our beloved customers since 1995. Fresh baked every morning.</p>
            <a href="#menu" className="inline-block mt-6 px-6 py-3 rounded-lg bg-[#A0764A] text-white font-bold hover:bg-[#8B6F47]">
              Order Now
            </a>
          </div>
          <div className="relative">
            <img src={business.promoImage} alt="Fresh baked bread" className="w-full rounded-2xl shadow-xl object-cover h-80" loading="lazy" />
          </div>
        </div>
      </section>

      {/* ── MENU / ORDERING ─────────────────────────────────────────────── */}
      <section id="menu" className="px-6 md:px-16 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-black text-center text-[#3a2a1d] mb-10">Order Online</h2>

        {/* category tabs */}
        <div className="flex justify-center flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition ${
                activeCategory === cat.id
                  ? 'bg-[#A0764A] text-white border-[#A0764A]'
                  : 'bg-transparent text-[#3a2a1d] border-[#3a2a1d]/20 hover:border-[#A0764A]/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleItems.map((item) => (
            <article key={item.id} className="bg-[#F5E6D3] rounded-2xl overflow-hidden shadow-sm">
              <img src={item.image} alt={item.name} className="w-full h-36 object-cover" loading="lazy" />
              <div className="p-4">
                <h3 className="font-bold text-sm text-[#3a2a1d]">{item.name}</h3>
                <p className="text-xs text-[#3a2a1d]/55 mt-1 line-clamp-2">{item.desc}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-[#A0764A]">${item.price.toFixed(2)}</span>
                  <button
                    onClick={addToCart}
                    className="px-3 py-1.5 rounded-full bg-[#A0764A] text-white text-xs font-bold hover:bg-[#8B6F47]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── SPECIAL OFFERS ──────────────────────────────────────────────── */}
      <section className="bg-[#F5E6D3] px-6 md:px-16 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center text-[#3a2a1d] mb-12">Our Special Offers</h2>
          <div className="grid md:grid-cols-2 gap-8 items-end">
            {specialOffers.map((offer) => (
              <article key={offer.id} className="bg-white rounded-2xl overflow-hidden shadow-lg">
                <img src={offer.image} alt={offer.name} className="w-full h-48 object-cover" loading="lazy" />
                <div className="p-6">
                  <h3 className="font-bold text-[#3a2a1d] text-lg">{offer.name}</h3>
                  <p className="text-[#A0764A] text-sm font-semibold mt-1">{offer.subtitle}</p>
                  <button
                    onClick={addToCart}
                    className="mt-4 px-5 py-2 rounded-lg bg-[#E8A856] text-white text-sm font-bold hover:bg-[#D99A46]"
                  >
                    Add to Order →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── TAGLINE + CAKE ──────────────────────────────────────────────── */}
      <section className="relative bg-white px-6 md:px-16 py-12 text-center overflow-hidden">
        <h2 className="text-3xl md:text-4xl font-black text-[#3a2a1d]">{tagline}</h2>
        <p className="text-[#3a2a1d]/60 text-sm mt-2">Fresh baked, fresh served. Every single day.</p>
        {/* Decorative cake image bottom right */}
        <div className="absolute bottom-0 right-0 w-40 h-40 opacity-80">
          <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&q=80" alt="Cake" className="w-full h-full object-contain" loading="lazy" />
        </div>
      </section>

      {/* ── INFO ──────────────────────────────────────────────────────────── */}
      <section id="contact" className="bg-white px-6 md:px-16 py-14">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#A0764A] font-bold">Hours</div>
            <div className="mt-2 font-medium text-[#3a2a1d]">{info.hours}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-[#A0764A] font-bold">Location</div>
            <div className="mt-2 font-medium text-[#3a2a1d]">{info.address}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-[#A0764A] font-bold">Contact</div>
            <div className="mt-2 font-medium text-[#3a2a1d]">{info.phone}</div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#8B6F47] text-white/70 text-sm text-center py-8">
        © {new Date().getFullYear()} {business.name} — Powered by FoodSpot
      </footer>
    </div>
  )
}
