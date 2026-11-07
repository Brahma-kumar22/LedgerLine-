/**
 * pages/PlaceholderPage.jsx
 *
 * Placeholder for routes that are part of the navigation but whose full
 * implementation is deferred to a future phase.
 *
 * This is NOT a fake page — it clearly tells the user the feature is coming
 * and shows the correct role-based access message.
 */

import { useAuth } from '../context/AuthContext'
import { PageHeader, Card, Badge } from '../components/ui'
import { capitalize } from '../lib/utils'
import { Construction } from 'lucide-react'

export default function PlaceholderPage({ title, description }) {
  const { user } = useAuth()

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={description}
      />
      <Card padded className="mt-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <Construction className="h-7 w-7 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">
            {title} — Coming Soon
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            This section is part of the MONVEX roadmap and will be implemented in
            a future development phase. Your role ({user?.role || 'unknown'}) has
            access to this page.
          </p>
          <div className="mt-4">
            <Badge color="info" size="sm">
              Role: {capitalize(user?.role || 'Unknown')}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
