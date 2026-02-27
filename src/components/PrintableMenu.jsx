import React from 'react'
import { formatPrice } from '../config/menuData.js'

// ==========================================
// 📄 PRINTABLE MENU GENERATOR (AI-Ready Setup)
// ==========================================
// Hidden on screen, styled cleanly for A4 print.

export default function PrintableMenu({ menu, businessName, primaryColor, logoUrl }) {
    if (!menu || !menu.categories) return null

    return (
        <div className="printable-menu-container">
            <style>
                {`
                    @media screen {
                        .printable-menu-container {
                            display: none !important;
                        }
                    }
                    @media print {
                        @page {
                            margin: 15mm;
                            size: A4;
                        }
                        body * {
                            visibility: hidden;
                        }
                        .printable-menu-container, .printable-menu-container * {
                            visibility: visible;
                        }
                        .printable-menu-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            display: block !important;
                            font-family: 'Inter', system-ui, sans-serif;
                            color: #111827;
                        }
                        
                        /* Layout */
                        .print-header {
                            text-align: center;
                            margin-bottom: 30px;
                            padding-bottom: 20px;
                            border-bottom: 2px solid ${primaryColor || '#000'};
                        }
                        .print-logo {
                            max-height: 80px;
                            max-width: 200px;
                            object-fit: contain;
                            margin-bottom: 10px;
                        }
                        .print-business-name {
                            font-size: 28pt;
                            font-weight: 800;
                            margin: 0;
                            color: ${primaryColor || '#000'};
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                        }
                        
                        /* Categories */
                        .print-category {
                            margin-bottom: 25px;
                            break-inside: avoid;
                        }
                        .print-category-title {
                            font-size: 18pt;
                            font-weight: 700;
                            color: ${primaryColor || '#000'};
                            margin: 0 0 15px 0;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            border-bottom: 1px solid #E5E7EB;
                            padding-bottom: 8px;
                        }
                        
                        /* Items */
                        .print-items-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 15px 30px;
                        }
                        .print-item {
                            display: flex;
                            justify-content: space-between;
                            align-items: baseline;
                        }
                        .print-item-name {
                            font-size: 12pt;
                            font-weight: 600;
                            margin-right: 10px;
                        }
                        .print-item-dots {
                            flex-grow: 1;
                            border-bottom: 1px dotted #D1D5DB;
                            margin: 0 10px;
                            position: relative;
                            top: -4px;
                        }
                        .print-item-price {
                            font-size: 12pt;
                            font-weight: 700;
                            white-space: nowrap;
                        }
                        .print-item-desc {
                            font-size: 10pt;
                            color: #6B7280;
                            margin-top: 2px;
                            grid-column: 1 / -1;
                        }
                        
                        .print-footer {
                            margin-top: 40px;
                            text-align: center;
                            font-size: 9pt;
                            color: #9CA3AF;
                            border-top: 1px solid #E5E7EB;
                            padding-top: 10px;
                        }
                    }
                `}
            </style>

            <div className="print-header">
                {logoUrl && <img src={logoUrl} alt={businessName} className="print-logo" />}
                <h1 className="print-business-name">{businessName || 'Nuestro Menú'}</h1>
            </div>

            <div className="print-body">
                {menu.categories.filter(cat => cat.enabled !== false).map((cat) => (
                    <div key={cat.id} className="print-category">
                        <h2 className="print-category-title">
                            {cat.icon && <span>{cat.icon}</span>}
                            {cat.name}
                        </h2>
                        <div className="print-items-grid">
                            {cat.items?.filter(item => item.available !== false).map((item) => (
                                <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div className="print-item">
                                        <div className="print-item-name">{item.name}</div>
                                        <div className="print-item-dots"></div>
                                        <div className="print-item-price">{formatPrice(item.price)}</div>
                                    </div>
                                    {item.description && (
                                        <div className="print-item-desc">{item.description}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="print-footer">
                Generado automáticamente • {new Date().toLocaleDateString()}
            </div>
        </div>
    )
}
