'use client'

import { useMemo, useState } from 'react'
import { BrainCircuit, Info, Sparkles } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'
import { fmtINR, useLivePrices, useMeta, usePredict } from '@/lib/api'

export function Predict() {
  const { t, pick, lang } = useLang()
  const { data: meta } = useMeta()
  const { data: live } = useLivePrices()
  const [cropId, setCropId] = useState('tomato')
  const [marketId, setMarketId] = useState('koyambedu')
  const { data, isLoading } = usePredict(cropId, marketId, 7)

  const crop = meta?.crops.find((c) => c.id === cropId)
  const market = meta?.markets.find((m) => m.id === marketId)
  const livePrice = live?.prices.find((p) => p.cropId === cropId && p.marketId === marketId)?.price

  const chartData = useMemo(() => {
    if (!data?.points) return []
    return [
      { date: t('ai.current'), price: livePrice ?? data.current, low: livePrice ?? data.current, high: livePrice ?? data.current, forecast: false },
      ...data.points.map((p) => ({
        date: new Date(p.date).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short' }),
        price: p.price, low: p.low, high: p.high, forecast: true,
      })),
    ]
  }, [data, livePrice, lang, t])

  const advice = data?.advice
  const lastPoint = data?.points?.[data.points.length - 1]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-green-700" /> {t('ai.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('ai.subtitle')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-1.5 block">{t('c.selectCrop')}</label>
          <Select value={cropId} onValueChange={setCropId}>
            <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(meta?.crops ?? []).map((c) => <SelectItem key={c.id} value={c.id} className="text-base">{pick(c.name, c.nameTa)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">{t('c.selectMarket')}</label>
          <Select value={marketId} onValueChange={setMarketId}>
            <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(meta?.markets ?? []).map((m) => <SelectItem key={m.id} value={m.id} className="text-base">{pick(m.name, m.nameTa)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
      ) : !data?.points ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4" /> {t('ai.training')}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* summary cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('ai.current')}</p>
                <p className="text-2xl font-bold tabular-nums">{fmtINR(livePrice ?? data.current)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('ai.forecast', { n: data.horizon })} {lastPoint && `· ${t('ai.expected', { date: new Date(lastPoint.date).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short' }) })}`}</p>
                <p className={cn('text-2xl font-bold tabular-nums', (data.trendPct ?? 0) >= 0 ? 'text-green-700' : 'text-red-600')}>
                  {fmtINR(lastPoint?.price ?? data.current)}{' '}
                  <span className="text-sm font-semibold">({data.trendPct >= 0 ? '+' : ''}{data.trendPct}%)</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('ai.accuracy')}</p>
                {data.model.accuracy != null ? (
                  <p className="text-2xl font-bold text-green-700 tabular-nums">{data.model.accuracy}%</p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">{data.engine === 'fallback' ? t('ai.offline') : '…'}</p>
                )}
                <Badge variant="outline" className="mt-2 text-[10px] max-w-full truncate">{t('ai.engine')}: {data.engine === 'flask-ml' ? 'Flask + scikit-learn' : 'statistical'}</Badge>
              </CardContent>
            </Card>
          </div>

          {/* advice */}
          <Card className={cn(advice === 'SELL_NOW' && 'border-red-200 bg-red-50/50', advice === 'WAIT' && 'border-green-200 bg-green-50/50')}>
            <CardHeader className="pb-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-700" /> {t('ai.adviceTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {advice === 'SELL_NOW' && (<><p className="text-lg font-bold text-red-700">{t('ai.sellNow')}</p><p className="text-sm text-muted-foreground mt-0.5">{t('ai.sellNowDesc')}</p></>)}
              {advice === 'WAIT' && (<><p className="text-lg font-bold text-green-700">{t('ai.wait')}</p><p className="text-sm text-muted-foreground mt-0.5">{t('ai.waitDesc')}</p></>)}
              {advice === 'HOLD' && (<><p className="text-lg font-bold">{t('ai.hold')}</p><p className="text-sm text-muted-foreground mt-0.5">{t('ai.holdDesc')}</p></>)}
              {!advice && <p className="text-sm text-muted-foreground">{t('ai.offline')}</p>}
            </CardContent>
          </Card>

          {/* forecast chart */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">
                {pick(crop?.name, crop?.nameTa)} · {pick(market?.name, market?.nameTa)} — {t('ai.forecast', { n: data.horizon })}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t('ai.confidence')}</p>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a34a" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={20} />
                    <YAxis tick={{ fontSize: 11 }} width={56} domain={['auto', 'auto']} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                    <Tooltip formatter={(v: number, name) => [fmtINR(v), name === 'high' ? '▲' : name === 'low' ? '▼' : '']} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                    <Area type="monotone" dataKey="high" stroke="none" fill="url(#bandFill)" />
                    <Area type="monotone" dataKey="low" stroke="none" fill="#ffffff" fillOpacity={0} />
                    <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2.6} dot={{ r: 3, fill: '#16a34a' }} activeDot={{ r: 5 }} isAnimationActive={false} />
                    {chartData.length > 1 && (
                      <ReferenceDot x={chartData[0].date} y={chartData[0].price} r={5} fill="#0a0a0a" stroke="#fff" />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
