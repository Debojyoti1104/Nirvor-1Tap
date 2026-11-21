'use client'

import { Siren, HeartHandshake, Users, ArrowRight } from 'lucide-react'

interface TriageCardsProps {
  onDanger: () => void
  onNeed: () => void
  onHelp: () => void
}

const CARDS = [
  {
    key: 'danger',
    icon: Siren,
    title: 'I am in danger',
    subtitle: 'Send an SOS with your location',
    className: 'border-red-200 bg-red-50 hover:bg-red-100',
    iconClass: 'bg-red-600 text-white',
    titleClass: 'text-red-800',
    subClass: 'text-red-600',
  },
  {
    key: 'need',
    icon: HeartHandshake,
    title: 'I need help',
    subtitle: 'Request rescue, water, medicine',
    className: 'border-amber-200 bg-amber-50 hover:bg-amber-100',
    iconClass: 'bg-amber-500 text-white',
    titleClass: 'text-amber-900',
    subClass: 'text-amber-700',
  },
  {
    key: 'help',
    icon: Users,
    title: 'I want to help',
    subtitle: 'Offer supplies or volunteering',
    className: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
    iconClass: 'bg-emerald-600 text-white',
    titleClass: 'text-emerald-900',
    subClass: 'text-emerald-700',
  },
] as const

export default function TriageCards({ onDanger, onNeed, onHelp }: TriageCardsProps) {
  const handlers = { danger: onDanger, need: onNeed, help: onHelp }

  return (
    <section aria-labelledby="triage-heading">
      <div className="mb-2">
        <h1 id="triage-heading" className="text-base sm:text-lg font-bold text-slate-900">
          What do you need right now?
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Works offline · No account needed · Available in 4 languages
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {CARDS.map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.key}
              onClick={handlers[card.key]}
              className={`group flex items-center gap-3 sm:flex-col sm:items-start text-left border rounded-xl p-3 sm:p-4 transition-colors ${card.className}`}
            >
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconClass}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-bold ${card.titleClass}`}>{card.title}</span>
                <span className={`block text-xs mt-0.5 ${card.subClass}`}>{card.subtitle}</span>
              </span>
              <ArrowRight className={`hidden sm:block w-4 h-4 mt-1 transition-transform group-hover:translate-x-0.5 ${card.subClass}`} />
            </button>
          )
        })}
      </div>
    </section>
  )
}
