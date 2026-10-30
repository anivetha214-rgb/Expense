'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, BarChart3, Bell, BrainCircuit, Sprout, Store, TrendingDown, TrendingUp, Truck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'
import { fmtINR, useBootstrap, useLivePrices, useMeta, type LivePrice } from '@/lib/api'

export function Dashboard({ onNavigate }: { onNavigate: (tab: string, opts?: { cropId?: string }) => void }) {
  const { t, pick, lang } = useLang()
  const { data: meta } = useMeta()
  const { data: boot } = useBootstrap()
  const { data: live, socketConnected } = useLivePrices()
  const [defaultCrop] = useState('tomato')

  const prices = live?.prices ?? []

  const stats = useMemo(() => {
    if (!meta || prices.length === 0) return null
    const best = prices.reduce((a, b) => (b.price > a.price ? b : a))
    const bestCrop = meta.crops.find((c) => c.id === best.cropId)
    const bestMarket = meta.markets.find((m) => m.id === best.marketId)
    const sorted = [...prices].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    const movers = sorted.slice(0, 6)
    const accuracyVals = Object.values(boot?.ml.accuracy ?? {})
    const avgAccuracy = accuracyVals.length ? accuracyVals.reduce((a, b) => a + b, 0) / accuracyVals.length : null
    return { best, bestCrop, bestMarket, movers, avgAccuracy }
  }, [meta, prices, boot])

  const marketName = (id: string) => {
    const m = meta?.markets.find((x) => x.id === id)
    return m ? pick(m.name, m.nameTa) : id
  }
  const cropName = (id: string) => {
    const c = meta?.crops.find((x) => x.id === id)
    return c ? pick(c.name, c.nameTa) : id
  }

  return (
    <div className="space-y-6">
      {/* hero */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 via-background to-amber-50">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                <Sprout className="h-4 w-4" /> {t('nav.tagline')}
              </p>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">
                {t('home.guestGreeting')}
              </h1>
              <p className="mt-1 text-muted-foreground">{t('home.subtitle')}</p>
            </div>
            <div className="flex gap-4">
              <Stat value={meta ? String(meta.markets.length) : '—'} label={t('home.statMarkets')} />
              <Stat value={meta ? String(meta.crops.length) : '—'} label={t('home.statCrops')} />
              <Stat
                value={stats?.avgAccuracy ? `${stats.avgAccuracy.toFixed(1)}%` : '—'}
                label={t('home.statAccuracy')}
              />
            </div>
          </div>
          <p className={cn('mt-4 text-xs font-medium flex items-center gap-1.5',
            boot?.ml.status === 'ready' ? 'text-green-700' : boot?.ml.status === 'training' ? 'text-amber-600' : 'text-muted-foreground')}>
            <BrainCircuit className="h-3.5 w-3.5" />
            {boot?.ml.status === 'ready' ? t('home.engineReady') : boot?.ml.status === 'training' ? t('home.engineTraining') : t('home.engineOffline')}
          </p>
        </CardContent>
      </Card>

      {/* live ticker */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">{t('home.liveTicker')}</h2>
          <span className={cn('flex h-2 w-2 rounded-full', socketConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500')} />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:thin]">
          {prices.length === 0
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 w-40 shrink-0 rounded-xl" />)
            : prices.map((p: LivePrice) => (
              <motion.button
                key={`${p.cropId}:${p.marketId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => onNavigate('prices', { cropId: p.cropId })}
                className="shrink-0 rounded-xl border bg-card p-3 text-left hover:border-green-400 hover:shadow-sm transition-all min-w-[160px]"
              >
                <p className="text-xs font-medium text-muted-foreground truncate">{cropName(p.cropId)}</p>
                <p className="text-sm font-semibold truncate">{marketName(p.marketId)}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold tabular-nums">{fmtINR(p.price)}</span>
                  <span className={cn('text-xs font-semibold flex items-center', p.changePct >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {p.changePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {p.changePct >= 0 ? '+' : ''}{p.changePct}%
                  </span>
                </div>
              </motion.button>
            ))}
        </div>
      </div>

      {/* best deal + movers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-green-700" /> {t('home.bestDeal')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats || !stats.bestCrop || !stats.bestMarket ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <button className="w-full text-left" onClick={() => onNavigate('prices', { cropId: stats.best!.cropId })}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xl font-bold">{cropName(stats.bestCrop.id)}</p>
                    <p className="text-sm text-muted-foreground">{marketName(stats.bestMarket.id)} · {pick(stats.bestMarket.district, stats.bestMarket.districtTa)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-700 tabular-nums">{fmtINR(stats.best.price)}</p>
                    <p className="text-xs text-muted-foreground">/ {t('c.quintal')}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                  {t('home.bestDealHint', { n: meta?.markets.length ?? 10 })} <ArrowRight className="h-3 w-3" />
                </p>
              </button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-700" /> {t('home.movers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <ul className="space-y-2">
                {stats.movers.map((m) => (
                  <li key={`${m.cropId}:${m.marketId}`} className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      <span className="font-medium">{cropName(m.cropId)}</span>
                      <span className="text-muted-foreground"> · {marketName(m.marketId)}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold tabular-nums">{fmtINR(m.price)}</span>
                      <Badge variant={m.changePct >= 0 ? 'secondary' : 'destructive'}
                        className={cn('gap-0.5 tabular-nums', m.changePct >= 0 && 'bg-green-100 text-green-800 hover:bg-green-100')}>
                        {m.changePct >= 0 ? '+' : ''}{m.changePct}%
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t('home.quickActions')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction icon={<BarChart3 className="h-6 w-6" />} title={t('home.qaPrices')} desc={t('home.qaPricesDesc')} onClick={() => onNavigate('prices')} />
          <QuickAction icon={<BrainCircuit className="h-6 w-6" />} title={t('home.qaPredict')} desc={t('home.qaPredictDesc')} onClick={() => onNavigate('predict')} />
          <QuickAction icon={<Truck className="h-6 w-6" />} title={t('home.qaSell')} desc={t('home.qaSellDesc')} onClick={() => onNavigate('sell')} />
          <QuickAction icon={<Bell className="h-6 w-6" />} title={t('home.qaAlerts')} desc={t('home.qaAlertsDesc')} onClick={() => onNavigate('alerts')} />
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center md:text-right">
      <p className="text-2xl font-bold text-green-700 tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground max-w-[110px]">{label}</p>
    </div>
  )
}

function QuickAction({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group rounded-xl border bg-card p-4 text-left transition-all hover:border-green-400 hover:shadow-md min-h-[44px]"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-green-100 text-green-700 p-2.5 group-hover:scale-105 transition-transform">{icon}</span>
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="block text-xs text-muted-foreground mt-0.5">{desc}</span>
        </span>
      </div>
    </button>
  )
}
