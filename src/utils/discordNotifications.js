/**
 * Send payment request to Discord webhook for delivery orders
 */
export const sendPaymentRequestToDiscord = async (webhookUrl, orderData) => {
    if (!webhookUrl) {
        console.warn('Discord webhook URL not configured')
        return { success: false, error: 'Webhook not configured' }
    }

    try {
        const embed = {
            title: `💳 Payment Due – Order #${orderData.orderNumber}`,
            description: `${orderData.customerName} is waiting for payment`,
            color: 16753920, // Orange
            fields: [
                {
                    name: 'Amount',
                    value: `$${orderData.total.toFixed(2)}`,
                    inline: true
                },
                {
                    name: 'Type',
                    value: orderData.paymentMethod === 'cash' ? 'Cash' : 'MP Alias',
                    inline: true
                },
                {
                    name: 'Address',
                    value: orderData.deliveryAddress || 'N/A',
                    inline: false
                },
                {
                    name: 'Phone',
                    value: orderData.customerPhone || 'N/A',
                    inline: true
                },
                {
                    name: 'Items',
                    value: `${orderData.itemCount} items`,
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        })

        if (!response.ok) {
            throw new Error(`Discord API error: ${response.status}`)
        }

        return { success: true }
    } catch (err) {
        console.error('Failed to send Discord notification:', err)
        return { success: false, error: err.message }
    }
}
