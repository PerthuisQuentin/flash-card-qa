import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import PageTitle from '../components/PageTitle.tsx'
import Button from '../components/ui/Button.tsx'
import {
  backupFileName,
  createDefaultState,
  parseStateJson,
  serializeState,
  type StoredState,
} from '../lib/storage.ts'
import { updateSettings } from '../state/actions.ts'
import { useStore } from '../state/store.tsx'

const RETENTION_OPTIONS = [
  { value: 0.8, label: '80 % — moins de révisions' },
  { value: 0.85, label: '85 %' },
  { value: 0.9, label: '90 % — recommandé' },
  { value: 0.95, label: '95 % — beaucoup plus de révisions' },
]

export default function Settings() {
  const { state } = useStore()
  return (
    <>
      <PageTitle
        title="Paramètres"
        subtitle="Rythme de révision et sauvegarde de la progression."
      />
      <div className="space-y-6">
        {/* Remount on external changes (import, reset) to refresh the local draft. */}
        <ReviewSettings key={state.settings.newCardsPerDay} />
        <BackupSection />
        <ResetSection />
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-64 dark:border-slate-700 dark:bg-slate-900'

function ReviewSettings() {
  const { state, update } = useStore()
  const { newCardsPerDay, desiredRetention } = state.settings
  const [draft, setDraft] = useState(String(newCardsPerDay))
  const draftValue = Number(draft)
  const draftValid =
    draft !== '' && Number.isInteger(draftValue) && draftValue >= 0 && draftValue <= 500

  // Saved when leaving the field, so intermediate keystrokes are never persisted.
  function commitNewCards() {
    if (draftValid) update((s) => updateSettings(s, { newCardsPerDay: draftValue }))
    else setDraft(String(newCardsPerDay))
  }

  return (
    <Section title="Révision">
      <div className="space-y-1">
        <label htmlFor="new-cards-per-day" className="block text-sm font-medium">
          Nouvelles cartes par jour
        </label>
        <input
          id="new-cards-per-day"
          aria-describedby="new-cards-per-day-hint"
          type="number"
          inputMode="numeric"
          min={0}
          max={500}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitNewCards}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          aria-invalid={!draftValid}
          className={inputClass}
        />
        <p
          id="new-cards-per-day-hint"
          className={`text-xs ${draftValid ? 'text-slate-500 dark:text-slate-400' : 'text-rose-600'}`}
        >
          {draftValid
            ? 'Nombre maximum de cartes jamais vues introduites chaque jour.'
            : 'Entre un nombre entier entre 0 et 500.'}
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="desired-retention" className="block text-sm font-medium">
          Rétention cible
        </label>
        <select
          id="desired-retention"
          aria-describedby="desired-retention-hint"
          value={desiredRetention}
          onChange={(event) =>
            update((s) => updateSettings(s, { desiredRetention: Number(event.target.value) }))
          }
          className={inputClass}
        >
          {RETENTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p id="desired-retention-hint" className="text-xs text-slate-500 dark:text-slate-400">
          Probabilité visée de se souvenir d’une carte au moment de la revoir. Plus elle est haute,
          plus les intervalles sont courts. S’applique aux prochaines notations.
        </p>
      </div>
    </Section>
  )
}

function summarize(state: StoredState): string {
  const seen = Object.keys(state.srs).length
  return `${seen} carte${seen > 1 ? 's' : ''} vue${seen > 1 ? 's' : ''}, ${state.answers.length} réponse${state.answers.length > 1 ? 's' : ''}`
}

type ImportStatus =
  | { kind: 'idle' }
  | { kind: 'preview'; state: StoredState; fileName: string }
  | { kind: 'error'; message: string }
  | { kind: 'done' }

function BackupSection() {
  const { state, update } = useStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<ImportStatus>({ kind: 'idle' })

  function exportState() {
    const blob = new Blob([serializeState(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFileName(new Date())
    link.click()
    URL.revokeObjectURL(url)
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allows selecting the same file again
    if (!file) return
    const result = parseStateJson(await file.text())
    setStatus(
      result.ok
        ? { kind: 'preview', state: result.state, fileName: file.name }
        : { kind: 'error', message: result.error },
    )
  }

  return (
    <Section title="Sauvegarde">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        La progression est stockée dans ce navigateur uniquement ({summarize(state)}). Exporte-la
        pour la sauvegarder ou la transférer sur un autre appareil.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={exportState}>Exporter la progression</Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()}>
          Importer une sauvegarde…
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          data-testid="import-input"
          onChange={onFileSelected}
        />
      </div>

      {status.kind === 'preview' && (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          <p>
            <strong>{status.fileName}</strong> : {summarize(status.state)}.
          </p>
          <p>
            Remplacer la progression actuelle ({summarize(state)}) ? Cette action est définitive.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                update(() => status.state)
                setStatus({ kind: 'done' })
              }}
            >
              Remplacer
            </Button>
            <Button variant="ghost" onClick={() => setStatus({ kind: 'idle' })}>
              Annuler
            </Button>
          </div>
        </div>
      )}
      {status.kind === 'error' && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <p className="font-medium">Fichier invalide, rien n’a été modifié.</p>
          <pre className="mt-2 text-xs whitespace-pre-wrap">{status.message}</pre>
        </div>
      )}
      {status.kind === 'done' && (
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400" role="status">
          ✓ Progression importée.
        </p>
      )}
    </Section>
  )
}

function ResetSection() {
  const { update } = useStore()
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  return (
    <Section title="Réinitialisation">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Efface toute la progression, l’historique et les paramètres. Pense à exporter avant.
      </p>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-rose-700 dark:text-rose-400">
            Tout effacer définitivement ?
          </span>
          <Button
            className="bg-rose-600 hover:bg-rose-500"
            onClick={() => {
              update(() => createDefaultState())
              setConfirming(false)
              setDone(true)
            }}
          >
            Oui, tout effacer
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={() => {
            setConfirming(true)
            setDone(false)
          }}
        >
          Réinitialiser la progression…
        </Button>
      )}
      {done && (
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400" role="status">
          ✓ Progression réinitialisée.
        </p>
      )}
    </Section>
  )
}
