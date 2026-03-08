// src/services/acousticService.ts
import { useAppStore } from '../store/appStore';

class AcousticService {
    private recognition: any = null;
    private audioContext: AudioContext | null = null; // Add this
    private analyser: AnalyserNode | null = null;    // Add this
    private dataArray: Uint8Array | null = null;     // Add this

    async startListening() {
        const { userSettings } = useAppStore.getState();
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) return;

        // --- Add Audio Analyser for getAudioLevel ---
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new AudioContext();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        } catch (err) {
            console.error("Mic access denied for visualization", err);
        }
        // --------------------------------------------

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
            const confidence = event.results[event.results.length - 1][0].confidence;
            const keywords = userSettings?.emergencyKeywords || ['SOS', 'help'];
            const detected = keywords.find(kw => transcript.includes(kw.toLowerCase()));

            if (detected && confidence > (userSettings?.akdConfidenceThreshold || 0.7)) {
                useAppStore.getState().addKeywordDetection({
                    timestamp: Date.now(),
                    keyword: detected,
                    confidence,
                    deviceId: userSettings?.deviceId || 'local',
                });
            }
        };

        this.recognition.start();
    }

    // Add this missing method
    getAudioLevel(): number {
        if (!this.analyser || !this.dataArray) return 0;
        this.analyser.getByteFrequencyData(this.dataArray as any);
        const sum = this.dataArray.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.dataArray.length); // Returns 0-255
    }

    stopListening() {
        this.recognition?.stop();
        this.audioContext?.close();
    }
}

export const acousticService = new AcousticService();