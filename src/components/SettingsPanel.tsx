// src/components/SettingsPanel.tsx

import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { dbService } from '../services/db';
import { AlertCircle, Zap, Volume2 } from 'lucide-react';
import './SettingsPanel.css';

function SettingsPanel() {
  const {
    userSettings,
    setUserSettings,
    updateAlertMode,
    setAKDThreshold,
    reset,
  } = useAppStore();

  const [showDangerZone, setShowDangerZone] = useState(false);
  const [testAlert, setTestAlert] = useState(false);

  const handleAKDToggle = (enabled: boolean) => {
    if (userSettings) {
      const updated = { ...userSettings, akdEnabled: enabled };
      setUserSettings(updated);
      dbService.saveUserSettings(updated);
    }
  };

  const handleThresholdChange = (threshold: number) => {
    setAKDThreshold(threshold);
    if (userSettings) {
      const updated = { ...userSettings, akdConfidenceThreshold: threshold };
      dbService.saveUserSettings(updated);
    }
  };

  const handleAlertModeChange = (mode: 'haptic' | 'visual' | 'audio') => {
    if (userSettings) {
      const enabled = !userSettings.alertModes[mode];
      updateAlertMode(mode, enabled);

      const updated = {
        ...userSettings,
        alertModes: {
          ...userSettings.alertModes,
          [mode]: enabled,
        },
      };
      dbService.saveUserSettings(updated);
    }
  };

  const handleTestAlert = async () => {
    setTestAlert(true);

    if (userSettings?.alertModes.haptic && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    if (userSettings?.alertModes.visual) {
      document.body.classList.add('alert-flash');
      setTimeout(() => document.body.classList.remove('alert-flash'), 1000);
    }

    if (userSettings?.alertModes.audio) {
      const utterance = new SpeechSynthesisUtterance('Test alert received');
      speechSynthesis.speak(utterance);
    }

    setTimeout(() => setTestAlert(false), 2000);
  };

  const handleClearData = async () => {
    if (window.confirm('Delete all event data? This cannot be undone.')) {
      await dbService.clearAllData();
      reset();
    }
  };

  if (!userSettings) {
    return <div className="settings-container">Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      {/* Device Section */}
      <div className="settings-section">
        <h2>Device Information</h2>

        <div className="setting-item">
          <label className="setting-label">Device Alias</label>
          <input
            type="text"
            value={userSettings.alias}
            readOnly
            className="setting-input read-only"
          />
          <small>Your unique device identifier on the mesh</small>
        </div>

        <div className="setting-item">
          <label className="setting-label">User ID</label>
          <input
            type="text"
            value={userSettings.userId}
            readOnly
            className="setting-input read-only"
          />
          <small>Persistent user identifier</small>
        </div>
      </div>

      {/* Alert Modes Section */}
      <div className="settings-section">
        <h2>Alert Notification Modes</h2>
        <p className="section-description">
          Choose how you want to receive emergency alerts. You can enable multiple modes.
        </p>

        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={userSettings.alertModes.haptic}
              onChange={() => handleAlertModeChange('haptic')}
            />
            <div className="toggle-content">
              <Zap size={16} />
              <div>
                <span className="toggle-label">Haptic Feedback</span>
                <span className="toggle-desc">Device vibrates on emergency alerts</span>
              </div>
            </div>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={userSettings.alertModes.visual}
              onChange={() => handleAlertModeChange('visual')}
            />
            <div className="toggle-content">
              <AlertCircle size={16} />
              <div>
                <span className="toggle-label">Visual Alerts</span>
                <span className="toggle-desc">Screen flashes and displays alert banners</span>
              </div>
            </div>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={userSettings.alertModes.audio}
              onChange={() => handleAlertModeChange('audio')}
            />
            <div className="toggle-content">
              <Volume2 size={16} />
              <div>
                <span className="toggle-label">Audio Alerts</span>
                <span className="toggle-desc">Alert messages are read aloud</span>
              </div>
            </div>
          </label>
        </div>

        <button
          className="btn-test-alert"
          onClick={handleTestAlert}
          disabled={testAlert}
        >
          {testAlert ? 'Testing...' : 'Test Alert'}
        </button>
      </div>

      {/* Acoustic Monitoring Section */}
      <div className="settings-section">
        <h2>Acoustic Keyword Detection (AKD)</h2>
        <p className="section-description">
          Monitors your environment for emergency keywords. Processing occurs locally on your device.
        </p>

        <div className="toggle-item full">
          <input
            type="checkbox"
            checked={userSettings.akdEnabled}
            onChange={(e) => handleAKDToggle(e.target.checked)}
            id="akd-toggle"
          />
          <label htmlFor="akd-toggle">
            <span className="toggle-label">Enable Acoustic Monitoring</span>
            <span className="toggle-desc">
              Listen for keywords: {userSettings.emergencyKeywords.join(', ')}
            </span>
          </label>
        </div>

        {userSettings.akdEnabled && (
          <div className="setting-item">
            <label className="setting-label">
              Detection Sensitivity: {(userSettings.akdConfidenceThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={userSettings.akdConfidenceThreshold}
              onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
              className="setting-slider"
            />
            <div className="sensitivity-guide">
              <span className="guide-low">More Sensitive</span>
              <span className="guide-high">More Conservative</span>
            </div>
            <small>Lower sensitivity = more alerts (more false positives) | Higher sensitivity = fewer alerts (might miss real keywords)</small>
          </div>
        )}
      </div>

      {/* Data Management Section */}
      <div className="settings-section">
        <h2>Data Management</h2>

        <div className="setting-item">
          <label className="setting-label">Data Retention Period</label>
          <select
            className="setting-input"
            defaultValue={userSettings.dataRetentionDays}
          >
            <option value="24">24 hours</option>
            <option value="72">72 hours (default)</option>
            <option value="168">7 days</option>
            <option value="720">30 days</option>
          </select>
          <small>Events older than this period will be automatically deleted</small>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section danger-zone">
        <button
          className="btn-danger-toggle"
          onClick={() => setShowDangerZone(!showDangerZone)}
        >
          {showDangerZone ? '▼' : '▶'} Danger Zone
        </button>

        {showDangerZone && (
          <div className="danger-content">
            <button
              className="btn-danger"
              onClick={handleClearData}
            >
              Delete All Data
            </button>
            <small>Permanently delete all stored events, SOS messages, and keyword detections. This cannot be undone.</small>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <div className="footer-content">
          <p className="footer-title">AuraMesh Emergency Communication System</p>
          <p className="footer-version">Version 1.0 • Offline-First • Privacy-Focused</p>
          <p className="footer-note">All audio processing occurs locally on your device. No data is transmitted without your consent.</p>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
