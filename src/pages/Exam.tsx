import { useStore } from '../state/store.tsx'
import ExamHome from './exam/ExamHome.tsx'
import ExamRunner from './exam/ExamRunner.tsx'

export default function Exam() {
  const { state } = useStore()
  return state.currentExam ? (
    <ExamRunner key={state.currentExam.id} exam={state.currentExam} />
  ) : (
    <ExamHome />
  )
}
