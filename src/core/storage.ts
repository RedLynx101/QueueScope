import { createDefaultSnapshot } from "./defaults";
import { normalizeSettings, normalizeWatch } from "./validation";
import type { AppSnapshot } from "./types";

const STORAGE_KEY = "queuescope.snapshot.v1";

export async function loadSnapshot(): Promise<AppSnapshot> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const raw = stored[STORAGE_KEY] as Partial<AppSnapshot> | undefined;
  if (!raw || raw.version !== 1) return createDefaultSnapshot();
  return {
    version: 1,
    watches: Array.isArray(raw.watches) ? raw.watches.flatMap((watch) => {
      try { return [normalizeWatch(watch)]; } catch { return []; }
    }) : [],
    activeRuns: Array.isArray(raw.activeRuns) ? raw.activeRuns : [],
    history: Array.isArray(raw.history) ? raw.history : [],
    settings: normalizeSettings(raw.settings)
  };
}

export async function saveSnapshot(snapshot: AppSnapshot): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: snapshot });
}
