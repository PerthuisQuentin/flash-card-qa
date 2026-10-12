import { Route, Routes } from 'react-router'
import Layout from './components/Layout.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Exam from './pages/Exam.tsx'
import NotFound from './pages/NotFound.tsx'
import Practice from './pages/Practice.tsx'
import Review from './pages/Review.tsx'
import Settings from './pages/Settings.tsx'
import Stats from './pages/Stats.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="review" element={<Review />} />
        <Route path="practice" element={<Practice />} />
        <Route path="exam" element={<Exam />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
