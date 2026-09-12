import type { CropId } from './crops'
import { formatINR } from './money'

/**
 * Farmer-facing copy in the pilot's three languages. Translations were drafted
 * for the prototype and should be reviewed by a native speaker before any
 * real farmer sees them.
 */
export type Lang = 'en' | 'hi' | 'te' | 'gu'
export const LANGS: Lang[] = ['en', 'hi', 'te', 'gu']
export const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', te: 'తెలుగు', gu: 'ગુજરાતી' }
export const SPEECH_LOCALE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', gu: 'gu-IN' }

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'hi' || value === 'te' || value === 'gu'
}

const CROP_NAMES: Record<CropId, Record<Lang, string>> = {
  TOMATO: { en: 'tomato', hi: 'टमाटर', te: 'టమోటా', gu: 'ટામેટાં' },
  SPINACH: { en: 'spinach', hi: 'पालक', te: 'పాలకూర', gu: 'પાલક' },
  ONION: { en: 'onion', hi: 'प्याज़', te: 'ఉల్లిపాయ', gu: 'ડુંગળી' },
  POTATO: { en: 'potato', hi: 'आलू', te: 'బంగాళాదుంప', gu: 'બટાકા' },
  BAJRA: { en: 'bajra', hi: 'बाजरा', te: 'సజ్జలు', gu: 'બાજરી' },
  TUR: { en: 'tur', hi: 'तुअर', te: 'కందులు', gu: 'તુવેર' },
}

export function cropName(crop: CropId, lang: Lang): string {
  return CROP_NAMES[crop][lang]
}

