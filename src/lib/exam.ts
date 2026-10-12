import { cards as allCards, chapters as allChapters } from '../data/cards.ts'
import type { Card, CardId, Chapter, KLevel, McqCard } from '../data/schema.ts'
import { gradeMcq, shuffle, type Random } from './grading.ts'
import type { ExamInProgress, ExamResult, StoredState } from './storage.ts'

export const OFFICIAL_QUESTION_COUNT = 40
export const OFFICIAL_DURATION_MIN = 60
export const PASS_RATIO = 0.65
/** Duration per question for shortened exams (60 min / 40 questions). */
const MINUTES_PER_QUESTION = OFFICIAL_DURATION_MIN / OFFICIAL_QUESTION_COUNT

export interface ExamPlan {
  /** Number of questions drawn per chapter id. */
  quotas: Record<number, number>
  total: number
  durationSec: number
  passMark: number
  /** Set when the composition differs from the official one. */
  warning?: string
}

export function mcqsByChapter(cards: readonly Card[] = allCards): Map<number, McqCard[]> {
  const result = new Map<number, McqCard[]>()
  for (const card of cards) {
    if (card.type !== 'mcq') continue
    result.set(card.chapter, [...(result.get(card.chapter) ?? []), card])
  }
  return result
}

/**
 * Official distribution, capped by the MCQs available. Missing questions are
 * handed out one by one to the chapter with spare MCQs that is furthest below
 * its official weight (D'Hondt method), which keeps the result proportional.
 */
export function planExam(
  chapters: readonly Chapter[] = allChapters,
  cards: readonly Card[] = allCards,
): ExamPlan {
  const available = mcqsByChapter(cards)
  const count = (chapter: Chapter) => available.get(chapter.id)?.length ?? 0

  const quotas: Record<number, number> = {}
  for (const chapter of chapters)
    quotas[chapter.id] = Math.min(chapter.examQuestions, count(chapter))

  const target = chapters.reduce((sum, chapter) => sum + chapter.examQuestions, 0)
  let total = Object.values(quotas).reduce((sum, n) => sum + n, 0)
  while (total < target) {
    const candidates = chapters.filter(
      (chapter) => chapter.examQuestions > 0 && count(chapter) > quotas[chapter.id],
    )
    if (candidates.length === 0) break
    const best = candidates.reduce((a, b) =>
      b.examQuestions / (quotas[b.id] + 1) > a.examQuestions / (quotas[a.id] + 1) ? b : a,
    )
    quotas[best.id]++
    total++
  }

  const durationMin =
    total === target ? OFFICIAL_DURATION_MIN : Math.max(1, Math.round(total * MINUTES_PER_QUESTION))

  return {
    quotas,
    total,
    durationSec: durationMin * 60,
    passMark: Math.ceil(total * PASS_RATIO),
    warning: compositionWarning(chapters, quotas, total, target),
  }
}

function compositionWarning(
  chapters: readonly Chapter[],
  quotas: Record<number, number>,
  total: number,
  target: number,
): string | undefined {
  const official = chapters.every((chapter) => quotas[chapter.id] === chapter.examQuestions)
  if (official) return undefined

  const missing = chapters.filter((chapter) => quotas[chapter.id] === 0).map((c) => c.id)
  const partial = chapters
    .filter((chapter) => quotas[chapter.id] > 0 && quotas[chapter.id] < chapter.examQuestions)
    .map((c) => c.id)
  const composition = chapters
    .filter((chapter) => quotas[chapter.id] > 0)
    .map((chapter) => `ch. ${chapter.id} : ${quotas[chapter.id]}`)
    .join(', ')

  const parts: string[] = []
  if (missing.length) {
    parts.push(
      `${missing.length > 1 ? 'Chapitres' : 'Chapitre'} ${formatList(missing)} sans QCM disponible`,
    )
  }
  if (partial.length) {
    parts.push(
      `${partial.length > 1 ? 'chapitres' : 'chapitre'} ${formatList(partial)} incomplet${partial.length > 1 ? 's' : ''}`,
    )
  }
  const length = total < target ? ` (examen raccourci à ${total} questions)` : ''
  return `${capitalize(parts.join(', '))}. Composition réelle${length} : ${composition}.`
}

function formatList(ids: number[]): string {
  if (ids.length > 2 && ids.every((id, i) => i === 0 || id === ids[i - 1] + 1)) {
    return `${ids[0]} à ${ids[ids.length - 1]}`
  }
  return ids.length > 1 ? `${ids.slice(0, -1).join(', ')} et ${ids[ids.length - 1]}` : `${ids[0]}`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Draws the questions of a plan: random within each chapter, chapters in order. */
export function drawQuestions(
  plan: ExamPlan,
  random?: Random,
  cards: readonly Card[] = allCards,
): CardId[] {
  const available = mcqsByChapter(cards)
  return Object.entries(plan.quotas)
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([chapterId, quota]) =>
      shuffle(available.get(Number(chapterId)) ?? [], random)
        .slice(0, quota)
        .map((card) => card.id),
    )
}

