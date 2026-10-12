import { z } from 'zod'

export const STORAGE_KEY = 'flashcards-qa:v1'
export const CURRENT_VERSION = 1

const isoDate = z.iso.datetime({ offset: true })

/** Serialized ts-fsrs `Card` (dates as ISO strings). */
export const srsCardSchema = z.object({
  due: isoDate,
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  learning_steps: z.number().int(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  last_review: isoDate.optional(),
})

export const answerSchema = z.object({
  cardId: z.string(),
  at: isoDate,
  correct: z.boolean(),
  mode: z.enum(['review', 'practice']),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
})

export const settingsSchema = z.object({
  newCardsPerDay: z.number().int().min(0).max(500),
  desiredRetention: z.number().min(0.7).max(0.99),
})

export const storedStateSchema = z.object({
  version: z.literal(CURRENT_VERSION),
  settings: settingsSchema,
  srs: z.record(z.string(), srsCardSchema),
  answers: z.array(answerSchema),
  /** Number of new cards introduced per local day (YYYY-MM-DD). */
  newCardsIntroduced: z.record(z.string(), z.number().int().nonnegative()),
  // Exam shapes are defined in step 8; kept loose until then.
  exams: z.array(z.unknown()),
  currentExam: z.unknown().optional(),
})

export type SrsCardData = z.infer<typeof srsCardSchema>
export type Answer = z.infer<typeof answerSchema>
export type Settings = z.infer<typeof settingsSchema>
export type StoredState = z.infer<typeof storedStateSchema>

export const DEFAULT_SETTINGS: Settings = {
  newCardsPerDay: 20,
  desiredRetention: 0.9,
}

export function createDefaultState(): StoredState {
  return {
    version: CURRENT_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    srs: {},
    answers: [],
    newCardsIntroduced: {},
    exams: [],
  }
}

/** Minimal subset of the Web Storage API, so tests can inject an in-memory store. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export type ParseResult = { ok: true; state: StoredState } | { ok: false; error: string }

/**
 * Upgrades older stored formats to the current version.
 * Each future version adds a step here (v1 → v2, v2 → v3…).
 */
export function migrate(raw: unknown): unknown {
  return raw
}

/** Validates any untrusted value (localStorage content, imported file) as a StoredState. */
export function parseState(raw: unknown): ParseResult {
  const result = storedStateSchema.safeParse(migrate(raw))
  if (result.success) return { ok: true, state: result.data }
  return { ok: false, error: z.prettifyError(result.error) }
}

export function parseStateJson(json: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Le fichier ne contient pas de JSON valide.' }
  }
  return parseState(raw)
}

export function loadState(storage: KeyValueStorage | undefined = safeLocalStorage()): StoredState {
  if (!storage) return createDefaultState()

  let json: string | null
  try {
    json = storage.getItem(STORAGE_KEY)
  } catch (error) {
    console.error('[storage] Unable to read localStorage', error)
    return createDefaultState()
  }
  if (json === null) return createDefaultState()

  const result = parseStateJson(json)
  if (result.ok) return result.state

  // Keep the unreadable data aside instead of silently overwriting it.
  console.error('[storage] Invalid stored state, starting fresh', result.error)
  try {
    storage.setItem(`${STORAGE_KEY}:corrupt:${new Date().toISOString()}`, json)
  } catch {
    // Nothing more we can do.
  }
  return createDefaultState()
}

export function saveState(
  state: StoredState,
  storage: KeyValueStorage | undefined = safeLocalStorage(),
): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (error) {
    console.error('[storage] Unable to write localStorage', error)
    return false
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    // Accessing localStorage can throw when storage is blocked.
    return undefined
  }
}

export function backupFileName(now: Date): string {
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  return `flashcards-qa-backup-${day}.json`
}

export function serializeState(state: StoredState): string {
  return JSON.stringify(state, null, 2)
}
