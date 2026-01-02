import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addToCurrentOrder, getRewards } from '../../utils/storage.js'
import { formatPrice } from '../../config/menuData.js'

// ============================================
// PROMOS PAGE - McDonald's Vibe UI
// ============================================

// Calculate Happy Hour end time (2 hours from now)
function getHappyHourEnd() {
    const end = new Date()
    end.setHours(end.getHours() + 2)
    return end
}

// Promo data (McDonald's Vibe)
const PROMO_DATA = {
    headerTitle: 'DELIVERY HAPPY HOUR',
    weeklySpecial: {
        id: 'weekly-boss',
        title: 'WEEKLY SPECIAL',
        name: 'Double Stack "The Boss"',
        description: 'Double patty, special sauce, crispy bacon',
        price: 1499,
        originalPrice: 1899,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop'
    },
    feastBundles: [
        {
            id: 'feast-crispy',
            title: 'Feast Bundle',
            subtitle: 'Crispy Bucket Feast',
            description: '8pc Crispy Chicken + Fries + Drinks',
            price: 2499,
            borderColor: 'border-[#DC2626]',
            bgColor: 'bg-red-50',
            image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=300&h=300&fit=crop'
        },
        {
            id: 'feast-taco',
            title: 'Family Crnete',
            subtitle: 'Taco Tuesday Pack',
            description: '6 Tacos + Nachos + Salsa',
            price: 1899,
            borderColor: 'border-[#FCD34D]',
            bgColor: 'bg-yellow-50',
            image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&h=300&fit=crop'
        },
        {
            id: 'feast-game',
            title: 'Feast Bundle',
            subtitle: 'Game Night Combo',
            description: 'Pizza + Wings + 2L Soda',
            price: 2199,
            borderColor: 'border-[#F97316]',
            bgColor: 'bg-orange-50',
            image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=300&fit=crop'
        }
    ]
}

// RewardsPill Component (Black Sticky Punch Card)
function RewardsPill({ stamps, total }) {
    if (stamps === 0) return null

    return (
        <div className="fixed bottom-20 left-4 right-4 bg-black rounded-2xl p-4 shadow-xl z-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FCD34D] rounded-full flex items-center justify-center">
                        <span className="text-black font-bold">{stamps}</span>
                    </div>
                    <div>
                        <p className="text-white font-semibold text-sm">Punch Card</p>
                        <p className="text-gray-400 text-xs">{total - stamps} more for free item!</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    {Array.from({ length: total }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${i < stamps ? 'bg-[#FCD34D]' : 'bg-gray-600'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

function Promos({ config }) {
    const navigate = useNavigate()
    const [timeRemaining, setTimeRemaining] = useState('')
    const [happyHourEnd] = useState(() => getHappyHourEnd())
    const [rewards] = useState(() => getRewards())

    // Countdown timer
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date()
            const diff = happyHourEnd - now

            if (diff <= 0) {
                setTimeRemaining('00:00:00')
                return
            }

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            setTimeRemaining(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            )
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [happyHourEnd])

    // Add item to cart handler
    const handleAddToCart = (item) => {
        const cartItem = {
            id: item.id,
            name: item.name || item.subtitle,
            price: item.price,
            quantity: 1,
            image: item.image
        }
        addToCurrentOrder(cartItem)
        navigate('/order')
    }

    const { weeklySpecial, feastBundles, headerTitle } = PROMO_DATA
    const rewardsEnabled = config?.features?.rewardsEnabled
    const currentStamps = rewards?.stamps || 0
    const stampsRequired = config?.rewards?.stampsRequired || 10

    return (
        <div className="min-h-screen bg-white pb-64">
            {/* === RED HEADER WITH SWIRL PATTERN === */}
            <header className="bg-[#DB0007] relative overflow-hidden pb-10 pt-4">
                {/* Decorative swirl pattern */}
                <div className="absolute inset-0 opacity-20">
                    <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                        <path d="M0,100 Q100,50 200,100 T400,100" fill="none" stroke="#8B0000" strokeWidth="40" />
                        <path d="M0,150 Q100,100 200,150 T400,150" fill="none" stroke="#8B0000" strokeWidth="30" />
                    </svg>
                </div>

                {/* Header Title */}
                <h1 className="relative z-10 text-center font-black text-2xl md:text-3xl tracking-wide"
                    style={{
                        color: '#FCD34D',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.4), 0 0 20px rgba(252,211,77,0.3)'
                    }}>
                    {headerTitle}
                </h1>

                {/* LCD Countdown Timer */}
                <div className="relative z-10 text-center mt-4">
                    <div className="font-mono text-6xl md:text-7xl font-bold tracking-wider"
                        style={{
                            color: '#FCD34D',
                            textShadow: '0 0 10px rgba(252,211,77,0.5), 0 0 30px rgba(252,211,77,0.3)',
                            fontFamily: "'Courier New', monospace"
                        }}>
                        {timeRemaining}
                    </div>
                </div>
            </header>

            {/* === WHITE SHEET BODY === */}
            <main className="bg-white rounded-t-[40px] -mt-24 relative z-10 px-4 pt-6">
                {/* Weekly Special Section */}
                <h2 className="text-xl font-bold text-gray-900 mb-4">WEEKLY SPECIAL</h2>

                <div className="relative border-4 border-[#FCD34D] rounded-2xl overflow-hidden mb-8">
                    {/* Hero Image */}
                    <div className="aspect-[16/10] relative">
                        <img
                            src={weeklySpecial.image}
                            alt={weeklySpecial.name}
                            className="w-full h-full object-cover"
                        />

                        {/* Add Button */}
                        <button
                            onClick={() => handleAddToCart(weeklySpecial)}
                            className="absolute bottom-4 right-4 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold px-6 py-3 rounded-full shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                        >
                            <span className="text-xl">+</span>
                            <span>ADD</span>
                        </button>
                    </div>

                    {/* Price Badge */}
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-lg px-3 py-2 shadow-md">
                        <p className="text-xs text-gray-500 line-through">{formatPrice(weeklySpecial.originalPrice)}</p>
                        <p className="text-lg font-bold text-[#DB0007]">{formatPrice(weeklySpecial.price)}</p>
                    </div>
                </div>

                {/* Feast Bundle Section */}
                <h3 className="text-lg font-bold text-gray-900 mb-4">Feast Bundle Triple-Threat</h3>

                {/* Horizontal Scroll Container */}
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 touch-pan-x">
                    {feastBundles.map((bundle) => (
                        <div
                            key={bundle.id}
                            className={`flex-shrink-0 w-40 snap-start ${bundle.bgColor} border-2 ${bundle.borderColor} rounded-2xl overflow-hidden`}
                        >
                            {/* Bundle Image */}
                            <div className="aspect-square relative">
                                <img
                                    src={bundle.image}
                                    alt={bundle.subtitle}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Bundle Info */}
                            <div className="p-3">
                                <p className="font-bold text-sm text-gray-900 truncate">{bundle.title}</p>
                                <p className="text-xs text-gray-500 truncate">{bundle.subtitle}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="font-bold text-[#DB0007]">{formatPrice(bundle.price)}</p>
                                    <button
                                        onClick={() => handleAddToCart(bundle)}
                                        className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold px-3 py-1.5 rounded-full transition-transform active:scale-95"
                                    >
                                        +ADD
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Extra spacing for RewardsPill */}
                {rewardsEnabled && <div className="h-20" />}
            </main>

            {/* === REWARDS PILL (Conditional) === */}
            {rewardsEnabled && (
                <RewardsPill stamps={currentStamps} total={stampsRequired} />
            )}
        </div>
    )
}

export default Promos
