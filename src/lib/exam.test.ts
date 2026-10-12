import { describe, expect, it } from 'vitest'
import { chapters as realChapters, getCard as realGetCard } from '../data/cards.ts'
import type { Card, Chapter } from '../data/schema.ts'
import {
  abandonExam,
  breakdown,
  byChapter,
  byLevel,
  createExam,
  drawQuestions,
  finishExam,
  isPassed,
  mcqsByChapter,
  planExam,
  remainingSec,
  scoreExam,
  setExamAnswer,
  setExamQuestion,
  startExam,
  toggleExamFlag,
  unansweredCount,
} from './exam.ts'
import { createDefaultState, parseState, type ExamInProgress } from './storage.ts'

const chapters: Chapter[] = [
  { id: 1, title: 'Un', examQuestions: 8 },
  { id: 2, title: 'Deux', examQuestions: 6 },
  { id: 3, title: 'Trois', examQuestions: 4 },
  { id: 4, title: 'Quatre', examQuestions: 11 },
  { id: 5, title: 'Cinq', examQuestions: 9 },
  { id: 6, title: 'Six', examQuestions: 2 },
]

/** `counts[i]` MCQs for chapter i + 1, plus one non-MCQ card per chapter. */
function deck(counts: number[]): Card[] {
  return counts.flatMap((count, i) => {
    const chapter = i + 1
    const mcqs: Card[] = Array.from({ length: count }, (_, n) => ({
      id: `c${chapter}-${String(n + 1).padStart(3, '0')}`,
      chapter,
      type: 'mcq',
      section: `${chapter}.1`,
      lo: `FL-${chapter}.1.1`,
      k: n % 2 ? 'K2' : 'K1',
      question: `Q${chapter}-${n}`,
      options: ['A', 'B', 'C', 'D'],
      correct: [0],
      tags: [],
    }))
    const flashcard: Card = {
      id: `c${chapter}-900`,
      chapter,
      type: 'flashcard',
      section: `${chapter}.1`,
      lo: `FL-${chapter}.1.1`,
      k: 'K1',
      question: 'Flash',
      answer: 'Réponse',
      tags: [],
    }
    return [...mcqs, flashcard]
  })
}

const getCardIn = (cards: Card[]) => (id: string) => cards.find((card) => card.id === id)

describe('planExam', () => {
  it('uses the official distribution when every chapter has enough MCQs', () => {
    const plan = planExam(chapters, deck([20, 20, 20, 20, 20, 20]))
    expect(plan).toEqual({
      quotas: { 1: 8, 2: 6, 3: 4, 4: 11, 5: 9, 6: 2 },
      total: 40,
      durationSec: 3600,
      passMark: 26,
      warning: undefined,
    })
  })

  it('builds a full exam from chapter 1 alone when it has enough MCQs', () => {
    const plan = planExam(chapters, deck([48, 0, 0, 0, 0, 0]))
    expect(plan.quotas).toEqual({ 1: 40, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 })
    expect(plan.durationSec).toBe(3600)
    expect(plan.warning).toBe(
      'Chapitres 2 à 6 sans QCM disponible. Composition réelle : ch. 1 : 40.',
    )
  })

  it('redistributes missing questions proportionally to official weights', () => {
    // Chapter 4 (11 questions) is missing: its share goes mostly to chapters 1 and 5.
    const plan = planExam(chapters, deck([30, 30, 30, 0, 30, 30]))
    expect(plan.total).toBe(40)
    expect(plan.quotas[4]).toBe(0)
    expect(plan.quotas[1]).toBeGreaterThan(plan.quotas[2])
    expect(plan.quotas[5]).toBeGreaterThan(plan.quotas[3])
    expect(plan.quotas[6]).toBeLessThan(plan.quotas[3])
    expect(plan.warning).toMatch(/^Chapitre 4 sans QCM disponible\./)
  })

  it('caps a chapter by its available MCQs and reports it as incomplete', () => {
    const plan = planExam(chapters, deck([20, 3, 20, 20, 20, 20]))
    expect(plan.quotas[2]).toBe(3)
    expect(plan.total).toBe(40)
    expect(plan.warning).toMatch(/^Chapitre 2 incomplet\./)
  })

  it('shortens the exam and its duration when there are fewer than 40 MCQs', () => {
    const plan = planExam(chapters, deck([12, 8, 0, 0, 0, 0]))
    expect(plan.total).toBe(20)
    expect(plan.durationSec).toBe(30 * 60)
    expect(plan.passMark).toBe(13)
    expect(plan.warning).toBe(
      'Chapitres 3 à 6 sans QCM disponible. Composition réelle (examen raccourci à 20 questions) : ch. 1 : 12, ch. 2 : 8.',
    )
  })

  it('works with the real card data', () => {
    const plan = planExam(realChapters)
    const available = mcqsByChapter()
    expect(plan.total).toBe(40)
    expect(Object.values(plan.quotas).reduce((a, b) => a + b, 0)).toBe(40)
    for (const chapter of realChapters) {
      expect(plan.quotas[chapter.id] ?? 0).toBeLessThanOrEqual(
        available.get(chapter.id)?.length ?? 0,
      )
    }
  })
})

