'use client'

import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { flushOutbox, pendingCount, readOutbox, SYNC_EVENT } from '@/lib/community'

export default function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const [justSynced, setJustSynced] = useState(0)

  useEffect(() => {
    const refresh = () => setPending(pendingCount())

    const goOnline = async () => {
      setOnline(true)
      const before = readOutbox().length
      await flushOutbox()
      refresh()
      if (before > 0 && before > pendingCount()) {
        setJustSynced(before)
        setTimeout(() => setJustSynced(0), 5000)
      }
    }
    const goOffline = () => {
      setOnline(false)
      refresh()
    }

    setOnline(navigator.onLine)
    refresh()

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    window.addEventListener(SYNC_EVENT, refresh)
    const poll = setInterval(refresh, 15000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener(SYNC_EVENT, refresh)
      clearInterval(poll)
    }
  }, [])

  if (!online) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 border-b border-slate-800">
        <CloudOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <p className="text-xs text-slate-200 flex-1">
          <strong className="text-white">Offline mode.</strong> Last known data shown. Emergency numbers and SOS still work.
        </p>
        {pending > 0 && (
          <span className="text-xs font-mono text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded tabular-nums flex-shrink-0">
            {pending} queued
          </span>
        )}
      </div>
    )
  }

  if (justSynced > 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 border-b border-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
        <p className="text-xs text-white font-medium flex-1">
          Back online — {justSynced} queued {justSynced === 1 ? 'report' : 'reports'} synced.
        </p>
      </div>
    )
  }

  if (pending > 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-200">
        <RefreshCw className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 animate-spin" />
        <p className="text-xs text-amber-700 flex-1">
          {pending} {pending === 1 ? 'report' : 'reports'} waiting to sync.
        </p>
        <button
          onClick={() => flushOutbox().then(() => setPending(pendingCount()))}
          className="text-xs font-semibold text-amber-800 underline flex-shrink-0"
        >
          Retry now
        </button>
      </div>
    )
  }

  return null
}
