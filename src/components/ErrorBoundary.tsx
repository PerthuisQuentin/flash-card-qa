import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Last-resort screen if rendering crashes, instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] Unexpected error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        data-cy="error-boundary"
        role="alert"
        className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center"
      >
        <h1 className="text-2xl font-bold">Oups, quelque chose s’est mal passé</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Ta progression est enregistrée dans le navigateur et n’est pas perdue. Recharge la page ;
          si le problème persiste, exporte ta progression depuis les Paramètres.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-100 p-3 text-left text-xs dark:bg-slate-900">
          {this.state.error.message}
        </pre>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            data-cy="error-reload"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Recharger
          </button>
          <a
            href="/settings"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Paramètres
          </a>
        </div>
      </div>
    )
  }
}
