'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, BrainCircuit, BellRing, Home, Truck, Wheat } from 'lucide-react'
import { LanguageToggle, LiveBadge, NotificationBell, TabSwitcher } from '@/components/farmer/shell'
import { Dashboard } from '@/components/farmer/home'
import { Prices } from '@/components/farmer/prices'
import { Predict } from '@/components/farmer/predict'
import { Sell } from '@/components/farmer/sell'
import { Alerts } from '@/components/farmer/alerts'
import { VoiceAssistant } from '@/components/farmer/voice'
import { useLang } from '@/lib/i18n'
import { useLivePrices } from '@/lib/api'
import { cn } from '@/lib/utils'

type Tab = 'home' | 'prices' | 'predict' | 'sell' | 'alerts'

export function FarmerApp() {
  const { t, lang } = useLang()
  const [tab, setTab] = useState<Tab>('home')
  const [pricesCrop, setPricesCrop] = useState<string | undefined>(undefined)
  const { socketConnected } = useLivePrices()

  const navigate = useCallback((next: string, opts?: { cropId?: string }) => {
    setTab(next as Tab)
    if (opts?.cropId) setPricesCrop(opts.cropId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'ta' ? 'ta' : 'en'
  }, [lang])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: t('nav.home'), icon: <Home className="h-5 w-5" /> },
    { id: 'prices', label: t('nav.prices'), icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'predict', label: t('nav.predict'), icon: <BrainCircuit className="h-5 w-5" /> },
    { id: 'sell', label: t('nav.sell'), icon: <Truck className="h-5 w-5" /> },
    { id: 'alerts', label: t('nav.alerts'), icon: <BellRing className="h-5 w-5" /> },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50/60 via-background to-background">
      {/* header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <button className="flex items-center gap-2.5 min-w-0" onClick={() => setTab('home')} aria-label={t('nav.appName')}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
              <Wheat className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block font-bold leading-tight truncate">{t('nav.appName')}</span>
              <span className="block text-[11px] text-muted-foreground leading-tight truncate">{t('nav.tagline')}</span>
            </span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <LiveBadge connected={socketConnected} label={t('nav.live')} className="hidden sm:inline-flex" />
            <LanguageToggle />
            <NotificationBell />
          </div>
        </div>
        {/* desktop tabs */}
        <nav className="hidden md:block border-t" aria-label="Main">
          <div className="mx-auto max-w-6xl px-4 flex gap-1">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                aria-current={tab === tb.id ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors min-h-[44px]',
                  tab === tb.id ? 'border-green-600 text-green-700' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tb.icon}
                {tb.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 md:pb-8">
        <TabSwitcher active={tab}>
          {tab === 'home' && <Dashboard onNavigate={navigate} />}
          {tab === 'prices' && <Prices initialCropId={pricesCrop} />}
          {tab === 'predict' && <Predict />}
          {tab === 'sell' && <Sell />}
          {tab === 'alerts' && <Alerts />}
        </TabSwitcher>
      </main>

      {/* footer — sticks to bottom when content is short */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground">
          {t('nav.appName')} · {t('nav.tagline')} · Flask ML + React + socket.io · {new Date().getFullYear()}
        </div>
      </footer>

      {/* mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main mobile"
      >
        <div className="grid grid-cols-5">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              aria-current={tab === tb.id ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium min-h-[56px] transition-colors',
                tab === tb.id ? 'text-green-700' : 'text-muted-foreground',
              )}
            >
              {tb.icon}
              {tb.label}
            </button>
          ))}
        </div>
      </nav>

      <VoiceAssistant />
    </div>
  )
}
