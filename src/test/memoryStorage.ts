import type { KeyValueStorage } from '../lib/storage.ts'

/** In-memory replacement for localStorage, exposing its data for assertions. */
export function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  } satisfies KeyValueStorage & { data: Map<string, string> }
}
