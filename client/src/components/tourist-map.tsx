import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Tourist, GeoZone } from "@shared/schema";

// Declare Leaflet global
declare global {
  interface Window {
    L: any;
  }
}

interface TouristMapProps {
  tourist?: Tourist;
}

export default function TouristMap({ tourist }: TouristMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const { data: geoZones = [] } = useQuery<GeoZone[]>({
    queryKey: ["/api/geo-zones"],
  });

  useEffect(() => {
    if (!mapRef.current) return;

    // Load Leaflet if not already loaded
    if (!window.L) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    function initializeMap() {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const lat = parseFloat(tourist?.lastKnownLat || "15.5527");
      const lng = parseFloat(tourist?.lastKnownLng || "73.7547");

      // Initialize map
      const map = window.L.map(mapRef.current).setView([lat, lng], 13);
      mapInstanceRef.current = map;

      // Add tile layer
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add user location marker
      const userIcon = window.L.divIcon({
        html: `<div style="background-color: hsl(211 100% 43%); width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [22, 22],
        className: 'custom-div-icon'
      });

      window.L.marker([lat, lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>Your Location</b><br>${tourist?.currentLocation || "Goa, India"}`);

      // Add geo zones
      geoZones.forEach((zone: GeoZone) => {
        if (zone.coordinates && zone.coordinates.length > 0) {
          const coords = zone.coordinates.map(coord => [coord.lat, coord.lng]);
          
          let color = "hsl(122 39% 49%)"; // default green for safe
          if (zone.type === "caution") color = "hsl(36 100% 50%)"; // orange
          if (zone.type === "restricted") color = "hsl(0 72% 51%)"; // red

          window.L.polygon(coords, {
            color: color,
            fillColor: color,
            fillOpacity: 0.2,
            weight: 2
          }).addTo(map)
            .bindPopup(`<b>${zone.type.charAt(0).toUpperCase() + zone.type.slice(1)} Zone</b><br>${zone.name}<br>${zone.description || ""}`);
        }
      });

      // Add some demo safe zones
      window.L.circle([15.5007, 73.9119], {
        color: "hsl(122 39% 49%)",
        fillColor: "hsl(122 39% 49%)",
        fillOpacity: 0.2,
        radius: 500
      }).addTo(map)
        .bindPopup('<b>Safe Zone</b><br>Old Goa Heritage Area');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [tourist, geoZones]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full map-container"
      data-testid="tourist-map"
    />
  );
}
