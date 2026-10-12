import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import McqView from '../../components/cards/McqView.tsx'
import Button from '../../components/ui/Button.tsx'
import KeyHint from '../../components/ui/KeyHint.tsx'
import { getCard } from '../../data/cards.ts'
import { useHotkeys, type HotkeyBindings } from '../../hooks/useHotkeys.ts'
import {
  abandonExam,
  finishExam,
  isAnswered,
  remainingSec,
  setExamAnswer,
  setExamQuestion,
  toggleExamFlag,
  unansweredCount,
} from '../../lib/exam.ts'
import { formatClock } from '../../lib/format.ts'
import { toggleMcqOption } from '../../lib/grading.ts'
import type { ExamInProgress } from '../../lib/storage.ts'
import { useStore } from '../../state/store.tsx'

const LOW_TIME_SEC = 5 * 60

export default function ExamRunner({ exam }: { exam: ExamInProgress }) {
  const { update } = useStore()
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())
  const [confirm, setConfirm] = useState<'finish' | 'abandon' | null>(null)

  const remaining = remainingSec(exam, now)
  const unanswered = unansweredCount(exam)
  const last = exam.questions.length - 1
  const index = Math.min(exam.current ?? 0, last)
  const cardId = exam.questions[index]
  const card = getCard(cardId)

  const finish = useCallback(() => {
    update((s) => finishExam(s, new Date(), getCard))
    navigate(`/exam/${exam.id}`)
  }, [update, navigate, exam.id])

  const setIndex = (i: number) => update((s) => setExamQuestion(s, i))
  const examBindings: HotkeyBindings = {
    arrowleft: () => setIndex(index - 1),
    arrowright: () => setIndex(index + 1),
    f: () => update((s) => toggleExamFlag(s, cardId)),
  }
  if (card?.type === 'mcq') {
    card.options.forEach((_, option) => {
      examBindings[String(option + 1)] = () =>
        update((s) =>
          setExamAnswer(
            s,
            cardId,
            toggleMcqOption(card, s.currentExam?.answers[cardId] ?? [], option),
          ),
        )
    })
  }
  useHotkeys(examBindings, confirm === null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Time is up (also when coming back to an expired exam): submit automatically.
  useEffect(() => {
    if (remaining === 0) finish()
  }, [remaining, finish])

  return (
    <div className="space-y-5">
      {exam.warning && index === 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          ⚠️ {exam.warning}
        </p>
      )}

      <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Question {index + 1} / {exam.questions.length}
          </span>
          <button
            type="button"
            aria-pressed={exam.flagged.includes(cardId)}
            onClick={() => update((s) => toggleExamFlag(s, cardId))}
            className={`rounded-lg border px-3 py-1 text-sm ${
              exam.flagged.includes(cardId)
                ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            🚩 {exam.flagged.includes(cardId) ? 'Marquée à revoir' : 'Marquer à revoir'}
          </button>
        </div>

        {card?.type === 'mcq' ? (
          <>
            <h2 className="text-lg leading-snug font-semibold whitespace-pre-wrap">
              {card.question}
            </h2>
            <McqView
              card={card}
              selected={exam.answers[cardId] ?? []}
              onChange={(selected) => update((s) => setExamAnswer(s, cardId, selected))}
              revealed={false}
            />
          </>
        ) : (
          <p className="text-slate-500">Cette question n’existe plus dans le jeu de cartes.</p>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            ← Précédente
          </Button>
          <Button
            variant={index === exam.questions.length - 1 ? 'secondary' : 'primary'}
            onClick={() =>
              index === exam.questions.length - 1 ? setConfirm('finish') : setIndex(index + 1)
            }
          >
            {index === exam.questions.length - 1 ? 'Terminer l’examen' : 'Suivante →'}
          </Button>
        </div>
        <KeyHint
          items={[
            ['1–4', 'répondre'],
            ['← →', 'naviguer'],
            ['F', 'marquer'],
          ]}
        />
      </article>

      <nav aria-label="Questions">
        <ol className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {exam.questions.map((id, i) => {
            const answered = isAnswered(exam, id)
            const flagged = exam.flagged.includes(id)
            const status = [answered ? 'répondue' : 'sans réponse', flagged && 'marquée']
              .filter(Boolean)
              .join(', ')
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-label={`Question ${i + 1}, ${status}`}
                  aria-current={i === index ? 'step' : undefined}
                  onClick={() => setIndex(i)}
                  className={`relative h-9 w-full rounded-md text-sm font-medium tabular-nums ${
                    answered
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-300 ring-inset dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
                  } ${i === index ? 'outline-2 outline-offset-2 outline-indigo-500' : ''}`}
                >
                  {i + 1}
                  {flagged && (
                    <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-950" />
                  )}
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-indigo-600" /> Répondue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded ring-1 ring-slate-400" /> Sans réponse
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-400" /> Marquée à revoir
          </span>
        </p>
      </nav>
      {/* Sticky footer: always visible timer, and the confirmation right where "Terminer" is. */}
      <div className="sticky bottom-0 z-[5] -mx-4 space-y-3 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        {confirm && (
          <ConfirmPanel
            kind={confirm}
            unanswered={unanswered}
            onConfirm={() => {
              if (confirm === 'finish') finish()
              else update(abandonExam)
            }}
            onCancel={() => setConfirm(null)}
            onAbandon={() => setConfirm('abandon')}
          />
        )}
        <div className="flex items-center gap-3">
          <span
            role="timer"
            aria-label="Temps restant"
            className={`font-mono text-lg font-semibold tabular-nums ${
              remaining <= LOW_TIME_SEC ? 'text-rose-600 dark:text-rose-400' : ''
            }`}
          >
            ⏱ {formatClock(remaining)}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {exam.questions.length - unanswered}/{exam.questions.length} répondues
          </span>
          <Button className="ml-auto" variant="secondary" onClick={() => setConfirm('finish')}>
            Terminer
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ConfirmPanelProps {
  kind: 'finish' | 'abandon'
  unanswered: number
  onConfirm: () => void
  onCancel: () => void
  onAbandon: () => void
}

function ConfirmPanel({ kind, unanswered, onConfirm, onCancel, onAbandon }: ConfirmPanelProps) {
  return (
    <div
      role="alertdialog"
      aria-label={kind === 'finish' ? 'Terminer l’examen' : 'Abandonner l’examen'}
      className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40"
    >
      {kind === 'finish' ? (
        <p className="text-sm">
          {unanswered > 0
            ? `Il reste ${unanswered} question${unanswered > 1 ? 's' : ''} sans réponse (comptée${unanswered > 1 ? 's' : ''} fausse${unanswered > 1 ? 's' : ''}). Terminer quand même ?`
            : 'Toutes les questions ont une réponse. Terminer et voir le résultat ?'}
        </p>
      ) : (
        <p className="text-sm">L’examen sera supprimé sans résultat. Abandonner ?</p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onConfirm}>
          {kind === 'finish' ? 'Terminer et corriger' : 'Oui, abandonner'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Continuer l’examen
        </Button>
        {kind === 'finish' && (
          <Button variant="ghost" className="ml-auto text-rose-600" onClick={onAbandon}>
            Abandonner sans résultat
          </Button>
        )}
      </div>
    </div>
  )
}
