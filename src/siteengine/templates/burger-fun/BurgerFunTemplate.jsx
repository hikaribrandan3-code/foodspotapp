import React, { useState } from 'react'
import { mockBurgerFunData } from './mockData.js'

/**
 * SiteEngine — Burger Fun template (fifth template built).
 *
 * Static visual pass from mockBurgerFunData. Design reference: burgermain3.png
 * (fun, playful, casual burger joint with green/orange palette, "YUMMY" speech
 * bubble, 3-burger showcase, testimonials). Third burger variant — sharp contrast
 * to burger-qsr and burger-dark. Community-focused, lighthearted, approachable.
 */
export default function BurgerFunTemplate({ data = mockBurgerFunData }) {
  const { business, featured, testimonials, mentions } = data
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const prevTestimonial = () => setActiveTestimonial((i) => (i - 1 + testimonials.length) % testimonials.length)
  const nextTestimonial = () => setActiveTestimonial((i) => (i + 1) % testimonials.length)

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 bg-[#1f5a4a] text-white">
        <nav className="flex items-center gap-8 text-sm font-semibold">
          <a href="#home" className="hover:text-[#ff8c00]">HOME</a>
          <a href="#shop" className="hover:text-[#ff8c00]">SHOP</a>
          <a href="#pages" className="hover:text-[#ff8c00]">PAGES</a>
          <a href="#blog" className="hover:text-[#ff8c00]">BLOG</a>
          <a href="#contact" className="hover:text-[#ff8c00]">CONTACT</a>
        </nav>
        <span className="text-2xl font-black text-[#ff8c00]">{business.name}</span>
        <div className="flex items-center gap-3 text-lg">
          <button aria-label="Search">🔍</button>
          <button aria-label="Account">👤</button>
          <button aria-label="Wishlist">❤️</button>
          <button className="relative">🛒<span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-[#ff8c00] text-white text-xs font-bold">0</span></button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        id="home"
        className="relative min-h-[500px] md:min-h-[600px] flex items-center overflow-hidden"
        style={{
          background: 'linear-gradient(to right, #1f5a4a 0%, #1f5a4a 45%, #ffc107 45%, #ffc107 100%)',
        }}
      >
        {/* Left side: text + CTA */}
        <div className="relative z-10 px-6 md:px-16 w-full md:w-1/2 text-white">
          {/* burger icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">{business.heroIcon}</div>
            <span className="text-sm font-bold uppercase tracking-widest text-[#ff8c00]">Fresh Burgers Daily</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-4">
            {business.heroHeadline}<br />{business.heroHeadline2}
          </h1>
          <p className="text-white/80 max-w-sm mb-6 text-sm">{business.heroSub}</p>
          <button className="px-8 py-3 rounded-full bg-[#ff8c00] text-white font-bold hover:bg-[#e67e00] uppercase tracking-wide">
            ORDER NOW
          </button>
        </div>

        {/* Right side: hero burger image with bubble + badge */}
        <div className="relative hidden md:flex w-1/2 items-center justify-end pr-10 h-full">
          {/* yellow background bubble */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-yellow-300/30 blur-3xl" />

          {/* hero burger */}
          <img
            src={business.heroImage}
            alt={business.name}
            className="relative z-10 max-w-sm drop-shadow-2xl object-contain"
            loading="lazy"
          />

          {/* YUMMY speech bubble */}
          <div className="absolute top-20 right-40 bg-yellow-300 rounded-full px-6 py-3 transform -rotate-12 shadow-lg">
            <div className="text-2xl font-black text-[#1a1a1a] italic">{business.heroBubble}</div>
            <div className="absolute bottom-0 left-4 w-4 h-4 bg-yellow-300 rounded-full transform translate-y-4" />
          </div>

          {/* Badge */}
          <div className="absolute bottom-20 right-20 bg-[#1f5a4a] text-white rounded-full px-6 py-4 text-center border-4 border-[#ff8c00] shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wide">{business.heroBadge}</div>
          </div>
        </div>

        {/* carousel indicators (01, 04) */}
        <div className="absolute bottom-8 right-8 text-white/40 text-sm tracking-widest">
          <div>01</div>
          <div>04</div>
        </div>
      </section>

      {/* ── FEATURED BURGERS ───────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-16 max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-black mb-2" style={{ color: '#ff8c00' }}>{business.name}</h2>
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {featured.map((burger) => (
            <article key={burger.id} className="text-center">
              <img src={burger.image} alt={burger.name} className="w-full h-64 object-cover rounded-2xl shadow-lg mb-4" loading="lazy" />
              <h3 className="text-lg font-black text-[#1a1a1a] mb-1">{burger.name}</h3>
              <p className="text-[#ff8c00] font-bold text-sm">{burger.subtitle}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── WAVY SEPARATOR ─────────────────────────────────────────────── */}
      <div className="h-12 bg-[#ff8c00]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 100%)' }} />

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="bg-[#ff8c00] px-6 md:px-16 py-16 text-white">
        <h2 className="text-3xl font-black text-center mb-12 uppercase tracking-wide">What Our Fans Say</h2>

        <div className="max-w-3xl mx-auto relative">
          {/* testimonial card */}
          <div className="bg-[#ff6600] rounded-2xl p-8 md:p-12 text-center min-h-[200px] flex flex-col justify-center items-center">
            <p className="text-lg md:text-xl font-medium mb-6 italic">"{testimonials[activeTestimonial].quote}"</p>
            <div className="flex justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-2xl">⭐</span>
              ))}
            </div>
            <div className="text-sm font-bold">{testimonials[activeTestimonial].author}</div>
            <div className="text-xs opacity-80">{testimonials[activeTestimonial].source}</div>
          </div>

          {/* nav buttons */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 rounded-full bg-white text-[#ff8c00] flex items-center justify-center font-bold text-xl hover:bg-[#ff6600]"
          >
            ‹
          </button>
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 rounded-full bg-white text-[#ff8c00] flex items-center justify-center font-bold text-xl hover:bg-[#ff6600]"
          >
            ›
          </button>

          {/* dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`w-3 h-3 rounded-full transition ${i === activeTestimonial ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </div>

        {/* mentions */}
        <div className="mt-16 pt-8 border-t border-white/30 text-center">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
            {mentions.map((m) => (
              <div key={m.name} className="text-xs font-bold text-white/80 flex flex-col items-center gap-1">
                <span className="text-2xl">{m.logo}</span>
                {m.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#1f5a4a] text-white/60 text-sm text-center py-8">
        © {new Date().getFullYear()} {business.name} — Powered by FoodSpot
      </footer>
    </div>
  )
}
