import React, { useState } from 'react';
import { translations } from '../../utils/translations';

export default function ProductsList({ products, lang, onDelete }) {
  const [toggleStates, setToggleStates] = useState(
    products.reduce((acc, p) => ({ ...acc, [p.id]: p.active }), {})
  );

  const toggleProduct = (id) => {
    setToggleStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <div className="flex items-end justify-between border-b border-outline-variant pb-xs mb-sm">
        <h3 className="font-h3 text-h3 text-on-surface font-bold">
          {translations.active_products?.[lang] || 'Active Products'}
        </h3>
        <a href="#" className="font-label-md text-label-md text-primary hover:underline">
          {translations.view_all?.[lang] || 'View All'}
        </a>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[3fr_2fr_1.5fr_auto] gap-sm p-sm bg-surface-container-low border-b border-outline-variant">
          <div className="font-label-caps text-label-caps text-outline">
            {translations.product_name?.[lang] || 'Name'}
          </div>
          <div className="font-label-caps text-label-caps text-outline">
            {translations.category?.[lang] || 'Category'}
          </div>
          <div className="font-label-caps text-label-caps text-outline text-right">
            {translations.price?.[lang] || 'Price'}
          </div>
          <div className="w-[60px] text-center font-label-caps text-label-caps text-outline">
            {translations.status?.[lang] || 'Status'}
          </div>
        </div>

        {/* Rows */}
        {products.length > 0 ? (
          <div className="divide-y divide-outline-variant">
            {products.map((product) => (
              <div key={product.id} className="grid grid-cols-[3fr_2fr_1.5fr_auto] gap-sm p-sm items-center hover:bg-surface transition-colors">
                <div className="font-body-md text-body-md text-on-surface font-medium truncate">
                  {product.name}
                </div>
                <div className="font-body-md text-body-md text-outline">{product.category}</div>
                <div className="font-data-mono text-data-mono text-on-surface text-right">
                  ${product.price.toFixed(2)}
                </div>
                <div className="flex justify-center gap-sm items-center">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleProduct(product.id)}
                    className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${
                      toggleStates[product.id] ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 bg-white rounded-full absolute top-[2px] transition-all ${
                        toggleStates[product.id] ? 'right-[2px]' : 'left-[2px]'
                      }`}
                    ></div>
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => onDelete(product.id)}
                    className="text-outline hover:text-error transition-colors flex justify-end"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-sm text-center text-outline font-body-md">
            {translations.no_products?.[lang] || 'No products yet'}
          </div>
        )}
      </div>
    </div>
  );
}
