import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './PrintMenu.css';

const PrintMenu = ({ menu, tenantData, tenantSlug }) => {
  const [fontFamily, setFontFamily] = useState('Inter');
  const [primaryColor, setPrimaryColor] = useState(tenantData?.confirmation_color || '#22C55E');
  const [separatorStyle, setSeparatorStyle] = useState('line');
  const [showPrices, setShowPrices] = useState(true);
  const [customHeader, setCustomHeader] = useState('');
  const [customFooter, setCustomFooter] = useState('');

  const categories = menu?.categories?.filter(c => c.items?.length > 0) || [];

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format((price ?? 0) / 100);
  };

  if (!categories.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 15 }}>
        No hay ítems en el menú para imprimir.
      </div>
    );
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
            <label>Separador</label>
            <select value={separatorStyle} onChange={(e) => setSeparatorStyle(e.target.value)}>
              <option value="line">Línea</option>
              <option value="dotted">Puntos</option>
              <option value="stars">★ ★ ★</option>
              <option value="dash">— — —</option>
            </select>
          </div>

          <div className="control-group">
            <label>Mostrar Precios</label>
            <select value={showPrices ? 'yes' : 'no'} onChange={(e) => setShowPrices(e.target.value === 'yes')}>
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="control-group full-width">
          <label>Encabezado Personalizado</label>
          <input
            type="text"
            value={customHeader}
            onChange={(e) => setCustomHeader(e.target.value)}
            placeholder="Ej: ¡Bienvenidos! Nuestro menú de hoy..."
          />
        </div>

        <div className="control-group full-width">
          <label>Pie Personalizado</label>
          <input
            type="text"
            value={customFooter}
            onChange={(e) => setCustomFooter(e.target.value)}
            placeholder="Ej: ¡Gracias por su visita!"
          />
        </div>

        <div className="control-actions">
          <button onClick={() => window.print()} className="btn-print">
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
        }}
      >
        {/* Header */}
        <div className="menu-header">
          <h1 className="business-name">{tenantData?.business_name || 'Mi Negocio'}</h1>
          {customHeader && (
            <p className="custom-header-text">{customHeader}</p>
          )}
          <div className="header-divider" data-separator={separatorStyle}></div>
        </div>

        {/* Menu Items by Category */}
        <div className="menu-body">
          {categories.map((category) => (
            <div key={category.id || category.name} className="menu-category">
              <h2 className="category-name" style={{ color: primaryColor }}>
                {category.name}
              </h2>
              <div className="category-divider" data-separator={separatorStyle}></div>

              <div className="category-items">
                {category.items.map((item, i) => (
                  <div key={item.id || i} className="menu-item">
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
          ))}
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
              Escaneá para ver el menú completo y ordenar
            </p>
          </div>

          {customFooter && (
            <p className="custom-footer-text">{customFooter}</p>
          )}

          {(tenantData?.phone || tenantData?.address) && (
            <div className="business-contact">
              {tenantData?.phone && <span>📞 {tenantData.phone}</span>}
              {tenantData?.address && <span>📍 {tenantData.address}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintMenu;
