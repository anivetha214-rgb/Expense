'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, Send, Volume2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'
import { fmtINR, useLivePrices, useMeta, usePredict } from '@/lib/api'

// bilingual keyword maps for voice/text understanding
const CROP_KEYWORDS: Record<string, string[]> = {
  tomato: ['tomato', 'thakkali', 'தக்காளி'],
  onion: ['onion', 'vengayam', 'வெங்காயம்'],
  potato: ['potato', 'urulai', 'உருளை', 'ஆளுளை'],
  banana: ['banana', 'vazhai', 'வாழை'],
  brinjal: ['brinjal', 'eggplant', 'kathiri', 'கத்தரி'],
  carrot: ['carrot', 'கேரட்'],
  cabbage: ['cabbage', 'muttaikose', 'முட்டைகோஸ்', 'கோஸ்'],
  chilli: ['chilli', 'chili', 'milagai', 'மிளகாய்'],
  mango: ['mango', 'maampazham', 'மாம்பழம்', 'மா'],
  turmeric: ['turmeric', 'manjal', 'மஞ்சள்'],
  groundnut: ['groundnut', 'nilakkadalai', 'நிலக்கடலை', 'கடலை'],
  paddy: ['paddy', 'rice', 'nel', 'நெல்', 'அரிசி'],
}
const MARKET_KEYWORDS: Record<string, string[]> = {
  koyambedu: ['chennai', 'koyambedu', 'சென்னை', 'கோயம்பேடு'],
  'gandhi-trichy': ['trichy', 'tiruchirappalli', 'திருச்சி', 'திருச்சிராப்பள்ளி'],
  ukkadam: ['coimbatore', 'ukkadam', 'கோயம்புத்தூர்', 'உக்கடம்', 'கோவை'],
  'central-madurai': ['madurai', 'மதுரை'],
  salem: ['salem', 'சேலம்'],
  erode: ['erode', 'ஈரோடு'],
  hosur: ['hosur', 'krishnagiri', 'ஓசூர்', 'கிருஷ்ணகிரி'],
  tanjore: ['tanjore', 'thanjavur', 'தஞ்சாவூர்', 'தஞ்சை'],
  tirunelveli: ['tirunelveli', 'nelai', 'திருநெல்வேலி', 'நெல்லை'],
  vellore: ['vellore', 'வேலூர்'],
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: unknown) => void) | null
  start: () => void
  stop: () => void
}

type Intent = 'price' | 'predict' | 'best'

interface VoiceAnswer {
  text: string
  detail?: string
}

