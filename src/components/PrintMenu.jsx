import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../supabaseClient';
import './PrintMenu.css';

const PrintMenu = ({ businessId, tenantSlug }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branding, setBranding] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Customization options
  const [fontFamily, setFontFamily] = useState('Inter');
  const [primaryColor, setPrimaryColor] = useState('#22C55E');
  const [borderStyle, setBorderStyle] = useState('solid');
  const [separatorStyle, setSeparatorStyle] = useState('line');
  const [showPrices, setShowPrices] = useState(true);
  const [customHeader, setCustomHeader] = useState('');
  const [customFooter, setCustomFooter] = useState('');

  useEffect(() => {
    fetchMenuData();
  }, [businessId]);

  const fetchMenuData = async () => {
    try {
      // Fetch branding
      const { data: brandingData } = await supabase
        .from('branding')
        .select('*')
        .eq('business_id', businessId)
        .single();
      
      if (brandingData) {
        setBranding(brandingData);
        setPrimaryColor(brandingData.primary_color || '#22C55E');
      }

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });
      
      setCategories(categoriesData || []);

      // Fetch menu items
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name');
      
      setMenuItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getItemsByCategory = (categoryId) => {
    return menuItems.filter(item => item.category_id === categoryId);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="print-menu-loading">Cargando menú...</div>;
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
            const items = getItemsByCategory(category.id);
            if (items.length === 0) return null;
            
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
            );
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
  );
};

export default PrintMenu;