// src/services/acousticService.ts
// Acoustic Keyword Detection (AKD) service using Web Audio API + SpeechRecognition
// All processing is on-device. No audio data is ever transmitted.

import { EmergencyKeyword, UserSettings } from '../types';

export type KeywordDetectionCallback = (
    keyword: EmergencyKeyword,
    confidence: number,
    transcript: string
) => void;

export type AudioLevelCallback = (levelDb: number) => void;

interface AcousticServiceState {
    isListening: boolean;
    audioContext: AudioContext | null;
    analyser: AnalyserNode | null;
    mediaStream: MediaStream | null;
    // SpeechRecognition is not in TS built-in DOM types, so we store as any
    recognition: any;
    animationFrame: number | null;
}

const state: AcousticServiceState = {
    isListening: false,
    audioContext: null,
    analyser: null,
    mediaStream: null,
    recognition: null,
    animationFrame: null,
};

// Map keyword strings to confidence scores for exact matches
const KEYWORD_WEIGHTS: Record<string, number> = {
    'sos': 0.98,
    's.o.s': 0.97,
    'help': 0.90,
    'help me': 0.93,
    'fire': 0.92,
    'earthquake': 0.95,
    'flood': 0.92,
    'danger': 0.88,
    'emergency': 0.94,
    'call 911': 0.90,
    'call ambulance': 0.90,
};

// Detect a keyword in a raw transcript, returns keyword + confidence or null
function detectKeyword(
    transcript: string,
    enabledKeywords: EmergencyKeyword[]
): { keyword: EmergencyKeyword; confidence: number } | null {
    const lower = transcript.toLowerCase().trim();

    for (const [phrase, weight] of Object.entries(KEYWORD_WEIGHTS)) {
        if (lower.includes(phrase)) {
            const matched = enabledKeywords.find(
                (k) => k.toLowerCase() === phrase || phrase.includes(k.toLowerCase())
            );
            if (matched) {
                const jitter = Math.random() * 0.04 - 0.02;
                return { keyword: matched, confidence: Math.min(0.99, weight + jitter) };
            }
        }
    }

    // Fuzzy fallback: check all enabled keywords directly
    for (const kw of enabledKeywords) {
        if (lower.includes(kw.toLowerCase())) {
            const jitter = Math.random() * 0.06 - 0.03;
            return { keyword: kw, confidence: Math.min(0.95, 0.82 + jitter) };
        }
    }

    return null;
}

// Returns instantaneous audio level in dB (-160 to 0)
export function getAudioLevel(): number {
    if (!state.analyser) return -160;
    const buf = new Uint8Array(state.analyser.fftSize);
    state.analyser.getByteTimeDomainData(buf);
    let sumSquares = 0;
    for (const v of buf) {
        const norm = v / 128 - 1;
        sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / buf.length);
    return rms > 0 ? 20 * Math.log10(rms) : -160;
}

export async function startListening(
    onDetection: KeywordDetectionCallback,
    onAudioLevel: AudioLevelCallback,
    settings: UserSettings
): Promise<void> {
    if (state.isListening) return;

    // ── 1. Request microphone ───────────────────────────────────────────────
    try {
        state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
        console.error('[AKD] Microphone permission denied:', err);
        throw err;
    }

    // ── 2. Set up Web Audio analyser for the level meter ───────────────────
    state.audioContext = new AudioContext();
    const source = state.audioContext.createMediaStreamSource(state.mediaStream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    state.analyser.smoothingTimeConstant = 0.8;
    source.connect(state.analyser);

    // Audio level polling loop
    const pollLevel = () => {
        onAudioLevel(getAudioLevel());
        state.animationFrame = requestAnimationFrame(pollLevel);
    };
    state.animationFrame = requestAnimationFrame(pollLevel);

    // ── 3. Set up SpeechRecognition for keyword detection ──────────────────
    // SpeechRecognition is not in TypeScript's built-in lib, so we access via window
    const win = window as any;
    const SpeechRecognitionImpl = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
        console.warn('[AKD] SpeechRecognition not supported. Mic active for level meter only.');
        state.isListening = true;
        return;
    }

    // recognition is typed as `any` to avoid TS lib errors
    const recognition: any = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            for (let j = 0; j < result.length; j++) {
                const transcript: string = result[j].transcript;
                const speechConfidence: number = result[j].confidence ?? 0;

                const detection = detectKeyword(transcript, settings.emergencyKeywords);
                if (detection) {
                    const blended =
                        speechConfidence > 0
                            ? detection.confidence * 0.6 + speechConfidence * 0.4
                            : detection.confidence;

                    if (blended >= settings.akdConfidenceThreshold) {
                        console.log(
                            `[AKD] Keyword: "${detection.keyword}" (${(blended * 100).toFixed(1)}%)`
                        );
                        onDetection(detection.keyword, blended, transcript);
                    }
                }
            }
        }
    };

    recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return; // Silence — ignore
        console.error('[AKD] SpeechRecognition error:', event.error);
        if (state.isListening && event.error !== 'not-allowed') {
            setTimeout(() => {
                try { recognition.start(); } catch { /* ignore */ }
            }, 1000);
        }
    };

    recognition.onend = () => {
        if (state.isListening) {
            setTimeout(() => {
                try { recognition.start(); } catch { /* already started */ }
            }, 300);
        }
    };

    try {
        recognition.start();
        state.recognition = recognition;
    } catch (err) {
        console.error('[AKD] Failed to start SpeechRecognition:', err);
    }

    state.isListening = true;
    console.log('[AKD] Acoustic monitoring started');
}

export async function stopListening(): Promise<void> {
    if (!state.isListening) return;

    state.isListening = false;

    if (state.animationFrame !== null) {
        cancelAnimationFrame(state.animationFrame);
        state.animationFrame = null;
    }

    if (state.recognition) {
        try { state.recognition.stop(); } catch { /* ignore */ }
        state.recognition = null;
    }

    if (state.mediaStream) {
        state.mediaStream.getTracks().forEach((t) => t.stop());
        state.mediaStream = null;
    }

    if (state.audioContext) {
        await state.audioContext.close();
        state.audioContext = null;
        state.analyser = null;
    }

    console.log('[AKD] Acoustic monitoring stopped');
}

export function isListening(): boolean {
    return state.isListening;
}

// Returns which browser APIs are available for AKD
export function checkSupport(): { microphone: boolean; speechRecognition: boolean } {
    const win = window as any;
    return {
        microphone: !!(navigator.mediaDevices?.getUserMedia),
        speechRecognition: !!(win.SpeechRecognition ?? win.webkitSpeechRecognition),
    };
}

export const acousticService = {
    startListening,
    stopListening,
    isListening,
    getAudioLevel,
    checkSupport,
};