const DATE_LOCALE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', gu: 'gu-IN' }

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
    gu: (p, l) => `AgriLink: ${p.buyer} ને ${localDate(p.date!, l)} સુધીમાં ${n(p.qty)} કિલો ${cropName(p.crop, l)} જોઈએ છે, ₹${n(p.price)}/કિલોના ભાવે. તમે આશરે ${n(p.expected)} કિલો નોંધાવ્યું છે. આપવા માટે YES <કિલો> મોકલો, નહીં તો NO. – ${p.fpo}`,
  },
  OFFER_IVR: {
    en: (p, l) => `Namaste ${p.farmer}. This is AgriLink calling for ${p.fpo}. ${p.buyer} needs ${cropName(p.crop, l)} by ${localDate(p.date!, l)}, at ${n(p.price)} rupees per kilo. You registered about ${n(p.expected)} kilos. Press 1 to commit, or 2 to decline.`,
    hi: (p, l) => `नमस्ते ${p.farmer}। ${p.fpo} की ओर से AgriLink बोल रहा है। ${p.buyer} को ${localDate(p.date!, l)} तक ${cropName(p.crop, l)} चाहिए, ${n(p.price)} रुपये प्रति किलो पर। आपने लगभग ${n(p.expected)} किलो दर्ज किया है। देने के लिए 1 दबाएँ, मना करने के लिए 2 दबाएँ।`,
    te: (p, l) => `నమస్కారం ${p.farmer}. ${p.fpo} తరపున AgriLink నుండి కాల్ చేస్తున్నాము. ${p.buyer} కి ${localDate(p.date!, l)} నాటికి కిలో ₹${n(p.price)} చొప్పున ${cropName(p.crop, l)} అవసరం. మీరు సుమారు ${n(p.expected)} కిలోలు నమోదు చేశారు. అంగీకరించడానికి 1, వద్దనుకుంటే 2 నొక్కండి.`,
    gu: (p, l) => `નમસ્તે ${p.farmer}. ${p.fpo} તરફથી AgriLink બોલે છે. ${p.buyer} ને ${localDate(p.date!, l)} સુધીમાં ${cropName(p.crop, l)} જોઈએ છે, ${n(p.price)} રૂપિયે કિલોના ભાવે. તમે આશરે ${n(p.expected)} કિલો નોંધાવ્યું છે. આપવા માટે 1 દબાવો, ના પાડવા માટે 2 દબાવો.`,
  },
  OFFER_COORDINATOR: {
    en: (p, l) => `Your FPO coordinator will call you today about the ${cropName(p.crop, l)} order for ${p.buyer}.`,
    hi: (p, l) => `आपके FPO कोऑर्डिनेटर आज ${p.buyer} के ${cropName(p.crop, l)} ऑर्डर के बारे में आपको कॉल करेंगे।`,
    te: (p, l) => `మీ FPO సమన్వయకర్త ఈరోజు ${p.buyer} కోసం ${cropName(p.crop, l)} ఆర్డర్ గురించి మీకు కాల్ చేస్తారు.`,
    gu: (p, l) => `તમારા FPO કોઑર્ડિનેટર આજે ${p.buyer} ના ${cropName(p.crop, l)} ઑર્ડર વિશે તમને ફોન કરશે.`,
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
    gu: (p, l) =>
      [
        p.primary ? `પાકું: ${localDate(p.date!, l)} પહેલાં ${n(p.primary)} કિલો ${cropName(p.crop, l)} લેવામાં આવશે.` : `તમે ${n(p.standby)} કિલો ${cropName(p.crop, l)} માટે સ્ટેન્ડબાય પર છો.`,
        p.primary && p.standby ? `${n(p.standby)} કિલો સ્ટેન્ડબાય પર છે.` : '',
        p.standby ? 'સ્ટેન્ડબાય જથ્થાની જરૂર પડશે તો અમે જણાવીશું.' : '',
        p.offered ? `(તમે આપેલા ${n(p.offered)} કિલોમાંથી અમે ${n((p.primary ?? 0) + (p.standby ?? 0))} કિલો લઈ શકીએ છીએ.)` : '',
      ].filter(Boolean).join(' '),
  },
  PROMOTED: {
    en: (p, l) => `Good news: your standby ${n(p.qty)} kg ${cropName(p.crop, l)} is now needed. Pickup before ${localDate(p.date!, l)}.`,
    hi: (p, l) => `खुशखबरी: आपका स्टैंडबाय ${n(p.qty)} किलो ${cropName(p.crop, l)} अब चाहिए। ${localDate(p.date!, l)} से पहले उठाया जाएगा।`,
    te: (p, l) => `శుభవార్త: మీ స్టాండ్‌బై ${n(p.qty)} కిలోల ${cropName(p.crop, l)} ఇప్పుడు అవసరం. ${localDate(p.date!, l)} లోపు సేకరణ జరుగుతుంది.`,
    gu: (p, l) => `સારા સમાચાર: તમારો સ્ટેન્ડબાય ${n(p.qty)} કિલો ${cropName(p.crop, l)} હવે જોઈએ છે. ${localDate(p.date!, l)} પહેલાં લેવામાં આવશે.`,
  },
  FILLED: {
    en: (p, l) => `The ${cropName(p.crop, l)} order for ${p.buyer} is now full. Thank you — we will message you for the next order.`,
    hi: (p, l) => `${p.buyer} का ${cropName(p.crop, l)} ऑर्डर पूरा हो गया है। धन्यवाद — अगले ऑर्डर के लिए हम आपको संदेश भेजेंगे।`,
    te: (p, l) => `${p.buyer} యొక్క ${cropName(p.crop, l)} ఆర్డర్ పూర్తయింది. ధన్యవాదాలు — తదుపరి ఆర్డర్ కోసం మేము మీకు సందేశం పంపుతాము.`,
    gu: (p, l) => `${p.buyer} નો ${cropName(p.crop, l)} ઑર્ડર પૂરો થઈ ગયો છે. આભાર — આગલા ઑર્ડર માટે અમે તમને સંદેશ મોકલીશું.`,
  },
  RELEASED: {
    en: (p, l) => `Your standby ${n(p.qty)} kg ${cropName(p.crop, l)} was not needed this time. You are free to sell it elsewhere.`,
    hi: (p, l) => `इस बार आपके स्टैंडबाय ${n(p.qty)} किलो ${cropName(p.crop, l)} की ज़रूरत नहीं पड़ी। आप इसे कहीं और बेच सकते हैं।`,
    te: (p, l) => `ఈసారి మీ స్టాండ్‌బై ${n(p.qty)} కిలోల ${cropName(p.crop, l)} అవసరం రాలేదు. మీరు దీనిని వేరే చోట విక్రయించుకోవచ్చు.`,
    gu: (p, l) => `આ વખતે તમારા સ્ટેન્ડબાય ${n(p.qty)} કિલો ${cropName(p.crop, l)} ની જરૂર ન પડી. તમે તેને બીજે વેચી શકો છો.`,
  },
  ADVANCE: {
    en: (p, l) => `${rs(p.amount)} advance for ${n(p.qty)} kg ${cropName(p.crop, l)} (Grade ${p.grade}) sent to your bank account by ${p.fpo}.`,
    hi: (p, l) => `${n(p.qty)} किलो ${cropName(p.crop, l)} (ग्रेड ${p.grade}) का ${rs(p.amount)} एडवांस ${p.fpo} ने आपके बैंक खाते में भेजा।`,
    te: (p, l) => `${p.fpo} ద్వారా ${n(p.qty)} కిలోల ${cropName(p.crop, l)} (గ్రేడ్ ${p.grade}) కోసం ${rs(p.amount)} అడ్వాన్స్ మీ బ్యాంక్ ఖాతాకు పంపబడింది.`,
    gu: (p, l) => `${n(p.qty)} કિલો ${cropName(p.crop, l)} (ગ્રેડ ${p.grade}) નું ${rs(p.amount)} એડવાન્સ ${p.fpo} એ તમારા બેંક ખાતામાં મોકલ્યું.`,
  },
  REJECTED: {
    en: (p, l) => `Your ${cropName(p.crop, l)} lot was not accepted at collection: ${p.reason}.`,
    hi: (p, l) => `आपका ${cropName(p.crop, l)} लॉट कलेक्शन पर स्वीकार नहीं हुआ: ${p.reason}।`,
    te: (p, l) => `సేకరణ కేంద్రం వద్ద మీ ${cropName(p.crop, l)} లాట్ ఆమోదించబడలేదు: ${p.reason}.`,
    gu: (p, l) => `તમારો ${cropName(p.crop, l)} લોટ કલેક્શન વખતે સ્વીકારાયો નહીં: ${p.reason}.`,
  },
  SETTLED: {
    en: (p) => `Sale settled: ${n(p.qty)} kg × ₹${n(p.price)} = ${rs(p.gross)}. Advance ${rs(p.advance)} and transport ${rs(p.transport)} deducted. Balance ${rs(p.net)} sent by ${p.fpo}.`,
    hi: (p) => `बिक्री का हिसाब: ${n(p.qty)} किलो × ₹${n(p.price)} = ${rs(p.gross)}। एडवांस ${rs(p.advance)} और ढुलाई ${rs(p.transport)} घटाकर बाकी ${rs(p.net)} ${p.fpo} ने भेजा।`,
    te: (p) => `అమ్మకం పరిష్కారం: ${n(p.qty)} కిలోలు × ₹${n(p.price)} = ${rs(p.gross)}. అడ్వాన్స్ ${rs(p.advance)} మరియు రవాణా ఖర్చులు ${rs(p.transport)} మినహాయించబడ్డాయి. మిగిలిన నికర మొత్తం ${rs(p.net)} ${p.fpo} ద్వారా పంపబడింది.`,
    gu: (p) => `વેચાણનો હિસાબ: ${n(p.qty)} કિલો × ₹${n(p.price)} = ${rs(p.gross)}. એડવાન્સ ${rs(p.advance)} અને ભાડું ${rs(p.transport)} બાદ કરીને બાકીના ${rs(p.net)} ${p.fpo} એ મોકલ્યા.`,
  },
  WITHDRAWN: {
    en: (p, l) => `You have withdrawn from the ${cropName(p.crop, l)} order. No penalty — thank you for telling us early.`,
    hi: (p, l) => `आप ${cropName(p.crop, l)} ऑर्डर से हट गए हैं। कोई जुर्माना नहीं — पहले बताने के लिए धन्यवाद।`,
    te: (p, l) => `మీరు ${cropName(p.crop, l)} ఆర్డర్ నుండి వైదొలిగారు. ఎటువంటి జరిమానా లేదు — ముందస్తుగా తెలియజేసినందుకు ధన్యవాదాలు.`,
    gu: (p, l) => `તમે ${cropName(p.crop, l)} ઑર્ડરમાંથી નીકળી ગયા છો. કોઈ દંડ નથી — વહેલા જણાવવા બદલ આભાર.`,
  },
}

