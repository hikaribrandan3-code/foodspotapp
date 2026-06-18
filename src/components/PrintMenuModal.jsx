import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './PrintMenuModal.css';
import { formatCurrency } from '../utils/currency';

const PRESET_THEMES = {
  american: {
    name: 'American',
    color: '#DC2626',
    border: '#DC2626',
    separator: 'dash',
    icon: '🇺🇸'
  },
  latino: {
    name: 'Latino',
    color: '#EA580C',
    border: '#EA580C',
    separator: 'stars',
    icon: '🎉'
  },
  asian: {
    name: 'Asian',
    color: '#DC2626',
    border: '#DC2626',
    separator: 'dotted',
    icon: '🥢'
  },
  african: {
    name: 'African',
    color: '#B45309',
    border: '#B45309',
    separator: 'stars',
    icon: '🥁'
  },
  arabic: {
    name: 'Arabic',
    color: '#7C3AED',
    border: '#7C3AED',
    separator: 'line',
    icon: '✨'
  }
};

const PrintMenuModal = ({ isOpen, onClose, menu, tenantData, tenantSlug }) => {
  const [fontFamily, setFontFamily] = useState('Inter');
  const [primaryColor, setPrimaryColor] = useState(tenantData?.confirmation_color || '#22C55E');
  const [borderColor, setBorderColor] = useState(primaryColor);
  const [separatorStyle, setSeparatorStyle] = useState('line');
  const [showPrices, setShowPrices] = useState(true);
  const [customHeader, setCustomHeader] = useState('');
  const [customFooter, setCustomFooter] = useState('');

  const categories = menu?.categories?.filter(c => c.items?.length > 0) || [];

  const applyTheme = (theme) => {
    setPrimaryColor(theme.color);
    setBorderColor(theme.color);
    setSeparatorStyle(theme.separator);
  };

  const currency = tenantData?.app_config?.businessCurrency || 'ARS';
  const fmt = (price) => formatCurrency(price, currency);

  if (!isOpen) return null;

  const separatorContent = {
    line: null,
    dotted: null,
    stars: '★ ★ ★',
    dash: '— — — — —'
  };

  const getSeparatorStyle = (type) => {
    switch (type) {
      case 'line':
        return { borderBottom: `2px solid ${borderColor}` };
      case 'dotted':
        return { borderBottom: `2px dotted ${borderColor}` };
      case 'stars':
      case 'dash':
        return {};
      default:
        return { borderBottom: `2px solid ${borderColor}` };
    }
  };

  const getSeparatorContent = (type) => {
    if (type === 'stars') return '★ ★ ★';
    if (type === 'dash') return '— — — — —';
    return null;
  };

  return (
    <div className="print-menu-modal-overlay" onClick={onClose}>
      <div className="print-menu-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close" onClick={onClose}>
          ← Back
        </button>

        <div className="modal-content">
          {/* Controls Panel */}
          <div className="controls-panel">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Print Menu Builder</h2>

            {/* Preset Themes */}
            <div className="presets-section">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: 12, display: 'block' }}>
                Quick Themes
              </label>
              <div className="presets-grid">
                {Object.entries(PRESET_THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    className={`preset-btn ${primaryColor === theme.color && separatorStyle === theme.separator ? 'active' : ''}`}
                    onClick={() => applyTheme(theme)}
                    title={theme.name}
                    style={{
                      backgroundColor: theme.color,
                      borderColor: primaryColor === theme.color && separatorStyle === theme.separator ? '#000' : '#ddd'
                    }}
                  >
                    {theme.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Controls */}
            <div className="custom-controls">
              <div className="control-group">
                <label>Primary Color</label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    setBorderColor(e.target.value);
                  }}
                />
              </div>

              <div className="control-group">
                <label>Border Color</label>
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                />
              </div>

              <div className="control-group">
                <label>Separator Style</label>
                <select value={separatorStyle} onChange={(e) => setSeparatorStyle(e.target.value)}>
                  <option value="line">Línea</option>
                  <option value="dotted">Puntos</option>
                  <option value="stars">★ ★ ★</option>
                  <option value="dash">— — —</option>
                </select>
              </div>

              <div className="control-group">
                <label>Font Family</label>
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                  <option value="Inter">Inter (Moderno)</option>
                  <option value="Georgia">Georgia (Clásico)</option>
                  <option value="Courier New">Courier (Typewriter)</option>
                  <option value="Arial">Arial (Simple)</option>
                </select>
              </div>

              <div className="control-group">
                <label>Show Prices</label>
                <select value={showPrices ? 'yes' : 'no'} onChange={(e) => setShowPrices(e.target.value === 'yes')}>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="control-group full-width">
                <label>Custom Header</label>
                <input
                  type="text"
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  placeholder="Ej: ¡Bienvenidos!"
                />
              </div>

              <div className="control-group full-width">
                <label>Custom Footer</label>
                <input
                  type="text"
                  value={customFooter}
                  onChange={(e) => setCustomFooter(e.target.value)}
                  placeholder="Ej: ¡Gracias por su visita!"
                />
              </div>
            </div>
          </div>

          {/* A4 Preview */}
          <div
            className="preview-section"
            style={{ '--primary-color': primaryColor, '--font-family': fontFamily }}
          >
            <div className="print-menu-preview">
              <div className="menu-header">
                <h1 className="business-name">{tenantData?.business_name || 'Mi Negocio'}</h1>
                {customHeader && <p className="custom-header-text">{customHeader}</p>}
                <div className="header-divider" style={getSeparatorStyle(separatorStyle)}>
                  {getSeparatorContent(separatorStyle) && (
                    <div style={{ textAlign: 'center', color: borderColor, fontSize: 14, letterSpacing: 8, padding: '8px 0' }}>
                      {getSeparatorContent(separatorStyle)}
                    </div>
                  )}
                </div>
              </div>

              <div className="menu-body">
                {categories.map((category) => (
                  <div key={category.id || category.name} className="menu-category">
                    <h2 className="category-name" style={{ color: primaryColor }}>
                      {category.name}
                    </h2>
                    <div className="category-divider" style={getSeparatorStyle(separatorStyle)}>
                      {getSeparatorContent(separatorStyle) && (
                        <div style={{ textAlign: 'center', color: borderColor, fontSize: 14, letterSpacing: 8, padding: '8px 0' }}>
                          {getSeparatorContent(separatorStyle)}
                        </div>
                      )}
                    </div>
                    <div className="category-items">
                      {category.items.map((item, i) => (
                        <div key={item.id || i} className="menu-item">
                          <div className="item-header">
                            <span className="item-name">{item.name}</span>
                            {showPrices && (
                              <span className="item-price">{fmt(item.price)}</span>
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

              <div className="menu-footer">
                <div className="footer-divider" style={getSeparatorStyle(separatorStyle)}>
                  {getSeparatorContent(separatorStyle) && (
                    <div style={{ textAlign: 'center', color: borderColor, fontSize: 14, letterSpacing: 8, padding: '8px 0' }}>
                      {getSeparatorContent(separatorStyle)}
                    </div>
                  )}
                </div>
                <div className="qr-section">
                  <QRCodeSVG
                    value={`https://foodspotapp.vercel.app/${tenantSlug}`}
                    size={120}
                    level="M"
                    includeMargin={true}
                  />
                  <p className="qr-text">Escaneá para ver el menú completo y ordenar</p>
                </div>
                {customFooter && <p className="custom-footer-text">{customFooter}</p>}
                {(tenantData?.phone || tenantData?.address) && (
                  <div className="business-contact">
                    {tenantData.phone && <span>📞 {tenantData.phone}</span>}
                    {tenantData.address && <span>📍 {tenantData.address}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Print Button */}
        <div className="modal-footer">
          <button onClick={() => window.print()} className="btn-print">
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintMenuModal;
