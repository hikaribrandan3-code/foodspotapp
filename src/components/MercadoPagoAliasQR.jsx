import { QRCodeCanvas } from 'qrcode.react'

/**
 * MercadoPagoAliasQR - Generates a QR code from an MP Alias
 *
 * In South America (especially Argentina), Mercado Pago Alias QR codes
 * let customers scan and pay directly from their banking app.
 * The QR encodes the alias string (e.g. "tu.alias.mp").
 *
 * Props:
 *  - alias: string (e.g. "alias@mirestaurante")
 *  - size: number (default 220)
 *  - showLabel: boolean (default true)
 */
export default function MercadoPagoAliasQR({ alias, size = 220, showLabel = true }) {
  if (!alias) {
    return (
      <div style={{
        padding: 24,
        background: '#FEF2F2',
        borderRadius: 16,
        textAlign: 'center',
        border: '1px solid #FECACA',
      }}>
        <p style={{ margin: 0, color: '#991B1B', fontSize: 14, fontWeight: 600 }}>
          Mercado Pago Alias not configured
        </p>
        <p style={{ margin: '8px 0 0', color: '#B91C1C', fontSize: 13 }}>
          Please contact the restaurant owner
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      padding: 24,
      background: '#FFFFFF',
      borderRadius: 20,
      border: '2px solid #009EE3',
      boxShadow: '0 8px 24px rgba(0,158,227,0.12)',
    }}>
      <div style={{
        padding: 16,
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #E5E7EB',
      }}>
        <QRCodeCanvas
          value={alias}
          size={size}
          bgColor="#FFFFFF"
          fgColor="#009EE3"
          level="M"
          includeMargin={false}
        />
      </div>

      {showLabel && (
        <div style={{ textAlign: 'center' }}>
          <p style={{
            margin: '0 0 4px',
            fontSize: 11,
            fontWeight: 700,
            color: '#009EE3',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Mercado Pago Alias
          </p>
          <p style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: '#1F2937',
            fontFamily: 'monospace',
            letterSpacing: '-0.02em',
            wordBreak: 'break-all',
          }}>
            {alias}
          </p>
          <p style={{
            margin: '8px 0 0',
            fontSize: 13,
            color: '#6B7280',
          }}>
            Scan with your banking app to pay
          </p>
        </div>
      )}
    </div>
  )
}
