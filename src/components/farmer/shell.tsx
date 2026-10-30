'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellRing, Check, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useLang } from '@/lib/i18n'
import { useMarkNotifications, useNotifications, getDeviceId } from '@/lib/api'

export function LanguageToggle() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex items-center rounded-full border bg-background p-0.5 shadow-sm" role="group" aria-label="Language">
      <button
        onClick={() => setLang('en')}
        className={`rounded-full px-3 h-8 text-sm font-semibold transition-colors min-w-[44px] ${lang === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
      <button
        onClick={() => setLang('ta')}
        className={`rounded-full px-3 h-8 text-sm font-semibold transition-colors min-w-[44px] ${lang === 'ta' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        aria-pressed={lang === 'ta'}
      >
        தமிழ்
      </button>
    </div>
  )
}

export function NotificationBell() {
  const { lang, t } = useLang()
  const [deviceId] = useState(() => getDeviceId())
  const [open, setOpen] = useState(false)
  const { data } = useNotifications(deviceId, lang)
  const mark = useMarkNotifications()
  const notifications = data?.notifications ?? []
  const unread = data?.unread ?? 0

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o && unread > 0) mark.mutate({ deviceId, all: true }) }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full h-10 w-10" aria-label={t('al.notifications')}>
          {unread > 0 ? <BellRing className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5" />}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold text-sm">{t('al.notifications')}</p>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => mark.mutate({ deviceId, all: true })}>
              <Check className="h-3.5 w-3.5 mr-1" /> {t('al.markAll')}
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{t('al.emptyNotif')}</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id} className={`px-4 py-3 ${n.read ? 'opacity-70' : 'bg-accent/40'}`}>
                  <div className="flex gap-2">
                    <span className="mt-0.5">
                      {/below|கீழே/.test(n.title) ? <TrendingDown className="h-4 w-4 text-red-600" /> : <TrendingUp className="h-4 w-4 text-green-600" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export function LiveBadge({ connected, label, className = '' }: { connected: boolean; label?: string; className?: string }) {
  return (
    <Badge className={`gap-1.5 bg-green-600 hover:bg-green-600 ${className}`} aria-live="polite">
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full ${connected ? 'animate-ping bg-white opacity-75' : 'bg-white/40'}`} />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      {label ?? 'LIVE'}
    </Badge>
  )
}

export function TabSwitcher({ children, active }: { children: React.ReactNode; active: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