describe('drawQuestions', () => {
  it('draws distinct MCQs per chapter quota, in chapter order', () => {
    const cards = deck([20, 20, 20, 20, 20, 20])
    const ids = drawQuestions(planExam(chapters, cards), Math.random, cards)

    expect(ids).toHaveLength(40)
    expect(new Set(ids).size).toBe(40)
    const chaptersDrawn = ids.map((id) => getCardIn(cards)(id)!.chapter)
    expect(chaptersDrawn).toEqual([...chaptersDrawn].sort())
    expect(ids.every((id) => getCardIn(cards)(id)!.type === 'mcq')).toBe(true)
  })
})

describe('exam lifecycle', () => {
  const cards = deck([40, 0, 0, 0, 0, 0])
  const getCard = getCardIn(cards)
  const start = new Date('2026-10-12T10:00:00Z')
  const after = (minutes: number) => new Date(start.getTime() + minutes * 60_000)

  function newExam(): ExamInProgress {
    return createExam(start, Math.random, chapters, cards)
  }

  it('creates an exam that fits the stored state schema', () => {
    const state = startExam(createDefaultState(), newExam())
    expect(parseState(state).ok).toBe(true)
    expect(state.currentExam?.questions).toHaveLength(40)
    expect(unansweredCount(state.currentExam!)).toBe(40)
  })

  it('shuffles the options of each question and keeps that order in the result', () => {
    const exam = newExam()
    for (const id of exam.questions) {
      expect([...exam.optionOrders![id]].sort()).toEqual([0, 1, 2, 3])
    }
    const result = scoreExam(exam, after(10), getCard)
    expect(result.questions.map((q) => q.order)).toEqual(
      exam.questions.map((id) => exam.optionOrders![id]),
    )
  })

  it('scores exams started before option shuffling existed', () => {
    const { optionOrders: _orders, ...legacy } = newExam()
    const result = scoreExam(legacy, after(10), getCard)
    expect(result.questions.every((q) => !('order' in q))).toBe(true)
  })

  it('records answers and flags', () => {
    let state = startExam(createDefaultState(), newExam())
    const [q1, q2] = state.currentExam!.questions

    state = setExamAnswer(state, q1, [0])
    state = setExamAnswer(state, q2, [1])
    state = setExamAnswer(state, q2, [])
    state = toggleExamFlag(state, q1)
    expect(state.currentExam!.answers).toEqual({ [q1]: [0] })
    expect(unansweredCount(state.currentExam!)).toBe(39)
    expect(state.currentExam!.flagged).toEqual([q1])

    state = toggleExamFlag(state, q1)
    expect(state.currentExam!.flagged).toEqual([])
  })

  it('remembers the current question within bounds', () => {
    let state = startExam(createDefaultState(), newExam())
    state = setExamQuestion(state, 5)
    expect(state.currentExam!.current).toBe(5)
    expect(parseState(state).ok).toBe(true)
    expect(setExamQuestion(state, -1).currentExam!.current).toBe(0)
    expect(setExamQuestion(state, 99).currentExam!.current).toBe(39)
  })

  it('counts down from the start time', () => {
    const exam = newExam()
    expect(remainingSec(exam, start)).toBe(3600)
    expect(remainingSec(exam, after(59.5))).toBe(30)
    expect(remainingSec(exam, after(90))).toBe(0)
  })

  it('scores an exam all-or-nothing and archives it', () => {
    let state = startExam(createDefaultState(), newExam())
    const questions = state.currentExam!.questions
    // 26 correct answers (option 0), 2 wrong, 12 unanswered.
    questions.slice(0, 26).forEach((id) => (state = setExamAnswer(state, id, [0])))
    questions.slice(26, 28).forEach((id) => (state = setExamAnswer(state, id, [0, 1])))

    state = finishExam(state, after(42), getCard)
    expect(state.currentExam).toBeUndefined()
    const [result] = state.exams
    expect(result).toMatchObject({ score: 26, passMark: 26, timedOut: false, elapsedSec: 42 * 60 })
    expect(isPassed(result)).toBe(true)
    expect(result.questions[27]).toMatchObject({
      cardId: questions[27],
      selected: [0, 1],
      correct: false,
    })
    expect(result.questions[39]).toMatchObject({
      cardId: questions[39],
      selected: [],
      correct: false,
    })
    expect(parseState(state).ok).toBe(true)
  })

  it('closes a timed-out exam at its deadline', () => {
    const result = scoreExam(newExam(), after(120), getCard)
    expect(result.timedOut).toBe(true)
    expect(result.elapsedSec).toBe(3600)
    expect(result.finishedAt).toBe(after(60).toISOString())
    expect(isPassed(result)).toBe(false)
  })

  it('abandons an exam without archiving it', () => {
    const state = abandonExam(startExam(createDefaultState(), newExam()))
    expect(state.currentExam).toBeUndefined()
    expect(state.exams).toEqual([])
    expect('currentExam' in state).toBe(false)
  })
})

