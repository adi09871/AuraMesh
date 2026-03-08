// src/components/Dashboard.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { AlertTriangle, Zap, CheckCircle, Mic, MicOff } from 'lucide-react';
import { alertService } from '../services/alertService';
import { acousticService } from '../services/acousticService';
import { meshService } from '../services/meshService';
import './Dashboard.css';

function Dashboard() {
  const {
    userSettings,
    events,
    sos_messages,
    micActive,
    peerCount,
    addSOSMessage,
    addEvent,
    loadEvents,
  } = useAppStore();

  const [sosPressed, setSOSPressed] = useState(false);
  const [sosConfirm, setSosConfirm] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [audioLevel, setAudioLevel] = useState(-160);
  const [recentStats, setRecentStats] = useState({
    lastSOS: null as number | null,
    lastKeyword: null as number | null,
  });

  const sosConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load events from IndexedDB on mount ─────────────────────────────────
  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep last-SOS stat in sync ────────────────────────────────────────
  useEffect(() => {
    if (sos_messages.length > 0) {
      setRecentStats((prev) => ({
        ...prev,
        lastSOS: sos_messages[0].timestamp,
      }));
    }
  }, [sos_messages]);

  // ── Live audio level meter (polls acoustic service) ──────────────────
  useEffect(() => {
    if (!micActive) return;
    const id = setInterval(() => {
      setAudioLevel(acousticService.getAudioLevel());
    }, 80);
    return () => clearInterval(id);
  }, [micActive]);

  // ── Cleanup confirm timer on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (sosConfirmTimer.current) clearTimeout(sosConfirmTimer.current);
    };
  }, []);

  // ── SOS Flow: first press → confirm prompt ─────────────────────────────
  const handleSOSInitiate = () => {
    if (sosConfirm) return; // Already in confirm state
    setSOSPressed(true);
    if (sosConfirmTimer.current) clearTimeout(sosConfirmTimer.current);
    sosConfirmTimer.current = setTimeout(() => {
      setSOSPressed(false);
      setSosConfirm(false);
    }, 5000);
    setSosConfirm(true);
  };

  // ── SOS Flow: confirm → broadcast ─────────────────────────────────────
  const handleSOSConfirm = useCallback(async () => {
    if (sosSending) return;
    setSosSending(true);
    if (sosConfirmTimer.current) clearTimeout(sosConfirmTimer.current);

    try {
      const location = await getDeviceLocation();

      const sosPayload = {
        timestamp: Date.now(),
        userId: userSettings?.userId || 'user-default',
        deviceId: userSettings?.deviceId || 'device-local',
        emergencyType: 'emergency' as const,
        message: 'Manual SOS — Emergency assistance required',
        coordinates: location,
        status: 'active' as const,
        sourceDevice: userSettings?.deviceId || 'device-local',
        hopCount: 0,
      };

      await addSOSMessage(sosPayload);

      // Relay via mesh
      meshService.broadcastSOS({ ...sosPayload, id: `sos_${Date.now()}` });

      // Haptic + visual + audio alert on the sending device too
      if (userSettings) {
        alertService.triggerSOSAlert(userSettings, peerCount);
      }

      setSosConfirm(false);
    } catch (error) {
      console.error('[Dashboard] Failed to send SOS:', error);
      await addEvent({
        type: 'system',
        severity: 'warning',
        title: 'SOS Failed',
        description: 'Could not broadcast SOS signal. Please try again.',
        timestamp: Date.now(),
      });
    } finally {
      setSosSending(false);
      setSOSPressed(false);
    }
  }, [sosSending, userSettings, peerCount, addSOSMessage, addEvent]);

  const getDeviceLocation = async (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(undefined),
          { timeout: 3000 }
        );
      } else {
        resolve(undefined);
      }
    });
  };

  // ── Derived stats ──────────────────────────────────────────────────────
  const recentEvents = events.slice(0, 10);
  const criticalCount = events.filter((e) => e.severity === 'critical').length;
  const warningCount = events.filter((e) => e.severity === 'warning').length;

  // Normalize audio level to 0–100% bar width
  const audioLevelPct = Math.max(0, Math.min(100, ((audioLevel + 60) / 60) * 100));
  const audioLevelColor =
    audioLevelPct > 70 ? '#ef2b2d' : audioLevelPct > 40 ? '#f59e0b' : '#10b981';

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
            className={`sos-button ${sosPressed ? 'pressed' : ''} ${sosConfirm ? 'confirm-mode' : ''} ${sosSending ? 'sending' : ''}`}
            onClick={handleSOSInitiate}
            disabled={sosSending}
            title="Press to send emergency signal"
          >
            <div className="sos-pulse"></div>
            <span>{sosSending ? 'SENDING...' : 'SOS'}</span>
          </button>

          {sosPressed && !sosSending && (
            <div className="sos-prompt">
              <p>Press again or confirm below</p>
              <small>(5-second timeout)</small>
            </div>
          )}

          {sosConfirm && !sosSending && (
            <div className="sos-confirm-prompt">
              <p className="confirm-text">Confirm SOS broadcast?</p>
              <button className="btn-confirm-sos" onClick={handleSOSConfirm}>
                ✓ CONFIRM &amp; BROADCAST
              </button>
              <button
                className="btn-cancel-sos"
                onClick={() => {
                  setSosConfirm(false);
                  setSOSPressed(false);
                  if (sosConfirmTimer.current) clearTimeout(sosConfirmTimer.current);
                }}
              >
                ✕ CANCEL
              </button>
            </div>
          )}
        </div>

        <div className="sos-status">
          <div className="status-badge">
            <span className="label">Mic Status</span>
            <span className={`value ${micActive ? 'active' : 'inactive'}`}>
              {micActive ? (
                <><Mic size={12} /> ACTIVE</>
              ) : (
                <><MicOff size={12} /> INACTIVE</>
              )}
            </span>
          </div>
          <div className="status-badge">
            <span className="label">Broadcast Range</span>
            <span className="value">{peerCount > 0 ? `${peerCount} Peers` : 'Standalone'}</span>
          </div>
        </div>

        {/* Live audio level meter */}
        {micActive && (
          <div className="audio-level-container">
            <span className="audio-level-label">Audio Level</span>
            <div className="audio-level-bar-bg">
              <div
                className="audio-level-bar-fill"
                style={{ width: `${audioLevelPct}%`, background: audioLevelColor }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Panel */}
      <div className="stats-panel">
        <div className="stat-card critical">
          <div className="stat-icon"><Zap size={20} /></div>
          <div className="stat-content">
            <div className="stat-value">{criticalCount}</div>
            <div className="stat-label">Critical Events</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <div className="stat-content">
            <div className="stat-value">{warningCount}</div>
            <div className="stat-label">Warnings</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon"><CheckCircle size={20} /></div>
          <div className="stat-content">
            <div className="stat-value">{sos_messages.length}</div>
            <div className="stat-label">SOS Messages</div>
          </div>
        </div>
      </div>

      {/* Real-Time Event Feed */}
      <div className="events-feed">
        <h3 className="feed-title">Real-Time Event Feed</h3>

        {recentEvents.length === 0 ? (
          <div className="empty-state">
            <p>No events detected yet.</p>
            <small>Emergency events will appear here in real time.</small>
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
