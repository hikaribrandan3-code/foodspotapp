/**
 * PromosComingSoon.jsx
 * Modern placeholder for Promos tab pre-launch
 * Dark theme with purple accents, animated elements
 */

import React from 'react';
import './PromosComingSoon.css';

export default function PromosComingSoon() {
  return (
    <div className="promos-coming-soon">
      {/* Background gradient mesh */}
      <div className="pcs-bg-mesh">
        <div className="mesh-blob blob-1"></div>
        <div className="mesh-blob blob-2"></div>
        <div className="mesh-blob blob-3"></div>
      </div>

      {/* Content */}
      <div className="pcs-content">
        {/* Icon */}
        <div className="pcs-icon-wrap">
          <span className="pcs-icon">🎉</span>
          <div className="icon-glow"></div>
        </div>

        {/* Title */}
        <h1 className="pcs-title">
          <span className="title-line">Próximamente</span>
          <span className="title-sub">Something Big is Cooking</span>
        </h1>

        {/* Description */}
        <p className="pcs-desc">
          Eventos exclusivos, cover gratis, y promos que no vas a querer perderte.
        </p>

        {/* Feature preview cards */}
        <div className="pcs-preview-grid">
          <div className="preview-card">
            <span className="preview-icon">🎟️</span>
            <span className="preview-label">Event Tickets</span>
          </div>
          <div className="preview-card">
            <span className="preview-icon">🆓</span>
            <span className="preview-label">Free Cover</span>
          </div>
          <div className="preview-card">
            <span className="preview-icon">🎁</span>
            <span className="preview-label">Flash Deals</span>
          </div>
        </div>

        {/* CTA */}
        <div className="pcs-cta">
          <span className="cta-badge">
            <span className="badge-dot"></span>
            Launching Q2 2026
          </span>
        </div>

        {/* Decorative elements */}
        <div className="pcs-decoration">
          <div className="decoration-line"></div>
          <span className="decoration-text">FoodSpot Events</span>
          <div className="decoration-line"></div>
        </div>
      </div>

      {/* Noise texture overlay */}
      <div className="pcs-noise"></div>
    </div>
  );
}