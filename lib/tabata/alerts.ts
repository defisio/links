import type { Phase } from "./engine";
import type { Preferences } from "./storage";
import { renderWorkoutTrack } from "./audio-track";
import { getPhaseVoices } from "./phase-voices";

type AudioSession = { type: string };
type AudioNavigator = Navigator & { audioSession?: AudioSession };
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
type AudioPreferences = Pick<Preferences, "sound" | "voice">;
interface AlertOptions {
  mediaBase?: string;
  onError?: (message: string) => void;
  onPause?: () => void;
  onResume?: () => void;
}
export class WorkoutAlerts {
  private context: AudioContext | null = null;
  private media: HTMLAudioElement | null = null;
  private track: HTMLAudioElement | null = null;
  private voicePreview: HTMLAudioElement | null = null;
  private nameTimer: ReturnType<typeof setTimeout> | null = null;
  private trackURL: string | null = null;
  private trackActive = false;
  private trackPending = false;
  private trackUnlocked = false;
  private channel: BroadcastChannel | null = null;
  private session: AudioSession | null = null;
  private previousSessionType: string | null = null;
  private ready: Promise<boolean> = Promise.resolve(false);
  private active = false;
  private generation = 0;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private oscillators = new Set<OscillatorNode>();
  private emitted = new Set<string>();
  constructor(private options: AlertOptions = {}) {}

