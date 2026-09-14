import type { CropId } from './crops'
import { formatINR } from './money'

/**
 * Farmer-facing copy in the pilot's three languages: English, Hindi, and Telugu.
 * Translations were drafted for the prototype and should be reviewed by a native
 * speaker before any real farmer sees them.
 */
export type Lang = 'en' | 'hi' | 'te'
export const LANGS: Lang[] = ['en', 'hi', 'te']
export const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', te: 'తెలుగు' }
export const SPEECH_LOCALE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' }

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'hi' || value === 'te'
}

const CROP_NAMES: Record<CropId, Record<Lang, string>> = {
  PADDY: { en: 'paddy (rice)', hi: 'धान (चावल)', te: 'వరి (వరి ధాన్యం)' },
  WHEAT: { en: 'wheat', hi: 'गेहूं', te: 'గోధుమలు' },
  TOMATO: { en: 'tomato', hi: 'टमाटर', te: 'టమోటా' },
  SPINACH: { en: 'spinach', hi: 'पालक', te: 'పాలకూర' },
  ONION: { en: 'onion', hi: 'प्याज़', te: 'ఉల్లిపాయ' },
  POTATO: { en: 'potato', hi: 'आलू', te: 'బంగాళాదుంప' },
  BAJRA: { en: 'bajra', hi: 'बाजरा', te: 'సజ్జలు' },
  TUR: { en: 'tur', hi: 'तुअर', te: 'కందులు' },
}

export function cropName(crop: CropId | string, lang: Lang): string {
  const norm = (crop || '').toUpperCase() as CropId
  return CROP_NAMES[norm]?.[lang] || CROP_NAMES[norm]?.['en'] || String(crop || '')
}

const DATE_LOCALE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' }

export function localDate(day: string, lang: Lang): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))
}

export type MessageParams = {
  crop: CropId
  buyer?: string
  fpo?: string
  farmer?: string
  date?: string
  qty?: number
  expected?: number
  price?: number
  primary?: number
  standby?: number
  offered?: number
  amount?: number
  grade?: string
  reason?: string
  gross?: number
  advance?: number
  transport?: number
  net?: number
}

export type MessageTemplate =
  | 'OFFER_SMS'
  | 'OFFER_IVR'
  | 'OFFER_COORDINATOR'
  | 'CONFIRMATION'
  | 'PROMOTED'
  | 'FILLED'
  | 'RELEASED'
  | 'ADVANCE'
  | 'REJECTED'
  | 'SETTLED'
  | 'WITHDRAWN'

type Renderer = (p: Required<Pick<MessageParams, 'crop'>> & MessageParams, lang: Lang) => string

const n = (value: number | undefined) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value ?? 0)
const rs = (value: number | undefined) => formatINR(value ?? 0)

