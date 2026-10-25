import { Link } from 'react-router'
import PageTitle from '../components/PageTitle.tsx'

export default function NotFound() {
  return (
    <>
      <PageTitle title="Page introuvable" />
      <Link
        to="/"
        data-cy="not-found-home-link"
        className="text-indigo-600 underline dark:text-indigo-400"
      >
        Retour à l'accueil
      </Link>
    </>
  )
}
