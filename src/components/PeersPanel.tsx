// src/components/PeersPanel.tsx

import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Bluetooth, Radio, Wifi, RefreshCw } from 'lucide-react';
import { meshService } from '../services/meshService';
import './PeersPanel.css';

function PeersPanel() {
  const { peers, loadActivePeers, updatePeer } = useAppStore();
  const [scanning, setScanning] = useState(false);

  // Load active peers from DB on mount and refresh every 10s
  useEffect(() => {
    loadActivePeers();
    const interval = setInterval(() => loadActivePeers(), 10_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const peerList = Array.from(peers.values());

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'bluetooth': return <Bluetooth size={16} />;
      case 'webrtc': return <Wifi size={16} />;
      default: return <Radio size={16} />;
    }
  };

  const handleScanBluetooth = async () => {
    setScanning(true);
    try {
      await meshService.scanBluetooth(async (peer) => {
        await updatePeer(peer);
      });
    } catch (err) {
      console.warn('[PeersPanel] Bluetooth scan cancelled or failed:', err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="peers-panel-container">
      <div className="peers-header">
        <h2>Connected Peers</h2>
        <div className="peers-header-actions">
          <span className="peer-count">{peerList.length} active</span>
          <button
            className={`btn-scan ${scanning ? 'scanning' : ''}`}
            onClick={handleScanBluetooth}
            disabled={scanning}
            title="Scan for Bluetooth peers"
          >
            <RefreshCw size={14} className={scanning ? 'spin' : ''} />
            {scanning ? 'Scanning…' : 'Scan BLE'}
          </button>
        </div>
      </div>

      {peerList.length === 0 ? (
        <div className="empty-state">
          <p>No active peers detected.</p>
          <small>
            Open AuraMesh in another browser tab to see same-origin peers, or use "Scan BLE" to
            find nearby Bluetooth devices.
          </small>
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
        <small>
          Peers connect via BroadcastChannel (same browser) · Bluetooth · WebRTC (coming in Phase 3)
        </small>
      </div>
    </div>
  );
}

export default PeersPanel;
