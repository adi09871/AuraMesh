// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { useAppStore } from './store/appStore';
import { AlertCircle, Bluetooth, Radio, Settings, Map as MapIcon, BarChart3, Users } from 'lucide-react';
import Dashboard from './components/Dashboard';
import EventLog from './components/EventLog';
import PeersPanel from './components/PeersPanel';
import SettingsPanel from './components/SettingsPanel';
import MapView from './components/MapView';
import { dbService } from './services/db';
import { acousticService } from './services/acousticService';
import { alertService } from './services/alertService';
import { meshService } from './services/meshService';
import './App.css';

function App() {
  const {
    userSettings,
    micActive,
    bluetoothActive,
    peerCount,
    activeTab,
    setActiveTab,
    setUserSettings,
    setMicActive,
    setBluetoothActive,
    setPeerCount,
    updatePeer,
    addKeywordDetection,
    addSOSMessage,
    addEvent,
    peers,
  } = useAppStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [storageStatus, setStorageStatus] = useState('--');
  const settingsRef = useRef(userSettings);

  // Keep settingsRef in sync so callbacks always have latest settings
  useEffect(() => {
    settingsRef.current = userSettings;
  }, [userSettings]);

  // ── App Initialization ─────────────────────────────────────────────────
  useEffect(() => {
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Storage status polling (every 30s) ─────────────────────────────────
  useEffect(() => {
    if (!isInitialized) return;
    const updateStorage = async () => {
      const metrics = await dbService.getStorageMetrics();
      setStorageStatus(`${metrics.totalEvents} events · ${metrics.storageUsedMB} MB`);
    };
    updateStorage();
    const interval = setInterval(updateStorage, 30_000);
    return () => clearInterval(interval);
  }, [isInitialized]);

  // ── Peer count sync ────────────────────────────────────────────────────
  useEffect(() => {
    setPeerCount(peers.size);
  }, [peers, setPeerCount]);

  // ── Service teardown on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      acousticService.stopListening();
      meshService.stopMesh();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // ── Load / create user settings ──────────────────────────────────
      let settings = await dbService.getUserSettings('default-user');
      if (!settings) {
        settings = {
          userId: 'default-user',
          deviceId: `device_${Math.random().toString(36).substr(2, 9)}`,
          alias: `AuraMesh-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          alertModes: { haptic: true, visual: true, audio: true },
          akdEnabled: true,
          akdConfidenceThreshold: 0.75,
          emergencyKeywords: ['SOS', 'fire', 'help', 'earthquake', 'flood', 'danger', 'emergency'],
          dataRetentionDays: 72,
        };
        await dbService.saveUserSettings(settings);
      }
      setUserSettings(settings);

      // ── Boot Mesh Service ────────────────────────────────────────────
      meshService.startMesh(
        settings.deviceId,
        settings.alias,
        // onPeerUpdate
        async (peer) => {
          await updatePeer(peer);
        },
        // onMessageReceived
        async (msg) => {
          await addEvent({
            type: 'system',
            severity: 'info',
            title: `Mesh message received [${msg.type}]`,
            description: `From ${msg.senderAlias || msg.senderId} · hop ${msg.hopCount}/${msg.maxHops}`,
            timestamp: msg.timestamp,
          });
        },
        // onSOSReceived
        async (sos) => {
          await addSOSMessage(sos);
          alertService.triggerAlert(
            `Incoming SOS from ${sos.userId}: ${sos.emergencyType}`,
            'critical'
          );
        }
      );
      setBluetoothActive(true);

      // ── Boot Acoustic Monitoring (if enabled) ────────────────────────
      if (settings.akdEnabled) {
        try {
          await acousticService.startListening();
          setMicActive(true);
        } catch {
          // User denied mic or browser doesn't support — graceful degradation
          setMicActive(false);
        }
      }

      // ── Heartbeat so peers can discover this device ──────────────────
      meshService.sendHeartbeat();

      // ── Log system startup event ─────────────────────────────────────
      await addEvent({
        type: 'system',
        severity: 'info',
        title: 'AuraMesh Initialized',
        description: `Device: ${settings.alias} · Mesh: active · AKD: ${settings.akdEnabled ? 'active' : 'off'}`,
        timestamp: Date.now(),
      });

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize AuraMesh:', error);
      setIsInitialized(true); // Show UI anyway
    }
  };

  if (!isInitialized) {
    return (
      <div className="app-init-screen">
        <div className="init-spinner"></div>
        <h1>AuraMesh</h1>
        <p>Initializing emergency communication system...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <Radio className="logo-icon" />
            <h1>AURAMESH</h1>
          </div>
          <div className="device-info">
            {userSettings && (
              <span className="device-alias">{userSettings.alias}</span>
            )}
          </div>
        </div>

        <div className="header-right">
          <div className="status-indicators">
            <div className={`status-item ${micActive ? 'active' : 'inactive'}`}>
              <div className="status-dot"></div>
              <span>Mic</span>
            </div>
            <div className={`status-item ${bluetoothActive ? 'active' : 'inactive'}`}>
              <Bluetooth size={16} />
              <span>BLE</span>
            </div>
            <div className="status-item info">
              <Users size={16} />
              <span>{peerCount} peers</span>
            </div>
          </div>

          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-navigation">
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={18} />
          <span>Dashboard</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <MapIcon size={18} />
          <span>Map</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          <AlertCircle size={18} />
          <span>Event Log</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'peers' ? 'active' : ''}`}
          onClick={() => setActiveTab('peers')}
        >
          <Users size={18} />
          <span>Peers</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'log' && <EventLog />}
        {activeTab === 'peers' && <PeersPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-info">
          <span className="footer-status">{storageStatus}</span>
          <span className="footer-version">v1.0 - Offline First</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
