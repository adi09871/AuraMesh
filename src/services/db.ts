// src/services/db.ts

import Dexie, { Table } from 'dexie';
import { SOSMessage, KeywordDetection, EmergencyEvent, UserSettings, PeerDevice } from '../types';

export class AuraMeshDB extends Dexie {
  sos_messages!: Table<SOSMessage>;
  keyword_detections!: Table<KeywordDetection>;
  events!: Table<EmergencyEvent>;
  user_settings!: Table<UserSettings>;
  peers!: Table<PeerDevice>;

  constructor() {
    super('AuraMeshDB');
    this.version(1).stores({
      sos_messages: '++id, timestamp, userId, deviceId, sourceDevice',
      keyword_detections: '++id, timestamp, keyword, deviceId',
      events: '++id, timestamp, type, severity',
      user_settings: 'userId',
      peers: 'id, lastSeen',
    });
  }
}

export const db = new AuraMeshDB();

// Database service functions
export const dbService = {
  // SOS Messages
  async saveSOS(message: Omit<SOSMessage, 'id'>): Promise<string> {
    const id = `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.sos_messages.add({ ...message, id });
    return id;
  },

  async getSOSMessages(limit = 100, offset = 0): Promise<SOSMessage[]> {
    return db.sos_messages
      .orderBy('timestamp')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  },

  async getSOSMessagesByDevice(deviceId: string): Promise<SOSMessage[]> {
    return db.sos_messages.where('deviceId').equals(deviceId).toArray();
  },

  async updateSOSStatus(sosId: string, status: 'active' | 'resolved' | 'false_alarm'): Promise<void> {
    await db.sos_messages.update(sosId, { status });
  },

  async deleteOldSOS(daysAgo: number): Promise<number> {
    const threshold = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    return db.sos_messages.where('timestamp').below(threshold).delete();
  },

  // Keyword Detections
  async saveKeywordDetection(detection: Omit<KeywordDetection, 'id'>): Promise<string> {
    const id = `kwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.keyword_detections.add({ ...detection, id });
    return id;
  },

  async getKeywordDetections(limit = 100, offset = 0): Promise<KeywordDetection[]> {
    return db.keyword_detections
      .orderBy('timestamp')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  },

  async getKeywordDetectionsByType(keyword: string, limit = 50): Promise<KeywordDetection[]> {
    return db.keyword_detections
      .where('keyword')
      .equals(keyword)
      .reverse()
      .limit(limit)
      .toArray();
  },

  // Events
  async saveEvent(event: Omit<EmergencyEvent, 'id'>): Promise<string> {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.events.add({ ...event, id });
    return id;
  },

  async getEvents(
    limit = 200,
    offset = 0,
    filterType?: string,
    filterSeverity?: string
  ): Promise<EmergencyEvent[]> {
    let query = db.events.orderBy('timestamp').reverse();

    if (filterType) {
      query = db.events.where('type').equals(filterType).reverse();
    }

    let results = await query.offset(offset).limit(limit).toArray();

    if (filterSeverity) {
      results = results.filter((e) => e.severity === filterSeverity);
    }

    return results;
  },

  async getEventsSince(timestamp: number): Promise<EmergencyEvent[]> {
    return db.events.where('timestamp').above(timestamp).toArray();
  },

  // User Settings
  async saveUserSettings(settings: UserSettings): Promise<void> {
    await db.user_settings.put(settings);
  },

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    return db.user_settings.get(userId);
  },

  // Peers
  async savePeer(peer: PeerDevice): Promise<void> {
    await db.peers.put(peer);
  },

  async getPeer(peerId: string): Promise<PeerDevice | undefined> {
    return db.peers.get(peerId);
  },

  async getAllPeers(): Promise<PeerDevice[]> {
    return db.peers.toArray();
  },

  async getActivePeers(withinSeconds = 60): Promise<PeerDevice[]> {
    const threshold = Date.now() - withinSeconds * 1000;
    return db.peers.where('lastSeen').above(threshold).toArray();
  },

  async deleteStalePeers(withinSeconds = 300): Promise<number> {
    const threshold = Date.now() - withinSeconds * 1000;
    return db.peers.where('lastSeen').below(threshold).delete();
  },

  // Storage metrics
  async getStorageMetrics() {
    const [events, sos, keywords] = await Promise.all([
      db.events.toArray(),
      db.sos_messages.toArray(),
      db.keyword_detections.toArray(),
    ]);

    const allData = [...events, ...sos, ...keywords];
    const timestamps = allData.map((d) => (d as any).timestamp).filter(Boolean);

    return {
      totalEvents: events.length,
      totalSOS: sos.length,
      totalKeywords: keywords.length,
      storageUsedMB: (new Blob([JSON.stringify(allData)]).size / 1024 / 1024).toFixed(2),
      oldestEvent: Math.min(...timestamps),
      newestEvent: Math.max(...timestamps),
    };
  },

  // Cleanup
  async clearAllData(): Promise<void> {
    await db.delete();
    await db.open();
  },

  // Export data
  async exportAsJSON(): Promise<string> {
    const [events, sos, keywords] = await Promise.all([
      db.events.toArray(),
      db.sos_messages.toArray(),
      db.keyword_detections.toArray(),
    ]);

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        events,
        sos_messages: sos,
        keyword_detections: keywords,
      },
      null,
      2
    );
  },

  async exportAsCSV(): Promise<string> {
    const [events, sos, keywords] = await Promise.all([
      db.events.toArray(),
      db.sos_messages.toArray(),
      db.keyword_detections.toArray(),
    ]);

    const csvLines = [
      'Type,Timestamp,Severity,Title,Data',
      ...events.map(
        (e) =>
          `${e.type},${new Date(e.timestamp).toISOString()},${e.severity},${e.title},"${e.description}"`
      ),
      ...sos.map(
        (s) =>
          `SOS,${new Date(s.timestamp).toISOString()},critical,"${s.emergencyType}","User: ${s.userId}"`
      ),
      ...keywords.map(
        (k) =>
          `Keyword,${new Date(k.timestamp).toISOString()},warning,"${k.keyword}","Confidence: ${(k.confidence * 100).toFixed(1)}%"`
      ),
    ];

    return csvLines.join('\n');
  },
};
