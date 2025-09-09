export interface Coordinate {
  lat: number;
  lng: number;
}

export interface GeoZone {
  id: string;
  name: string;
  type: 'safe' | 'caution' | 'restricted';
  coordinates: Coordinate[];
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a tourist is in a restricted zone
 */
export function checkGeoFenceViolation(
  touristLocation: Coordinate,
  geoZones: GeoZone[]
): { violation: boolean; zone?: GeoZone } {
  for (const zone of geoZones) {
    if (zone.type === 'restricted' && isPointInPolygon(touristLocation, zone.coordinates)) {
      return { violation: true, zone };
    }
  }
  return { violation: false };
}

/**
 * Get the current zone type for a tourist location
 */
export function getCurrentZoneType(
  touristLocation: Coordinate,
  geoZones: GeoZone[]
): 'safe' | 'caution' | 'restricted' {
  for (const zone of geoZones) {
    if (isPointInPolygon(touristLocation, zone.coordinates)) {
      return zone.type;
    }
  }
  return 'safe'; // Default to safe if not in any specific zone
}
