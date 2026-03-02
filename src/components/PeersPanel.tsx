// src/components/PeersPanel.tsx

import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Bluetooth, Radio, Wifi } from 'lucide-react';
import './PeersPanel.css';

function PeersPanel() {
  const { peers, loadActivePeers } = useAppStore();

  // useEffect(() => {
  //   loadActivePeers();
  //   const interval = setInterval(() => loadActivePeers(), 10000);
  //   return () => clearInterval(interval);
  // }, [loadActivePeers]);

  const peerList = Array.from(peers.values());

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'bluetooth':
        return <Bluetooth size={16} />;
      case 'webrtc':
        return <Wifi size={16} />;
      default:
        return <Radio size={16} />;
    }
  };

  return (
    <div className="peers-panel-container">
      <div className="peers-header">
        <h2>Connected Peers</h2>
        <span className="peer-count">{peerList.length} active</span>
      </div>

      {peerList.length === 0 ? (
        <div className="empty-state">
          <p>No active peers detected.</p>
          <small>Peers will appear when devices connect via Bluetooth or WebRTC on your local network.</small>
        </div>
      ) : (
        <div className="peers-grid">
          {peerList.map((peer) => (
            <div key={peer.id} className={`peer-card connection-${peer.connectionType}`}>
              <div className="peer-connection-icon">
                {getConnectionIcon(peer.connectionType)}
              </div>

              <div className="peer-main">
                <div className="peer-name">
                  {peer.alias || `Peer-${peer.id.substring(0, 8)}`}
                </div>

                <div className="peer-details">
                  <div className="detail">
                    <span className="label">Type</span>
                    <span className="value">{peer.connectionType}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Seen</span>
                    <span className="value">{new Date(peer.lastSeen).toLocaleTimeString()}</span>
                  </div>
                  {peer.signalStrength !== undefined && (
                    <div className="detail">
                      <span className="label">Signal</span>
                      <div className="signal-bars">
                        <span className={peer.signalStrength >= 25 ? 'active' : ''}></span>
                        <span className={peer.signalStrength >= 50 ? 'active' : ''}></span>
                        <span className={peer.signalStrength >= 75 ? 'active' : ''}></span>
                        <span className={peer.signalStrength >= 90 ? 'active' : ''}></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="peer-status">
                <div className="status-dot"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="peers-footer">
        <small>Peers connect automatically via Bluetooth (proximity) or WebRTC (same local network)</small>
      </div>
    </div>
  );
}

export default PeersPanel;
