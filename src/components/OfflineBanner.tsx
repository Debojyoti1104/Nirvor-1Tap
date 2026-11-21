'use client'

import { useEffect, useState, useCallback } from 'react'
import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { flushOutbox, pendingCount, readOutbox, clearOutbox, SYNC_EVENT } from '@/lib/community'

export default function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(0)

  const handleSync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const before = readOutbox().length
      const remaining = await flushOutbox()
      setPending(remaining)
      if (before > 0 && remaining < before) {
        setJustSynced(before - remaining)
        setTimeout(() => setJustSynced(0), 4000)
      }
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  useEffect(() => {
    const refresh = () => setPending(pendingCount())

    const goOnline = async () => {
      setOnline(true)
      await handleSync()
    }
    const goOffline = () => {
      setOnline(false)
      refresh()
    }

    setOnline(navigator.onLine)
    refresh()

    // Auto-sync if online and there are pending items
    if (navigator.onLine && pendingCount() > 0) {
      handleSync()
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    window.addEventListener(SYNC_EVENT, refresh)
    const poll = setInterval(refresh, 10000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener(SYNC_EVENT, refresh)
      clearInterval(poll)
    }
  }, [handleSync])

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
        <RefreshCw className={`w-3.5 h-3.5 text-amber-600 flex-shrink-0 ${syncing ? 'animate-spin' : ''}`} />
        <p className="text-xs text-amber-700 flex-1">
          {syncing
            ? `Syncing ${pending} ${pending === 1 ? 'report' : 'reports'} to cloud...`
            : `${pending} ${pending === 1 ? 'report' : 'reports'} waiting to sync.`}
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-xs font-semibold text-amber-800 underline flex-shrink-0 disabled:opacity-50 hover:text-amber-950"
        >
          {syncing ? 'Syncing...' : 'Sync now'}
        </button>
        <button
          onClick={() => {
            clearOutbox()
            setPending(0)
          }}
          className="text-xs text-amber-700 hover:text-amber-900 underline flex-shrink-0 ml-1.5"
          title="Dismiss if reports are already delivered"
        >
          Dismiss
        </button>
      </div>
    )
  }

  return null
}
