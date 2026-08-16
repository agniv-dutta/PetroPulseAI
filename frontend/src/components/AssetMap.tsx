import React from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker icon default path issue
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

export interface MapAsset {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: 'NORMAL' | 'WATCH' | 'HIGH' | 'CRITICAL';
  yield: string;
  basin: string;
}

const mockAssets: MapAsset[] = [
  { id: 'MH-07', name: 'Mumbai High North (MH-07)', lat: 19.42, lng: 71.32, severity: 'CRITICAL', yield: '12.4k bbl/d', basin: 'Western Offshore' },
  { id: 'KG-01', name: 'Krishna Godavari Deepwater (KG-01)', lat: 16.25, lng: 82.20, severity: 'CRITICAL', yield: '8.1k bbl/d', basin: 'KG Basin' },
  { id: 'RJ-04', name: 'Barmer Block (RJ-04)', lat: 25.75, lng: 71.40, severity: 'HIGH', yield: '24.5k bbl/d', basin: 'Rajasthan' },
  { id: 'AS-09', name: 'Digboi Field (AS-09)', lat: 27.38, lng: 95.63, severity: 'WATCH', yield: '4.2k bbl/d', basin: 'Assam Shelf' },
  { id: 'CAM-02', name: 'Cambay Basin Node 2', lat: 22.30, lng: 72.60, severity: 'NORMAL', yield: '18.9k bbl/d', basin: 'Cambay' },
  { id: 'CAU-05', name: 'Cauvery Offshore Node 5', lat: 10.80, lng: 79.84, severity: 'NORMAL', yield: '6.7k bbl/d', basin: 'Cauvery' },
  { id: 'MH-12', name: 'Heera Field (MH-12)', lat: 18.60, lng: 72.20, severity: 'WATCH', yield: '15.1k bbl/d', basin: 'Western Offshore' },
  { id: 'WB-01', name: 'Bengal Offshore Basin', lat: 21.50, lng: 88.20, severity: 'NORMAL', yield: '2.8k bbl/d', basin: 'Bengal' },
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return '#FF3B3B';
    case 'HIGH': return '#FF9000';
    case 'WATCH': return '#FFD700';
    case 'NORMAL':
    default: return '#00D966';
  }
};

interface AssetMapProps {
  onSelectAsset?: (assetId: string) => void;
}

export const AssetMap: React.FC<AssetMapProps> = ({ onSelectAsset }) => {
  const center: [number, number] = [20.5937, 78.9629]; // Center of India

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={4}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%', borderRadius: '8px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mockAssets.map((asset) => {
          const color = getSeverityColor(asset.severity);
          return (
            <React.Fragment key={asset.id}>
              {/* Heatmap / Glow Aura for critical/high severity */}
              {(asset.severity === 'CRITICAL' || asset.severity === 'HIGH') && (
                <CircleMarker
                  center={[asset.lat, asset.lng]}
                  radius={24}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.25,
                    stroke: false
                  }}
                />
              )}
              {/* Core Marker Pin */}
              <CircleMarker
                center={[asset.lat, asset.lng]}
                radius={8}
                pathOptions={{
                  color: '#080909',
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 1
                }}
                eventHandlers={{
                  click: () => {
                    if (onSelectAsset) onSelectAsset(asset.id);
                  }
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'sans-serif', padding: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#B8B3A8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {asset.basin}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#F3EFE4', margin: '2px 0 6px 0' }}>
                      {asset.name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{
                        backgroundColor: color + '22',
                        color: color,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}>
                        {asset.severity}
                      </span>
                      <span style={{ color: '#F3EFE4', fontWeight: 600 }}>{asset.yield}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        zIndex: 1000,
        backgroundColor: 'rgba(26, 29, 31, 0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #2A2D30',
        borderRadius: '6px',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '11px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF3B3B' }}></span>
          <span style={{ color: '#F3EFE4' }}>CRITICAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF9000' }}></span>
          <span style={{ color: '#F3EFE4' }}>HIGH</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FFD700' }}></span>
          <span style={{ color: '#F3EFE4' }}>WATCH</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00D966' }}></span>
          <span style={{ color: '#F3EFE4' }}>NORMAL</span>
        </div>
      </div>
    </div>
  );
};
