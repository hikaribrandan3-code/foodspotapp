// Reusable header wrapper for business name
// Used by: Menu, Order (Pedido), Info
// NOT used by: Home, Estado

// Mode indicator helper
function getModeColor() {
    try {
        const mode = localStorage.getItem('grub_user_mode')
        return { owner: '#22C55E', staff: '#EAB308' }[mode] || null
    } catch (e) {
        return null
    }
}

function PageHeader({ businessName }) {
    const modeColor = getModeColor()

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
            marginBottom: 0,
            position: 'relative',
            background: 'var(--header-bg)'
        }}>
            <span style={{
                fontSize: 28,
                fontWeight: 'var(--font-weight-brand)',
                color: 'var(--header-text)',
                letterSpacing: '-0.01em',
                textAlign: 'center',
                lineHeight: 1.3
            }}>
                {businessName || 'FoodSpot'}
            </span>
            {/* Mode indicator dot */}
            {modeColor && (
                <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: modeColor,
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)'
                }} />
            )}
        </div>
    )
}

export default PageHeader
