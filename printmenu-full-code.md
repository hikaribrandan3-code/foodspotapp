═══════════════════════════════════════════════════════════════
FILE 1: src/components/PrintMenu.jsx (227 lines)
═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../supabaseClient'
import './PrintMenu.css'

const PrintMenu = ({ businessId, tenantSlug }) => {
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [branding, setBranding] = useState({})
  const [loading, setLoading] = useState(true)

  // Customization options
  const [fontFamily, setFontFamily] = useState('Inter')
  const [primaryColor, setPrimaryColor] = useState('#22C55E')
  const [borderStyle, setBorderStyle] = useState('solid')
  const [separatorStyle, setSeparatorStyle] = useState('line')
  const [showPrices, setShowPrices] = useState(true)
  const [customHeader, setCustomHeader] = useState('')
  const [customFooter, setCustomFooter] = useState('')

  useEffect(() => {
    fetchMenuData()
  }, [businessId])

  const fetchMenuData = async () => {
    try {
      // Fetch branding
      const { data: brandingData } = await supabase
        .from('branding')
        .select('*')
        .eq('business_id', businessId)
        .single()

      if (brandingData) {
        setBranding(brandingData)
        setPrimaryColor(brandingData.primary_color || '#22C55E')
      }

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true })

      setCategories(categoriesData || [])

      // Fetch menu items
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name')

      setMenuItems(itemsData || [])
    } catch (error) {
      console.error('Error fetching menu data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getItemsByCategory = (categoryId) => {
    return menuItems.filter(item => item.category_id === categoryId)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <div className="print-menu-loading">Cargando menú...</div>
  }

  return (
    <div className="print-menu-container">
      {/* Controls - Hidden when printing */}
      <div className="print-menu-controls no-print">
        <h2>📄 Menú para Imprimir</h2>

        <div className="controls-grid">
          <div className="control-group">
            <label>Color Principal</label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
          </div>

          <div className="control-group">
            <label>Fuente</label>
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              <option value="Inter">Inter (Moderno)</option>
              <option value="Georgia">Georgia (Clásico)</option>
              <option value="Courier New">Courier (Typewriter)</option>
              <option value="Arial">Arial (Simple)</option>
            </select>
          </div>

          <div className="control-group">
            <label>Borde</label>
            <select value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)}>
              <option value="solid">Sólido</option>
              <option value="dashed">Guiones</option>
              <option value="dotted">Puntos</option>
              <option value="double">Doble</option>
            </select>
          </div>

          <div className="control-group">
            <label>Separador</label>
            <select value={separatorStyle} onChange={(e) => setSeparatorStyle(e.target.value)}>
              <option value="line">Línea</option>
              <option value="dotted">Puntos</option>
              <option value="stars">★ ★ ★</option>
              <option value="dash">— — —</option>
            </select>
          </div>
        </div>

        <div className="control-group full-width">
          <label>Texto Personalizado (Encabezado)</label>
          <input
            type="text"
            value={customHeader}
            onChange={(e) => setCustomHeader(e.target.value)}
            placeholder="Ej: ¡Bienvenidos! Nuestro menú de hoy..."
          />
        </div>

        <div className="control-group full-width">
          <label>Texto Personalizado (Pie)</label>
          <input
            type="text"
            value={customFooter}
            onChange={(e) => setCustomFooter(e.target.value)}
            placeholder="Ej: ¡Gracias por su visita!"
          />
        </div>

        <div className="control-actions">
          <button onClick={handlePrint} className="btn-print">
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Preview - This is what gets printed */}
      <div
        className="print-menu-preview"
        style={{
          '--primary-color': primaryColor,
          '--font-family': fontFamily,
          '--border-style': borderStyle,
        }}
      >
        {/* Header */}
        <div className="menu-header">
          <h1 className="business-name">{branding.name || 'Mi Negocio'}</h1>
          {branding.tagline && (
            <p className="business-tagline">{branding.tagline}</p>
          )}
          {customHeader && (
            <p className="custom-header-text">{customHeader}</p>
          )}
          <div className="header-divider" data-separator={separatorStyle}></div>
        </div>

        {/* Menu Items by Category */}
        <div className="menu-body">
          {categories.map((category) => {
            const items = getItemsByCategory(category.id)
            if (items.length === 0) return null

            return (
              <div key={category.id} className="menu-category">
                <h2 className="category-name" style={{ color: primaryColor }}>
                  {category.name}
                </h2>
                <div className="category-divider" data-separator={separatorStyle}></div>

                <div className="category-items">
                  {items.map((item) => (
                    <div key={item.id} className="menu-item">
                      <div className="item-header">
                        <span className="item-name">{item.name}</span>
                        {showPrices && (
                          <span className="item-price">{formatPrice(item.price)}</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="item-description">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="menu-footer">
          <div className="footer-divider" data-separator={separatorStyle}></div>

          <div className="qr-section">
            <QRCodeSVG
              value={`https://foodspotapp.vercel.app/${tenantSlug}`}
              size={120}
              level="M"
              includeMargin={true}
            />
            <p className="qr-text">
              Escaneá el código QR para ver el menú completo y ordenar
            </p>
          </div>

          {customFooter && (
            <p className="custom-footer-text">{customFooter}</p>
          )}

          {(branding.phone || branding.address) && (
            <div className="business-contact">
              {branding.phone && <span>📞 {branding.phone}</span>}
              {branding.address && <span>📍 {branding.address}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PrintMenu


═══════════════════════════════════════════════════════════════
FILE 2: src/components/PrintMenu.css (280 lines)
═══════════════════════════════════════════════════════════════

/* PrintMenu Container */
.print-menu-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Controls Section - Hidden when printing */
.print-menu-controls {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.print-menu-controls h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #1e293b;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-group.full-width {
  grid-column: 1 / -1;
}

.control-group label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control-group input[type="text"],
.control-group input[type="color"],
.control-group select {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.control-group input[type="color"] {
  height: 44px;
  cursor: pointer;
}

.control-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-print {
  background: #22c55e;
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-print:hover {
  background: #16a34a;
  transform: translateY(-1px);
}

/* Preview Section - This is what gets printed */
.print-menu-preview {
  background: white;
  max-width: 210mm; /* A4 width */
  min-height: 297mm; /* A4 height */
  margin: 0 auto;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  font-family: var(--font-family, 'Inter'), system-ui, sans-serif;
}

/* Header */
.menu-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 3px solid var(--primary-color, #22C55E);
}

.business-name {
  font-size: 42px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.business-tagline {
  font-size: 16px;
  color: #64748b;
  margin: 0;
  font-style: italic;
}

.custom-header-text {
  font-size: 15px;
  color: #475569;
  margin: 12px 0 0 0;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-style: italic;
}

.header-divider {
  margin-top: 20px;
}

/* Body */
.menu-body {
  margin-bottom: 32px;
}

.menu-category {
  margin-bottom: 28px;
}

.category-name {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.category-divider {
  margin-bottom: 16px;
}

/* Separators */
[data-separator="line"] {
  border-bottom: 2px solid #e2e8f0;
}

[data-separator="dotted"] {
  border-bottom: 2px dotted #cbd5e1;
}

[data-separator="stars"]::after {
  content: "★ ★ ★";
  display: block;
  text-align: center;
  color: #cbd5e1;
  font-size: 14px;
  letter-spacing: 8px;
  padding: 8px 0;
}

[data-separator="dash"]::after {
  content: "— — — — —";
  display: block;
  text-align: center;
  color: #cbd5e1;
  font-size: 16px;
  letter-spacing: 8px;
  padding: 8px 0;
}

/* Items */
.category-items {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.menu-item {
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
  break-inside: avoid; /* Don't break items across pages */
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.item-name {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
}

.item-price {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color, #22C55E);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.item-description {
  font-size: 14px;
  color: #64748b;
  margin: 6px 0 0 0;
  font-style: italic;
  line-height: 1.4;
}

/* Footer */
.menu-footer {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 3px solid var(--primary-color, #22C55E);
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.qr-text {
  font-size: 14px;
  color: #64748b;
  text-align: center;
  max-width: 280px;
  margin: 0;
}

.custom-footer-text {
  text-align: center;
  font-size: 16px;
  color: #475569;
  margin: 16px 0;
  font-style: italic;
}

.business-contact {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 20px;
  font-size: 14px;
  color: #64748b;
}

/* Loading */
.print-menu-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  font-size: 16px;
  color: #64748b;
}

/* Print Styles */
@media print {
  @page {
    size: A4;
    margin: 15mm;
  }

  body * {
    visibility: hidden;
  }

  .print-menu-preview,
  .print-menu-preview * {
    visibility: visible;
  }

  .print-menu-preview {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: none;
    min-height: auto;
    padding: 0;
    margin: 0;
    box-shadow: none;
  }

  .no-print {
    display: none !important;
  }

  .menu-item {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .menu-category {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}


═══════════════════════════════════════════════════════════════
INTEGRATION: MenuManager.jsx (lines to add)
═══════════════════════════════════════════════════════════════

1. At top of file, add imports:

import { useParams } from 'react-router-dom'
import PrintMenu from '../../components/PrintMenu.jsx'

2. Inside component, extract tenantSlug:

const { tenantSlug } = useParams()

3. At bottom of return, before closing </div>:

{/* 📄 PRINT MENU SECTION */}
<div style={{
    background: 'white',
    padding: 24,
    borderRadius: 16,
    marginTop: 24,
    border: '1px solid #e2e8f0',
}}>
    <PrintMenu businessId={businessId} tenantSlug={tenantSlug} />
</div>

4. Install dependency:

npm install qrcode.react --save