// src/store/appStore.ts

import { create } from 'zustand';
import { AppState, EmergencyEvent, EventType, Severity, PeerDevice, SOSMessage, KeywordDetection, UserSettings, MeshTopology } from '../types';
import { dbService } from '../services/db';

interface AppActions {
  // Settings
  setUserSettings: (settings: UserSettings) => void;
  updateAlertMode: (mode: 'haptic' | 'visual' | 'audio', enabled: boolean) => void;
  setAKDThreshold: (threshold: number) => void;

  // System state
  setMicActive: (active: boolean) => void;
  setBluetoothActive: (active: boolean) => void;
  setPeerCount: (count: number) => void;
  setStorageUsed: (used: number) => void;

  // Events
  addEvent: (event: Omit<EmergencyEvent, 'id'>) => Promise<void>;
  addSOSMessage: (message: Omit<SOSMessage, 'id'>) => Promise<void>;
  addKeywordDetection: (detection: Omit<KeywordDetection, 'id'>) => Promise<void>;
  loadEvents: (limit?: number, offset?: number, typeFilter?: string, severityFilter?: string) => Promise<void>;
  filterEvents: (typeFilter?: EventType, severityFilter?: Severity) => void;
  clearOldEvents: (daysAgo: number) => Promise<void>;

  // Peers & Mesh
  updatePeer: (peer: PeerDevice) => Promise<void>;
  removePeer: (peerId: string) => void;
  setMeshTopology: (topology: MeshTopology) => void;
  loadActivePeers: (withinSeconds?: number) => Promise<void>;

  // UI
  setActiveTab: (tab: 'dashboard' | 'map' | 'log' | 'settings' | 'peers') => void;
  setLastAlertTime: (time: number) => void;

  // Bulk operations
  reset: () => void;
}

const initialState: AppState = {
  userSettings: null,
  micActive: false,
  bluetoothActive: false,
  peerCount: 0,
  storageUsed: 0,
  events: [],
  sos_messages: [],
  keyword_detections: [],
  peers: new Map(),
  meshTopology: { nodes: new Map(), edges: [] },
  activeTab: 'dashboard',
};

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,

  // Settings
  setUserSettings: (settings) => set({ userSettings: settings }),

  updateAlertMode: (mode, enabled) =>
    set((state) => {
      if (state.userSettings) {
        return {
          userSettings: {
            ...state.userSettings,
            alertModes: {
              ...state.userSettings.alertModes,
              [mode]: enabled,
            },
          },
        };
      }
      return state;
    }),

  setAKDThreshold: (threshold) =>
    set((state) => {
      if (state.userSettings) {
        return {
          userSettings: {
            ...state.userSettings,
            akdConfidenceThreshold: threshold,
          },
        };
      }
      return state;
    }),

  // System state
  setMicActive: (active) => set({ micActive: active }),
  setBluetoothActive: (active) => set({ bluetoothActive: active }),
  setPeerCount: (count) => set({ peerCount: count }),
  setStorageUsed: (used) => set({ storageUsed: used }),

  // Events
  addEvent: async (event) => {
    const eventWithId = {
      ...event,
      id: `evt_${Date.now()}`,
    };

    await dbService.saveEvent(event);

    set((state) => ({
      events: [eventWithId as EmergencyEvent, ...state.events].slice(0, 500),
    }));
  },

  addSOSMessage: async (message) => {
    const sosId = await dbService.saveSOS(message);
    const fullMessage = { ...message, id: sosId } as SOSMessage;

    set((state) => ({
      sos_messages: [fullMessage, ...state.sos_messages].slice(0, 200),
    }));

    // Also create an event for dashboard
    await get().addEvent({
      type: 'sos',
      severity: 'critical',
      title: `${message.emergencyType} - SOS from ${message.userId}`,
      description: message.message || `Emergency type: ${message.emergencyType}`,
      timestamp: message.timestamp,
      data: fullMessage,
    });
  },

  addKeywordDetection: async (detection) => {
    const detectionId = await dbService.saveKeywordDetection(detection);
    const fullDetection = { ...detection, id: detectionId } as KeywordDetection;

    set((state) => ({
      keyword_detections: [fullDetection, ...state.keyword_detections].slice(0, 200),
    }));

    // Create event
    await get().addEvent({
      type: 'keyword',
      severity: detection.confidence > 0.8 ? 'critical' : 'warning',
      title: `Keyword Detected: ${detection.keyword}`,
      description: `Confidence: ${(detection.confidence * 100).toFixed(1)}%`,
      timestamp: detection.timestamp,
      data: fullDetection,
    });
  },

  loadEvents: async (limit = 100, offset = 0, typeFilter, severityFilter) => {
    const events = await dbService.getEvents(limit, offset, typeFilter, severityFilter);
    set({ events });
  },

  filterEvents: (typeFilter?: EventType, severityFilter?: Severity) => {
    set({ filterType: typeFilter, filterSeverity: severityFilter });
  },

  clearOldEvents: async (daysAgo) => {
    await dbService.deleteOldSOS(daysAgo);
    await get().loadEvents();
  },

  // Peers & Mesh
  updatePeer: async (peer) => {
    await dbService.savePeer(peer);

    set((state) => {
      const peers = new Map(state.peers);
      peers.set(peer.id, peer);
      return { peers };
    });

    // Create system event if it's a new peer
    const existing = get().peers.get(peer.id);
    if (!existing) {
      await get().addEvent({
        type: 'peer_connected',
        severity: 'info',
        title: `Peer Connected: ${peer.alias || peer.id}`,
        description: `Connection: ${peer.connectionType}`,
        timestamp: Date.now(),
        data: peer,
      });
    }
  },

  removePeer: (peerId) => {
    set((state) => {
      const peers = new Map(state.peers);
      peers.delete(peerId);
      return { peers };
    });
  },

  setMeshTopology: (topology) => set({ meshTopology: topology }),

  loadActivePeers: async (withinSeconds = 60) => {
    const peers = await dbService.getActivePeers(withinSeconds);
    const peerMap = new Map(peers.map((p) => [p.id, p]));
    set({ peers: peerMap });
  },

  // UI
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLastAlertTime: (time) => set({ lastAlertTime: time }),

  // Bulk
  reset: () => set(initialState),
}));
