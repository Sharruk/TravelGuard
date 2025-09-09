export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'tourist' | 'police' | 'alert' | 'zone';
  status?: 'safe' | 'caution' | 'alert';
  data?: any;
}

export interface MapOptions {
  center: { lat: number; lng: number };
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Default map options for Goa region
 */
export const GOA_MAP_OPTIONS: MapOptions = {
  center: { lat: 15.5527, lng: 73.7547 },
  zoom: 11,
  minZoom: 8,
  maxZoom: 18,
};

/**
 * Get marker color based on status
 */
export function getMarkerColor(status: string): string {
  switch (status) {
    case 'safe':
      return 'hsl(122 39% 49%)'; // green
    case 'caution':
      return 'hsl(36 100% 50%)'; // orange
    case 'alert':
      return 'hsl(0 72% 51%)'; // red
    default:
      return 'hsl(211 100% 43%)'; // blue
  }
}

/**
 * Create custom map icon HTML
 */
export function createMarkerIcon(type: 'tourist' | 'police' | 'alert', status?: string): string {
  const color = getMarkerColor(status || 'safe');
  
  switch (type) {
    case 'tourist':
      return `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;
    
    case 'police':
      return `<div style="color: hsl(215 16% 47%); font-size: 16px;">🏛️</div>`;
    
    case 'alert':
      return `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">!</div>`;
    
    default:
      return `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%;"></div>`;
  }
}

/**
 * Format popup content for different marker types
 */
export function formatPopupContent(marker: MapMarker): string {
  switch (marker.type) {
    case 'tourist':
      return `
        <b>Tourist ID: ${marker.data?.touristId || 'Unknown'}</b><br>
        Location: ${marker.data?.currentLocation || 'Unknown'}<br>
        Safety Score: ${marker.data?.safetyScore || 'N/A'}<br>
        Status: ${marker.status || 'Unknown'}<br>
        Last Update: ${marker.data?.lastUpdate ? new Date(marker.data.lastUpdate).toLocaleString() : 'Unknown'}
      `;
    
    case 'police':
      return `
        <b>${marker.data?.name || 'Police Station'}</b><br>
        Emergency Response Unit
      `;
    
    case 'alert':
      return `
        <b>${marker.data?.type?.toUpperCase() || 'ALERT'}</b><br>
        Severity: ${marker.data?.severity || 'Unknown'}<br>
        Location: ${marker.data?.location || 'Unknown'}<br>
        Status: ${marker.data?.status || 'Unknown'}<br>
        Time: ${marker.data?.createdAt ? new Date(marker.data.createdAt).toLocaleString() : 'Unknown'}
      `;
    
    default:
      return `<b>Location</b><br>Lat: ${marker.lat}, Lng: ${marker.lng}`;
  }
}

/**
 * Convert tourists data to map markers
 */
export function touristsToMarkers(tourists: any[]): MapMarker[] {
  return tourists
    .filter(tourist => tourist.lastKnownLat && tourist.lastKnownLng)
    .map(tourist => ({
      id: tourist.id,
      lat: parseFloat(tourist.lastKnownLat),
      lng: parseFloat(tourist.lastKnownLng),
      type: 'tourist' as const,
      status: tourist.status as 'safe' | 'caution' | 'alert',
      data: tourist,
    }));
}

/**
 * Convert alerts data to map markers
 */
export function alertsToMarkers(alerts: any[]): MapMarker[] {
  return alerts
    .filter(alert => alert.lat && alert.lng)
    .map(alert => ({
      id: alert.id,
      lat: parseFloat(alert.lat),
      lng: parseFloat(alert.lng),
      type: 'alert' as const,
      status: alert.severity === 'critical' ? 'alert' : 'caution',
      data: alert,
    }));
}