  get hasWorkoutTrack(): boolean {
    return this.trackActive || this.trackPending;
  }
  prepareWorkout(preferences: AudioPreferences): Promise<boolean> {
    const ready = this.enable(preferences);
    this.trackPending = preferences.sound || preferences.voice;
    // Unlock the same media element while the actual tap is still active.
    if (
      (preferences.sound || preferences.voice) &&
      !this.trackUnlocked &&
      this.options.mediaBase
    ) {
      try {
        this.track ??= new Audio();
        this.track.src = `${this.options.mediaBase}${preferences.sound ? "ready" : "unlock"}.wav`;
        this.trackUnlocked = true;
        void Promise.resolve(this.track.play()).catch((error) => {
          if (error?.name !== "AbortError") {
            this.trackUnlocked = false;
            this.failed(error);
          }
        });
      } catch (error) {
        this.trackUnlocked = false;
        this.failed(error);
      }
    }
    return ready;
  }
  playWorkout(
    phases: readonly Phase[],
    offsetMs: number,
    preferences: AudioPreferences,
    name: string,
  ) {
    if (!preferences.sound && !preferences.voice) {
      this.stopWorkout();
      return;
    }
    this.stopWorkout();
    try {
      const { buffer } = renderWorkoutTrack(phases, offsetMs, {
        sound: preferences.sound,
        voice: preferences.voice,
        voices: preferences.voice ? getPhaseVoices() : undefined,
      });
      this.track ??= new Audio();
      this.track.preload = "auto";
      this.track.loop = false;
      this.track.volume = 1;
      this.trackURL = URL.createObjectURL(
        new Blob([buffer], { type: "audio/wav" }),
      );
      this.track.src = this.trackURL;
      this.trackActive = true;
      this.track.onended = () => {
        if (this.track?.ended) this.deactivate();
      };
      this.track.onpause = () => {
        if (this.trackActive && this.track?.paused && !this.track.ended) {
          this.deactivate(true);
          this.options.onPause?.();
        }
      };
      this.track.onerror = () => {
        this.stopWorkout();
        this.failed();
      };
      // Reuse the element already unlocked by prepareWorkout in the actual tap.
      void Promise.resolve(this.track.play()).catch((error) => {
        if (error?.name !== "AbortError") {
          this.stopWorkout();
          this.failed(error);
        }
      });
      if (typeof BroadcastChannel !== "undefined") {
        if (!this.channel) {
          this.channel = new BroadcastChannel("de-fisio.tabata-soundtrack");
          this.channel.onmessage = () => this.deactivate();
        }
        this.channel.postMessage("playing");
      }
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.playbackState = "playing";
          if (typeof MediaMetadata !== "undefined")
            navigator.mediaSession.metadata = new MediaMetadata({
              title: name,
              artist: "Débora Eduarda",
              album: "Tabata Timer",
            });
          navigator.mediaSession.setActionHandler("pause", () => {
            this.deactivate(true);
            this.options.onPause?.();
          });
          navigator.mediaSession.setActionHandler("play", () =>
            this.options.onResume?.(),
          );
        } catch {
          /* Lock-screen controls are optional. */
        }
      }
    } catch (error) {
      this.stopWorkout();
      this.options.onError?.(
        error instanceof Error
          ? error.message
          : "Não foi possível preparar o áudio do treino.",
      );
    }
  }
  stopWorkout() {
    if (this.nameTimer !== null) clearTimeout(this.nameTimer);
    this.nameTimer = null;
    this.trackActive = false;
    this.trackPending = false;
    this.track?.pause();
    if (this.trackURL) URL.revokeObjectURL(this.trackURL);
    this.trackURL = null;
  }

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
      /* Per-tab deduplication still works without storage. */
    }
    return true;
  }
  private playbackSession(): boolean {
    try {
      const session = (navigator as AudioNavigator).audioSession;
      if (!session) return false;
      const previous = session.type;
      // Select the media category BEFORE creating/resuming Web Audio on iOS.
      session.type = "playback";
      if (!this.session) {
        this.session = session;
        this.previousSessionType = previous;
      }
      return true;
    } catch {
      return false;
    }
  }
  private failed(error?: unknown) {
    if (error instanceof Error && error.name === "AbortError") return;
    this.options.onError?.(
      "O som não pôde ser ativado. Aumente o volume de mídia e toque em Testar alertas ou Retomar.",
    );
  }
  enable(
    preferences: AudioPreferences = { sound: true, voice: true },
  ): Promise<boolean> {
    if (!preferences.sound && !preferences.voice) {
      this.deactivate();
      return Promise.resolve(false);
    }
    if (this.releaseTimer !== null) clearTimeout(this.releaseTimer);
    this.releaseTimer = null;
    this.active = true;
    const generation = this.generation;
    const routed = this.playbackSession();
    const appleMobile =
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!routed && appleMobile && this.options.mediaBase) {
      // Older Safari: reuse one media element, unlocked by the actual button tap.
      this.media ??= new Audio();
      this.media.preload = "auto";
      this.media.muted = !preferences.sound;
      this.ready = this.playMedia("ready");
      return this.ready;
    }
    try {
      if (!this.context || this.context.state === "closed") {
        const Context =
          window.AudioContext || (window as AudioWindow).webkitAudioContext;
        if (!Context) throw new Error("Web Audio unavailable");
        this.context = new Context();
      }
      const context = this.context;
      // Call resume synchronously in the user gesture, then wait before beeping.
      this.ready = Promise.resolve(context.resume())
        .then(() => {
          if (!this.active && context.state === "running")
            void context.suspend().catch(() => {});
          return (
            this.active &&
            generation === this.generation &&
            context.state === "running"
          );
        })
        .catch((error) => {
          this.failed(error);
          return false;
        });
      return this.ready;
    } catch (error) {
      this.failed(error);
      return Promise.resolve(false);
    }
  }
  private playMedia(name: string): Promise<boolean> {
    if (!this.active || !this.media || !this.options.mediaBase)
      return Promise.resolve(false);
    try {
      this.media.pause();
      this.media.src = `${this.options.mediaBase}${name}.wav`;
      this.media.currentTime = 0;
      return Promise.resolve(this.media.play())
        .then(() => true)
        .catch((error) => {
          // Replacing the initial confirmation with the first phase may abort it.
          if (error?.name !== "AbortError") this.failed(error);
          return false;
        });
    } catch (error) {
      this.failed(error);
      return Promise.resolve(false);
    }
  }
  private beep(frequency: number, duration: number, delay = 0) {
    const generation = this.generation;
    void this.ready.then((ready) => {
      if (
        !ready ||
        !this.active ||
        generation !== this.generation ||
        this.context?.state !== "running"
      )
        return;
      try {
        const context = this.context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const at = context.currentTime + delay;
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.22, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        this.oscillators.add(oscillator);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.01);
        oscillator.onended = () => {
          this.oscillators.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
      } catch (error) {
        this.failed(error);
      }
    });
  }
  say(text: string, enabled: boolean) {
    if (!enabled || !this.active || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((v) => v.lang === "pt-BR" && v.localService) ??
        voices.find((v) => v.lang.startsWith("pt"));
      if (voice) utterance.voice = voice;
      utterance.onerror = (event) => {
        if (event.error !== "interrupted" && event.error !== "canceled") {
          if (this.trackActive)
            this.options.onError?.(
              "A voz não está disponível neste momento. A sequência de bipes continua sendo reproduzida.",
            );
          else this.failed();
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      this.failed(error);
    }
  }
  countdown(preferences: Preferences) {
    if (preferences.sound && !this.hasWorkoutTrack) {
      if (this.media) void this.playMedia("countdown");
      else this.beep(650, 0.13);
    }
    this.vibrate(45, preferences.vibration);
  }
  test(preferences: Preferences) {
    void this.enable(preferences);
    if (preferences.sound) {
      if (this.media) void this.playMedia("transition");
      else {
        this.beep(800, 0.22);
        this.beep(1200, 0.16, 0.26);
      }
    }
    if (preferences.voice && this.options.mediaBase) {
      try {
        this.voicePreview ??= new Audio();
        this.voicePreview.src = `${this.options.mediaBase}voice-test.wav`;
        void Promise.resolve(this.voicePreview.play()).catch((error) => this.failed(error));
      } catch (error) {
        this.failed(error);
      }
    }
    this.vibrate([90, 60, 90], preferences.vibration);
  }
  transition(
    phase: Phase,
    nextExercise: string | undefined,
    preferences: Preferences,
  ) {
    if (preferences.sound && !this.hasWorkoutTrack) {
      if (this.media) void this.playMedia("transition");
      else {
        this.beep(phase.kind === "exercise" ? 1050 : 800, 0.22);
        this.beep(1200, 0.16, 0.26);
      }
    }
    this.vibrate([90, 60, 90], preferences.vibration);
    if (this.hasWorkoutTrack) {
      if (this.nameTimer !== null) clearTimeout(this.nameTimer);
      this.nameTimer = null;
      // Fixed phase announcements are already in the media track. Only custom
      // names use the browser voice, with the page visible and after that clip.
      const name = phase.kind === "exercise" ? phase.exerciseName : nextExercise;
      if (
        preferences.voice && name &&
        !/^Exercício \d+$/i.test(name) &&
        document.visibilityState === "visible"
      ) {
        const duration = getPhaseVoices()[phase.kind].length / 8;
        this.nameTimer = setTimeout(() => {
          this.nameTimer = null;
          if (this.active && document.visibilityState === "visible")
            this.say(phase.kind === "exercise" ? name : `A seguir: ${name}.`, true);
        }, duration + 160);
      }
      return;
    }
    this.say(
      phase.kind === "exercise"
        ? `${phase.exerciseName}. Comece!`
        : `${phase.label}.${nextExercise ? ` A seguir: ${nextExercise}.` : ""}`,
      preferences.voice,
    );
  }
  complete(preferences: Preferences) {
    if (this.trackActive) {
      this.vibrate([140, 80, 140], preferences.vibration);
      return;
    }
    if (preferences.sound && !this.trackActive) {
      if (this.media) void this.playMedia("complete");
      else
        [700, 900, 1200].forEach((hz, index) =>
          this.beep(hz, 0.25, index * 0.22),
        );
    }
    this.vibrate([140, 80, 140], preferences.vibration);
    this.say("Treino concluído.", preferences.voice);
    if (!this.trackActive) this.deactivateAfter(3000);
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
    if (this.nameTimer !== null) clearTimeout(this.nameTimer);
    this.nameTimer = null;
    try {
      window.speechSynthesis?.cancel();
      navigator.vibrate?.(0);
    } catch {
      /* No-op. */
    }
  }
  deactivateAfter(milliseconds: number) {
    if (this.releaseTimer !== null) clearTimeout(this.releaseTimer);
    this.releaseTimer = setTimeout(() => this.deactivate(), milliseconds);
  }
  deactivate(preservePlaybackControls = false) {
    this.active = false;
    this.generation += 1;
    if (this.releaseTimer !== null) clearTimeout(this.releaseTimer);
    this.releaseTimer = null;
    this.silence();
    this.stopWorkout();
    for (const oscillator of this.oscillators) {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch {
        /* Already ended. */
      }
    }
    this.oscillators.clear();
    this.media?.pause();
    this.voicePreview?.pause();
    if (this.context?.state === "running")
      void this.context.suspend().catch(() => {});
    if (this.session && this.previousSessionType !== null) {
      try {
        if (this.session.type === "playback")
          this.session.type = this.previousSessionType;
      } catch {
        /* Session revoked. */
      }
    }
    this.session = null;
    this.previousSessionType = null;
    try {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = preservePlaybackControls
          ? "paused"
          : "none";
        if (!preservePlaybackControls) {
          navigator.mediaSession.setActionHandler("play", null);
          navigator.mediaSession.setActionHandler("pause", null);
        }
      }
    } catch {
      /* Media controls are optional. */
    }
  }
  dispose() {
    this.deactivate();
    void this.context?.close().catch(() => {});
    this.context = null;
    this.media = null;
    this.voicePreview = null;
    this.channel?.close();
    this.channel = null;
  }
}