describe('breakdown', () => {
  it('groups the score by chapter and by K level', () => {
    const cards = deck([4, 2, 0, 0, 0, 0])
    const getCard = getCardIn(cards)
    const exam: ExamInProgress = {
      id: 'x',
      startedAt: '2026-10-12T10:00:00.000Z',
      durationSec: 540,
      passMark: 4,
      questions: ['c1-001', 'c1-002', 'c1-003', 'c1-004', 'c2-001', 'c2-002'],
      answers: { 'c1-001': [0], 'c1-002': [0], 'c2-001': [0], 'c2-002': [3] },
      flagged: [],
    }
    const result = scoreExam(exam, new Date('2026-10-12T10:05:00Z'), getCard)

    expect(breakdown(result, byChapter, getCard)).toEqual([
      { key: 1, correct: 2, total: 4 },
      { key: 2, correct: 1, total: 2 },
    ])
    expect(breakdown(result, byLevel, getCard)).toEqual([
      { key: 'K1', correct: 2, total: 3 },
      { key: 'K2', correct: 1, total: 3 },
    ])
  })

  it('ignores cards that no longer exist', () => {
    const result = scoreExam(
      {
        id: 'x',
        startedAt: '2026-10-12T10:00:00.000Z',
        durationSec: 90,
        passMark: 1,
        questions: ['c9-999'],
        answers: {},
        flagged: [],
      },
      new Date('2026-10-12T10:00:30Z'),
      realGetCard,
    )
    expect(breakdown(result, byChapter, realGetCard)).toEqual([])
  })
})
