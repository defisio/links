import type { SavedData, WorkoutFolder } from "./storage";

export function folderNameError(data: SavedData, name: string, exceptId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return "Use um nome de pasta entre 1 e 80 caracteres.";
  if (data.folders.some((folder) => folder.id !== exceptId &&
    folder.name.toLocaleLowerCase("pt-BR") === trimmed.toLocaleLowerCase("pt-BR")))
    return "Já existe uma pasta com esse nome.";
  return null;
}

export function addFolder(data: SavedData, folder: WorkoutFolder): SavedData {
  if (folderNameError(data, folder.name) || data.folders.some((item) => item.id === folder.id)) return data;
  return { ...data, folders: [...data.folders, { ...folder, name: folder.name.trim() }] };
}

export function renameFolder(data: SavedData, id: string, name: string): SavedData {
  if (folderNameError(data, name, id)) return data;
  return { ...data, folders: data.folders.map((folder) =>
    folder.id === id ? { ...folder, name: name.trim() } : folder) };
}

export function deleteFolder(data: SavedData, id: string): SavedData {
  if (!data.folders.some((folder) => folder.id === id)) return data;
  const moved = data.presets.filter((preset) => preset.folderId === id);
  return {
    ...data,
    folders: data.folders.filter((folder) => folder.id !== id),
    presets: [
      ...data.presets.filter((preset) => preset.folderId !== id),
      ...moved.map((preset) => ({ ...preset, folderId: null })),
    ],
  };
}

export function movePreset(data: SavedData, id: string, folderId: string | null): SavedData {
  const preset = data.presets.find((item) => item.id === id);
  if (!preset || preset.folderId === folderId ||
    (folderId !== null && !data.folders.some((folder) => folder.id === folderId))) return data;
  return {
    ...data,
    presets: [...data.presets.filter((item) => item.id !== id), { ...preset, folderId }],
  };
}

function swap<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function reorderPreset(data: SavedData, id: string, direction: -1 | 1): SavedData {
  const from = data.presets.findIndex((preset) => preset.id === id);
  if (from < 0) return data;
  const group = data.presets.filter((preset) => preset.folderId === data.presets[from].folderId);
  const sibling = group[group.findIndex((preset) => preset.id === id) + direction];
  if (!sibling) return data;
  return { ...data, presets: swap(data.presets, from, data.presets.findIndex((preset) => preset.id === sibling.id)) };
}

export function reorderFolder(data: SavedData, id: string, direction: -1 | 1): SavedData {
  const from = data.folders.findIndex((folder) => folder.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= data.folders.length) return data;
  return { ...data, folders: swap(data.folders, from, to) };
}
