// src/App.tsx
import { useState, useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { AlertCircle, Wifi, Bluetooth, Radio, Settings, Map as MapIcon, BarChart3, Users } from 'lucide-react';
import Dashboard from './components/Dashboard';
import EventLog from './components/EventLog';
import PeersPanel from './components/PeersPanel';
import SettingsPanel from './components/SettingsPanel';
import MapView from './components/MapView';
import { dbService } from './services/db';
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
  } = useAppStore();

  const [isInitialized, setIsInitialized] = useState(true);
  const [storageStatus, setStorageStatus] = useState('--');

  // useEffect(() => {
  //   initializeApp();
  // }, []);

  // useEffect(() => {
  //   const updateStorage = async () => {
  //     const metrics = await dbService.getStorageMetrics();
  //     setStorageStatus(`${metrics.totalEvents} events`);
  //   };
  //   updateStorage();
  //   const interval = setInterval(updateStorage, 30000);
  //   return () => clearInterval(interval);
  // }, []);

  const initializeApp = async () => {
    try {
      // Initialize user settings if not present
      let settings = await dbService.getUserSettings('default-user');
      if (!settings) {
        settings = {
          userId: 'default-user',
          deviceId: `device_${Math.random().toString(36).substr(2, 9)}`,
          alias: `AuraMesh-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          alertModes: {
            haptic: true,
            visual: true,
            audio: true,
          },
          akdEnabled: true,
          akdConfidenceThreshold: 0.75,
          emergencyKeywords: ['SOS', 'fire', 'help', 'earthquake', 'flood', 'danger', 'emergency'],
          dataRetentionDays: 72,
        };
        await dbService.saveUserSettings(settings);
      }

      setUserSettings(settings);
      setMicActive(true);
      setBluetoothActive(true);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
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
