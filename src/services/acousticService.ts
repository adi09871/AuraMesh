// src/services/acousticService.ts
import { useAppStore } from '../store/appStore';
import { alertService } from './alertService';

class AcousticService {
    private recognition: any = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataArray: Uint8Array | null = null;
    private isListening: boolean = false;

    async startListening() {
        if (this.isListening) return;

        const { userSettings } = useAppStore.getState();
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) return;

        // --- Request Mic Permission and Setup Audio Analyser ---
        // Asking for permission explicitly before setting up recognition
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new AudioContext();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.isListening = true;
        // --------------------------------------------

        if (!this.recognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event: any) => {
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
                const confidence = event.results[event.results.length - 1][0].confidence;

                // Add the user's specific requested keywords, plus defaults
                const defaultKeywords: import('../types').EmergencyKeyword[] = ['SOS', 'help', 'fire', 'danger', 'emergency'];
                const configKeywords = userSettings?.emergencyKeywords || defaultKeywords;

                const detected = configKeywords.find(kw => transcript.includes(kw.toLowerCase()));

                if (detected && confidence > (userSettings?.akdConfidenceThreshold || 0.6)) {
                    useAppStore.getState().addKeywordDetection({
                        timestamp: Date.now(),
                        keyword: detected,
                        confidence,
                        deviceId: userSettings?.deviceId || 'local',
                    });

                    // Check user preferences to trigger appropriate alerts
                    const modes = userSettings?.alertModes || { haptic: true, visual: true, audio: true };

                    if (modes.haptic) {
                        alertService.vibrate('critical');
                    }
                    if (modes.visual) {
                        alertService.flashUI('critical');
                    }
                    if (modes.audio) {
                        alertService.speak(`Emergency keyword detected: ${detected}`);
                    }

                    console.log(`[AcousticService] Emergency keyword detected: ${detected}`);
                }
            };

            this.recognition.onend = () => {
                // Continuously listen by restarting when it unexpectedly stops
                if (this.isListening && this.recognition) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.error('Failed to restart speech recognition', e);
                    }
                }
            };

            this.recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    this.isListening = false;
                }
            };
        }

        try {
            this.recognition.start();
        } catch (e) {
            console.error("Speech recognition start error", e);
        }
    }

    getAudioLevel(): number {
        if (!this.analyser || !this.dataArray) return 0;
        this.analyser.getByteFrequencyData(this.dataArray as any);
        const sum = this.dataArray.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.dataArray.length); // Returns 0-255
    }

    stopListening() {
        this.isListening = false;
        this.recognition?.stop();
        if (this.audioContext?.state !== 'closed') {
            this.audioContext?.close().catch(console.error);
        }
    }
}

export const acousticService = new AcousticService();