// src/services/alertService.ts
// Multi-modal alert dispatch: haptic, visual flash, and audio TTS.
// All modalities respect user settings.

import { EmergencyEvent, Severity, UserSettings } from '../types';

// ── Haptic ─────────────────────────────────────────────────────────────────

const HAPTIC_PATTERNS: Record<Severity, number[]> = {
    critical: [300, 100, 300, 100, 300, 100, 500],
    warning: [200, 100, 200, 100, 200],
    info: [100, 50, 100],
};

export function hapticAlert(severity: Severity): void {
    if (!navigator.vibrate) {
        console.warn('[Alert] Haptic API not available on this device');
        return;
    }
    navigator.vibrate(HAPTIC_PATTERNS[severity]);
}

// ── Visual Flash ───────────────────────────────────────────────────────────

export function visualAlert(severity: Severity): void {
    const className = `alert-flash-${severity}`;
    document.body.classList.add(className, 'alert-flash');

    const duration = severity === 'critical' ? 1200 : severity === 'warning' ? 800 : 400;

    setTimeout(() => {
        document.body.classList.remove(className, 'alert-flash');
    }, duration);
}

// ── Audio / TTS ────────────────────────────────────────────────────────────

// Play a short beep via AudioContext (fallback if TTS unavailable)
export function playTone(frequency: number = 880, durationMs: number = 300): void {
    try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + durationMs / 1000);

        oscillator.onended = () => ctx.close();
    } catch (err) {
        console.error('[Alert] Failed to play tone:', err);
    }
}

export function audioAlert(message: string, severity: Severity = 'info'): void {
    if (!window.speechSynthesis) {
        // Fallback to a beep
        const freq = severity === 'critical' ? 1000 : severity === 'warning' ? 660 : 440;
        playTone(freq, 500);
        return;
    }

    // Cancel any in-progress speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.volume = 1;
    utterance.rate = severity === 'critical' ? 1.2 : 1.0;
    utterance.pitch = severity === 'critical' ? 1.3 : 1.0;

    window.speechSynthesis.speak(utterance);
}

// ── Combined Dispatch ──────────────────────────────────────────────────────

export function triggerAlert(event: EmergencyEvent, settings: UserSettings): void {
    const { severity, title, description } = event;
    const modes = settings.alertModes;

    console.log(`[Alert] Triggering ${severity} alert: "${title}"`);

    if (modes.haptic) {
        hapticAlert(severity);
    }

    if (modes.visual) {
        visualAlert(severity);
    }

    if (modes.audio) {
        const spoken =
            severity === 'critical'
                ? `EMERGENCY ALERT: ${title}. ${description}`
                : `Alert: ${title}`;
        audioAlert(spoken, severity);
    }
}

// ── Convenience: quick SOS alert ─────────────────────────────────────────

export function triggerSOSAlert(settings: UserSettings, peerCount: number): void {
    const event: EmergencyEvent = {
        id: `alert_${Date.now()}`,
        type: 'sos',
        severity: 'critical',
        timestamp: Date.now(),
        title: 'SOS BROADCAST SENT',
        description: `Your emergency signal has been transmitted to ${peerCount} peer${peerCount !== 1 ? 's' : ''}.`,
    };
    triggerAlert(event, settings);
}

// ── Test all modalities (used from Settings page) ────────────────────────

export function testAlert(settings: UserSettings): void {
    if (settings.alertModes.haptic) hapticAlert('warning');
    if (settings.alertModes.visual) visualAlert('warning');
    if (settings.alertModes.audio) audioAlert('Test alert received. AuraMesh is working correctly.', 'info');
}

export const alertService = {
    triggerAlert,
    triggerSOSAlert,
    testAlert,
    hapticAlert,
    visualAlert,
    audioAlert,
    playTone,
};
