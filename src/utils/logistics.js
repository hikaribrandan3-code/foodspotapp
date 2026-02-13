export const formatAddressForDisplay = (addressData) => {
    if (!addressData) return 'Sin dirección'

    // LEGACY: If it's a simple string, return it as is
    if (typeof addressData === 'string') {
        try {
            // Try to parse just in case it's a JSON string
            const parsed = JSON.parse(addressData)
            if (parsed && typeof parsed === 'object') {
                addressData = parsed
            } else {
                return addressData
            }
        } catch (e) {
            return addressData
        }
    }

    // STRUCTURED: Street + Number (Floor)
    const { street, number, floor, notes } = addressData
    let display = `${street} ${number}`
    if (floor) display += ` (${floor})`
    return display
}

export const getAddressNotes = (addressData) => {
    if (!addressData || typeof addressData === 'string') return ''
    return addressData.notes || ''
}

export const generateMapsLink = (addressData) => {
    if (!addressData) return ''

    let query = ''
    if (typeof addressData === 'string') {
        query = addressData
    } else {
        const { street, number, city = '', state = '' } = addressData
        query = `${street} ${number}, ${city}, ${state}`
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export const generateDriverMessage = (order) => {
    const address = formatAddressForDisplay(order.delivery_address)
    const notes = getAddressNotes(order.delivery_address)
    const mapLink = generateMapsLink(order.delivery_address)

    return `🚀 PEDIDO #${order.order_number}
📍 Sede: ${address}
${notes ? `📝 Nota: ${notes}` : ''}
🗺️ Mapa: ${mapLink}
📞 Cliente: ${order.customer_phone}
💰 Total: $${order.total}`
}
