import React, { useMemo, useState } from 'react'
import { mockBurgerData } from './mockData.js'

const BADGE_STYLE = {
  'Best Seller': 'bg-yellow-400 text-red-900',
  'Spicy':       'bg-orange-500 text-white',
  'Hot Deal':    'bg-red-600 text-white',
  'New':         'bg-emerald-500 text-white',
}

/**
 * SiteEngine — Burger/QSR template (second template built).
 *
 * Static visual pass from mockBurgerData — same contract pattern as the
 * Coffee/Cafe template. Design combines three references: bold red/yellow
 * hero + highlight banners ("Mokr"/"Burguer Mania" style) and a live cart
 * sidebar with order summary breakdown ("Burger District Dubai" style).
 */
export default function BurgerQsrTemplate({ data = mockBurgerData }) {
  const { business, highlights, categories, items, cart } = data
  const [activeCategory, setActiveCategory] = useState(null) // null = all
  const [cartItems, setCartItems] = useState(cart.items)

  const visibleItems = useMemo(
    () => (activeCategory ? items.filter((i) => i.category === activeCategory) : items),
    [items, activeCategory]
  )

  const addToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
      return [...prev, { id: item.id, name: item.name, qty: 1, price: item.price }]
    })
  }

  const subtotal = cartItems.reduce((sum, c) => sum + c.price * c.qty, 0)
  const tax = subtotal * cart.taxRate
  const total = subtotal + cart.deliveryFee + tax

  return (
    <div className="min-h-screen bg-[#fdf6f0] text-stone-900">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 bg-[#1a0f0d] text-white">
        <span className="text-xl font-extrabold tracking-tight text-yellow-400">{business.name}</span>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
          <a href="#home" className="hover:text-yellow-400">Home</a>
          <a href="#menu" className="hover:text-yellow-400">Menu</a>
          <a href="#offers" className="hover:text-yellow-400">Offers</a>
          <a href="#about" className="hover:text-yellow-400">About</a>
          <a href="#contact" className="hover:text-yellow-400">Contact</a>
        </nav>
        <div className="flex items-center gap-4">
          <button aria-label="Search" className="hover:text-yellow-400">⌕</button>
          <button aria-label="Cart" className="relative hover:text-yellow-400">
            🛒
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-red-600 text-[10px] font-bold">
                {cartItems.length}
              </span>
            )}
          </button>
          <button className="px-4 py-2 rounded-full bg-yellow-400 text-red-900 text-sm font-bold hover:bg-yellow-300">
            Order Now
          </button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────────
          Bigger and bolder — dominant hero photo, huge headline, solid CTA.
          Reference: "Mokr" (burgernewmain.png) — full-bleed red band, hero
          burger scaled large and bleeding past its column, stacked bold
          white headline instead of a smaller two-column card. ──────────── */}
      <section id="home" className="relative overflow-hidden bg-gradient-to-b from-red-700 to-red-800 text-white">
        <div className="max-w-6xl mx-auto px-6 md:px-16 py-14 md:py-20 grid md:grid-cols-[1.1fr_1fr] gap-6 items-center">
          <div className="relative z-10">
            <span className="text-yellow-300 font-bold tracking-wide text-sm uppercase">{business.heroEyebrow}</span>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.02] mt-3">{business.heroHeadline}</h1>
            <p className="text-white/85 mt-5 max-w-md text-lg">{business.heroSub}</p>
            <div className="flex gap-3 mt-8">
              <button className="px-7 py-3.5 rounded-full bg-yellow-400 text-red-900 font-bold text-lg hover:bg-yellow-300 shadow-lg shadow-black/20">
                Order Now
              </button>
              <button className="px-7 py-3.5 rounded-full border-2 border-white/70 text-white font-bold text-lg hover:bg-white/10">
                View Menu
              </button>
            </div>
          </div>
          <div className="relative flex justify-center md:justify-end">
            <img
              src={business.heroImage}
              alt={business.name}
              className="w-full max-w-lg md:max-w-none md:w-[130%] md:-mr-10 rounded-full object-cover aspect-square shadow-2xl"
              loading="lazy"
            />
          </div>
        </div>
        {/* subtle bottom curve to separate hero from the highlight cards, echoing Mokr's pointer/notch transition */}
        <div className="absolute -bottom-1 left-0 right-0 h-8 bg-[#fdf6f0]" style={{ clipPath: 'ellipse(60% 100% at 50% 100%)' }} />
      </section>

      {/* ── HIGHLIGHT BANNERS ───────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-10 max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
        {highlights.map((h) => (
          <div
            key={h.id}
            className="relative rounded-2xl overflow-hidden h-40 flex items-end p-4 text-white"
            style={{ backgroundImage: `linear-gradient(rgba(20,10,8,0.15), rgba(20,10,8,0.75)), url(${h.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div>
              <div className="text-xs uppercase tracking-wide text-yellow-400 font-bold">{h.subtitle}</div>
              <div className="text-xl font-extrabold">{h.title}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ── MENU + CART ─────────────────────────────────────────────────── */}
      <section id="menu" className="px-6 md:px-10 py-6 max-w-6xl mx-auto grid lg:grid-cols-[1fr_300px] gap-8 items-start">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-red-800 mb-4">Our Menu</h2>

          {/* category tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                activeCategory === null
                  ? 'bg-red-700 text-white border-red-700'
                  : 'bg-white text-red-700 border-red-700/40 hover:bg-red-50'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                  activeCategory === cat.id
                    ? 'bg-red-700 text-white border-red-700'
                    : 'bg-white text-red-700 border-red-700/40 hover:bg-red-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* item grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {visibleItems.map((item) => (
              <article key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100">
                <div className="relative">
                  <img src={item.image} alt={item.name} className="w-full h-36 object-cover" loading="lazy" />
                  {item.badge && (
                    <span className={`absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase ${BADGE_STYLE[item.badge] || 'bg-stone-800 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-stone-900">{item.name}</h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">{item.desc}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-extrabold text-red-800">${item.price}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="px-3 py-1.5 rounded-full bg-yellow-400 text-red-900 text-xs font-bold hover:bg-yellow-300"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ── LIVE CART SIDEBAR ──────────────────────────────────────────── */}
        <aside className="bg-[#1a0f0d] text-white rounded-2xl p-5 sticky top-6">
          <h3 className="font-bold text-lg mb-4">Your Cart <span className="text-white/50 text-sm font-normal">({cartItems.length} items)</span></h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {cartItems.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-white/50 text-xs">Qty {c.qty}</div>
                </div>
                <span className="font-bold text-yellow-400">${(c.price * c.qty).toFixed(2)}</span>
              </div>
            ))}
            {cartItems.length === 0 && <p className="text-white/50 text-sm">Your cart is empty.</p>}
          </div>

          <div className="border-t border-white/15 mt-4 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-white/70"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-white/70"><span>Delivery Fee</span><span>${cart.deliveryFee.toFixed(2)}</span></div>
            <div className="flex justify-between text-white/70"><span>VAT ({(cart.taxRate * 100).toFixed(0)}%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-white/15 mt-2">
              <span>Total</span><span className="text-yellow-400">${total.toFixed(2)}</span>
            </div>
          </div>

          <button className="w-full mt-5 py-3 rounded-full bg-yellow-400 text-red-900 font-bold hover:bg-yellow-300">
            Checkout Securely
          </button>
        </aside>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer id="contact" className="bg-[#1a0f0d] text-white/60 text-sm text-center py-8 mt-10">
        © {new Date().getFullYear()} {business.name} — Powered by FoodSpot
      </footer>
    </div>
  )
}
