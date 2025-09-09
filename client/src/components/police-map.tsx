import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Tourist, Alert, GeoZone } from "@shared/schema";

// Declare Leaflet global
declare global {
  interface Window {
    L: any;
  }
}

interface PoliceMapProps {
  tourists: Tourist[];
  alerts: Alert[];
}

export default function PoliceMap({ tourists, alerts }: PoliceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const { data: geoZones = [] } = useQuery({
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

      // Initialize map centered on Goa
      const map = window.L.map(mapRef.current).setView([15.5527, 73.7547], 11);
      mapInstanceRef.current = map;

      // Add tile layer
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add tourist markers
      tourists.forEach((tourist: Tourist) => {
        if (tourist.lastKnownLat && tourist.lastKnownLng) {
          const lat = parseFloat(tourist.lastKnownLat);
          const lng = parseFloat(tourist.lastKnownLng);

          let iconColor = "hsl(211 100% 43%)"; // primary blue for safe
          if (tourist.status === 'caution') iconColor = "hsl(36 100% 50%)"; // warning orange
          if (tourist.status === 'alert') iconColor = "hsl(0 72% 51%)"; // destructive red

          const touristIcon = window.L.divIcon({
            html: `<div style="background-color: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            className: 'custom-div-icon'
          });

          window.L.marker([lat, lng], { icon: touristIcon })
            .addTo(map)
            .bindPopup(`
              <b>Tourist ID: ${tourist.touristId}</b><br>
              Location: ${tourist.currentLocation}<br>
              Safety Score: ${tourist.safetyScore}<br>
              Status: ${tourist.status}<br>
              Last Update: ${new Date(tourist.lastUpdate).toLocaleString()}
            `);
        }
      });

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
            fillOpacity: 0.3,
            weight: 2
          }).addTo(map)
            .bindPopup(`<b>${zone.type.charAt(0).toUpperCase() + zone.type.slice(1)} Zone</b><br>${zone.name}<br>${zone.description || ""}`);
        }
      });

      // Add police stations
      const policeStations = [
        { name: 'Calangute Police Station', lat: 15.5427, lng: 73.7647 },
        { name: 'Panaji Police Station', lat: 15.4909, lng: 73.8278 },
        { name: 'Margao Police Station', lat: 15.2993, lng: 74.1240 }
      ];

      policeStations.forEach(station => {
        const stationIcon = window.L.divIcon({
          html: `<div style="color: hsl(215 16% 47%); font-size: 16px;">🏛️</div>`,
          iconSize: [20, 20],
          className: 'custom-div-icon'
        });

        window.L.marker([station.lat, station.lng], { icon: stationIcon })
          .addTo(map)
          .bindPopup(`<b>${station.name}</b><br>Emergency Response Unit`);
      });

      // Add alert markers
      alerts.forEach((alert: Alert) => {
        if (alert.lat && alert.lng) {
          const lat = parseFloat(alert.lat);
          const lng = parseFloat(alert.lng);

          let alertColor = "hsl(36 100% 50%)"; // warning
          if (alert.severity === "critical") alertColor = "hsl(0 72% 51%)"; // red

          const alertIcon = window.L.divIcon({
            html: `<div style="background-color: ${alertColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">!</div>`,
            iconSize: [26, 26],
            className: 'custom-div-icon'
          });

          window.L.marker([lat, lng], { icon: alertIcon })
            .addTo(map)
            .bindPopup(`
              <b>${alert.type.toUpperCase()} ALERT</b><br>
              Severity: ${alert.severity}<br>
              Location: ${alert.location}<br>
              Status: ${alert.status}<br>
              Time: ${new Date(alert.createdAt).toLocaleString()}
            `);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [tourists, alerts, geoZones]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full map-container"
      data-testid="police-map"
    />
  );
}
