'use client'

import { useState } from 'react'
import { BellOff, BellRing, Check, Eye, Save, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'
import {
  fmtINR, getDeviceId, useAlertActions, useAlerts, useCreateAlert, useLivePrices, useMarkNotifications, useMeta,
  useNotifications, useProfile, useSaveProfile,
} from '@/lib/api'

export function Alerts() {
  const { t, pick, lang } = useLang()
  const { toast } = useToast()
  const { data: meta } = useMeta()
  const { data: live } = useLivePrices()
  const [deviceId] = useState(() => getDeviceId())

  const { data: profileData } = useProfile(deviceId)
  const saveProfile = useSaveProfile()

  const { data: alertsData } = useAlerts(deviceId)
  const { data: notifData } = useNotifications(deviceId, lang)
  const createAlert = useCreateAlert()
  const { reArm, remove } = useAlertActions()
  const markAll = useMarkNotifications()

  // profile fields: local edits override saved profile (derived, no effect)
  const [nameEdit, setNameEdit] = useState<string | null>(null)
  const [phoneEdit, setPhoneEdit] = useState<string | null>(null)
  const [districtEdit, setDistrictEdit] = useState<string | null>(null)
  const name = nameEdit ?? profileData?.profile?.name ?? ''
  const phone = phoneEdit ?? profileData?.profile?.phone ?? ''
  const district = districtEdit ?? profileData?.profile?.district ?? ''

  const [cropId, setCropId] = useState('tomato')
  const [marketId, setMarketId] = useState('koyambedu')
  const [direction, setDirection] = useState<'ABOVE' | 'BELOW'>('ABOVE')
  const [target, setTarget] = useState('')

  // prefill target with current live price (derived while untouched)
  const liveForSelection = live?.prices.find((x) => x.cropId === cropId && x.marketId === marketId)?.price
  const targetValue = target !== '' ? target : liveForSelection != null ? String(liveForSelection) : ''

  const submitAlert = () => {
    if (!deviceId) return
    const targetPrice = Number(targetValue)
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) return
    // save profile silently if name present
    if (name.trim()) {
      saveProfile.mutate({ deviceId, name: name.trim(), phone, district, language: lang })
    }
    createAlert.mutate(
      { deviceId, cropId, marketId, targetPrice, direction },
      {
        onSuccess: (res) => {
          toast({
            title: res.triggeredNow ? t('al.instantToast') : t('al.createdToast'),
            className: 'border-green-300',
          })
        },
      },
    )
  }

  const cropName = (id: string) => pick(meta?.crops.find((c) => c.id === id)?.name, meta?.crops.find((c) => c.id === id)?.nameTa) || id
  const marketName = (id: string) => pick(meta?.markets.find((m) => m.id === id)?.name, meta?.markets.find((m) => m.id === id)?.nameTa) || id

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <BellRing className="h-6 w-6 text-green-700" /> {t('al.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('al.subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('al.profile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t('al.name')}</Label>
                <Input value={name} onChange={(e) => setNameEdit(e.target.value)} className="h-11 mt-1" placeholder={t('al.name')} />
              </div>
              <div>
                <Label>{t('al.phone')}</Label>
                <Input value={phone} onChange={(e) => setPhoneEdit(e.target.value)} className="h-11 mt-1" inputMode="tel" placeholder="98xxxxxxxx" />
              </div>
            </div>
            <div>
              <Label>{t('al.district')}</Label>
              <Select value={district} onValueChange={setDistrictEdit}>
                <SelectTrigger className="h-11 mt-1"><SelectValue placeholder={t('al.district')} /></SelectTrigger>
                <SelectContent>
                  {(meta?.districts ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{pick(d.name, d.nameTa)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (!name.trim()) return
                saveProfile.mutate(
                  { deviceId, name: name.trim(), phone, district, language: lang },
                  { onSuccess: () => toast({ title: t('c.saved') }) },
                )
              }}
              className="h-11"
              disabled={!name.trim() || saveProfile.isPending}
            >
              <Save className="h-4 w-4 mr-2" /> {t('c.save')}
            </Button>
          </CardContent>
        </Card>

        {/* create alert */}
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('al.createTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t('c.selectCrop')}</Label>
                <Select value={cropId} onValueChange={setCropId}>
                  <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(meta?.crops ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{pick(c.name, c.nameTa)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('c.selectMarket')}</Label>
                <Select value={marketId} onValueChange={setMarketId}>
                  <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(meta?.markets ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{pick(m.name, m.nameTa)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <RadioGroup value={direction} onValueChange={(v) => setDirection(v as 'ABOVE' | 'BELOW')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ABOVE" id="above" />
                <Label htmlFor="above" className="font-normal cursor-pointer">{t('al.whenAbove')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="BELOW" id="below" />
                <Label htmlFor="below" className="font-normal cursor-pointer">{t('al.whenBelow')}</Label>
              </div>
            </RadioGroup>
            <div>
              <Label>{t('al.target')}</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" min="1" value={targetValue} onChange={(e) => setTarget(e.target.value)} className="h-11" inputMode="numeric" />
                <Button onClick={submitAlert} disabled={createAlert.isPending || !Number(targetValue)} className="h-11 bg-green-700 hover:bg-green-800 min-w-[120px]">
                  {createAlert.isPending ? '…' : t('al.create')}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('al.hint')}</p>
          </CardContent>
        </Card>
      </div>

      {/* my alerts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('al.mine')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!alertsData ? (
            <Skeleton className="h-20 w-full" />
          ) : alertsData.alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('al.empty')}</p>
          ) : (
            <ul className="divide-y">
              {alertsData.alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {cropName(a.cropId)} · {marketName(a.marketId)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.direction === 'ABOVE' ? '↑' : '↓'} {t(a.direction === 'ABOVE' ? 'al.whenAbove' : 'al.whenBelow')} {fmtINR(a.targetPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.triggeredAt ? (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">{t('al.triggered')}</Badge>
                    ) : a.active ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1"><Eye className="h-3 w-3" /> {t('al.active')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('al.triggered')}</Badge>
                    )}
                    {a.triggeredAt && (
                      <Button variant="ghost" size="icon" className="h-9 w-9" title={t('al.reArm')} onClick={() => reArm.mutate(a.id)}>
                        <BellRing className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" title={t('al.delete')} onClick={() => remove.mutate(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* notifications feed */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t('al.notifications')}</CardTitle>
          {notifData && notifData.notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => markAll.mutate({ deviceId, all: true })}>
              <Check className="h-3.5 w-3.5 mr-1" /> {t('al.markAll')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!notifData ? (
            <Skeleton className="h-16 w-full" />
          ) : notifData.notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center flex items-center justify-center gap-2">
              <BellOff className="h-4 w-4" /> {t('al.emptyNotif')}
            </p>
          ) : (
            <ScrollArea className="max-h-72">
              <ul className="divide-y pr-3">
                {notifData.notifications.map((n) => (
                  <li key={n.id} className={cn('py-3 px-2 rounded-lg', !n.read && 'bg-green-50/60')}>
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
