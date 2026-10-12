import { NavLink, Outlet } from 'react-router'
import { useStore } from '../state/store.tsx'

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/review', label: 'Réviser' },
  { to: '/practice', label: 'Entraînement' },
  { to: '/exam', label: 'Examen blanc' },
  { to: '/stats', label: 'Stats' },
  { to: '/settings', label: 'Paramètres' },
]

export default function Layout() {
  const { saveFailed } = useStore()
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-20 rounded-lg bg-indigo-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Aller au contenu
      </a>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <NavLink
            to="/"
            className="rounded text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Flash Cards <span className="text-indigo-600 dark:text-indigo-400">QA</span>
          </NavLink>
          <nav
            aria-label="Navigation principale"
            className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            <ul className="flex gap-1 text-sm whitespace-nowrap">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      {saveFailed && (
        <p
          role="alert"
          className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
        >
          ⚠️ Impossible d’enregistrer dans ce navigateur (navigation privée ou stockage plein) : ta
          progression sera perdue à la fermeture. Exporte-la depuis les Paramètres.
        </p>
      )}
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 outline-none"
      >
        <Outlet />
      </main>
    </div>
  )
}
