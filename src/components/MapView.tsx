// src/components/MapView.tsx
import React, { useState } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '../store/appStore';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Custom icons to avoid webpack build issues with default leaflet image assets
const createIcon = (color: string, isSOS: boolean = false) => L.divIcon({
  className: 'custom-map-icon',
  html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); ${isSOS ? 'animation: pulse-ring 1s infinite;' : ''}"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const peerIcon = createIcon('#3b82f6'); // Blue for peers
const sosIcon = createIcon('#ef4444', true); // Red for SOS

// Component to handle map clicks for dropping debug pins
function MapClickHandler({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function MapView() {
  const { sos_messages, peers, userSettings, updatePeer } = useAppStore();

  // Custom non-geographic bounds for the campus diagram (approx. 1000x666 pixels)
  const mapWidth = 1000;
  const mapHeight = 666;
  const bounds: L.LatLngBoundsExpression = [[0, 0], [mapHeight, mapWidth]];

  const handleMapClick = (latlng: L.LatLng) => {
    // For testing/demonstration: update the current user's simulated location on click
    if (userSettings) {
      updatePeer({
        id: userSettings.deviceId,
        alias: userSettings.alias,
        connectionType: 'direct',
        lastSeen: Date.now(),
        coordinates: {
          latitude: latlng.lat,
          longitude: latlng.lng
        }
      });
    }
  };

  return (
    <div className="map-view-container">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxZoom={2}
        minZoom={-2}
        style={{ height: '100%', width: '100%', backgroundColor: '#f8f9fa' }}
      >
        <ImageOverlay
          url="/campus-map.jpg"
          bounds={bounds}
        />

        <MapClickHandler onMapClick={handleMapClick} />

        {/* Render Active SOS Messages */}
        {sos_messages.filter(sos => sos.status === 'active').map((sos) => (
          sos.coordinates ? (
            <Marker
              key={sos.id}
              position={[sos.coordinates.latitude, sos.coordinates.longitude]}
              icon={sosIcon}
            >
              <Popup className="sos-popup">
                <strong>SOS Alert!</strong><br />
                <span className="user">User: {sos.userId}</span><br />
                <span className="type">Emergency: {sos.emergencyType}</span><br />
                <span className="time">{new Date(sos.timestamp).toLocaleTimeString()}</span>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* Render Connected Peers */}
        {Array.from(peers.values()).map((peer) => (
          peer.coordinates ? (
            <Marker
              key={peer.id}
              position={[peer.coordinates.latitude, peer.coordinates.longitude]}
              icon={peerIcon}
            >
              <Popup className="peer-popup">
                <strong>{peer.alias || peer.id}</strong>
                {peer.id === userSettings?.deviceId && <span className="you-badge"> (You)</span>}
                <br />
                Last Seen: {new Date(peer.lastSeen).toLocaleTimeString()}<br />
                Signal: {peer.signalStrength ? `${peer.signalStrength}dBm` : 'Unknown'}
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>

      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Active Peer</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
          <span>SOS Source</span>
        </div>
        <div className="legend-note">
          <i>Tap anywhere on the map to mock your current location coordinates.</i>
        </div>
      </div>
    </div>
  );
}

export default MapView;