export function VoiceAssistant() {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [answer, setAnswer] = useState<VoiceAnswer | null>(null)
  const [supported, setSupported] = useState<'unknown' | 'yes' | 'no'>('unknown')
  const [typed, setTyped] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const speechSupported = supported !== 'no'

  const { data: meta } = useMeta()
  const { data: live } = useLivePrices()
  const [predictKey, setPredictKey] = useState<{ crop: string; market: string } | null>(null)
  const [pending, setPending] = useState(false)
  const { data: prediction } = usePredict(predictKey?.crop ?? '', predictKey?.market ?? '', 7)

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = lang === 'ta' ? 'ta-IN' : 'en-IN'
      utter.rate = 0.95
      const voices = window.speechSynthesis.getVoices()
      const match = voices.find((v) => v.lang.startsWith(lang === 'ta' ? 'ta' : 'en-IN')) ?? voices.find((v) => v.lang.startsWith(lang === 'ta' ? 'ta' : 'en'))
      if (match) utter.voice = match
      window.speechSynthesis.speak(utter)
    },
    [lang],
  )

  const answerQuestion = useCallback(
    (question: string): VoiceAnswer | null => {
      if (!meta || !live) return null
      predictIntentRef.current = false
      const q = question.toLowerCase()
      const cropId = Object.entries(CROP_KEYWORDS).find(([, kws]) => kws.some((k) => q.includes(k)))?.[0]
      const marketId = Object.entries(MARKET_KEYWORDS).find(([, kws]) => kws.some((k) => q.includes(k)))?.[0]
      const wantsPredict = /predict|forecast|tomorrow|கணிப்பு|நாளை/.test(q)
      const wantsBest = /best|highest|சிறந்த|அதிக/.test(q)

      const crop = meta.crops.find((c) => c.id === cropId)
      if (!crop) return { text: t('v.unknown') }

      const cropNameStr = lang === 'ta' ? crop.nameTa : crop.name

      if (wantsBest) {
        const forCrop = live.prices.filter((p) => p.cropId === crop.id)
        const best = forCrop.reduce((a, b) => (b.price > a.price ? b : a))
        const market = meta.markets.find((m) => m.id === best.marketId)
        const mname = market ? (lang === 'ta' ? market.nameTa : market.name) : ''
        const text = t('v.bestAnswer', { crop: cropNameStr, market: mname, price: best.price })
        return { text, detail: `${market?.district ?? ''} · ${fmtINR(best.price)}/${t('c.quintal')}` }
      }

      if (wantsPredict) {
        const key = { crop: crop.id, market: marketId ?? 'koyambedu' }
        predictIntentRef.current = true
        setPredictKey(key)
        setPending(true)
        return null // answer arrives when the ML prediction loads
      }

      // default: current price
      const m = meta.markets.find((mk) => mk.id === (marketId ?? 'koyambedu'))
      const p = live.prices.find((x) => x.cropId === crop.id && x.marketId === (marketId ?? 'koyambedu'))
      if (!p || !m) return { text: t('v.unknown') }
      const text = t('v.priceAnswer', {
        crop: cropNameStr,
        market: lang === 'ta' ? m.nameTa : m.name,
        price: p.price,
        change: `${p.changePct >= 0 ? '+' : ''}${p.changePct}%`,
      })
      return { text, detail: `${lang === 'ta' ? m.nameTa : m.name} · ${fmtINR(p.price)}/${t('c.quintal')}` }
    },
    [meta, live, lang, t],
  )

  // prediction answer derived from data (no setState-in-effect)
  const predictionAnswer: VoiceAnswer | null = useMemo(() => {
    if (!prediction?.points || !predictKey || !meta) return null
    const crop = meta.crops.find((c) => c.id === predictKey.crop)
    const market = meta.markets.find((m) => m.id === predictKey.market)
    if (!crop || !market) return null
    const last = prediction.points[prediction.points.length - 1]
    const text = t('v.predictAnswer', {
      crop: lang === 'ta' ? crop.nameTa : crop.name,
      market: lang === 'ta' ? market.nameTa : market.name,
      price: last.price,
      trend: `${prediction.trendPct >= 0 ? '+' : ''}${prediction.trendPct}`,
    })
    return { text, detail: `${fmtINR(last.price)} · ${prediction.model.accuracy ?? ''}${prediction.model.accuracy ? '%' : ''}` }
  }, [prediction, predictKey, meta, lang, t])

  const displayAnswer = answer ?? predictionAnswer ?? (pending ? { text: t('c.loading'), detail: '' } : null)

  // speak the prediction once when it lands (external system update only)
  const spokenKeyRef = useRef<string | null>(null)
  const predictIntentRef = useRef(false)
  useEffect(() => {
    if (!predictionAnswer || !predictKey) return
    const key = `${predictKey.crop}:${predictKey.market}:${predictionAnswer.text}`
    if (spokenKeyRef.current === key) return
    spokenKeyRef.current = key
    speak(predictionAnswer.text)
  }, [predictionAnswer, predictKey, speak])

  const handleQuestion = useCallback(
    (question: string) => {
      setTranscript(question)
      const ans = answerQuestion(question)
      if (ans) {
        setPending(false)
        setAnswer(ans)
        speak(ans.text)
      } else if (predictIntentRef.current) {
        setAnswer(null) // prediction card will render when the ML call lands
      } else {
        setPending(false)
        setAnswer({ text: t('v.unknown') })
      }
    },
    [answerQuestion, speak, t],
  )

  const startListening = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) {
      setSupported('no')
      return
    }
    setSupported('yes')
    const rec = new Ctor()
    rec.lang = lang === 'ta' ? 'ta-IN' : 'en-IN'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? ''
      handleQuestion(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    setAnswer(null)
    setTranscript('')
    setListening(true)
    rec.start()
  }, [lang, handleQuestion])

  const suggestions = useMemo(
    () => [t('v.s1'), t('v.s2'), t('v.s3'), t('v.s4')],
    [t],
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setListening(false); recognitionRef.current?.stop() } }}>
      <DialogTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.92 }}
          className={cn(
            'fixed z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors text-white',
            'bg-green-600 hover:bg-green-700',
            'bottom-20 right-4 md:bottom-8 md:right-8',
          )}
          aria-label={t('v.listen')}
        >
          <Mic className="h-6 w-6" />
          <span className="absolute inset-0 rounded-full animate-ping bg-green-500 opacity-25" />
        </motion.button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-green-700" /> {t('v.title')}
            <Badge variant="outline" className="ml-1 text-[10px]">{lang === 'ta' ? 'தமிழ் / English' : 'English / தமிழ்'}</Badge>
          </DialogTitle>
        </div>

        <div className="space-y-4">
          {/* mic area */}
          <div className="flex flex-col items-center gap-3 py-2">
            <button
              onClick={startListening}
              disabled={!speechSupported}
              className={cn(
                'flex h-20 w-20 items-center justify-center rounded-full text-white transition-all',
                listening ? 'bg-red-500 animate-pulse scale-105' : 'bg-green-600 hover:bg-green-700',
                !speechSupported && 'opacity-40 cursor-not-allowed',
              )}
              aria-label={t('v.tapSpeak')}
            >
              <Mic className="h-8 w-8" />
            </button>
            <p className="text-sm font-medium text-center">
              {listening ? t('v.listening') : speechSupported ? t('v.tapSpeak') : t('v.micUnsupported')}
            </p>
          </div>

          {/* typed fallback */}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (typed.trim()) handleQuestion(typed.trim())
              setTyped('')
            }}
          >
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('v.typePlaceholder')} className="h-11" />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0 bg-green-700 hover:bg-green-800" aria-label={t('v.ask')}>
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {/* answer */}
          {displayAnswer && (
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-relaxed">{displayAnswer.text}</p>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => speak(displayAnswer.text)} aria-label={t('v.replay')}>
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
              {displayAnswer.detail && <p className="text-sm text-muted-foreground mt-1">{displayAnswer.detail}</p>}
            </div>
          )}

          {transcript && !displayAnswer && <p className="text-sm text-muted-foreground text-center italic">“{transcript}”</p>}

          {/* suggestions */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('v.suggestions')}:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleQuestion(s)}
                  className="rounded-full border px-3 py-1.5 text-xs hover:border-green-400 hover:bg-green-50 transition-colors min-h-[32px]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function VoiceCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClose} aria-label="close">
      <X className="h-4 w-4" />
    </Button>
  )
}
