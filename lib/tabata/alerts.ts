import type { Phase } from "./engine";
import type { Preferences } from "./storage";

type AudioNavigator = Navigator & { audioSession?: { type: string } };
export class WorkoutAlerts {
  private context: AudioContext | null = null;
  private emitted = new Set<string>();
  claim(key: string): boolean {
    if (this.emitted.has(key)) return false;
    this.emitted.add(key);
    try {
      const raw = JSON.parse(
        localStorage.getItem("de-fisio.tabata.alerts") || "[]",
      );
      const recent: string[] = Array.isArray(raw)
        ? raw.filter((value) => typeof value === "string")
        : [];
      if (recent.includes(key)) return false;
      localStorage.setItem(
        "de-fisio.tabata.alerts",
        JSON.stringify([key, ...recent].slice(0, 64)),
      );
    } catch {
      /* Per-tab deduplication still works without local storage. */
    }
    return true;
  }
  enable() {
    try {
      if (!this.context) this.context = new AudioContext();
      void this.context.resume().catch(() => {});
      const session = (navigator as AudioNavigator).audioSession;
      if (session) session.type = "transient";
    } catch {
      /* Audio is an enhancement, never a dependency of the clock. */
    }
  }
  private beep(frequency: number, duration: number, delay = 0) {
    try {
      if (!this.context || this.context.state !== "running") return;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const at = this.context.currentTime + delay;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.22, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.01);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {
      /* Some devices revoke audio while hidden. */
    }
  }
  say(text: string, enabled: boolean) {
    if (!enabled || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 1.05;
      const voice =
        window.speechSynthesis
          .getVoices()
          .find((v) => v.lang === "pt-BR" && v.localService) ??
        window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("pt"));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    } catch {
      /* Keep visual execution available if speech is unavailable. */
    }
  }
  countdown(preferences: Preferences) {
    if (preferences.sound) this.beep(650, 0.13);
    this.vibrate(45, preferences.vibration);
  }
  transition(
    phase: Phase,
    nextExercise: string | undefined,
    preferences: Preferences,
  ) {
    if (preferences.sound) {
      this.beep(phase.kind === "exercise" ? 1050 : 800, 0.22);
      this.beep(1200, 0.16, 0.26);
    }
    this.vibrate([90, 60, 90], preferences.vibration);
    this.say(
      phase.kind === "exercise"
        ? `${phase.exerciseName}. Comece!`
        : `${phase.label}.${nextExercise ? ` A seguir: ${nextExercise}.` : ""}`,
      preferences.voice,
    );
  }
  complete(preferences: Preferences) {
    if (preferences.sound)
      [700, 900, 1200].forEach((hz, index) =>
        this.beep(hz, 0.25, index * 0.22),
      );
    this.vibrate([140, 80, 140], preferences.vibration);
    this.say("Treino concluído.", preferences.voice);
  }
  private vibrate(pattern: number | number[], enabled: boolean) {
    if (enabled) {
      try {
        navigator.vibrate?.(pattern);
      } catch {
        /* Unsupported hardware. */
      }
    }
  }
  silence() {
    try {
      window.speechSynthesis?.cancel();
      navigator.vibrate?.(0);
    } catch {
      /* No-op. */
    }
  }
  dispose() {
    this.silence();
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
