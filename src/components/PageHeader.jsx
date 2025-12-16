// Reusable header wrapper for business name
// Used by: Menu, Order (Pedido), Info
// NOT used by: Home, Estado

function PageHeader({ businessName }) {
    return (
        <div style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 16,
            paddingRight: 16,
            marginBottom: 0
        }}>
            <span style={{
                fontSize: 27,
                fontWeight: 600,
                color: '#1F2937',
                letterSpacing: '-0.01em',
                textAlign: 'center',
                lineHeight: 1.3
            }}>
                {businessName || 'FoodSpot'}
            </span>
        </div>
    )
}

export default PageHeader
