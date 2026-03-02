// src/components/MapView.tsx
// MapView component
import { useAppStore } from '../store/appStore';
import './MapView.css';

function MapView() {
  const { sos_messages, peers } = useAppStore();

  return (
    <div className="map-view-container">
      <div className="map-placeholder">
        <h2>Offline Map View</h2>
        <div className="map-info">
          <p>Interactive map showing:</p>
          <ul>
            <li>• SOS message locations</li>
            <li>• Active peer positions</li>
            <li>• Mesh topology</li>
            <li>• Emergency zones</li>
          </ul>
          <div className="stats">
            <div className="stat">
              <strong>{sos_messages.length}</strong>
              <span>SOS Messages</span>
            </div>
            <div className="stat">
              <strong>{peers.size}</strong>
              <span>Connected Peers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapView;