export function createExam(
  now: Date,
  random?: Random,
  chapters: readonly Chapter[] = allChapters,
  cards: readonly Card[] = allCards,
): ExamInProgress {
  const plan = planExam(chapters, cards)
  return {
    id: crypto.randomUUID(),
    startedAt: now.toISOString(),
    durationSec: plan.durationSec,
    passMark: plan.passMark,
    questions: drawQuestions(plan, random, cards),
    answers: {},
    flagged: [],
    ...(plan.warning && { warning: plan.warning }),
  }
}

export function elapsedSec(exam: ExamInProgress, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(exam.startedAt).getTime()) / 1000))
}

export function remainingSec(exam: ExamInProgress, now: Date): number {
  return Math.max(0, exam.durationSec - elapsedSec(exam, now))
}

export function isAnswered(exam: ExamInProgress, cardId: CardId): boolean {
  return (exam.answers[cardId]?.length ?? 0) > 0
}

export function unansweredCount(exam: ExamInProgress): number {
  return exam.questions.filter((id) => !isAnswered(exam, id)).length
}

/** Grades the exam. A timed-out exam is closed at its deadline. */
export function scoreExam(
  exam: ExamInProgress,
  now: Date,
  getCard: (id: CardId) => Card | undefined,
): ExamResult {
  const timedOut = remainingSec(exam, now) === 0
  const finishedAt = timedOut
    ? new Date(new Date(exam.startedAt).getTime() + exam.durationSec * 1000)
    : now
  const questions = exam.questions.map((cardId) => {
    const card = getCard(cardId)
    const selected = exam.answers[cardId] ?? []
    return { cardId, selected, correct: card?.type === 'mcq' && gradeMcq(card, selected) }
  })
  return {
    id: exam.id,
    startedAt: exam.startedAt,
    finishedAt: finishedAt.toISOString(),
    durationSec: exam.durationSec,
    elapsedSec: Math.min(exam.durationSec, elapsedSec(exam, finishedAt)),
    timedOut,
    passMark: exam.passMark,
    score: questions.filter((q) => q.correct).length,
    questions,
    ...(exam.warning && { warning: exam.warning }),
  }
}

export function isPassed(result: ExamResult): boolean {
  return result.score >= result.passMark
}

export interface ScoreBreakdown<K> {
  key: K
  correct: number
  total: number
}

/** Score grouped by chapter or K level (unknown cards are ignored). */
export function breakdown<K extends number | string>(
  result: ExamResult,
  keyOf: (card: Card) => K,
  getCard: (id: CardId) => Card | undefined,
): ScoreBreakdown<K>[] {
  const groups = new Map<K, ScoreBreakdown<K>>()
  for (const question of result.questions) {
    const card = getCard(question.cardId)
    if (!card) continue
    const key = keyOf(card)
    const group = groups.get(key) ?? { key, correct: 0, total: 0 }
    group.total++
    if (question.correct) group.correct++
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) =>
    String(a.key).localeCompare(String(b.key), 'fr', { numeric: true }),
  )
}

export const byChapter = (card: Card) => card.chapter
export const byLevel = (card: Card): KLevel => card.k

// --- State transitions -----------------------------------------------------

export function startExam(state: StoredState, exam: ExamInProgress): StoredState {
  return { ...state, currentExam: exam }
}

export function setExamAnswer(state: StoredState, cardId: CardId, selected: number[]): StoredState {
  if (!state.currentExam) return state
  const answers = { ...state.currentExam.answers, [cardId]: selected }
  if (selected.length === 0) delete answers[cardId]
  return { ...state, currentExam: { ...state.currentExam, answers } }
}

/** Moves to another question, clamped to the exam bounds. */
export function setExamQuestion(state: StoredState, index: number): StoredState {
  if (!state.currentExam) return state
  const current = Math.max(0, Math.min(state.currentExam.questions.length - 1, index))
  if (current === (state.currentExam.current ?? 0)) return state
  return { ...state, currentExam: { ...state.currentExam, current } }
}

export function toggleExamFlag(state: StoredState, cardId: CardId): StoredState {
  if (!state.currentExam) return state
  const { flagged } = state.currentExam
  return {
    ...state,
    currentExam: {
      ...state.currentExam,
      flagged: flagged.includes(cardId)
        ? flagged.filter((id) => id !== cardId)
        : [...flagged, cardId],
    },
  }
}

export function finishExam(
  state: StoredState,
  now: Date,
  getCard: (id: CardId) => Card | undefined,
): StoredState {
  if (!state.currentExam) return state
  const { currentExam, ...rest } = state
  return { ...rest, exams: [...state.exams, scoreExam(currentExam, now, getCard)] }
}

export function abandonExam(state: StoredState): StoredState {
  const { currentExam: _abandoned, ...rest } = state
  return rest
}
