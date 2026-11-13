import type { Phase } from "./engine";

export const TRACK_SAMPLE_RATE = 8000;
const MAX_TRACK_MS = 2 * 60 * 60 * 1000;
const FINISH_MS = 3000;
export interface TrackAudioOptions {
  sound?: boolean;
  voice?: boolean;
  voices?: Partial<Record<Phase["kind"] | "complete", Uint8Array>>;
}

/** A real workout soundtrack: the media player handles future cues without JS timers. */
export function renderWorkoutTrack(
  phases: readonly Phase[],
  offsetMs = 0,
  options: TrackAudioOptions = {},
): { buffer: ArrayBuffer; durationMs: number } {
  const end = phases.at(-1)?.end ?? 0;
  const offset = Math.max(0, Math.min(end, offsetMs));
  const remaining = end - offset;
  if (remaining > MAX_TRACK_MS)
    throw new Error(
      "O áudio em segundo plano está disponível para até 2 horas restantes de treino.",
    );
  if (end === 0) throw new Error("O treino precisa ter pelo menos uma fase.");
  const durationMs = remaining + FINISH_MS;
  const samples = Math.ceil((durationMs * TRACK_SAMPLE_RATE) / 1000);
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const text = (at: number, value: string) => {
    for (let i = 0; i < value.length; i++) bytes[at + i] = value.charCodeAt(i);
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TRACK_SAMPLE_RATE, true);
  view.setUint32(28, TRACK_SAMPLE_RATE, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  const speech = (
    absoluteMs: number,
    clip: Uint8Array | undefined,
    availableMs: number,
  ) => {
    if (!options.voice || !clip?.length || absoluteMs < offset || availableMs <= 0)
      return;
    const start = Math.round((absoluteMs - offset) * TRACK_SAMPLE_RATE / 1000);
    const count = Math.min(
      clip.length,
      Math.floor(availableMs * TRACK_SAMPLE_RATE / 1000),
    );
    for (let i = 0; i < count && start + i < samples; i++) {
      const source = clip[Math.min(clip.length - 1, Math.floor(i * clip.length / count))];
      bytes[44 + start + i] = Math.max(
        0, Math.min(255, bytes[44 + start + i] + source - 128),
      );
    }
  };
  const tone = (absoluteMs: number, frequency: number, lengthMs: number) => {
    // Do not replay alerts missed before this start/resume/skip.
    if (options.sound === false || absoluteMs < offset) return;
    const start = Math.round(
      ((absoluteMs - offset) * TRACK_SAMPLE_RATE) / 1000,
    );
    const count = Math.round((lengthMs * TRACK_SAMPLE_RATE) / 1000);
    for (let i = 0; i < count && start + i < samples; i++) {
      const envelope =
        Math.min(1, i / (TRACK_SAMPLE_RATE * 0.012)) *
        Math.max(0, 1 - i / count);
      const amplitude =
        Math.sin((2 * Math.PI * frequency * i) / TRACK_SAMPLE_RATE) *
        envelope *
        (options.voice ? 18 : 45);
      bytes[44 + start + i] = Math.max(
        0,
        Math.min(255, bytes[44 + start + i] + Math.round(amplitude)),
      );
    }
  };
  for (const phase of phases) {
    // Allow the small commit delay after a start/skip, without replaying old phases.
    const start =
      phase.start < offset && offset - phase.start <= 200
        ? offset
        : phase.start;
    speech(start + 60, options.voices?.[phase.kind], phase.end - start - 80);
    tone(start, phase.kind === "exercise" ? 1050 : 800, 220);
    if (start >= offset) tone(start + 260, 1200, 160);
    for (const seconds of [3, 2, 1]) {
      if (phase.duration >= seconds) tone(phase.end - seconds * 1000, 650, 130);
    }
  }
  speech(end + 60, options.voices?.complete, FINISH_MS - 120);
  [700, 900, 1200].forEach((frequency, index) =>
    tone(end + index * 220, frequency, 250),
  );
  return { buffer, durationMs };
}
