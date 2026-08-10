import { createDefaultSnapshot } from "../core/defaults";
import type { AppSnapshot, RuntimeRequest, RuntimeResponse } from "../core/types";

const demoKey = "queuescope-demo-snapshot";

function hasExtensionRuntime(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}

function demoSnapshot(): AppSnapshot {
  const stored = window.localStorage.getItem(demoKey);
  if (stored) {
    try { return JSON.parse(stored) as AppSnapshot; } catch { /* fall through */ }
  }
  return createDefaultSnapshot();
}

export async function send<T = unknown>(request: RuntimeRequest): Promise<T> {
  if (!hasExtensionRuntime()) {
    if (request.type === "GET_SNAPSHOT") return demoSnapshot() as T;
    throw new Error("This action is available in the loaded extension.");
  }
  const result = await chrome.runtime.sendMessage(request) as RuntimeResponse<T>;
  if (!result?.ok) throw new Error(result?.error || "QueueScope could not complete the request.");
  return result.data as T;
}

export async function requestPageAccess(url: string): Promise<boolean> {
  if (!hasExtensionRuntime()) return true;
  const parsed = new URL(url);
  return chrome.permissions.request({ origins: [`${parsed.origin}/*`] });
}

export function onSnapshotChange(callback: () => void): () => void {
  if (!hasExtensionRuntime()) return () => undefined;
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "local" && changes["queuescope.snapshot.v1"]) callback();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function isPanelSurface(): boolean {
  return document.documentElement.dataset.surface === "panel";
}
