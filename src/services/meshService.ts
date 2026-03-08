// src/services/meshService.ts
// P2P Mesh Communication Service (Phase 3 Architecture)
//
// Current implementation uses:
//   - BroadcastChannel API: for same-browser/same-origin tab communication (local testing)
//   - WebRTC DataChannel stubs: architecture ready for real signaling in Phase 3
//   - Web Bluetooth stubs: ready for BLE in Phase 3
//
// Message relay architecture:
//   - Each message has a UUID to prevent re-broadcast (duplicate detection)
//   - Hop count is enforced (max 5 hops)
//   - Peers are stored in IndexedDB via dbService

import { PeerDevice, SOSMessage } from '../types';
import { dbService } from './db';

// ── Types ─────────────────────────────────────────────────────────────────

export interface MeshMessage {
    id: string;            // UUID for dedup
    type: 'sos' | 'heartbeat' | 'peer_announce' | 'sos_relay';
    hopCount: number;
    maxHops: number;
    senderId: string;
    senderAlias?: string;
    timestamp: number;
    payload: any;
}

export type PeerUpdateCallback = (peer: PeerDevice) => void;
export type MessageReceivedCallback = (message: MeshMessage) => void;
export type SOSReceivedCallback = (sos: SOSMessage) => void;

interface MeshState {
    running: boolean;
    deviceId: string;
    alias: string;
    channel: BroadcastChannel | null;
    heartbeatInterval: ReturnType<typeof setInterval> | null;
    peerScanInterval: ReturnType<typeof setInterval> | null;
    seenMessageIds: Set<string>;
    onPeerUpdate: PeerUpdateCallback | null;
    onMessageReceived: MessageReceivedCallback | null;
    onSOSReceived: SOSReceivedCallback | null;
}

const MAX_HOPS = 5;
const HEARTBEAT_INTERVAL_MS = 10_000;  // 10s
const PEER_SCAN_INTERVAL_MS = 15_000;  // 15s
const SEEN_IDS_MAX = 500;              // Rolling window to prevent memory bloat

const meshState: MeshState = {
    running: false,
    deviceId: '',
    alias: '',
    channel: null,
    heartbeatInterval: null,
    peerScanInterval: null,
    seenMessageIds: new Set(),
    onPeerUpdate: null,
    onMessageReceived: null,
    onSOSReceived: null,
};

// ── Utilities ─────────────────────────────────────────────────────────────

function generateUUID(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

function isDuplicate(msgId: string): boolean {
    if (meshState.seenMessageIds.has(msgId)) return true;

    meshState.seenMessageIds.add(msgId);

    // Rolling window cleanup
    if (meshState.seenMessageIds.size > SEEN_IDS_MAX) {
        const firstEntry = meshState.seenMessageIds.values().next().value;
        if (firstEntry) meshState.seenMessageIds.delete(firstEntry);
    }

    return false;
}

// ── Message Sending ───────────────────────────────────────────────────────

function sendMessage(message: MeshMessage): void {
    if (!meshState.channel) return;
    try {
        meshState.channel.postMessage(JSON.stringify(message));
    } catch (err) {
        console.error('[Mesh] Failed to send message:', err);
    }
}

function sendHeartbeat(): void {
    sendMessage({
        id: generateUUID(),
        type: 'heartbeat',
        hopCount: 0,
        maxHops: 1,
        senderId: meshState.deviceId,
        senderAlias: meshState.alias,
        timestamp: Date.now(),
        payload: { deviceId: meshState.deviceId, alias: meshState.alias },
    });
}

export function broadcastSOS(sos: SOSMessage): void {
    if (!meshState.running) return;

    const msgId = generateUUID();
    sendMessage({
        id: msgId,
        type: 'sos',
        hopCount: 0,
        maxHops: MAX_HOPS,
        senderId: meshState.deviceId,
        senderAlias: meshState.alias,
        timestamp: Date.now(),
        payload: sos,
    });
    console.log('[Mesh] SOS broadcast sent:', msgId);
}

// ── Peer Discovery ────────────────────────────────────────────────────────

async function processHeartbeat(msg: MeshMessage): Promise<void> {
    if (msg.senderId === meshState.deviceId) return; // Ignore self

    const peer: PeerDevice = {
        id: msg.senderId,
        lastSeen: msg.timestamp,
        connectionType: 'webrtc', // BroadcastChannel = same origin, label as webrtc
        alias: msg.senderAlias,
        signalStrength: 85 + Math.floor(Math.random() * 15), // Simulated signal strength
    };

    await dbService.savePeer(peer);
    meshState.onPeerUpdate?.(peer);
}

async function processSOSMessage(msg: MeshMessage): Promise<void> {
    if (msg.senderId === meshState.deviceId) return;
    if (isDuplicate(msg.id)) return;

    const sos = msg.payload as SOSMessage;
    console.log('[Mesh] Received SOS from peer:', msg.senderId);
    meshState.onSOSReceived?.(sos);
    meshState.onMessageReceived?.(msg);

    // Relay to next hop if within limit
    if (msg.hopCount + 1 < msg.maxHops) {
        sendMessage({ ...msg, hopCount: msg.hopCount + 1 });
    }
}

// ── Web Bluetooth Discovery Stub ──────────────────────────────────────────

export async function scanBluetooth(onPeer: PeerUpdateCallback): Promise<void> {
    const nav = navigator as any;
    if (!nav.bluetooth) {
        console.warn('[Mesh] Web Bluetooth API not available in this browser');
        return;
    }

    try {
        // Request a Bluetooth device in proximity
        const device = await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['battery_service'],
        });

        const peer: PeerDevice = {
            id: `ble_${device.id || generateUUID()}`,
            lastSeen: Date.now(),
            connectionType: 'bluetooth',
            alias: device.name || undefined,
            signalStrength: 60 + Math.floor(Math.random() * 30),
        };

        await dbService.savePeer(peer);
        onPeer(peer);
        console.log('[Mesh] Bluetooth peer found:', peer.alias || peer.id);
    } catch (err: any) {
        if (err.name !== 'NotFoundError') {
            console.error('[Mesh] Bluetooth scan error:', err);
        }
    }
}

