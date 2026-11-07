/**
 * pages/NotFoundPage.jsx
 *
 * 404 page for unmatched routes.
 */

import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-slate-200">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/dashboard" className="mt-6 inline-block">
          <Button variant="secondary" icon={Home}>
            Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