const TEMPLATES: Record<MessageTemplate, Record<Lang, Renderer>> = {
  OFFER_SMS: {
    en: (p, l) => `AgriLink: ${p.buyer} needs ${n(p.qty)} kg ${cropName(p.crop, l)} by ${localDate(p.date!, l)} at ₹${n(p.price)}/kg. You registered about ${n(p.expected)} kg. Reply YES <kg> to commit or NO. – ${p.fpo}`,
    hi: (p, l) => `AgriLink: ${p.buyer} को ${localDate(p.date!, l)} तक ${n(p.qty)} किलो ${cropName(p.crop, l)} चाहिए, ₹${n(p.price)}/किलो पर। आपने लगभग ${n(p.expected)} किलो दर्ज किया है। देने के लिए YES <किलो> भेजें, नहीं तो NO। – ${p.fpo}`,
    te: (p, l) => `AgriLink: ${p.buyer} కి ${localDate(p.date!, l)} నాటికి ₹${n(p.price)}/కిలో చొప్పున ${n(p.qty)} కిలోల ${cropName(p.crop, l)} అవసరం. మీరు సుమారు ${n(p.expected)} కిలోలు నమోదు చేసుకున్నారు. ఇవ్వడానికి YES <కిలోలు> లేదా తిరస్కరించడానికి NO అని సమాధానం ఇవ్వండి. – ${p.fpo}`,
  },
  OFFER_IVR: {
    en: (p, l) => `Namaste ${p.farmer}. This is AgriLink calling for ${p.fpo}. ${p.buyer} needs ${cropName(p.crop, l)} by ${localDate(p.date!, l)}, at ${n(p.price)} rupees per kilo. You registered about ${n(p.expected)} kilos. Press 1 to commit, or 2 to decline.`,
    hi: (p, l) => `नमस्ते ${p.farmer}। ${p.fpo} की ओर से AgriLink बोल रहा है। ${p.buyer} को ${localDate(p.date!, l)} तक ${cropName(p.crop, l)} चाहिए, ${n(p.price)} रुपये प्रति किलो पर। आपने लगभग ${n(p.expected)} किलो दर्ज किया है। देने के लिए 1 दबाएँ, मना करने के लिए 2 दबाएँ।`,
    te: (p, l) => `నమస్కారం ${p.farmer}. ${p.fpo} తరపున AgriLink నుండి కాల్ చేస్తున్నాము. ${p.buyer} కి ${localDate(p.date!, l)} నాటికి కిలో ₹${n(p.price)} చొప్పున ${cropName(p.crop, l)} అవసరం. మీరు సుమారు ${n(p.expected)} కిలోలు నమోదు చేశారు. అంగీకరించడానికి 1, వద్దనుకుంటే 2 నొక్కండి.`,
  },
  OFFER_COORDINATOR: {
    en: (p, l) => `Your FPO coordinator will call you today about the ${cropName(p.crop, l)} order for ${p.buyer}.`,
    hi: (p, l) => `आपके FPO कोऑर्डिनेटर आज ${p.buyer} के ${cropName(p.crop, l)} ऑर्डर के बारे में आपको कॉल करेंगे।`,
    te: (p, l) => `మీ FPO సమన్వయకర్త ఈరోజు ${p.buyer} కోసం ${cropName(p.crop, l)} ఆర్డర్ గురించి మీకు కాల్ చేస్తారు.`,
  },
  CONFIRMATION: {
    en: (p, l) =>
      [
        p.primary ? `Confirmed: ${n(p.primary)} kg ${cropName(p.crop, l)} for pickup before ${localDate(p.date!, l)}.` : `You are on standby for ${n(p.standby)} kg ${cropName(p.crop, l)}.`,
        p.primary && p.standby ? `${n(p.standby)} kg is on standby.` : '',
        p.standby ? 'We will tell you if the standby quantity is needed.' : '',
        p.offered ? `(We could take ${n((p.primary ?? 0) + (p.standby ?? 0))} of the ${n(p.offered)} kg you offered.)` : '',
      ].filter(Boolean).join(' '),
    hi: (p, l) =>
      [
        p.primary ? `पक्का: ${localDate(p.date!, l)} से पहले ${n(p.primary)} किलो ${cropName(p.crop, l)} उठाया जाएगा।` : `आप ${n(p.standby)} किलो ${cropName(p.crop, l)} के लिए स्टैंडबाय पर हैं।`,
        p.primary && p.standby ? `${n(p.standby)} किलो स्टैंडबाय पर है।` : '',
        p.standby ? 'स्टैंडबाय मात्रा की ज़रूरत होने पर हम बताएँगे।' : '',
        p.offered ? `(आपके ${n(p.offered)} किलो में से हम ${n((p.primary ?? 0) + (p.standby ?? 0))} किलो ले सकते हैं।)` : '',
      ].filter(Boolean).join(' '),
    te: (p, l) =>
      [
        p.primary ? `ఖరారైంది: ${localDate(p.date!, l)} లోపు ${n(p.primary)} కిలోల ${cropName(p.crop, l)} సేకరణకు నిర్ధారించబడింది.` : `మీరు ${n(p.standby)} కిలోల ${cropName(p.crop, l)} కోసం స్టాండ్‌బైలో ఉన్నారు.`,
        p.primary && p.standby ? `${n(p.standby)} కిలోలు స్టాండ్‌బైలో ఉంది.` : '',
        p.standby ? 'స్టాండ్‌బై పరిమాణం అవసరమైతే మేము మీకు తెలియజేస్తాము.' : '',
        p.offered ? `(మీరు ప్రతిపాదించిన ${n(p.offered)} కిలోలలో మేము ${n((p.primary ?? 0) + (p.standby ?? 0))} కిలోలు తీసుకోగలము.)` : '',
      ].filter(Boolean).join(' '),
  },
  PROMOTED: {
    en: (p, l) => `Good news: your standby ${n(p.qty)} kg ${cropName(p.crop, l)} is now needed. Pickup before ${localDate(p.date!, l)}.`,
    hi: (p, l) => `खुशखबरी: आपका स्टैंडबाय ${n(p.qty)} किलो ${cropName(p.crop, l)} अब चाहिए। ${localDate(p.date!, l)} से पहले उठाया जाएगा।`,
    te: (p, l) => `శుభవార్త: మీ స్టాండ్‌బై ${n(p.qty)} కిలోల ${cropName(p.crop, l)} ఇప్పుడు అవసరం. ${localDate(p.date!, l)} లోపు సేకరణ జరుగుతుంది.`,
  },
  FILLED: {
    en: (p, l) => `The ${cropName(p.crop, l)} order for ${p.buyer} is now full. Thank you — we will message you for the next order.`,
    hi: (p, l) => `${p.buyer} का ${cropName(p.crop, l)} ऑर्डर पूरा हो गया है। धन्यवाद — अगले ऑर्डर के लिए हम आपको संदेश भेजेंगे।`,
    te: (p, l) => `${p.buyer} యొక్క ${cropName(p.crop, l)} ఆర్డర్ పూర్తయింది. ధన్యవాదాలు — తదుపరి ఆర్డర్ కోసం మేము మీకు సందేశం పంపుతాము.`,
  },
  RELEASED: {
    en: (p, l) => `Your standby ${n(p.qty)} kg ${cropName(p.crop, l)} was not needed this time. You are free to sell it elsewhere.`,
    hi: (p, l) => `इस बार आपके स्टैंडबाय ${n(p.qty)} किलो ${cropName(p.crop, l)} की ज़रूरत नहीं पड़ी। आप इसे कहीं और बेच सकते हैं।`,
    te: (p, l) => `ఈసారి మీ స్టాండ్‌బై ${n(p.qty)} కిలోల ${cropName(p.crop, l)} అవసరం రాలేదు. మీరు దీనిని వేరే చోట విక్రయించుకోవచ్చు.`,
  },
  ADVANCE: {
    en: (p, l) => `${rs(p.amount)} advance for ${n(p.qty)} kg ${cropName(p.crop, l)} (Grade ${p.grade}) sent to your bank account by ${p.fpo}.`,
    hi: (p, l) => `${n(p.qty)} किलो ${cropName(p.crop, l)} (ग्रेड ${p.grade}) का ${rs(p.amount)} एडवांस ${p.fpo} ने आपके बैंक खाते में भेजा।`,
    te: (p, l) => `${p.fpo} ద్వారా ${n(p.qty)} కిలోల ${cropName(p.crop, l)} (గ్రేడ్ ${p.grade}) కోసం ${rs(p.amount)} అడ్వాన్స్ మీ బ్యాంక్ ఖాతాకు పంపబడింది.`,
  },
  REJECTED: {
    en: (p, l) => `Your ${cropName(p.crop, l)} lot was not accepted at collection: ${p.reason}.`,
    hi: (p, l) => `आपका ${cropName(p.crop, l)} लॉट कलेक्शन पर स्वीकार नहीं हुआ: ${p.reason}।`,
    te: (p, l) => `సేకరణ కేంద్రం వద్ద మీ ${cropName(p.crop, l)} లాట్ ఆమోదించబడలేదు: ${p.reason}.`,
  },
  SETTLED: {
    en: (p) => `Sale settled: ${n(p.qty)} kg × ₹${n(p.price)} = ${rs(p.gross)}. Advance ${rs(p.advance)} and transport ${rs(p.transport)} deducted. Balance ${rs(p.net)} sent by ${p.fpo}.`,
    hi: (p) => `बिक्री का हिसाब: ${n(p.qty)} किलो × ₹${n(p.price)} = ${rs(p.gross)}। एडवांस ${rs(p.advance)} और ढुलाई ${rs(p.transport)} घटाकर बाकी ${rs(p.net)} ${p.fpo} ने भेजा।`,
    te: (p) => `అమ్మకం పరిష్కారం: ${n(p.qty)} కిలోలు × ₹${n(p.price)} = ${rs(p.gross)}. అడ్వాన్స్ ${rs(p.advance)} మరియు రవాణా ఖర్చులు ${rs(p.transport)} మినహాయించబడ్డాయి. మిగిలిన నికర మొత్తం ${rs(p.net)} ${p.fpo} ద్వారా పంపబడింది.`,
  },
  WITHDRAWN: {
    en: (p, l) => `You have withdrawn from the ${cropName(p.crop, l)} order. No penalty — thank you for telling us early.`,
    hi: (p, l) => `आप ${cropName(p.crop, l)} ऑर्डर से हट गए हैं। कोई जुर्माना नहीं — पहले बताने के लिए धन्यवाद।`,
    te: (p, l) => `మీరు ${cropName(p.crop, l)} ఆర్డర్ నుండి వైదొలిగారు. ఎటువంటి జరిమానా లేదు — ముందస్తుగా తెలియజేసినందుకు ధన్యవాదాలు.`,
  },
}

