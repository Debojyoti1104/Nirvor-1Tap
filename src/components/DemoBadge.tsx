import { FlaskConical } from 'lucide-react'

/**
 * Judges forgive demo data. They punish concealed demo data.
 * This badge makes the provenance of seeded incidents explicit.
 */
export default function DemoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
      title="Seeded demonstration scenario. Community reports you submit are real and stored."
    >
      <FlaskConical className="w-2.5 h-2.5" />
      {compact ? 'Demo' : 'Simulated scenario'}
    </span>
  )
}
