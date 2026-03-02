// src/components/Dashboard.tsx

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { AlertTriangle, Zap, CheckCircle } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const {
    events,
    sos_messages,
    micActive,
    peerCount,
    addSOSMessage,
    addEvent,
    loadEvents,
  } = useAppStore();

  const [sosPressed, setSOSPressed] = useState(false);
  const [sosConfirm, setSOSConfirm] = useState(false);
  const [recentStats, setRecentStats] = useState({
    lastSOS: null as number | null,
    lastKeyword: null as number | null,
    activePeers: 0,
  });

  // useEffect(() => {
  //   loadEvents();
  // }, []);

  // useEffect(() => {
  //   const updateStats = () => {
  //     if (sos_messages.length > 0) {
  //       setRecentStats((prev) => ({
  //         ...prev,
  //         lastSOS: sos_messages[0].timestamp,
  //       }));
  //     }
  //   };
  //   updateStats();
  // }, [sos_messages]);

  const handleSOSInitiate = () => {
    setSOSPressed(true);
    setTimeout(() => setSOSPressed(false), 2000);
  };

  const handleSOSConfirm = async () => {
    if (!sosConfirm) {
      setSOSConfirm(true);
      setTimeout(() => setSOSConfirm(false), 5000);
      return;
    }

    try {
      const location = await getDeviceLocation();

      await addSOSMessage({
        timestamp: Date.now(),
        userId: 'user-default',
        deviceId: 'device-local',
        emergencyType: 'emergency',
        message: 'Manual SOS - Emergency assistance required',
        coordinates: location,
        status: 'active',
        sourceDevice: 'device-local',
        hopCount: 0,
      });

      setSOSConfirm(false);

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Show confirmation
      await addEvent({
        type: 'sos',
        severity: 'critical',
        title: 'SOS Broadcast',
        description: 'Your emergency signal has been broadcast to all nearby peers.',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to send SOS:', error);
    }
  };

  const getDeviceLocation = async (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => resolve(undefined)
        );
      } else {
        resolve(undefined);
      }
    });
  };

  const recentEvents = events.slice(0, 10);
  const criticalCount = events.filter((e) => e.severity === 'critical').length;
  const warningCount = events.filter((e) => e.severity === 'warning').length;

  return (
    <div className="dashboard-container">
      {/* SOS Panel */}
      <div className="sos-panel">
        <div className="sos-header">
          <AlertTriangle size={24} />
          <h2>Emergency SOS</h2>
        </div>

        <div className="sos-button-container">
          <button
            className={`sos-button ${sosPressed ? 'pressed' : ''} ${sosConfirm ? 'confirm-mode' : ''}`}
            onClick={handleSOSInitiate}
            title="Press to send emergency signal"
          >
            <div className="sos-pulse"></div>
            <span>SOS</span>
          </button>

          {sosPressed && !sosConfirm && (
            <div className="sos-prompt">
              <p>Press again to confirm</p>
              <small>(5 second timeout)</small>
            </div>
          )}

          {sosConfirm && (
            <div className="sos-confirm-prompt">
              <p className="confirm-text">Confirming SOS broadcast...</p>
              <button
                className="btn-confirm-sos"
                onClick={handleSOSConfirm}
              >
                CONFIRM & BROADCAST
              </button>
              <button
                className="btn-cancel-sos"
                onClick={() => setSOSConfirm(false)}
              >
                CANCEL
              </button>
            </div>
          )}
        </div>

        <div className="sos-status">
          <div className="status-badge">
            <span className="label">Mic Status</span>
            <span className={`value ${micActive ? 'active' : 'inactive'}`}>
              {micActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <div className="status-badge">
            <span className="label">Broadcast Range</span>
            <span className="value">{peerCount} Peers</span>
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="stats-panel">
        <div className="stat-card critical">
          <div className="stat-icon">
            <Zap size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{criticalCount}</div>
            <div className="stat-label">Critical Events</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{warningCount}</div>
            <div className="stat-label">Warnings</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{sos_messages.length}</div>
            <div className="stat-label">SOS Messages</div>
          </div>
        </div>
      </div>

      {/* Recent Events Feed */}
      <div className="events-feed">
        <h3 className="feed-title">Real-Time Event Feed</h3>

        {recentEvents.length === 0 ? (
          <div className="empty-state">
            <p>No events detected yet.</p>
            <small>Emergency events will appear here.</small>
          </div>
        ) : (
          <div className="event-list">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className={`event-item severity-${event.severity}`}
              >
                <div className="event-marker"></div>
                <div className="event-content">
                  <div className="event-title">{event.title}</div>
                  <div className="event-description">{event.description}</div>
                  <div className="event-time">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="system-status">
        <div className="status-grid">
          <div className="status-item">
            <div className="status-label">Last SOS</div>
            <div className="status-value">
              {recentStats.lastSOS
                ? new Date(recentStats.lastSOS).toLocaleTimeString()
                : 'None'}
            </div>
          </div>
          <div className="status-item">
            <div className="status-label">Network</div>
            <div className="status-value">
              {peerCount > 0 ? `${peerCount} peers` : 'Standalone'}
            </div>
          </div>
          <div className="status-item">
            <div className="status-label">Events</div>
            <div className="status-value">{events.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