export function renderMessage(template: MessageTemplate, params: MessageParams, lang: Lang): string {
  return TEMPLATES[template][lang](params, lang)
}

export const UI: Record<string, Record<Lang, string>> = {
  inbox: { en: 'AgriLink messages', hi: 'AgriLink संदेश', te: 'అగ్రిలింక్ సందేశాలు' },
  accept: { en: 'Accept', hi: 'स्वीकार करें', te: 'ఆమోదించండి' },
  decline: { en: 'Decline', hi: 'मना करें', te: 'తిరస్కరించండి' },
  qtyLabel: { en: 'How many kg can you supply?', hi: 'आप कितने किलो दे सकते हैं?', te: 'మీరు ఎన్ని కిలోలు సరఫరా చేయగలరు?' },
  commit: { en: 'Commit', hi: 'पक्का करें', te: 'ఖరారు చేయండి' },
  cancel: { en: 'Back', hi: 'वापस', te: 'వెనుకకు' },
  withdraw: { en: "Can't supply any more", hi: 'अब सप्लाई संभव नहीं', te: 'ఇక సరఫరా చేయలేను' },
  withdrawConfirm: { en: 'Withdraw from this order? Standby farmers will be called instead.', hi: 'इस ऑर्डर से हटना है? आपकी जगह स्टैंडबाय किसानों को बुलाया जाएगा।', te: 'ఈ ఆర్డర్ నుండి వైదొలగాలా? మీ స్థానంలో స్టాండ్‌బై రైతులను పిలవడం జరుగుతుంది.' },
  yes: { en: 'Yes, withdraw', hi: 'हाँ, हटें', te: 'అవును, వైదొలగండి' },
  playIvr: { en: 'Play voice call', hi: 'वॉइस कॉल सुनें', te: 'వాయిస్ కాల్ వినండి' },
  stopIvr: { en: 'Stop', hi: 'रोकें', te: 'ఆపు' },
  youReplied: { en: 'You replied', hi: 'आपने जवाब दिया', te: 'మీ సమాధానం' },
  accepted: { en: 'Accepted', hi: 'स्वीकार', te: 'ఆమోదించబడింది' },
  declined: { en: 'Declined', hi: 'मना किया', te: 'తిరస్కరించబడింది' },
  orderClosed: { en: 'This order is closed.', hi: 'यह ऑर्डर अब बंद है।', te: 'ఈ ఆర్డర్ ముగిసింది.' },
  noMessages: {
    en: 'No messages yet. When a buyer order matches your registered crop, it will appear here.',
    hi: 'अभी कोई संदेश नहीं। जब किसी खरीदार का ऑर्डर आपकी दर्ज फसल से मेल खाएगा, वह यहाँ दिखेगा।',
    te: 'ఇంకా సందేశాలు లేవు. కొనుగోలుదారు ఆర్డర్ మీ నమోదిత పంటతో సరిపోలినప్పుడు, అది ఇక్కడ కనిపిస్తుంది.',
  },
  mySales: { en: 'My sales', hi: 'मेरी बिक्री', te: 'నా విక్రయాలు' },
  kg: { en: 'kg', hi: 'किलो', te: 'కిలో' },
  gradedWeight: { en: 'Graded weight', hi: 'ग्रेड किया गया वज़न', te: 'గ్రేడ్ చేసిన బరువు' },
  agreedPrice: { en: 'Agreed price', hi: 'तय भाव', te: 'ఒప్పంద ధర' },
  gross: { en: 'Gross value', hi: 'कुल रकम', te: 'మొత్తం విలువ' },
  advancePaid: { en: 'Advance paid on harvest day', hi: 'कटाई के दिन मिला एडवांस', te: 'కోత రోజున చెల్లించిన అడ్వాన్స్' },
  transport: { en: 'Transport share', hi: 'ढुलाई का हिस्सा', te: 'రవాణా ఖర్చు వాటా' },
  net: { en: 'Balance paid at settlement', hi: 'हिसाब पर बाकी भुगतान', te: 'చివరి పరిష్కారంలో చెల్లించిన బ్యాలెన్స్' },
  totalReceived: { en: 'Total received', hi: 'कुल प्राप्त', te: 'మొత్తం అందింది' },
  realised: { en: 'You realised', hi: 'आपको मिला', te: 'మీకు అందిన నికర ధర' },
  mandi: { en: 'Mandi price that day', hi: 'उस दिन का मंडी भाव', te: 'ఆ నాటి మార్కెట్ యార్డ్ ధర' },
  perKg: { en: '/kg', hi: '/किलो', te: '/కిలో' },
  noSales: { en: 'No settled sales yet.', hi: 'अभी कोई बिक्री का हिसाब नहीं।', te: 'ఇంకా ఎటువంటి అమ్మకాల పరిష్కారాలు లేవు.' },
  grade: { en: 'Grade', hi: 'ग्रेड', te: 'గ్రేడ్' },
  standby: { en: 'Standby', hi: 'स्टैंडबाय', te: 'స్టాండ్‌బై' },
  confirmed: { en: 'Confirmed', hi: 'पक्का', te: 'ఖరారైంది' },
  commitRange: { en: 'Enter 1 to {max} kg', hi: '1 से {max} किलो लिखें', te: '1 నుండి {max} కిలోలు నమోదు చేయండి' },
}

export function t(key: keyof typeof UI, lang: Lang, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), UI[key][lang])
}
