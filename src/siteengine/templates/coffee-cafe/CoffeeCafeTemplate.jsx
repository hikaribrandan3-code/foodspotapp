import React, { useMemo, useRef, useState } from 'react'
import { mockCafeData } from './mockData.js'

/**
 * SiteEngine — Coffee/Cafe template (first template built).
 *
 * Static visual pass: renders from mockCafeData. Data shape mirrors what a
 * real tenant's Supabase menu/app_config would provide, so swapping this
 * for a live data hook later is a drop-in change — no restructuring needed.
 *
 * Design reference: "Drinko" (warm beige/brown, carousel menu with category
 * pills, featured-drink promo banner).
 */
export default function CoffeeCafeTemplate({ data = mockCafeData }) {
  const { business, categories, items, featuredDrink } = data
  const [activeCategory, setActiveCategory] = useState(null) // null = all
  const [cartCount, setCartCount] = useState(0)
  const scrollerRef = useRef(null)

  const visibleItems = useMemo(
    () => (activeCategory ? items.filter((i) => i.category === activeCategory) : items),
    [items, activeCategory]
  )

  const scrollByRow = (dir) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white text-stone-900">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 bg-[#3b2a20] text-white">
        <span className="text-xl font-bold tracking-tight">{business.name}</span>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#home" className="hover:opacity-70">Home</a>
          <a href="#menu" className="hover:opacity-70">Menu</a>
          <a href="#delivery" className="hover:opacity-70">Delivery</a>
        </nav>
        <div className="flex items-center gap-4">
          <button aria-label="Favorites" className="hover:opacity-70">♡</button>
          <button aria-label="Account" className="hover:opacity-70">☺</button>
          <button aria-label="Cart" className="relative hover:opacity-70">
            🛍
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-[#c98a5e] text-[10px] font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        id="home"
        className="relative flex items-center justify-center min-h-[380px] md:min-h-[460px] bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(rgba(59,42,32,0.35), rgba(59,42,32,0.55)), url(${business.heroImage})` }}
      >
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-10 text-white text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">{business.heroHeadline.left}</h1>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">{business.heroHeadline.right}</h1>
        </div>
        <span className="absolute bottom-8 right-8 md:right-16 italic text-lg md:text-2xl text-white/90 font-serif">
          {business.tagline}
        </span>
      </section>

      {/* ── MENU ────────────────────────────────────────────────────────── */}
      <section id="menu" className="px-6 md:px-10 py-12 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#3b2a20]">Menu</h2>
            <span className="italic text-[#c98a5e] text-sm">drinks</span>
          </div>
          <button className="px-5 py-2 rounded-full bg-[#c98a5e] text-white text-sm font-semibold hover:bg-[#b57a4f]">
            my basket
          </button>
        </div>

        {/* category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
              activeCategory === null
                ? 'bg-[#c98a5e] text-white border-[#c98a5e]'
                : 'bg-transparent text-[#3b2a20] border-[#c98a5e]/50 hover:bg-[#c98a5e]/10'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                activeCategory === cat.id
                  ? 'bg-[#c98a5e] text-white border-[#c98a5e]'
                  : 'bg-transparent text-[#3b2a20] border-[#c98a5e]/50 hover:bg-[#c98a5e]/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* item carousel */}
        <div className="relative">
          <button
            onClick={() => scrollByRow(-1)}
            aria-label="Scroll left"
            className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md items-center justify-center text-[#3b2a20]"
          >
            ‹
          </button>
          <div ref={scrollerRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className="flex-shrink-0 w-[240px] snap-start bg-[#f4ede6] rounded-2xl p-4 flex flex-col items-center text-center"
              >
                <img src={item.image} alt={item.name} className="w-full h-32 object-cover rounded-xl mb-3" loading="lazy" />
                <h3 className="font-semibold text-[#3b2a20]">{item.name}</h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{item.desc}</p>
                <div className="flex items-center justify-between w-full mt-3">
                  <span className="font-bold text-[#3b2a20]">${item.price.toFixed(2)}</span>
                  <button
                    onClick={() => setCartCount((c) => c + 1)}
                    className="px-3 py-1.5 rounded-full bg-white border border-[#c98a5e] text-[#c98a5e] text-xs font-semibold hover:bg-[#c98a5e] hover:text-white transition"
                  >
                    to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button
            onClick={() => scrollByRow(1)}
            aria-label="Scroll right"
            className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md items-center justify-center text-[#3b2a20]"
          >
            ›
          </button>
        </div>

        <div className="flex justify-center mt-8">
          <button className="px-6 py-2.5 rounded-full bg-[#c98a5e] text-white text-sm font-semibold hover:bg-[#b57a4f]">
            More
          </button>
        </div>
      </section>

      {/* ── FEATURED DRINK PROMO ────────────────────────────────────────── */}
      <section className="bg-[#f7d6d9] px-6 md:px-16 py-14">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="italic text-[#3b2a20]/70 text-sm">{featuredDrink.label}</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#3b2a20] leading-tight">
              {featuredDrink.name}
            </h2>
            <p className="text-sm text-stone-700 mt-4 max-w-md">{featuredDrink.description}</p>

            <div className="flex items-center gap-3 mt-4">
              <span className="text-2xl font-bold text-[#3b2a20]">${featuredDrink.price.toFixed(2)}</span>
              <span className="text-base line-through text-stone-500">${featuredDrink.originalPrice.toFixed(2)}</span>
            </div>

            <div className="flex gap-8 mt-6">
              {featuredDrink.tags.map((tag, i) => (
                <div key={i}>
                  <div className="text-lg font-bold text-[#3b2a20]">{tag.label}</div>
                  <div className="text-xs text-stone-600 max-w-[110px]">{tag.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <img src={featuredDrink.image} alt={featuredDrink.name} className="w-64 h-64 object-cover rounded-2xl shadow-xl" loading="lazy" />
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer id="delivery" className="bg-[#3b2a20] text-white/70 text-sm text-center py-8">
        © {new Date().getFullYear()} {business.name} — Powered by FoodSpot
      </footer>
    </div>
  )
}
