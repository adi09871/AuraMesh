// src/services/meshService.ts
import { PeerDevice } from '../types';
import { useAppStore } from '../store/appStore';

const MESH_CHANNEL = 'auramesh_sync';

export const meshService = {
    channel: new BroadcastChannel(MESH_CHANNEL),

    startMesh(
        deviceId: string,
        alias: string,
        onPeerUpdate: (peer: PeerDevice) => Promise<void>,
        onMessageReceived: (msg: any) => Promise<void>,
        onSOSReceived: (sos: any) => Promise<void>
    ) {
        this.channel.onmessage = (event) => {
            const { type, payload } = event.data;
            if (type === 'PEER_PULSE') {
                onPeerUpdate(payload);
            } else if (type === 'MESH_MESSAGE') {
                onMessageReceived(payload);
            } else if (type === 'SOS_MESSAGE') {
                onSOSReceived(payload);
            }
        };
    },

    stopMesh() {
        this.channel.onmessage = null;
    },

    // Add this missing method
    async scanBluetooth(callback: (peer: PeerDevice) => Promise<void>): Promise<void> {
        // Simulate a 2-second scan
        return new Promise((resolve) => {
            this.sendHeartbeat(); // Trigger peers to respond

            // For the demo, we show a slight delay
            setTimeout(() => {
                resolve();
            }, 2000);
        });
    },

    sendHeartbeat() {
        const settings = useAppStore.getState().userSettings;
        if (!settings) return;
        this.channel.postMessage({
            type: 'PEER_PULSE',
            payload: {
                id: settings.deviceId,
                alias: settings.alias,
                lastSeen: Date.now(),
                connectionType: 'mesh'
            }
        });
    },

    broadcastSOS(sosPayload: any) {
        this.channel.postMessage({
            type: 'SOS_MESSAGE',
            payload: sosPayload
        });
    }
};