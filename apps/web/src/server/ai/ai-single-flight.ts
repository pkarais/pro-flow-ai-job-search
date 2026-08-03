import { createHash } from "node:crypto";

const active = new Map<string, Promise<unknown>>();

export function aiRequestKey(operation: string, payload: unknown): string {
  return `${operation}:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

export async function singleFlight<T>(key: string, action: () => Promise<T>): Promise<T> {
  const existing = active.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const pending = action();
  active.set(key, pending);
  try {
    return await pending;
  } finally {
    if (active.get(key) === pending) active.delete(key);
  }
}

export function activeAiRequestCount(): number {
  return active.size;
}