export function renderMessage(template: MessageTemplate, params: MessageParams, lang: Lang): string {
  return TEMPLATES[template][lang](params, lang)
}

export const UI: Record<string, Record<Lang, string>> = {
  inbox: { en: 'AgriLink messages', hi: 'AgriLink संदेश', te: 'అగ్రిలింక్ సందేశాలు', gu: 'AgriLink સંદેશા' },
  accept: { en: 'Accept', hi: 'स्वीकार करें', te: 'ఆమోదించండి', gu: 'સ્વીકારો' },
  decline: { en: 'Decline', hi: 'मना करें', te: 'తిరస్కరించండి', gu: 'ના પાડો' },
  qtyLabel: { en: 'How many kg can you supply?', hi: 'आप कितने किलो दे सकते हैं?', te: 'మీరు ఎన్ని కిలోలు సరఫరా చేయగలరు?', gu: 'તમે કેટલા કિલો આપી શકો?' },
  commit: { en: 'Commit', hi: 'पक्का करें', te: 'ఖరారు చేయండి', gu: 'પાકું કરો' },
  cancel: { en: 'Back', hi: 'वापस', te: 'వెనుకకు', gu: 'પાછા' },
  withdraw: { en: "Can't supply any more", hi: 'अब सप्लाई संभव नहीं', te: 'ఇక సరఫరా చేయలేను', gu: 'હવે સપ્લાય શક્ય નથી' },
  withdrawConfirm: { en: 'Withdraw from this order? Standby farmers will be called instead.', hi: 'इस ऑर्डर से हटना है? आपकी जगह स्टैंडबाय किसानों को बुलाया जाएगा।', te: 'ఈ ఆర్డర్ నుండి వైదొలగాలా? మీ స్థానంలో స్టాండ్‌బై రైతులను పిలవడం జరుగుతుంది.', gu: 'આ ઑર્ડરમાંથી નીકળવું છે? તમારી જગ્યાએ સ્ટેન્ડબાય ખેડૂતોને બોલાવવામાં આવશે.' },
  yes: { en: 'Yes, withdraw', hi: 'हाँ, हटें', te: 'అవును, వైదొలగండి', gu: 'હા, નીકળો' },
  playIvr: { en: 'Play voice call', hi: 'वॉइस कॉल सुनें', te: 'వాయిస్ కాల్ వినండి', gu: 'વૉઇસ કૉલ સાંભળો' },
  stopIvr: { en: 'Stop', hi: 'रोकें', te: 'ఆపు', gu: 'બંધ કરો' },
  youReplied: { en: 'You replied', hi: 'आपने जवाब दिया', te: 'మీ సమాధానం', gu: 'તમે જવાબ આપ્યો' },
  accepted: { en: 'Accepted', hi: 'स्वीकार', te: 'ఆమోదించబడింది', gu: 'સ્વીકાર્યું' },
  declined: { en: 'Declined', hi: 'मना किया', te: 'తిరస్కరించబడింది', gu: 'ના પાડી' },
  orderClosed: { en: 'This order is closed.', hi: 'यह ऑर्डर अब बंद है।', te: 'ఈ ఆర్డర్ ముగిసింది.', gu: 'આ ઑર્ડર હવે બંધ છે.' },
  noMessages: {
    en: 'No messages yet. When a buyer order matches your registered crop, it will appear here.',
    hi: 'अभी कोई संदेश नहीं। जब किसी खरीदार का ऑर्डर आपकी दर्ज फसल से मेल खाएगा, वह यहाँ दिखेगा।',
    te: 'ఇంకా సందేశాలు లేవు. కొనుగోలుదారు ఆర్డర్ మీ నమోదిత పంటతో సరిపోలినప్పుడు, అది ఇక్కడ కనిపిస్తుంది.',
    gu: 'હજુ કોઈ સંદેશ નથી. જ્યારે કોઈ ખરીદારનો ઑર્ડર તમારા નોંધાયેલા પાક સાથે મેળ ખાશે, ત્યારે તે અહીં દેખાશે.',
  },
  mySales: { en: 'My sales', hi: 'मेरी बिक्री', te: 'నా విక్రయాలు', gu: 'મારું વેચાણ' },
  kg: { en: 'kg', hi: 'किलो', te: 'కిలో', gu: 'કિલો' },
  gradedWeight: { en: 'Graded weight', hi: 'ग्रेड किया गया वज़न', te: 'గ్రేడ్ చేసిన బరువు', gu: 'ગ્રેડ કરેલું વજન' },
  agreedPrice: { en: 'Agreed price', hi: 'तय भाव', te: 'ఒప్పంద ధర', gu: 'નક્કી ભાવ' },
  gross: { en: 'Gross value', hi: 'कुल रकम', te: 'మొత్తం విలువ', gu: 'કુલ રકમ' },
  advancePaid: { en: 'Advance paid on harvest day', hi: 'कटाई के दिन मिला एडवांस', te: 'కోత రోజున చెల్లించిన అడ్వాన్స్', gu: 'કાપણીના દિવસે મળેલું એડવાન્સ' },
  transport: { en: 'Transport share', hi: 'ढुलाई का हिस्सा', te: 'రవాణా ఖర్చు వాటా', gu: 'ભાડાનો હિસ્સો' },
  net: { en: 'Balance paid at settlement', hi: 'हिसाब पर बाकी भुगतान', te: 'చివరి పరిష్కారంలో చెల్లించిన బ్యాలెన్స్', gu: 'હિસાબ વખતે બાકી ચુકવણી' },
  totalReceived: { en: 'Total received', hi: 'कुल प्राप्त', te: 'మొత్తం అందింది', gu: 'કુલ મળેલું' },
  realised: { en: 'You realised', hi: 'आपको मिला', te: 'మీకు అందిన నికర ధర', gu: 'તમને મળ્યું' },
  mandi: { en: 'Mandi price that day', hi: 'उस दिन का मंडी भाव', te: 'ఆ నాటి మార్కెట్ యార్డ్ ధర', gu: 'તે દિવસનો મંડી ભાવ' },
  perKg: { en: '/kg', hi: '/किलो', te: '/కిలో', gu: '/કિલો' },
  noSales: { en: 'No settled sales yet.', hi: 'अभी कोई बिक्री का हिसाब नहीं।', te: 'ఇంకా ఎటువంటి అమ్మకాల పరిష్కారాలు లేవు.', gu: 'હજુ કોઈ વેચાણનો હિસાબ નથી.' },
  grade: { en: 'Grade', hi: 'ग्रेड', te: 'గ్రేడ్', gu: 'ગ્રેડ' },
  standby: { en: 'Standby', hi: 'स्टैंडबाय', te: 'స్టాండ్‌బై', gu: 'સ્ટેન્ડબાય' },
  confirmed: { en: 'Confirmed', hi: 'पक्का', te: 'ఖరారైంది', gu: 'પાકું' },
  commitRange: { en: 'Enter 1 to {max} kg', hi: '1 से {max} किलो लिखें', te: '1 నుండి {max} కిలోలు నమోదు చేయండి', gu: '1 થી {max} કિલો લખો' },
}

export function t(key: keyof typeof UI, lang: Lang, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), UI[key][lang])
}
