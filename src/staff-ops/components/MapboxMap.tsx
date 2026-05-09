import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Order } from '@/types';

interface MapboxMapProps {
  orders: Order[];
  driverPosition: { lat: number; lng: number } | null;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function MapboxMap({ orders, driverPosition }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarkerInstance = useRef<mapboxgl.Marker | null>(null);
  const orderMarkers = useRef<mapboxgl.Marker[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const instance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: driverPosition ? [driverPosition.lng, driverPosition.lat] : [-73.98, 40.73],
      zoom: 12.5,
      pitch: 0,
      attributionControl: false,
      logoPosition: 'bottom-left',
    });

    instance.on('load', () => {
      setIsReady(true);
      // Force resize after container is properly laid out
      requestAnimationFrame(() => instance.resize());
    });

    map.current = instance;

    instance.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'bottom-right',
    );

    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);

  // Resize map when visibility changes
  useEffect(() => {
    if (!map.current || !isReady) return;
    const timer = setTimeout(() => {
      map.current?.resize();
    }, 300);
    return () => clearTimeout(timer);
  }, [isReady]);

  // Update driver position dot
  useEffect(() => {
    if (!map.current || !isReady || !driverPosition) return;

    // Create or update driver marker
    if (!driverMarkerInstance.current) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          position: relative;
          width: 28px;
          height: 28px;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 28px;
            height: 28px;
            background: rgba(59,130,246,0.3);
            border-radius: 50%;
            animation: driverPulse 2s ease-out infinite;
            z-index: 1;
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 14px;
            height: 14px;
            background: #059669;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(59,130,246,0.6);
            z-index: 2;
          "></div>
        </div>
        <style>
          @keyframes driverPulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
            100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
          }
        </style>
      `;

      driverMarkerInstance.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([driverPosition.lng, driverPosition.lat])
        .addTo(map.current);
    } else {
      driverMarkerInstance.current.setLngLat([driverPosition.lng, driverPosition.lat]);
    }

    // Smooth pan to driver
    map.current.easeTo({
      center: [driverPosition.lng, driverPosition.lat],
      duration: 2000,
      easing: (t: number) => t * (2 - t),
    });
  }, [driverPosition, isReady]);

  // Update order markers
  useEffect(() => {
    if (!map.current || !isReady) return;

    // Clear existing order markers
    orderMarkers.current.forEach(m => m.remove());
    orderMarkers.current = [];

    const mapInstance = map.current;
    if (!mapInstance) return;

    orders.forEach(order => {
      if (!order.deliveryCoords) return;

      const color = order.status === 'DISPATCH' ? '#10b981' : '#f59e0b';
      const el = document.createElement('div');
      el.style.cssText = `
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: 700;
        font-family: ui-monospace, monospace;
        box-shadow: 0 2px 10px rgba(0,0,0,0.35);
        cursor: pointer;
      `;
      el.textContent = order.id.split('-')[1]?.slice(-2) || '?';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([order.deliveryCoords.lng, order.deliveryCoords.lat])
        .addTo(mapInstance);

      orderMarkers.current.push(marker);
    });
  }, [orders, isReady]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height: '380px', minHeight: '380px', border: '1px solid var(--card-border)' }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="flex flex-col items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
