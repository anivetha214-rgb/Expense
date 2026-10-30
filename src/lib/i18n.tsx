'use client'

// FarmPrice AI — bilingual i18n (English / தமிழ்)
import React, { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react'

export type Lang = 'en' | 'ta'

// tiny localStorage-backed store (no effects needed)
let langListeners: (() => void)[] = []
const langStore = {
  get(): Lang {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem('fp-lang') === 'ta' ? 'ta' : 'en'
  },
  set(l: Lang) {
    window.localStorage.setItem('fp-lang', l)
    document.documentElement.lang = l === 'ta' ? 'ta' : 'en'
    langListeners.forEach((fn) => fn())
  },
  subscribe(fn: () => void) {
    langListeners.push(fn)
    return () => {
      langListeners = langListeners.filter((x) => x !== fn)
    }
  },
}

const en: Record<string, string> = {
  // nav / shell
  'nav.appName': 'FarmPrice AI',
  'nav.tagline': 'Farmer Market Price Assistant',
  'nav.home': 'Home',
  'nav.prices': 'Market Prices',
  'nav.predict': 'AI Prediction',
  'nav.sell': 'Sell & Profit',
  'nav.alerts': 'Alerts',
  'nav.live': 'LIVE',
  // common
  'c.loading': 'Loading…',
  'c.error': 'Something went wrong',
  'c.retry': 'Retry',
  'c.quintal': 'quintal',
  'c.updated': 'Updated',
  'c.best': 'Best',
  'c.recommended': 'Recommended',
  'c.save': 'Save',
  'c.saved': 'Saved!',
  'c.close': 'Close',
  'c.selectCrop': 'Select crop',
  'c.selectMarket': 'Select market',
  // home
  'home.greeting': 'Vanakkam, {name}!',
  'home.guestGreeting': 'Vanakkam, Farmer!',
  'home.subtitle': 'Today\'s best markets for your harvest',
  'home.statMarkets': 'Markets tracked',
  'home.statCrops': 'Crops',
  'home.statAccuracy': 'AI accuracy',
  'home.bestDeal': 'Best deal today',
  'home.bestDealHint': 'Highest price across {n} markets',
  'home.movers': 'Today\'s top movers',
  'home.moversHint': 'Live changes vs yesterday close',
  'home.quickActions': 'What do you want to do?',
  'home.qaPrices': 'Check prices',
  'home.qaPricesDesc': 'Live rates at 10 markets',
  'home.qaPredict': 'Predict price',
  'home.qaPredictDesc': 'AI forecast for next 7 days',
  'home.qaSell': 'Where to sell?',
  'home.qaSellDesc': 'Compare profit after transport',
  'home.qaAlerts': 'Set price alert',
  'home.qaAlertsDesc': 'Get notified at your target rate',
  'home.liveTicker': 'Live market rates',
  'home.engineReady': 'AI engine ready',
  'home.engineTraining': 'AI engine training…',
  'home.engineOffline': 'AI engine offline (basic estimates)',
  // prices
  'pr.title': 'Market Prices',
  'pr.subtitle': 'Live wholesale rates — ₹ per quintal',
  'pr.market': 'Market',
  'pr.price': 'Live price',
  'pr.change': 'Today',
  'pr.trend7': '7-day trend',
  'pr.history': '30-day price history',
  'pr.historyHint': 'Yesterday close and 30 days of official modal prices',
  'pr.youGet': 'You get',
  'pr.noData': 'No data',
  'pr.vsYesterday': 'vs yesterday',
  // predict
  'ai.title': 'AI Price Prediction',
  'ai.subtitle': 'Machine-learning forecast for the coming days',
  'ai.forecast': '{n}-day forecast',
  'ai.current': 'Current price',
  'ai.expected': 'By {date}',
  'ai.accuracy': 'Model accuracy',
  'ai.model': 'Model',
  'ai.confidence': 'Confidence band (95%)',
  'ai.adviceTitle': 'Selling advice',
  'ai.sellNow': 'Sell now',
  'ai.sellNowDesc': 'Prices are expected to fall — selling now protects your income.',
  'ai.wait': 'Wait',
  'ai.waitDesc': 'Prices are expected to rise — consider storing and selling in a few days.',
  'ai.hold': 'Stable',
  'ai.holdDesc': 'No big change expected — sell when convenient.',
  'ai.training': 'The AI engine is training on 2 years of market data. This takes about a minute.',
  'ai.offline': 'AI engine offline — showing statistical estimate.',
  'ai.engine': 'Engine',
  // sell
  'sell.title': 'Sell & Profit',
  'sell.subtitle': 'Compare net profit across markets after transport costs',
  'sell.location': 'Your village / district',
  'sell.quantity': 'Quantity (quintals)',
  'sell.vehicle': 'Vehicle',
  'sell.calculate': 'Find best market',
  'sell.netProfit': 'Net profit',
  'sell.perQuintal': 'per quintal',
  'sell.gross': 'Sale value',
  'sell.transport': 'Transport (round trip)',
  'sell.fee': 'Market fee (1.5%)',
  'sell.spoilage': 'Spoilage loss',
  'sell.distance': 'Distance',
  'sell.breakdown': 'Cost breakdown',
  'sell.trips': '{n} trip(s)',
  'sell.capacityWarn': 'Load exceeds one trip for this vehicle',
  'sell.price': 'Live price',
  'sell.margin': 'Margin',
  'sell.handling': 'Loading / unloading',
  'sell.tolls': 'Tolls',
  'sell.weighing': 'Weighing',
  'sell.hint': 'Net profit = sale value − transport − market fee − spoilage. Higher price far away can still lose to a nearer market!',
  // alerts
  'al.title': 'Price Alerts',
  'al.subtitle': 'We watch the markets and notify you',
  'al.profile': 'Farmer profile',
  'al.name': 'Your name',
  'al.phone': 'Mobile number',
  'al.district': 'District',
  'al.createTitle': 'New price alert',
  'al.whenAbove': 'When price rises above',
  'al.whenBelow': 'When price falls below',
  'al.target': 'Target price (₹/quintal)',
  'al.create': 'Create alert',
  'al.mine': 'My alerts',
  'al.active': 'Watching',
  'al.triggered': 'Triggered',
  'al.reArm': 'Watch again',
  'al.delete': 'Delete',
  'al.notifications': 'Notifications',
  'al.markAll': 'Mark all read',
  'al.empty': 'No alerts yet — create your first one above.',
  'al.emptyNotif': 'No notifications yet.',
  'al.createdToast': 'Alert created! We will notify you.',
  'al.instantToast': 'Condition already true — check notifications!',
  'al.hint': 'Alerts are checked live every few seconds while the app is open, and on every visit.',
  // voice
  'v.listen': 'Voice assistant',
  'v.listening': 'Listening…',
  'v.tapSpeak': 'Tap the microphone and ask',
  'v.typePlaceholder': 'Or type: tomato price in Salem',
  'v.ask': 'Ask',
  'v.suggestions': 'Try asking',
  'v.s1': 'Tomato price in Chennai',
  'v.s2': 'Onion price in Coimbatore',
  'v.s3': 'Tomato price prediction',
  'v.s4': 'Best market for banana',
  'v.priceAnswer': '{crop} at {market} is ₹{price} per quintal, {change} today.',
  'v.bestAnswer': 'Best market for {crop} is {market} at ₹{price} per quintal.',
  'v.predictAnswer': 'AI expects {crop} at {market} to be around ₹{price} in 7 days ({trend}%).',
  'v.unknown': 'Sorry, I did not catch a crop name. Try: tomato, onion, banana…',
  'v.micUnsupported': 'Voice input is not supported in this browser — please type your question.',
  'v.replay': 'Play again',
  'v.title': 'Voice Assistant',
}

const ta: Record<string, string> = {
  'nav.appName': 'பார்ம்பிரைஸ் AI',
  'nav.tagline': 'விவசாய சந்தை விலை உதவியாளர்',
  'nav.home': 'முகப்பு',
  'nav.prices': 'சந்தை விலைகள்',
  'nav.predict': 'AI கணிப்பு',
  'nav.sell': 'விற்பனை மற்றும் லாபம்',
  'nav.alerts': 'எச்சரிக்கைகள்',
  'nav.live': 'நேரலை',
  'c.loading': 'ஏற்றுகிறது…',
  'c.error': 'ஏதோ தவறு ஏற்பட்டது',
  'c.retry': 'மீண்டும் முயற்சி',
  'c.quintal': 'குண்டல்',
  'c.updated': 'புதுப்பிக்கப்பட்டது',
  'c.best': 'சிறந்தது',
  'c.recommended': 'பரிந்துரைக்கப்படுகிறது',
  'c.save': 'சேமி',
  'c.saved': 'சேமிக்கப்பட்டது!',
  'c.close': 'மூடு',
  'c.selectCrop': 'பயிரைத் தேர்ந்தெடு',
  'c.selectMarket': 'சந்தையைத் தேர்ந்தெடு',
  'home.greeting': 'வணக்கம், {name}!',
  'home.guestGreeting': 'வணக்கம், விவசாயி!',
  'home.subtitle': 'உங்கள் அறுவடைக்கு இன்றைய சிறந்த சந்தைகள்',
  'home.statMarkets': 'கண்காணிக்கப்படும் சந்தைகள்',
  'home.statCrops': 'பயிர்கள்',
  'home.statAccuracy': 'AI துல்லியம்',
  'home.bestDeal': 'இன்றைய சிறந்த ஒப்பந்தம்',
  'home.bestDealHint': '{n} சந்தைகளில் அதிக விலை',
  'home.movers': 'இன்றைய முக்கிய மாற்றங்கள்',
  'home.moversHint': 'நேற்றைய கடைசி விலையுடன் ஒப்பிடும்போது',
  'home.quickActions': 'என்ன செய்ய விரும்புகிறீர்கள்?',
  'home.qaPrices': 'விலைகளைப் பார்',
  'home.qaPricesDesc': '10 சந்தைகளின் நேரலை விலை',
  'home.qaPredict': 'விலை கணிப்பு',
  'home.qaPredictDesc': 'அடுத்த 7 நாட்களுக்கான AI கணிப்பு',
  'home.qaSell': 'எங்கு விற்பது?',
  'home.qaSellDesc': 'போக்குவரத்து செலவுக்குப் பிறகு லாப ஒப்பீடு',
  'home.qaAlerts': 'விலை எச்சரிக்கை',
  'home.qaAlertsDesc': 'உங்கள் இலக்கு விலையில் அறிவிப்பு',
  'home.liveTicker': 'நேரலை சந்தை விலைகள்',
  'home.engineReady': 'AI இயந்திரம் தயார்',
  'home.engineTraining': 'AI இயந்திரம் பயிற்சியில்…',
  'home.engineOffline': 'AI இயந்திரம் இல்லை (அடிப்படை மதிப்பீடு)',
  'pr.title': 'சந்தை விலைகள்',
  'pr.subtitle': 'நேரலை மொத்த விலை — குண்டலுக்கு ₹',
  'pr.market': 'சந்தை',
  'pr.price': 'நேரலை விலை',
  'pr.change': 'இன்று',
  'pr.trend7': '7 நாள் போக்கு',
  'pr.history': '30 நாள் விலை வரலாறு',
  'pr.historyHint': 'நேற்றைய கடைசி விலை மற்றும் 30 நாட்களின் அதிகாரப்பூர்வ விலை',
  'pr.youGet': 'நீங்கள் பெறுவது',
  'pr.noData': 'தரவு இல்லை',
  'pr.vsYesterday': 'நேற்றையுடன் ஒப்பிடும்போது',
  'ai.title': 'AI விலை கணிப்பு',
  'ai.subtitle': 'வரும் நாட்களுக்கான இயந்திர கற்றல் கணிப்பு',
  'ai.forecast': '{n} நாள் கணிப்பு',
  'ai.current': 'தற்போதைய விலை',
  'ai.expected': '{date} அன்று',
  'ai.accuracy': 'மாதிரி துல்லியம்',
  'ai.model': 'மாதிரி',
  'ai.confidence': 'நம்பகத்தன்மை வரம்பு (95%)',
  'ai.adviceTitle': 'விற்பனை ஆலோசனை',
  'ai.sellNow': 'இப்போதே விற்க',
  'ai.sellNowDesc': 'விலை குறைய வாய்ப்பு — இப்போது விற்பது உங்கள் வருவாயைப் பாதுகாக்கும்.',
  'ai.wait': 'காத்திரு',
  'ai.waitDesc': 'விலை உயர வாய்ப்பு — சில நாட்கள் சேமித்து விற்கலாம்.',
  'ai.hold': 'நிலையானது',
  'ai.holdDesc': 'பெரிய மாற்றம் இல்லை — வசதியான நேரத்தில் விற்கலாம்.',
  'ai.training': 'AI இயந்திரம் 2 ஆண்டு சந்தைத் தரவில் பயிற்சி பெறுகிறது. ஒரு நிமிடம் ஆகும்.',
  'ai.offline': 'AI இயந்திரம் இல்லை — புள்ளிவிவர மதிப்பீடு காட்டப்படுகிறது.',
  'ai.engine': 'இயந்திரம்',
  'sell.title': 'விற்பனை மற்றும் லாபம்',
  'sell.subtitle': 'போக்குவரத்து செலவுக்குப் பிறகு சந்தைகளில் தூய லாப ஒப்பீடு',
  'sell.location': 'உங்கள் கிராமம் / மாவட்டம்',
  'sell.quantity': 'அளவு (குண்டல்)',
  'sell.vehicle': 'வாகனம்',
  'sell.calculate': 'சிறந்த சந்தையைக் கண்டறி',
  'sell.netProfit': 'தூய லாபம்',
  'sell.perQuintal': 'குண்டலுக்கு',
  'sell.gross': 'விற்பனை மதிப்பு',
  'sell.transport': 'போக்குவரத்து (இரு வழி)',
  'sell.fee': 'சந்தைக் கட்டணம் (1.5%)',
  'sell.spoilage': 'கெட்டுப்போன இழப்பு',
  'sell.distance': 'தூரம்',
  'sell.breakdown': 'செலவு விவரம்',
  'sell.trips': '{n} பயணம்',
  'sell.capacityWarn': 'இந்த வாகனத்தில் ஒரே பயணத்தில் சுமக்க முடியாது',
  'sell.price': 'நேரலை விலை',
  'sell.margin': 'லாப விகிதம்',
  'sell.handling': 'ஏற்றுதல் / இறக்குதல்',
  'sell.tolls': 'கட்டணச் சாலை',
  'sell.weighing': 'தராசு',
  'sell.hint': 'தூய லாபம் = விற்பனை மதிப்பு − போக்குவரத்து − சந்தைக் கட்டணம் − கெட்டுப்போன இழப்பு. தூரத்தில் அதிக விலை, அருகிலுள்ள சந்தையை விட குறைவாக இருக்கலாம்!',
  'al.title': 'விலை எச்சரிக்கைகள்',
  'al.subtitle': 'நாங்கள் சந்தைகளைக் கண்காணித்து உங்களுக்குத் தெரிவிக்கிறோம்',
  'al.profile': 'விவசாயி சுயவிவரம்',
  'al.name': 'உங்கள் பெயர்',
  'al.phone': 'கைபேசி எண்',
  'al.district': 'மாவட்டம்',
  'al.createTitle': 'புதிய விலை எச்சரிக்கை',
  'al.whenAbove': 'விலை ₹ க்கு மேல் உயர்ந்தால்',
  'al.whenBelow': 'விலை ₹ க்கு கீழ் விழுந்தால்',
  'al.target': 'இலக்கு விலை (₹/குண்டல்)',
  'al.create': 'எச்சரிக்கையை உருவாக்கு',
  'al.mine': 'எனது எச்சரிக்கைகள்',
  'al.active': 'கண்காணிப்பில்',
  'al.triggered': 'எச்சரிக்கை வந்தது',
  'al.reArm': 'மீண்டும் கண்காணி',
  'al.delete': 'நீக்கு',
  'al.notifications': 'அறிவிப்புகள்',
  'al.markAll': 'அனைத்தையும் படித்ததாகக் குறி',
  'al.empty': 'இன்னும் எச்சரிக்கை இல்லை — மேலே உங்கள் முதல் எச்சரிக்கையை உருவாக்குங்கள்.',
  'al.emptyNotif': 'இன்னும் அறிவிப்புகள் இல்லை.',
  'al.createdToast': 'எச்சரிக்கை உருவாக்கப்பட்டது! நாங்கள் உங்களுக்குத் தெரிவிப்போம்.',
  'al.instantToast': 'நிலை ஏற்கனவே உண்மை — அறிவிப்புகளைப் பார்க்கவும்!',
  'al.hint': 'செயலி திறந்திருக்கும்போது ஒவ்வொரு சில வினாடிகளும் எச்சரிக்கைகள் சரிபார்க்கப்படும், ஒவ்வொரு வருகையிலும்.',
  'v.listen': 'குரல் உதவியாளர்',
  'v.listening': 'கேட்கிறது…',
  'v.tapSpeak': 'மைக்கை தட்டி கேளுங்கள்',
  'v.typePlaceholder': 'அல்லது தட்டச்சு செய்யுங்கள்: சேலத்தில் தக்காளி விலை',
  'v.ask': 'கேள்',
  'v.suggestions': 'இப்படிக் கேளுங்கள்',
  'v.s1': 'சென்னையில் தக்காளி விலை',
  'v.s2': 'கோயம்புத்தூரில் வெங்காயம் விலை',
  'v.s3': 'தக்காளி விலை கணிப்பு',
  'v.s4': 'வாழைக்காய்க்கு சிறந்த சந்தை',
  'v.priceAnswer': '{market} இல் {crop} விலை குண்டலுக்கு ₹{price}, இன்று {change}.',
  'v.bestAnswer': '{crop}க்கு சிறந்த சந்தை {market}, குண்டலுக்கு ₹{price}.',
  'v.predictAnswer': 'AI கணிப்பு: {market} இல் {crop} 7 நாட்களில் சுமார் ₹{price} ({trend}%).',
  'v.unknown': 'மன்னிக்கவும், பயிரின் பெயர் புரியவில்லை. முயற்சிக்கவும்: தக்காளி, வெங்காயம், வாழை…',
  'v.micUnsupported': 'இந்த உலாவியில் குரல் உள்ளீடு இல்லை — உங்கள் கேள்வியைத் தட்டச்சு செய்யுங்கள்.',
  'v.replay': 'மீண்டும் இயக்கு',
  'v.title': 'குரல் உதவியாளர்',
}

const DICT: Record<Lang, Record<string, string>> = { en, ta }

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
  pick: (en: string | undefined, ta_: string | undefined) => string
}

const Ctx = createContext<LangCtx | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(langStore.subscribe, langStore.get, () => 'en' as Lang)

  const setLang = useCallback((l: Lang) => {
    langStore.set(l)
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let s = DICT[lang][key] ?? DICT.en[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v))
      }
      return s
    },
    [lang],
  )

  const pick = useCallback(
    (enName: string | undefined, taName: string | undefined) =>
      (lang === 'ta' ? taName ?? enName : enName ?? taName) ?? '',
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t, pick }), [lang, setLang, t, pick])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
