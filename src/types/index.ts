// src/types/index.ts

export type AlertModality = 'haptic' | 'visual' | 'audio';
export type EventType = 'keyword' | 'sos' | 'system' | 'peer_connected' | 'peer_disconnected';
export type Severity = 'critical' | 'warning' | 'info';
export type EmergencyKeyword = 
  | 'SOS' 
  | 'fire' 
  | 'help' 
  | 'earthquake' 
  | 'flood' 
  | 'danger' 
  | 'emergency';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface SOSMessage {
  id: string;
  timestamp: number;
  userId: string;
  deviceId: string;
  coordinates?: Coordinates;
  emergencyType: EmergencyKeyword;
  message?: string;
  status: 'active' | 'resolved' | 'false_alarm';
  sourceDevice: string;
  hopCount: number;
}

export interface KeywordDetection {
  id: string;
  timestamp: number;
  keyword: EmergencyKeyword;
  confidence: number;
  coordinates?: Coordinates;
  deviceId: string;
}

export interface EmergencyEvent {
  id: string;
  type: EventType;
  timestamp: number;
  severity: Severity;
  title: string;
  description: string;
  data?: SOSMessage | KeywordDetection | PeerDevice;
}

export interface PeerDevice {
  id: string;
  lastSeen: number;
  signalStrength?: number;
  connectionType: 'webrtc' | 'bluetooth' | 'direct';
  coordinates?: Coordinates;
  alias?: string;
}

export interface UserSettings {
  userId: string;
  deviceId: string;
  alias: string;
  alertModes: {
    haptic: boolean;
    visual: boolean;
    audio: boolean;
  };
  akdEnabled: boolean;
  akdConfidenceThreshold: number;
  emergencyKeywords: EmergencyKeyword[];
  autoSleepDuration?: number;
  dataRetentionDays: number;
}

export interface MeshTopology {
  nodes: Map<string, PeerDevice>;
  edges: Array<{ source: string; target: string }>;
}

export interface AppState {
  // Settings
  userSettings: UserSettings | null;
  
  // Current state
  micActive: boolean;
  bluetoothActive: boolean;
  peerCount: number;
  storageUsed: number;
  
  // Events
  events: EmergencyEvent[];
  sos_messages: SOSMessage[];
  keyword_detections: KeywordDetection[];
  
  // Mesh
  peers: Map<string, PeerDevice>;
  meshTopology: MeshTopology;
  
  // UI
  activeTab: 'dashboard' | 'map' | 'log' | 'settings' | 'peers';
  filterType?: EventType;
  filterSeverity?: Severity;
  lastAlertTime?: number;
}

export interface StorageMetrics {
  totalEvents: number;
  totalSOS: number;
  totalKeywords: number;
  storageUsedMB: number;
  oldestEvent: number;
  newestEvent: number;
}
