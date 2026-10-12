import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import Layout from './components/Layout.tsx'
import Dashboard from './pages/Dashboard.tsx'
import NotFound from './pages/NotFound.tsx'

// Secondary pages are loaded on demand to keep the first load light.
const Review = lazy(() => import('./pages/Review.tsx'))
const Practice = lazy(() => import('./pages/Practice.tsx'))
const Exam = lazy(() => import('./pages/Exam.tsx'))
const ExamResultPage = lazy(() => import('./pages/exam/ExamResultPage.tsx'))
const Stats = lazy(() => import('./pages/Stats.tsx'))
const Settings = lazy(() => import('./pages/Settings.tsx'))

export default function App() {
  return (
    <Suspense fallback={<p className="text-slate-500">Chargement…</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="review" element={<Review />} />
          <Route path="practice" element={<Practice />} />
          <Route path="exam" element={<Exam />} />
          <Route path="exam/:id" element={<ExamResultPage />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
