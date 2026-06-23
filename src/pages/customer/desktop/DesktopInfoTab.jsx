import { MapPin, Phone, Mail, Globe, Instagram, Facebook } from 'lucide-react'
import { useTenant } from '../../../contexts/TenantContext'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DEFAULT_HOURS = { Mon: '11:00 - 22:00', Tue: '11:00 - 22:00', Wed: '11:00 - 22:00', Thu: '11:00 - 22:00', Fri: '11:00 - 22:00', Sat: '11:00 - 22:00', Sun: '11:00 - 22:00' }

export default function DesktopInfoTab() {
    const { tenantData } = useTenant()

    const name = tenantData?.business_name || 'Restaurant'
    const address = tenantData?.address || tenantData?.store_address || '123 Main St, Buenos Aires'
    const phone = tenantData?.phone || tenantData?.telephone || '+54 11 1234 5678'
    const about = tenantData?.app_config?.about || tenantData?.description || 'Welcome to our restaurant. We serve authentic cuisine with quality ingredients.'
    const cuisine = tenantData?.app_config?.cuisine || tenantData?.app_config?.servesCuisine || 'International'
    const hours = tenantData?.app_config?.hours || DEFAULT_HOURS
    const lat = tenantData?.store_lat
    const lon = tenantData?.store_lon
    const social = tenantData?.app_config?.social_links || {}

    // Google Maps embed URL (static, no API key needed for basic embed)
    const mapsEmbedUrl = lat && lon
        ? `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${lon}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${lat},${lon}!5e0!3m2!1sen!2sus!4v1234567890`
        : null

    return (
        <div className="p-4 lg:p-6">
            {/* Header — Restaurant name + logo */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-[var(--canvas-text)] mb-3">{name}</h1>
                <div className="text-5xl">🍔</div>
            </div>

            {/* 2-column layout: 60% left, 40% right (responsive stack on tablet) */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-8">

                {/* LEFT COLUMN — Info cards */}
                <div className="space-y-5">

                    {/* Hours Card */}
                    <div
                        className="p-5 bg-[var(--canvas-surface)] rounded-lg shadow-sm"
                        style={{ borderRadius: 'var(--radius-card)' }}
                    >
                        <h3 className="font-bold text-lg text-[var(--canvas-text)] mb-4">Hours of Operation</h3>
                        <div className="space-y-2">
                            {DAYS.map((day) => {
                                const time = hours[day] || hours[day.toLowerCase()] || '11:00 - 22:00'
                                return (
                                    <div key={day} className="flex justify-between text-sm text-[var(--canvas-text)]">
                                        <span className="font-semibold">{day}</span>
                                        <span>{time}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Contact Details Card */}
                    <div
                        className="p-5 bg-[var(--canvas-surface)] rounded-lg shadow-sm space-y-4"
                        style={{ borderRadius: 'var(--radius-card)' }}
                    >
                        <h3 className="font-bold text-lg text-[var(--canvas-text)]">Contact Details</h3>
                        <div className="flex items-start gap-3">
                            <MapPin size={18} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                            <div className="text-sm text-[var(--canvas-text)]">{address}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone size={18} className="text-[var(--color-primary)] shrink-0" />
                            <a href={`tel:${phone}`} className="text-sm text-[var(--color-primary)] hover:underline">
                                {phone}
                            </a>
                        </div>
                    </div>

                    {/* About Us */}
                    <div>
                        <h3 className="font-bold text-lg text-[var(--canvas-text)] mb-2">About Us</h3>
                        <p className="text-sm text-[var(--canvas-text)] leading-relaxed">{about}</p>
                        {cuisine && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs font-semibold text-white px-3 py-1 rounded-full" style={{ background: 'var(--color-primary)' }}>
                                    {cuisine}
                                </span>
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN — Actions, social, map */}
                <div className="space-y-5">

                    {/* Action buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={() => alert('Help Center coming soon')}
                            className="w-full py-3 rounded-lg text-white font-bold text-sm transition-opacity hover:opacity-90"
                            style={{ background: 'var(--color-primary)' }}
                        >
                            Help Center
                        </button>
                        <button
                            onClick={() => window.location.href = `mailto:info@${name.toLowerCase().replace(/\s+/g, '')}.com`}
                            className="w-full py-3 rounded-lg text-white font-bold text-sm transition-opacity hover:opacity-90"
                            style={{ background: 'var(--color-primary)' }}
                        >
                            Contact Us
                        </button>
                        <button
                            onClick={() => alert('Policies & FAQ coming soon')}
                            className="w-full py-3 rounded-lg text-white font-bold text-sm transition-opacity hover:opacity-90"
                            style={{ background: 'var(--color-primary)' }}
                        >
                            Policies & FAQ
                        </button>
                    </div>

                    {/* Social links */}
                    {(social.instagram || social.facebook || social.tiktok) && (
                        <div>
                            <h4 className="font-bold text-sm text-[var(--canvas-text)] mb-3">Connect with Us</h4>
                            <div className="flex gap-3 justify-center">
                                {social.instagram && (
                                    <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                                        <Instagram size={20} />
                                    </a>
                                )}
                                {social.facebook && (
                                    <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                                        <Facebook size={20} />
                                    </a>
                                )}
                                {social.tiktok && (
                                    <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                                        <Globe size={20} />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Map embed */}
                    {mapsEmbedUrl ? (
                        <div className="rounded-lg overflow-hidden shadow-sm" style={{ borderRadius: 'var(--radius-card)' }}>
                            <iframe
                                width="100%"
                                height="300"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={mapsEmbedUrl}
                            />
                        </div>
                    ) : (
                        <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm" style={{ borderRadius: 'var(--radius-card)' }}>
                            Map not available
                        </div>
                    )}

                </div>

            </div>
        </div>
    )
}