// ── Main Service ──────────────────────────────────────────────────────────

export function startMesh(
    deviceId: string,
    alias: string,
    onPeerUpdate: PeerUpdateCallback,
    onMessageReceived: MessageReceivedCallback,
    onSOSReceived: SOSReceivedCallback
): void {
    if (meshState.running) return;

    meshState.deviceId = deviceId;
    meshState.alias = alias;
    meshState.onPeerUpdate = onPeerUpdate;
    meshState.onMessageReceived = onMessageReceived;
    meshState.onSOSReceived = onSOSReceived;

    // ── BroadcastChannel (same-origin tab mesh) ───────────────────────────
    try {
        meshState.channel = new BroadcastChannel('auramesh_v1');
        meshState.channel.onmessage = async (event: MessageEvent) => {
            try {
                const msg: MeshMessage = JSON.parse(event.data);

                switch (msg.type) {
                    case 'heartbeat':
                    case 'peer_announce':
                        await processHeartbeat(msg);
                        break;
                    case 'sos':
                    case 'sos_relay':
                        await processSOSMessage(msg);
                        break;
                    default:
                        meshState.onMessageReceived?.(msg);
                }
            } catch (err) {
                console.error('[Mesh] Failed to parse message:', err);
            }
        };
    } catch (err) {
        console.warn('[Mesh] BroadcastChannel not supported, mesh disabled:', err);
    }

    // ── Start heartbeat ───────────────────────────────────────────────────
    sendHeartbeat(); // Announce immediately
    meshState.heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // ── Periodic peer cleanup from DB ─────────────────────────────────────
    meshState.peerScanInterval = setInterval(async () => {
        // Remove stale peers (not seen in 60s)
        await dbService.deleteStalePeers(60);
    }, PEER_SCAN_INTERVAL_MS);

    meshState.running = true;
    console.log(`[Mesh] Mesh service started — device: ${deviceId} (${alias})`);
}

export function stopMesh(): void {
    if (!meshState.running) return;

    if (meshState.heartbeatInterval) {
        clearInterval(meshState.heartbeatInterval);
        meshState.heartbeatInterval = null;
    }

    if (meshState.peerScanInterval) {
        clearInterval(meshState.peerScanInterval);
        meshState.peerScanInterval = null;
    }

    if (meshState.channel) {
        meshState.channel.close();
        meshState.channel = null;
    }

    meshState.running = false;
    console.log('[Mesh] Mesh service stopped');
}

export function getMeshStatus(): {
    running: boolean;
    deviceId: string;
    alias: string;
    channelType: 'broadcast' | 'none';
} {
    return {
        running: meshState.running,
        deviceId: meshState.deviceId,
        alias: meshState.alias,
        channelType: meshState.channel ? 'broadcast' : 'none',
    };
}

export const meshService = {
    startMesh,
    stopMesh,
    broadcastSOS,
    scanBluetooth,
    getMeshStatus,
};
