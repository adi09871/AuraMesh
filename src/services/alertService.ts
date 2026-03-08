// src/services/alertService.ts
import { Severity, UserSettings } from '../types';

export const alertService = {
    triggerAlert(title: string, severity: Severity) {
        this.vibrate(severity);
        this.speak(title);
    },

    // Add this missing method
    triggerSOSAlert(settings: UserSettings, peerCount: number) {
        if (settings.alertModes.haptic) {
            this.vibrate('critical');
        }
        if (settings.alertModes.audio) {
            this.speak(`SOS broadcasted to ${peerCount} nearby peers`);
        }
        if (settings.alertModes.visual) {
            this.flashUI('critical');
        }
    },

    vibrate(severity: Severity) {
        if (!navigator.vibrate) return;
        const patterns = {
            critical: [500, 100, 500, 100, 500],
            warning: [200, 100, 200],
            info: [100]
        };
        navigator.vibrate(patterns[severity]);
    },

    speak(text: string) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    },

    flashUI(severity: Severity) {
        document.body.classList.add(`alert-flash-${severity}`);
        setTimeout(() => document.body.classList.remove(`alert-flash-${severity}`), 1000);
    }
};