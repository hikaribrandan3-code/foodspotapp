import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Haversine distance: calculates km between two lat/lng points
 */
export function getDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate conservative ETA in minutes: distance / 30 km/h + 10 min buffer
 */
export function getETAMinutes(distanceKm: number): number {
  const travelMins = Math.ceil((distanceKm / 30) * 60);
  return travelMins + 10; // Conservative 10 min buffer
}

/**
 * Format integer cents to currency string (e.g., 1150 → "$11.50")
 */
export function formatPrice(cents: number | undefined): string {
  if (cents === undefined || cents === null) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
}
