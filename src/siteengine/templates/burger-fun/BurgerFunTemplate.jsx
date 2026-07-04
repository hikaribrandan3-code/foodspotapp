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
        <div className="flex items-center gap-4">
          {/* SVG search icon */}
          <button aria-label="Search" className="w-5 h-5 hover:text-[#ff8c00]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          {/* SVG account icon */}
          <button aria-label="Account" className="w-5 h-5 hover:text-[#ff8c00]">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="8" r="4" />
              <path d="M 12 14 C 7 14 4 16 4 20 v 2 h 16 v -2 c 0 -4 -3 -6 -8 -6 Z" />
            </svg>
          </button>
          {/* SVG heart icon */}
          <button aria-label="Wishlist" className="w-5 h-5 hover:text-[#ff8c00]">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M 12 21.35 l -1.45 -1.32 C 5.4 15.36 2 12.28 2 8.5 C 2 5.42 4.42 3 7.5 3 c 1.74 0 3.41 0.81 4.5 2.09 C 13.09 3.81 14.76 3 16.5 3 C 19.58 3 22 5.42 22 8.5 c 0 3.78 -3.4 6.86 -8.55 11.54 L 12 21.35 Z" />
            </svg>
          </button>
          {/* SVG cart icon */}
          <button aria-label="Cart" className="relative w-5 h-5 hover:text-[#ff8c00]">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M 7 4 V 3 h 2 l 1 5 h 9 l 1.5 -3 h 2 l -1.5 3 v 10 c 0 1.1 -0.9 2 -2 2 H 6 c -1.1 0 -2 -0.9 -2 -2 V 4 Z M 9 19 c 1.1 0 2 0.9 2 2 s -0.9 2 -2 2 s -2 -0.9 -2 -2 s 0.9 -2 2 -2 Z m 8 0 c 1.1 0 2 0.9 2 2 s -0.9 2 -2 2 s -2 -0.9 -2 -2 s 0.9 -2 2 -2 Z" />
            </svg>
            <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-[#ff8c00] text-white text-[10px] font-bold">0</span>
          </button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section id="home" className="relative min-h-[500px] md:min-h-[600px]">
        <div className="absolute inset-0 grid grid-cols-2">
          {/* Left: green */}
          <div className="bg-[#1f5a4a]" />
          {/* Right: yellow */}
          <div className="bg-[#ffc107]" />
        </div>

        <div className="relative z-10 h-full flex items-center">
          {/* Left side: text + CTA */}
          <div className="w-1/2 px-6 md:px-16 text-white">
            {/* burger icon + label */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{business.heroIcon}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#ff8c00]">Fresh Burgers Daily</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black leading-tight mb-4">
              {business.heroHeadline}<br />{business.heroHeadline2}
            </h1>
            <p className="text-white/80 max-w-sm mb-6 text-sm">{business.heroSub}</p>
            <button className="px-8 py-3 rounded-full bg-[#ff8c00] text-white font-bold hover:bg-[#e67e00] uppercase tracking-wide">
              ORDER NOW
            </button>
          </div>

          {/* Right side: hero burger with bubble + badge */}
          <div className="relative w-1/2 h-full flex items-center justify-center px-8 overflow-hidden">
            {/* hero burger image — LARGE, dominates yellow space */}
            <img
              src={business.heroImage}
              alt={business.name}
              className="w-[500px] h-auto object-contain drop-shadow-2xl"
              loading="lazy"
            />

            {/* YUMMY speech bubble — positioned top right of burger */}
            <div className="absolute top-24 right-20 bg-yellow-300 rounded-full px-8 py-4 transform -rotate-12 shadow-lg">
              <div className="text-3xl font-black text-[#1a1a1a] italic">{business.heroBubble}</div>
              <div className="absolute bottom-0 left-6 w-5 h-5 bg-yellow-300 rounded-full transform translate-y-5" />
            </div>

            {/* Badge — positioned bottom right of burger */}
            <div className="absolute bottom-32 right-8 bg-[#1f5a4a] text-white rounded-full px-6 py-5 text-center border-4 border-[#ff8c00] shadow-lg">
              <div className="text-xs font-bold uppercase tracking-wide leading-tight">{business.heroBadge}</div>
            </div>

            {/* Carousel indicators (01, 04) */}
            <div className="absolute bottom-12 right-12 text-white/30 text-sm tracking-widest font-bold">
              <div>01</div>
              <div>04</div>
            </div>
          </div>
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
                <svg key={i} className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M 12 2 l 3.09 6.26 L 22 9.27 l -5 4.87 l 1.18 6.88 L 12 17.77 l -6.18 3.25 L 7 14.14 L 2 9.27 l 6.91 -1.01 L 12 2 Z" />
                </svg>
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

        {/* mentions — SVG placeholders */}
        <div className="mt-16 pt-8 border-t border-white/30 text-center">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
            {mentions.map((m) => (
              <div key={m.name} className="text-xs font-bold text-white/80 flex flex-col items-center gap-2">
                {/* SVG placeholder circles for logos */}
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">
                  {m.name.slice(0, 1)}
                </div>
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
