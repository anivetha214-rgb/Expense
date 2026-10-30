'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'
import { fmtINR, useHistory, useLivePrices, useMeta } from '@/lib/api'

export function Prices({ initialCropId }: { initialCropId?: string }) {
  const { t, pick, lang } = useLang()
  const { data: meta } = useMeta()
  const { data: live, socketConnected } = useLivePrices()
  const [cropId, setCropId] = useState(initialCropId ?? 'tomato')
  const [focusMarket, setFocusMarket] = useState<string | undefined>(undefined)

  // reset crop when navigated from dashboard (state-during-render pattern)
  const [lastInitial, setLastInitial] = useState(initialCropId)
  if (initialCropId !== lastInitial) {
    setLastInitial(initialCropId)
    setCropId(initialCropId ?? 'tomato')
    setFocusMarket(undefined)
  }

  const { data: history } = useHistory(cropId, focusMarket ?? undefined, 30)
  const prices = live?.prices ?? []

  const rows = useMemo(() => {
    const markets = meta?.markets ?? []
    return markets
      .map((m) => {
        const p = prices.find((x) => x.cropId === cropId && x.marketId === m.id)
        const series = (history?.records ?? []).filter((r) => r.marketId === m.id)
        const week = series.slice(-7)
        const trend = week.length >= 2 ? ((week[week.length - 1].modalPrice - week[0].modalPrice) / week[0].modalPrice) * 100 : 0
        return { market: m, price: p?.price, base: p?.base, changePct: p?.changePct, trend, series }
      })
      .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
  }, [meta, prices, cropId, history])

  const bestPrice = rows.length > 0 && rows[0].price ? rows[0].price : undefined

  const crop = meta?.crops.find((c) => c.id === cropId)
  const focusSeries = useMemo(() => {
    const recs = focusMarket
      ? (history?.records ?? [])
      : rows.find((r) => r.market.id === rows[0]?.market.id)?.series ?? []
    return recs.map((r) => ({
      date: new Date(r.date).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short' }),
      price: r.modalPrice,
    }))
  }, [history, focusMarket, rows, lang])

  const livePoint = useMemo(() => {
    const p = prices.find((x) => x.cropId === cropId && x.marketId === (focusMarket ?? rows[0]?.market.id))
    if (!p || focusSeries.length === 0) return null
    return { date: t('nav.live'), price: p.price }
  }, [prices, cropId, focusMarket, rows, focusSeries, t])

  const chartData = useMemo(
    () => (livePoint && focusSeries.length ? [...focusSeries.slice(0, -1), livePoint, focusSeries[focusSeries.length - 1]] : focusSeries),
    [focusSeries, livePoint],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('pr.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('pr.subtitle')}</p>
        </div>
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', socketConnected && 'text-green-700')}>
          <span className={cn('h-2 w-2 rounded-full', socketConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500')} />
          {socketConnected ? t('nav.live') : t('c.updated')} · {new Date().toLocaleTimeString(lang === 'ta' ? 'ta-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* crop chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:thin]" role="tablist" aria-label={t('c.selectCrop')}>
        {(meta?.crops ?? []).map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cropId === c.id}
            onClick={() => setCropId(c.id)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all min-h-[44px]',
              cropId === c.id ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card hover:border-green-400',
            )}
          >
            {pick(c.name, c.nameTa)}
          </button>
        ))}
        {!meta && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-24 shrink-0 rounded-full" />)}
      </div>

      {/* market comparison table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{pick(crop?.name, crop?.nameTa)} — {t('pr.market')}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t('pr.market')}</TableHead>
                <TableHead className="text-right">{t('pr.price')}</TableHead>
                <TableHead className="text-right">{t('pr.change')}</TableHead>
                <TableHead className="text-right hidden sm:table-cell">{t('pr.trend7')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4} className="pl-6"><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
                : rows.map((r, idx) => (
                  <TableRow
                    key={r.market.id}
                    onClick={() => setFocusMarket(focusMarket === r.market.id ? undefined : r.market.id)}
                    className={cn('cursor-pointer', r.price === bestPrice && 'bg-green-50/70 hover:bg-green-50', focusMarket === r.market.id && 'ring-1 ring-inset ring-green-400')}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pick(r.market.name, r.market.nameTa)}</span>
                        {r.price === bestPrice && <Badge className="bg-green-600 hover:bg-green-600 text-[11px] px-1.5">★ {t('c.best')}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{pick(r.market.district, r.market.districtTa)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.price ? (
                        <motion.span key={r.price} initial={{ scale: 1.08, color: '#15803d' }} animate={{ scale: 1, color: '#0a0a0a' }} transition={{ duration: 0.4 }} className="font-bold tabular-nums text-base">
                          {fmtINR(r.price)}
                        </motion.span>
                      ) : <Skeleton className="h-5 w-16 ml-auto" />}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.changePct != null ? (
                        <span className={cn('font-semibold tabular-nums text-sm', r.changePct >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {r.changePct >= 0 ? '+' : ''}{r.changePct}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span className={cn('text-sm tabular-nums', r.trend >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {r.trend >= 0 ? '+' : ''}{r.trend.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 30-day history chart */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t('pr.history')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('pr.historyHint')}</p>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-64">
            {chartData.length === 0 ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={40} />
                  <YAxis tick={{ fontSize: 11 }} width={56} domain={['auto', 'auto']} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    formatter={(v: number) => [fmtINR(v), '']}
                    labelStyle={{ fontWeight: 600 }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2.2} fill="url(#priceFill)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
