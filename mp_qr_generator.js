// Mercado Pago QR Generator for FoodSpot-OS
// Uses Sandbox credentials

const MP_ACCESS_TOKEN = 'APP_USR-7137506006398248-020514-048ecd19a32b3e8c9fcbaa20d16ca2ea-3183605674';
const MP_PUBLIC_KEY = 'APP_USR-5e368f55-f4d2-4846-8c17-f9606e823492';

/**
 * Generate Mercado Pago Checkout Preference for QR Code
 * @param {Object} orderData - Order details
 * @param {string} orderData.external_reference - Unique order reference
 * @param {number} orderData.total_amount - Total amount in cents
 * @param {string} orderData.currency - Currency code (default: USD)
 * @param {string} orderData.description - Order description
 * @param {string} orderData.success_url - Redirect URL after payment
 * @param {string} orderData.failure_url - Redirect URL on failure
 */
async function generatePaymentQR(orderData) {
    const {
        external_reference,
        total_amount,
        currency = 'USD',
        description = 'FoodSpot Order',
        success_url,
        failure_url
    } = orderData;

    const amount_decimal = total_amount / 100;

    const preferenceData = {
        items: [{
            title: description,
            unit_price: amount_decimal,
            quantity: 1,
            currency_id: currency
        }],
        external_reference: external_reference,
        notification_url: `${process.env.WEBHOOK_URL || 'https://your-domain.com'}/api/webhooks/mercado-pago`,
        back_urls: {
            success: success_url || 'https://your-domain.com/payment/success',
            failure: failure_url || 'https://your-domain.com/payment/failure',
            pending: success_url || 'https://your-domain.com/payment/pending'
        },
        auto_return: 'approved',
        payment_methods: {
            excluded_payment_types: [],
            installments: 1
        }
    };

    try {
        console.log('🔄 Creating Mercado Pago preference...');
        
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferenceData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`MP API Error: ${error.message || response.statusText}`);
        }

        const data = await response.json();
        
        console.log('✅ Preference created!');
        console.log('   Preference ID:', data.id);
        console.log('   Init Point:', data.init_point);
        
        return {
            success: true,
            preference_id: data.id,
            qr_url: data.init_point, // This is the URL for QR generation
            external_reference: external_reference,
            sandbox_url: data.sandbox_init_point // For testing
        };

    } catch (error) {
        console.error('❌ Failed to create preference:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test the QR generation with Ghost Burger
 */
async function testGhostBurgerQR() {
    console.log('\n🍔 GENERATING QR FOR GHOST BURGER\n');
    console.log('=' .repeat(60));
    
    const result = await generatePaymentQR({
        external_reference: 'GHOST-TEST-' + Date.now(),
        total_amount: 1000, // $10.00
        currency: 'USD',
        description: 'Ghost Burger - FoodSpot Test',
        success_url: 'https://buendqgmwpxdixwvlkhd.supabase.co/payment/success',
        failure_url: 'https://buendqgmwpxdixwvlkhd.supabase.co/payment/failure'
    });
    
    if (result.success) {
        console.log('\n✅ QR GENERATION SUCCESSFUL');
        console.log('   Use this URL for QR code:');
        console.log('   ', result.sandbox_url);
        console.log('\n   Or preference ID for API:');
        console.log('   ', result.preference_id);
    } else {
        console.log('\n❌ QR GENERATION FAILED');
        console.log('   Error:', result.error);
    }
    
    return result;
}

/**
 * Webhook handler for payment notifications
 * @param {Object} payload - Mercado Pago webhook payload
 */
async function handlePaymentWebhook(payload) {
    const { data } = payload;
    
    if (data?.id && data?.external_reference) {
        // Fetch payment details from MP API
        const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
            }
        });
        
        const payment = await paymentResponse.json();
        
        console.log('💰 Payment received:', {
            id: payment.id,
            status: payment.status,
            external_reference: payment.external_reference,
            amount: payment.transaction_amount
        });
        
        // Update order in Supabase
        return {
            payment_id: payment.id,
            status: payment.status,
            external_reference: payment.external_reference,
            amount: payment.transaction_amount
        };
    }
}

// Export for use
module.exports = {
    generatePaymentQR,
    handlePaymentWebhook,
    MP_PUBLIC_KEY,
    MP_ACCESS_TOKEN
};

// Run test if called directly
if (require.main === module) {
    testGhostBurgerQR();
}