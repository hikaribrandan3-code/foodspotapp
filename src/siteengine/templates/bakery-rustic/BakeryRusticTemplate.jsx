import React from 'react'
import { mockBakeryRusticData } from './mockData.js'

/**
 * SiteEngine — Bakery Rustic template (sixth template built).
 *
 * Static visual pass from mockBakeryRusticData. Design reference: bakery2.png
 * (rustic artisanal bread-focused bakery with warm brown/orange palette,
 * sourdough hero, hand-drawn wheat illustrations, quality & service messaging).
 * Sharp contrast to bakery #1's elegant pastry focus — this is craft bread.
 */
export default function BakeryRusticTemplate({ data = mockBakeryRusticData }) {
  const { business, features, specialOffers, tagline } = data

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
          <a href="#shop" className="hover:text-[#C9A878]">Shop</a>
          <a href="#blog" className="hover:text-[#C9A878]">Blog</a>
          <a href="#contact" className="hover:text-[#C9A878]">Contact</a>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#3a2a1d]">9:30 AM - 8:30 PM</span>
          <button className="px-4 py-2 rounded-full bg-[#A0764A] text-white text-xs font-bold hover:bg-[#8B6F47]">
            ORDER NOW
          </button>
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
              <button className="px-6 py-3 rounded-lg bg-[#A0764A] text-white font-bold hover:bg-[#8B6F47]">
                {business.heroCTA1}
              </button>
              <button className="px-6 py-3 rounded-lg border-2 border-[#8B6F47] text-[#8B6F47] font-bold hover:bg-[#8B6F47]/10">
                {business.heroCTA2}
              </button>
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
              <div className="text-3xl">{f.icon}</div>
              <div className="text-sm">
                <div className="font-bold text-[#3a2a1d]">{f.title}</div>
                <div className="text-xs text-[#3a2a1d]/60">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────────────────────────– */}
      <section className="px-6 md:px-16 py-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#A0764A] uppercase">Why Choose Us</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2 text-[#3a2a1d]">Good quality & passion<br />with our services.</h2>
            <p className="text-[#3a2a1d]/70 mt-4 text-sm">We are the bread experts that have been baking the finest quality breads for our beloved customers since 1995. Fresh baked every morning.</p>
            <button className="mt-6 px-6 py-3 rounded-lg bg-[#A0764A] text-white font-bold hover:bg-[#8B6F47]">
              Learn More
            </button>
          </div>
          <div className="relative">
            <img src={business.promoImage} alt="Fresh baked bread" className="w-full rounded-2xl shadow-xl object-cover h-80" loading="lazy" />
          </div>
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
                  <button className="mt-4 px-5 py-2 rounded-lg bg-[#E8A856] text-white text-sm font-bold hover:bg-[#D99A46]">
                    Shop Now →
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

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#8B6F47] text-white/70 text-sm text-center py-8">
        © {new Date().getFullYear()} {business.name} — Powered by FoodSpot
      </footer>
    </div>
  )
}
