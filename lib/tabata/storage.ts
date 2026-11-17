import { z } from "zod";
import { CLASSIC, type Execution, type Workout } from "./engine";

const seconds = z.number().int().min(0).max(3600);
export const workoutSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sets: z.number().int().min(1).max(99),
  repetitions: z.number().int().min(1).max(99),
  preparation: seconds,
  warmup: seconds,
  cooldown: seconds,
  exercise: seconds.min(1),
  rest: seconds,
  setRest: seconds,
  exercises: z.array(z.string().max(80)).max(99),
});
const executionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(80),
    workout: workoutSchema,
    startedAt: z.number().finite().nonnegative(),
    endedAt: z.number().finite().nonnegative().nullable(),
    pausedAt: z.number().finite().nonnegative().nullable(),
    pausedMs: z.number().finite().nonnegative(),
    skippedMs: z.number().finite().nonnegative(),
    skippedPhases: z.number().int().nonnegative(),
    status: z.enum(["running", "paused", "completed", "interrupted"]),
    favorite: z.boolean(),
  })
  .refine((e) =>
    e.status === "paused"
      ? e.pausedAt !== null && e.endedAt === null
      : e.status === "running"
        ? e.pausedAt === null && e.endedAt === null
        : e.endedAt !== null,
  );
export const preferencesSchema = z.object({
  sound: z.boolean(),
  voice: z.boolean(),
  vibration: z.boolean(),
  contrast: z.boolean(),
  keepAwake: z.boolean(),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const DEFAULT_PREFERENCES: Preferences = {
  sound: true,
  voice: true,
  vibration: true,
  contrast: false,
  keepAwake: true,
};
const schema = z.object({
  version: z.literal(1),
  draft: workoutSchema.extend({ name: z.string().max(80) }),
  presets: z.array(z.object({
    id: z.string(),
    workout: workoutSchema,
    folderId: z.string().min(1).nullable().default(null),
  })),
  folders: z.array(z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
  })).default([]),
  executions: z.array(executionSchema),
  preferences: preferencesSchema,
});
export type SavedData = z.infer<typeof schema>;
export type WorkoutFolder = SavedData["folders"][number];
export const STORAGE_KEY = "de-fisio.tabata.v1";
export const DATA_LOCK = "de-fisio.tabata-data";
export const AUDIO_LOCK = "de-fisio.tabata-audio";
export function emptyData(): SavedData {
  return {
    version: 1,
    draft: { ...CLASSIC, exercises: [] },
    presets: [],
    folders: [],
    executions: [],
    preferences: { ...DEFAULT_PREFERENCES },
  };
}
export function readData(): { data: SavedData; error?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: emptyData() };
    const result = schema.safeParse(JSON.parse(raw));
    if (!result.success)
      return {
        data: emptyData(),
        error:
          "Os dados salvos não puderam ser lidos. Nenhum registro foi apagado. Você pode começar com o modelo clássico.",
      };
    const folders = new Set(result.data.folders.map((folder) => folder.id));
    return { data: {
      ...result.data,
      presets: result.data.presets.map((preset) => ({
        ...preset,
        folderId: preset.folderId && folders.has(preset.folderId) ? preset.folderId : null,
      })),
    } };
  } catch {
    return {
      data: emptyData(),
      error:
        "Não foi possível acessar os dados deste navegador. O timer funciona, mas os ajustes podem não ser salvos.",
    };
  }
}
export function trimExecutions(executions: Execution[]): Execution[] {
  let recent = 0;
  return [...executions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .filter(
      (e) =>
        e.favorite ||
        e.status === "running" ||
        e.status === "paused" ||
        recent++ < 100,
    );
}
export function writeData(data: SavedData): SavedData {
  const next = { ...data, executions: trimExecutions(data.executions) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
export function activeExecution(data: SavedData): Execution | undefined {
  return data.executions.find(
    (e) => e.status === "running" || e.status === "paused",
  );
}
export function validWorkout(workout: Workout): boolean {
  return workoutSchema.safeParse(workout).success;
}
