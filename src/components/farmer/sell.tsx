'use client'

import { useState } from 'react'
import { MapPin, Medal, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'
import { fmtINR, useMeta, useProfile, useProfitRanking, getDeviceId, type ProfitResponse } from '@/lib/api'

export function Sell() {
  const { t, pick, lang } = useLang()
  const { data: meta } = useMeta()
  const [deviceId] = useState(() => getDeviceId())
  const { data: profileData } = useProfile(deviceId)

  const [cropId, setCropId] = useState('tomato')
  const [districtChoice, setDistrictChoice] = useState('')
  const [vehicleId, setVehicleId] = useState('mini-truck')
  const [quantity, setQuantity] = useState('10')
  const [result, setResult] = useState<ProfitResponse | null>(null)

  // profile district is the fallback until the farmer picks one (derived, no effect)
  const districtId = districtChoice || profileData?.profile?.district || ''
  const setDistrictId = setDistrictChoice

  const ranking = useProfitRanking()

  const calculate = () => {
    const q = Math.max(0.5, Number(quantity) || 10)
    ranking.mutate(
      { cropId, districtId, vehicleId, quantityQuintal: q },
      { onSuccess: (data) => setResult(data) },
    )
  }

  const districtOk = !!districtId

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-green-700" /> {t('sell.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('sell.subtitle')}</p>
      </div>

      {/* form */}
      <Card>
        <CardContent className="p-4 md:p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Label className="text-sm">{t('c.selectCrop')}</Label>
            <Select value={cropId} onValueChange={setCropId}>
              <SelectTrigger className="h-12 mt-1.5 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(meta?.crops ?? []).map((c) => <SelectItem key={c.id} value={c.id} className="text-base">{pick(c.name, c.nameTa)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-1">
            <Label className="text-sm">{t('sell.location')}</Label>
            <Select value={districtId} onValueChange={setDistrictId}>
              <SelectTrigger className="h-12 mt-1.5 text-base"><SelectValue placeholder={t('sell.location')} /></SelectTrigger>
              <SelectContent>
                {(meta?.districts ?? []).map((d) => <SelectItem key={d.id} value={d.id} className="text-base">{pick(d.name, d.nameTa)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-1">
            <Label className="text-sm">{t('sell.quantity')}</Label>
            <Input type="number" min="0.5" step="0.5" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-12 mt-1.5 text-base" />
          </div>
          <div className="lg:col-span-1">
            <Label className="text-sm">{t('sell.vehicle')}</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="h-12 mt-1.5 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(meta?.vehicles ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-base">
                    {pick(v.name, v.nameTa)} · ≤{v.capacityQuintal}t
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={calculate} disabled={!districtOk || ranking.isPending} className="h-12 w-full text-base font-semibold bg-green-700 hover:bg-green-800">
              {ranking.isPending ? t('c.loading') : t('sell.calculate')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {ranking.isPending && <Skeleton className="h-40 w-full rounded-xl" />}

      {result && (
        <>
          <p className="text-xs text-muted-foreground">{t('sell.hint')}</p>
          <div className="space-y-4">
            {result.ranked.map((r, i) => (
              <Card
                key={r.marketId}
                className={cn(
                  'overflow-hidden transition-all',
                  r.recommended ? 'border-green-500 shadow-md ring-1 ring-green-500/30' : i < 3 ? 'border-green-200' : '',
                )}
              >
                <div className={cn('h-1.5 w-full', r.recommended ? 'bg-green-600' : i < 3 ? 'bg-green-300' : 'bg-transparent')} />
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-lg', r.recommended ? 'bg-green-600 text-white' : 'bg-muted')}>
                        {r.rank}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-base truncate">{pick(r.marketName, r.marketNameTa)}</p>
                          {r.recommended && <Badge className="bg-green-600 hover:bg-green-600 gap-1"><Medal className="h-3 w-3" /> {t('c.recommended')}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {t('sell.distance')}: {r.distanceKm} km · {t('sell.trips', { n: r.tripsNeeded })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 md:gap-8">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{t('sell.price')}</p>
                        <p className="font-bold tabular-nums">{fmtINR(r.price)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{t('sell.margin')}</p>
                        <p className={cn('font-semibold tabular-nums', r.marginPct >= 70 ? 'text-green-700' : r.marginPct >= 40 ? 'text-amber-600' : 'text-red-600')}>{r.marginPct}%</p>
                      </div>
                      <div className="text-center min-w-[110px]">
                        <p className="text-xs text-muted-foreground">{t('sell.netProfit')}</p>
                        <p className={cn('text-xl font-bold tabular-nums', r.recommended ? 'text-green-700' : '')}>{fmtINR(r.netProfit)}</p>
                        <p className="text-[11px] text-muted-foreground">{fmtINR(r.netPerQuintal)}/{t('sell.perQuintal')}</p>
                      </div>
                    </div>
                  </div>

                  <Collapsible className="mt-4">
                    <CollapsibleTrigger className="text-sm font-medium text-green-700 hover:underline flex items-center gap-1">
                      {t('sell.breakdown')} ▾
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-3 text-sm">
                        <Cost label={t('sell.gross')} value={fmtINR(r.grossRevenue)} />
                        <Cost label={`${t('sell.spoilage')} (${r.spoilagePct}%)`} value={`−${fmtINR(r.spoilageValue)}`} negative />
                        <Cost label={t('sell.transport')} value={`−${fmtINR(r.transport.vehicleCharge)}`} negative sub={`${r.distanceKm} km × ${r.tripsNeeded}`} />
                        <Cost label={t('sell.handling')} value={`−${fmtINR(r.transport.handling)}`} negative />
                        <Cost label={t('sell.tolls')} value={`−${fmtINR(r.transport.tolls)}`} negative />
                        <Cost label={t('sell.weighing')} value={`−${fmtINR(r.transport.weighing)}`} negative />
                        <Cost label={t('sell.fee')} value={`−${fmtINR(r.marketFee)}`} negative />
                      </div>
                      {!r.vehicleCapacityOk && <p className="mt-3 text-xs text-amber-600">⚠ {t('sell.capacityWarn')}</p>}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      {!result && !ranking.isPending && districtOk === false && (
        <p className="text-sm text-muted-foreground">{t('sell.location')}: {lang === 'ta' ? 'மாவட்டத்தைத் தேர்ந்தெடுத்து கணக்கிடவும்' : 'select your district to calculate'}</p>
      )}
    </div>
  )
}

function Cost({ label, value, negative, sub }: { label: string; value: string; negative?: boolean; sub?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      <p className={cn('font-semibold tabular-nums mt-0.5', negative && 'text-red-600')}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}
