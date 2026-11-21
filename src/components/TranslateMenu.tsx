'use client'

import { useEffect, useRef, useState } from 'react'
import { Languages, Check, ChevronDown } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
] as const

const INCLUDED = LANGUAGES.map(l => l.code).join(',')

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
    google?: { translate?: { TranslateElement?: new (options: Record<string, unknown>, id: string) => unknown } }
  }
}

export default function TranslateMenu() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('en')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/)
    if (match) {
      const parts = decodeURIComponent(match[1]).split('/').filter(Boolean)
      const code = parts[parts.length - 1]
      if (code && LANGUAGES.some(l => l.code === code)) setActive(code)
    } else {
      const stored = localStorage.getItem('nc_lang')
      if (stored && LANGUAGES.some(l => l.code === stored)) setActive(stored)
    }

    window.googleTranslateElementInit = () => {
      const TranslateElement = window.google?.translate?.TranslateElement
      if (!TranslateElement) return
      new TranslateElement(
        { pageLanguage: 'en', includedLanguages: INCLUDED, autoDisplay: false },
        'google_translate_element'
      )
    }

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = 'https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const applyLanguage = (code: string) => {
    setOpen(false)
    setActive(code)
    localStorage.setItem('nc_lang', code)

    if (code === 'en') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    } else {
      document.cookie = `googtrans=/en/${code}; path=/`
    }

    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null
    if (select) {
      select.value = code
      select.dispatchEvent(new Event('change', { bubbles: true }))
      return
    }
    // Widget not ready — a reload applies the cookie reliably.
    window.setTimeout(() => window.location.reload(), 60)
  }

  const current = LANGUAGES.find(l => l.code === active) ?? LANGUAGES[0]

  return (
    <div ref={containerRef} className="relative notranslate">
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        title="Change language / भाषा / ভাষা"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Languages className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{current.native}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Language</p>
          </div>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => applyLanguage(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${active === lang.code ? 'bg-slate-50' : ''}`}
              role="option"
              aria-selected={active === lang.code}
            >
              <span>
                <span className="block text-xs font-semibold text-slate-800">{lang.native}</span>
                <span className="block text-[10px] text-slate-400">{lang.label}</span>
              </span>
              {active === lang.code && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </button>
          ))}
          <p className="px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-100 leading-snug">
            Machine translation. Emergency numbers stay the same.
          </p>
        </div>
      )}
    </div>
  )
}
