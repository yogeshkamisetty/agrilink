'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  HelpCircle,
  Info,
  Loader2,
  MessageSquare,
  Mic,
  Minus,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Truck,
  Wheat,
  X,
} from 'lucide-react'
import { authHeaders } from '@/lib/auth-client'
import { Language } from '@/lib/i18n'
import type { BoardOrder } from '@/lib/server/marketplace'
import type { FarmerOverview } from '@/lib/server/views'
import { GradeCamCamera } from './gradecam-camera'

interface FarmerDashboardViewProps {
  order: any
  buyer: any
  currentUserName: string | null
  lang: Language
  activeNav: string
  onNavigate: (tab: 'Overview' | 'Orders' | 'Collection & grade' | 'Settlements') => void
  farmerOfferAccepted: boolean
  onAcceptCommitment: () => void
  onDeclareHarvest: () => void
  onOpenVoice: () => void
  onOpenReceipt: () => void
  onRedistributeExcess?: () => void
  onCapturePhoto: (dataUrl: string) => void
  aiResult: { status: string; grade: string; confidence: number; reasoning: string } | null
  busy: boolean
  farmerTab?: 'slip' | 'camera'
  setFarmerTab?: (tab: 'slip' | 'camera') => void
}

type GradeAttempt = {
  aiStatus: 'GRADED' | 'LOW_CONFIDENCE' | 'UNAVAILABLE'
  aiGrade: string | null
  aiConfidence: number | null
  aiReasoning: string | null
  aiDefects: string[]
}

const CROP_IMAGES: Record<string, string> = {
  PADDY: '/crops/paddy.png',
  RICE: '/crops/paddy.png',
  TOMATO: '/crops/tomato.png',
  WHEAT: '/crops/wheat.png',
  ONION: '/crops/onion.png',
  POTATO: '/crops/potato.png',
}

const STAGE_LABELS: Record<string, Record<string, string>> = {
  en: {
    POSTED: 'Order Placed',
    FUNDED: 'Advance in Escrow',
    SOURCING: 'Collecting Commitments',
    COLLECTING: 'Pickup & Quality Check',
    DISPATCHED: 'Truck En Route',
    SETTLED: 'Fully Paid to Bank',
    REJECTED: 'Cancelled',
  },
  hi: {
    POSTED: 'ऑर्डर दर्ज हुआ',
    FUNDED: 'अग्रिम राशि सुरक्षित',
    SOURCING: 'फसल संकलन जारी',
    COLLECTING: 'पिकअप और जांच',
    DISPATCHED: 'वाहन रास्ते में है',
    SETTLED: 'बैंक में भुगतान पूर्ण',
    REJECTED: 'रद्द किया गया',
  },
  te: {
    POSTED: 'ఆర్డర్ నమోదైంది',
    FUNDED: 'అడ్వాన్స్ భద్రపరచబడింది',
    SOURCING: 'పంట సేకరణ జరుగుతోంది',
    COLLECTING: 'పికప్ & నాణ్యత తనిఖీ',
    DISPATCHED: 'వాహనం మార్గంలో ఉంది',
    SETTLED: 'పూర్తి చెల్లింపు పూర్తయింది',
    REJECTED: 'రద్దు చేయబడింది',
  },
}

const LABELS: Record<string, Record<string, string>> = {
  en: {
    welcome: 'Welcome',
    memberBadge: 'Verified FPO Member',
    tagline: 'Guaranteed prices fixed directly with buyers before you harvest.',
    declareBtn: 'Declare New Harvest',
    declareSub: 'Register what you will pick so buyers can order from you',
    voiceBtn: 'Voice Assistant',
    allocatedTitle: 'New Order Request Allocated To You!',
    allocatedSub: 'A buyer placed an order matching your harvest. You are the nearest member with ready supply.',
    priceAgreed: 'Guaranteed Price',
    mandiBenchmark: 'Mandi Rate',
    extraGain: 'Extra Gain',
    deliverBy: 'Pickup By',
    buyerLabel: 'Buyer',
    acceptOrder: 'Accept Order',
    declineOrder: 'Decline (Pass to next farmer)',
    declineNotice: 'Declining automatically offers this order to the next nearest farmer in your FPO.',
    committedProduce: 'Committed Produce',
    committedWorth: 'guaranteed value',
    vsMandi: 'Extra Gain vs Mandi',
    vsMandiSub: 'above local APMC market',
    nextPickup: 'Next Pickup',
    noPickup: 'No pickup scheduled yet',
    moneyReceived: 'Money in Bank',
    moneySub: 'advances + final settlements',
    tabCrops: 'My Crops & Pickup',
    tabDemands: 'Buyer Demands',
    tabQuality: 'Quality Check (GradeCam)',
    tabPassbook: 'Passbook & Earnings',
    registeredHarvests: 'My Registered Crops',
    addCrop: 'Add Crop',
    ofCommitted: 'committed',
    availableToSell: 'available to sell',
    harvestWindow: 'Harvest window',
    activeCommitments: 'Active Delivery Orders',
    noCommitments: 'No commitments yet. Check Buyer Demands to commit your crop.',
    fpoUpdates: 'Official FPO Updates',
    noMessages: 'Confirmations, pickup notifications, and payment receipts will appear here.',
    openDemandsTitle: 'Available Buyer Demands',
    openDemandsSub: 'Orders funded by buyers taking farmer commitments at pre-agreed rates.',
    noDemands: 'No open demands available right now.',
    commitBtn: 'Commit Produce',
    registerToCommit: 'Register this crop to commit',
    comingUp: 'Upcoming Demands (Planning)',
    comingUpSub: 'Orders awaiting buyer advance. Useful for planning your upcoming harvest.',
    cameraTitle: 'GradeCam Quality Pre-Check',
    cameraSub: 'Take a clear photo of 4-5 sample items before the truck arrives. AI estimates the grade against official AGMARK criteria.',
    cameraHelp: 'Place produce on a clean surface in daylight or good lighting.',
    checkingPhoto: 'Checking photo quality…',
    aiGradeSuggested: 'Suggested Grade',
    confidence: 'confidence',
    gradedLotsTitle: 'Graded & Picked Lots',
    noGradedLots: 'Lots appear here once weighed and graded at your farm gate or collection center.',
    passbookTitle: 'Farmer Earnings Ledger',
    noPassbook: 'Payment entries will appear here from your first delivery.',
    grossCropValue: 'Gross Crop Value',
    advanceDeducted: 'Advance already received',
    transportShare: 'Transport share',
    finalBalancePaid: 'Final balance paid',
    realisedAboveMandi: 'realised above mandi benchmark',
    howPaidTitle: 'Transparent Direct Payment Process',
    howPaid1: '1. Advance: 50% advance released to your bank on the day your lot is collected and graded.',
    howPaid2: '2. Final Settlement: Balance paid directly to bank once the truck reaches the destination and buyer checks receipt.',
    howPaid3: '3. Transparent Deductions: Only agreed fair transport share is deducted; zero hidden commission fees.',
    kisanHelpline: 'Kisan Call Centre (Toll-Free)',
    callHelplineBtn: 'Call Kisan Helpline 1800-180-1551',
  },
  hi: {
    welcome: 'नमस्ते',
    memberBadge: 'सत्यापित FPO सदस्य',
    tagline: 'कटाई से पहले ही खरीदार के साथ तय गारंटीशुदा भाव पर अपनी फसल बेचें।',
    declareBtn: 'नई फसल दर्ज करें',
    declareSub: 'बताएं क्या और कितना काटेंगे, ताकि खरीदार सीधे ऑर्डर कर सकें',
    voiceBtn: 'बोलकर पूछें',
    allocatedTitle: 'आपके लिए नया ऑर्डर आया है!',
    allocatedSub: 'खरीदार ने ऑर्डर दिया है और आप सबसे नजदीक तैयार फसल वाले सदस्य किसान हैं।',
    priceAgreed: 'तय भाव',
    mandiBenchmark: 'मंडी भाव',
    extraGain: 'अतिरिक्त लाभ',
    deliverBy: 'पिकअप तारीख',
    buyerLabel: 'खरीदार',
    acceptOrder: 'ऑर्डर स्वीकार करें',
    declineOrder: 'मना करें (अगले किसान को दें)',
    declineNotice: 'मना करने पर यह ऑर्डर अपने आप आपके FPO के अगले नजदीकी किसान को भेज दिया जाएगा।',
    committedProduce: 'पक्की फसल',
    committedWorth: 'कुल तय मूल्य',
    vsMandi: 'मंडी से ज्यादा कमाई',
    vsMandiSub: 'स्थानीय APMC मंडी भाव से अधिक',
    nextPickup: 'अगला पिकअप',
    noPickup: 'अभी कोई पिकअप तय नहीं है',
    received: 'बैंक में कुल राशि',
    receivedSub: 'अग्रिम + अंतिम भुगतान',
    tabCrops: 'मेरी फसल और उठाव',
    tabDemands: 'खरीदार की मांगें',
    tabQuality: 'क्वालिटी जांच (GradeCam)',
    tabPassbook: 'कमाई और पासबुक',
    registeredHarvests: 'मेरी दर्ज फसलें',
    addCrop: 'फसल जोड़ें',
    ofCommitted: 'वादा किया',
    availableToSell: 'बेचने के लिए उपलब्ध',
    harvestWindow: 'कटाई का समय',
    activeCommitments: 'मेरे पक्के ऑर्डर',
    noCommitments: 'अभी कोई ऑर्डर नहीं है। खरीदार मांग वाले टैब में जाकर अपनी फसल का वादा करें।',
    fpoUpdates: 'FPO से आधिकारिक संदेश',
    noMessages: 'पिकअप, तौल और भुगतान की पुष्टि के संदेश यहां दिखेंगे।',
    openDemandsTitle: 'खरीदारों की वर्तमान मांगें',
    openDemandsSub: 'खरीदारों द्वारा अग्रिम जमा किए गए ऑर्डर, जिनमें आप अपनी फसल दे सकते हैं।',
    noDemands: 'फिलहाल कोई खुली मांग उपलब्ध नहीं है।',
    commitBtn: 'फसल का वादा करें',
    registerToCommit: 'इस ऑर्डर में हिस्सा लेने के लिए यह फसल दर्ज करें',
    comingUp: 'आने वाली मांगें (योजना हेतु)',
    comingUpSub: 'खरीदार के अग्रिम भुगतान की प्रतीक्षा में ऑर्डर। अगली कटाई की योजना के लिए उपयोगी।',
    cameraTitle: 'GradeCam फोटो क्वालिटी जांच',
    cameraSub: 'पिकअप वाहन आने से पहले अपनी फसल के 4-5 नमूनों की साफ फोटो लें। AI तुरंत AGMARK ग्रेड बताता है।',
    cameraHelp: 'फसल को साफ जगह पर और अच्छी रोशनी में रखकर फोटो खींचें।',
    checkingPhoto: 'फोटो की जांच हो रही है…',
    aiGradeSuggested: 'सुझाया गया ग्रेड',
    confidence: 'सटीकता',
    gradedLotsTitle: 'जांची और तौली गई फसलें',
    noGradedLots: 'खेत पर या संकलन केंद्र पर तौल होने के बाद फसलें यहां दर्ज होंगी।',
    passbookTitle: 'किसान खाता पासबुक',
    noPassbook: 'पहली डिलीवरी के बाद भुगतान का पूरा विवरण यहां दिखेगा।',
    grossCropValue: 'फसल का कुल मूल्य',
    advanceDeducted: 'मिला अग्रिम भुगतान',
    transportShare: 'परिवहन का हिस्सा',
    finalBalancePaid: 'बैंक में अंतिम भुगतान',
    realisedAboveMandi: 'मंडी भाव से अधिक हासिल हुआ',
    howPaidTitle: 'सीधे और पारदर्शी भुगतान की प्रक्रिया',
    howPaid1: '1. अग्रिम: फसल की तौल और जांच होते ही 50% अग्रिम राशि आपके बैंक खाते में भेजी जाती है।',
    howPaid2: '2. अंतिम भुगतान: खरीदार तक डिलीवरी पहुंचते ही बाकी राशि तुरंत बैंक में जमा हो जाती है।',
    howPaid3: '3. बिना किसी दलाली: केवल तय वाहन भाड़ा कटेगा, कोई गुप्त कमीशन नहीं।',
    kisanHelpline: 'किसान कॉल सेंटर (टोल-फ्री)',
    callHelplineBtn: 'किसान हेल्पलाइन 1800-180-1551 पर कॉल करें',
  },
  te: {
    welcome: 'నమస్కారం',
    memberBadge: 'ధృవీకరించబడిన FPO సభ్యుడు',
    tagline: 'పంట కోతకు ముందే కొనుగోలుదారులతో నిర్ణీత గ్యారెంటీ ధరతో పంటను అమ్ముకోండి.',
    declareBtn: 'కొత్త పంట నమోదు చేయండి',
    declareSub: 'మీరు కోసే పంట వివరాలు నమోదు చేస్తే కొనుగోలుదారులు నేరుగా ఆర్డర్ చేయవచ్చు',
    voiceBtn: 'వాయిస్ సహాయం',
    allocatedTitle: 'మీ కోసం కొత్త ఆర్డర్ వచ్చింది!',
    allocatedSub: 'కొనుగోలుదారు ఆర్డర్ ఇచ్చారు, సరిపడా పంట ఉన్న అత్యంత సమీప రైతు మీరే.',
    priceAgreed: 'ఖరారైన ధర',
    mandiBenchmark: 'మండీ ధర',
    extraGain: 'అదనపు లాభం',
    deliverBy: 'పికప్ తేదీ',
    buyerLabel: 'కొనుగోలుదారు',
    acceptOrder: 'ఆర్డర్ అంగీకరించండి',
    declineOrder: 'వద్దు (మరో రైతుకు ఇవ్వండి)',
    declineNotice: 'మీరు తిరస్కరిస్తే, ఈ ఆర్డర్ వెంటనే మీ FPO లోని మరో సమీప రైతుకు ఆటోమేటిక్‌గా బదిలీ అవుతుంది.',
    committedProduce: 'ఖరారైన పంట',
    committedWorth: 'మొత్తం విలువ',
    vsMandi: 'మండీ కంటే ఎక్కువ లాభం',
    vsMandiSub: 'స్థానిక వ్యవసాయ మార్కెట్ కంటే ఎక్కువ',
    nextPickup: 'తదుపరి పికప్',
    noPickup: 'ఇంకా పికప్ నిర్ణయం కాలేదు',
    received: 'బ్యాంకులో అందిన మొత్తం',
    receivedSub: 'అడ్వాన్స్ + తుది చెల్లింపులు',
    tabCrops: 'నా పంట & పికప్',
    tabDemands: 'కొనుగోలుదారు డిమాండ్లు',
    tabQuality: 'నాణ్యత తనిఖీ (GradeCam)',
    tabPassbook: 'పాస్‌బుక్ & చెల్లింపులు',
    registeredHarvests: 'నా నమోదైన పంటలు',
    addCrop: 'పంట చేర్చండి',
    ofCommitted: 'ఒప్పందం పూర్తయింది',
    availableToSell: 'అమ్మకానికి సిద్ధంగా ఉంది',
    harvestWindow: 'కోత సమయం',
    activeCommitments: 'నా డెలివరీ ఆర్డర్లు',
    noCommitments: 'ఇంకా ఆర్డర్లు లేవు. కొనుగోలుదారు డిమాండ్లలో మీ పంటను నమోదు చేయండి.',
    fpoUpdates: 'FPO అధికారిక సందేశాలు',
    noMessages: 'పికప్, తూకం మరియు చెల్లింపు వివరాల సందేశాలు ఇక్కడ కనిపిస్తాయి.',
    openDemandsTitle: 'కొనుగోలుదారుల డిమాండ్లు',
    openDemandsSub: 'అడ్వాన్స్ చెల్లించి సిద్ధంగా ఉన్న కొనుగోలుదారుల ఆర్డర్లు.',
    noDemands: 'ప్రస్తుతం డిమాండ్లు అందుబాటులో లేవు.',
    commitBtn: 'పంటను ఒప్పందం చేయండి',
    registerToCommit: 'ఈ ఆర్డర్ కోసం పంటను నమోదు చేయండి',
    comingUp: 'రాబోయే డిమాండ్లు (ప్రణాళిక కోసం)',
    comingUpSub: 'అడ్వాన్స్ కోసం ఎదురుచూస్తున్న ఆర్డర్లు. తదుపరి కోతకు ప్రణాళిక వేసుకోండి.',
    cameraTitle: 'GradeCam ఫోటో క్వాలిటీ పరీక్ష',
    cameraSub: 'పికప్ వాహనం రాకముందే 4-5 నమూనాల ఫోటో తీయండి. AI వెంటనే AGMARK గ్రేడ్ సూచిస్తుంది.',
    cameraHelp: 'మంచి వెలుతురులో పంటను ఉంచి స్పష్టమైన ఫోటో తీయండి.',
    checkingPhoto: 'ఫోటో నాణ్యత తనిఖీ జరుగుతోంది…',
    aiGradeSuggested: 'సూచించిన గ్రేడ్',
    confidence: 'ఖచ్చితత్వం',
    gradedLotsTitle: 'తూకం వేసి తనిఖీ చేసిన పంటలు',
    noGradedLots: 'మీ పొలం వద్ద తూకం వేసిన తర్వాత ఇక్కడ కనిపిస్తాయి.',
    passbookTitle: 'రైతు పాస్‌బుక్ & లెడ్జర్',
    noPassbook: 'మొదటి డెలివరీ తర్వాత ఇక్కడ పూర్తి చెల్లింపుల వివరాలు ఉంటాయి.',
    grossCropValue: 'పంట మొత్తం విలువ',
    advanceDeducted: 'అందిన అడ్వాన్స్',
    transportShare: 'రవాణా ఖర్చు వాటా',
    finalBalancePaid: 'బ్యాంకులో జమైన మిగిలిన మొత్తం',
    realisedAboveMandi: 'మండీ ధర కంటే అదనంగా లభించింది',
    howPaidTitle: 'నేరుగా పారదర్శక చెల్లింపు విధానం',
    howPaid1: '1. అడ్వాన్స్: పంట తూకం వేయగానే 50% అడ్వాన్స్ నేరుగా మీ బ్యాంక్ ఖాతాలో జమవుతుంది.',
    howPaid2: '2. తుది చెల్లింపు: వాహనం చేరగానే మిగిలిన మొత్తం వెంటనే బ్యాంకుకు పంపబడుతుంది.',
    howPaid3: '3. దాపరికాలు లేని రవాణా: కేవలం నిర్ణయించిన రవాణా ఖర్చు మాత్రమే తగ్గుతుంది, దళారుల కమీషన్లు ఉండవు.',
    kisanHelpline: 'కిసాన్ కాల్ సెంటర్ (టోల్-ఫ్రీ)',
    callHelplineBtn: 'కిసాన్ హెల్ప్‌లైన్ 1800-180-1551 కి కాల్ చేయండి',
  },
}

const inr = (value: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`
const kgLabel = (value: number) => `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)} kg`
const dayLabel = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const cropLabel = (crop: string) => crop.charAt(0).toUpperCase() + crop.slice(1).toLowerCase()

function broadcast(type: string) {
  window.dispatchEvent(new CustomEvent('agrilink:order-created'))
  try {
    const bc = new BroadcastChannel('agrilink_sync')
    bc.postMessage({ type })
    bc.close()
  } catch {}
}

export function FarmerDashboardView({
  currentUserName,
  lang,
  activeNav,
  onNavigate,
  onDeclareHarvest,
  onOpenVoice,
}: FarmerDashboardViewProps) {
  const t = LABELS[lang] ?? LABELS.en
  const stages = STAGE_LABELS[lang] ?? STAGE_LABELS.en

  const [me, setMe] = useState<FarmerOverview | null>(null)
  const [meError, setMeError] = useState<string | null>(null)
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [commitQty, setCommitQty] = useState<Record<string, number>>({})
  const [grading, setGrading] = useState(false)
  const [gradeResult, setGradeResult] = useState<GradeAttempt | null>(null)

  const load = useCallback(async () => {
    const [meRes, ordersRes] = await Promise.all([
      fetch('/api/farmer/me', { headers: authHeaders() }).catch(() => null),
      fetch('/api/orders', { headers: authHeaders() }).catch(() => null),
    ])
    if (meRes) {
      const json = await meRes.json().catch(() => ({}))
      if (meRes.ok) {
        setMe(json)
        setMeError(null)
      } else {
        setMeError(json.error || 'Your farm record could not be loaded.')
      }
    }
    if (ordersRes?.ok) {
      const json = await ordersRes.json().catch(() => ({}))
      if (Array.isArray(json.orders)) setOrders(json.orders)
    }
  }, [])

  useEffect(() => {
    load()
    // 12s polling avoids saturating the database while staying updated
    const timer = setInterval(load, 12000)
    window.addEventListener('agrilink:order-created', load)
    window.addEventListener('agrilink:order-funded', load)
    window.addEventListener('agrilink:harvest-updated', load)
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('agrilink_sync')
      bc.onmessage = () => load()
    } catch {}
    return () => {
      clearInterval(timer)
      window.removeEventListener('agrilink:order-created', load)
      window.removeEventListener('agrilink:order-funded', load)
      window.removeEventListener('agrilink:harvest-updated', load)
      try {
        bc?.close()
      } catch {}
    }
  }, [load])

  function flash(tone: 'ok' | 'error', text: string) {
    setToast({ tone, text })
    setTimeout(() => setToast((current) => (current?.text === text ? null : current)), 7000)
  }

  async function act(orderId: string, body: Record<string, unknown>) {
    setBusyId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/action`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Request failed. Please try again.')
      flash('ok', json.message || 'Done.')
      broadcast('FARMER_ACTION')
      await load()
    } catch (e) {
      flash('error', e instanceof Error ? e.message : 'Request failed. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function gradePhoto(dataUrl: string) {
    const next = me?.summary.nextDelivery
    if (!next) {
      flash('error', 'Photos are checked against a committed lot. Commit your harvest to an order first.')
      return
    }
    setGrading(true)
    try {
      const res = await fetch(`/api/orders/${next.orderId}/grade`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ photoDataUrl: dataUrl }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'The photo could not be checked.')
      setGradeResult(json.attempt)
      flash('ok', 'Photo quality check complete.')
    } catch (e) {
      setGradeResult(null)
      flash('error', e instanceof Error ? e.message : 'The photo could not be checked.')
    } finally {
      setGrading(false)
    }
  }

  const farmerName = me?.farmer.name ?? currentUserName ?? 'Kisan Member'
  const summary = me?.summary
  const allocations = orders.filter((o) => o.is_allocated_to_me)
  const available = new Map((me?.registry ?? []).map((r) => [r.crop, Math.max(0, r.expectedQtyKg - r.committedKg)]))
  const openDemands = orders.filter((o) => o.open_for_commitment)
  const upcoming = orders.filter(
    (o) => o.order_tier === 'BULK' && o.status === 'POSTED' && o.review_status !== 'pending' && o.review_status !== 'rejected'
  )
  const totalMoneyReceived = (summary?.advancesReceived ?? 0) + (summary?.settledNet ?? 0)

  const tabs = [
    { key: 'Overview' as const, label: t.tabCrops, icon: Wheat },
    { key: 'Orders' as const, label: t.tabDemands, icon: ShoppingBag, badge: openDemands.length > 0 ? openDemands.length : undefined },
    { key: 'Collection & grade' as const, label: t.tabQuality, icon: BadgeCheck },
    { key: 'Settlements' as const, label: t.tabPassbook, icon: Receipt },
  ]

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex max-w-md items-start gap-3 rounded-2xl px-5 py-3.5 shadow-2xl transition-all ${
            toast.tone === 'ok' ? 'bg-emerald-600 text-white' : 'bg-destructive text-white'
          }`}
        >
          {toast.tone === 'ok' ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <X className="mt-0.5 size-5 shrink-0" />}
          <span className="text-sm font-semibold">{toast.text}</span>
        </div>
      )}

      {/* ── 1. Farmer Profile & Action Header ─────────────────────────────── */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="size-3.5" />
                {t.memberBadge}
              </span>
              {me?.fpo && (
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                  {me.fpo.name} · {me.farmer.village}
                </span>
              )}
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t.welcome}, {farmerName}
            </h1>
            <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">{t.tagline}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onDeclareHarvest}
              className="inline-flex min-h-[48px] items-center gap-2.5 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-95"
            >
              <Sprout className="size-5" />
              {t.declareBtn}
            </button>
            <button
              onClick={onOpenVoice}
              className="inline-flex min-h-[48px] items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition-all hover:bg-primary/20 active:scale-95"
            >
              <Mic className="size-5" />
              {t.voiceBtn}
            </button>
          </div>
        </div>

        {meError && <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm font-semibold text-destructive">{meError}</p>}
        {!me && !meError && (
          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" /> Loading farm details…
          </p>
        )}

        {/* ── 2. Four Key Accessible Metrics ───────────────────────────────── */}
        {summary && (
          <div className="mt-7 grid grid-cols-2 gap-3.5 border-t border-border pt-6 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/40">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Wheat className="size-4 text-emerald-600" />
                {t.committedProduce}
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{kgLabel(summary.committedKg)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                worth <strong className="font-semibold text-foreground">{inr(summary.contractValue)}</strong> {t.committedWorth}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/40">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <CircleDollarSign className="size-4 text-primary" />
                {t.vsMandi}
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-600 sm:text-3xl">
                {summary.mandiComparison
                  ? `${summary.mandiComparison.gain >= 0 ? '+' : '−'}${inr(Math.abs(summary.mandiComparison.gain))}`
                  : '—'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {summary.mandiComparison ? `${inr(summary.mandiComparison.contractValue)} agreed vs ${inr(summary.mandiComparison.mandiValue)} mandi rate` : t.vsMandiSub}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/40">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Truck className="size-4 text-sky-600" />
                {t.nextPickup}
              </p>
              {summary.nextDelivery ? (
                <>
                  <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{dayLabel(summary.nextDelivery.deliveryDate)}</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {kgLabel(summary.nextDelivery.qtyCommittedKg)} {cropLabel(summary.nextDelivery.crop)} · {summary.nextDelivery.buyerName}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm font-medium text-muted-foreground">{t.noPickup}</p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/40">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Receipt className="size-4 text-amber-600" />
                {t.moneyReceived}
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{inr(totalMoneyReceived)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{inr(summary.advancesReceived)} advances · {inr(summary.settledNet)} settled</p>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. High-Priority Action Card: Allocated Orders ─────────────────── */}
      {allocations.map((o) => {
        const extraPerKg = o.mandi_price_per_kg != null ? o.price_per_kg - o.mandi_price_per_kg : null
        return (
          <div
            key={o.id}
            className="relative overflow-hidden rounded-3xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-500/10 via-card to-background p-6 shadow-xl sm:p-7"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-3 animate-ping rounded-full bg-emerald-500" />
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                    {t.allocatedTitle}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background p-1.5 shadow-xs">
                    {CROP_IMAGES[o.crop] ? (
                      <img src={CROP_IMAGES[o.crop]} alt={o.crop} className="size-full object-contain" />
                    ) : (
                      <Sprout className="size-7 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
                      {kgLabel(o.qty_target_kg)} {cropLabel(o.crop)}
                    </h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {t.buyerLabel}: <strong className="text-foreground">{o.buyer_name}</strong>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{t.allocatedSub}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-secondary/70 p-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-muted-foreground">{t.priceAgreed}: </span>
                    <strong className="font-mono text-base font-bold text-foreground">{inr(o.price_per_kg)}/kg</strong>
                  </div>
                  {o.mandi_price_per_kg != null && (
                    <div className="text-muted-foreground">
                      <span>{t.mandiBenchmark}: </span>
                      <span className="font-mono">{inr(o.mandi_price_per_kg)}/kg</span>
                    </div>
                  )}
                  {extraPerKg != null && extraPerKg > 0 && (
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      +{inr(extraPerKg)}/kg {t.extraGain}
                    </span>
                  )}
                  <div>
                    <span className="text-muted-foreground">{t.deliverBy}: </span>
                    <strong className="font-semibold text-foreground">{dayLabel(o.delivery_date)}</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => act(o.id, { action: 'farmer_accept' })}
                    disabled={busyId === o.id}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
                  >
                    {busyId === o.id ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                    {t.acceptOrder}
                  </button>
                  <button
                    onClick={() => act(o.id, { action: 'farmer_reject' })}
                    disabled={busyId === o.id}
                    className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-95 disabled:opacity-60"
                    title={t.declineNotice}
                  >
                    <X className="size-5" />
                    {t.declineOrder}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground lg:text-right">{t.declineNotice}</p>
              </div>
            </div>
          </div>
        )
      })}

      {/* ── 4. Main Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-5 py-3.5 text-xs font-bold transition-all sm:text-sm ${
              activeNav === key
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Icon className="size-4.5" />
            {label}
            {badge != null && (
              <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: My Crops & Pickups ──────────────────────────────────────── */}
      {activeNav === 'Overview' && me && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {/* Registered crops */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-foreground">{t.registeredHarvests}</h3>
                  <p className="text-xs text-muted-foreground">{t.declareSub}</p>
                </div>
                <button
                  onClick={onDeclareHarvest}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80"
                >
                  <Plus className="size-3.5" /> {t.addCrop}
                </button>
              </div>

              {me.registry.length === 0 ? (
                <div className="py-8 text-center">
                  <Sprout className="mx-auto size-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-semibold text-foreground">No harvest registered yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Declare what you expect to pick so buyers’ orders can reach you.</p>
                  <button
                    onClick={onDeclareHarvest}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                  >
                    <Plus className="size-3.5" /> {t.declareBtn}
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3.5">
                  {me.registry.map((r) => {
                    const uncommitted = Math.max(0, r.expectedQtyKg - r.committedKg)
                    const pct = r.expectedQtyKg > 0 ? Math.min(100, Math.round((r.committedKg / r.expectedQtyKg) * 100)) : 0
                    return (
                      <div key={r.id} className="rounded-2xl border border-border bg-background/50 p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/60 p-1.5">
                            {CROP_IMAGES[r.crop] ? (
                              <img src={CROP_IMAGES[r.crop]} alt={r.crop} className="size-full object-contain" />
                            ) : (
                              <Sprout className="size-7 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <h4 className="text-base font-bold text-foreground">{cropLabel(r.crop)}</h4>
                              <p className="text-xs font-medium tabular-nums text-muted-foreground">
                                <strong className="text-foreground">{kgLabel(r.committedKg)}</strong> {t.ofCommitted} ({kgLabel(r.expectedQtyKg)})
                              </p>
                            </div>
                            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                              <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {t.harvestWindow}: {dayLabel(r.harvestWindowStart)} – {dayLabel(r.harvestWindowEnd)}
                              </span>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                {kgLabel(uncommitted)} {t.availableToSell}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Active commitments */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="border-b border-border pb-4 font-serif text-xl font-bold text-foreground">{t.activeCommitments}</h3>
              {me.commitments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t.noCommitments}</p>
              ) : (
                <div className="mt-3 divide-y divide-border">
                  {me.commitments.map((c) => (
                    <div key={`${c.orderId}-${c.isStandby}`} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground">
                          {kgLabel(c.qtyCommittedKg)} {cropLabel(c.crop)} · {c.buyerName}
                          {c.isStandby && (
                            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Standby 15%
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.code} · {t.deliverBy} <strong className="text-foreground">{dayLabel(c.deliveryDate)}</strong> ·{' '}
                          <span className="font-medium text-primary">{stages[c.orderStatus] || c.orderStatus}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold text-foreground">{inr(c.pricePerKg)}/kg</p>
                        <p className="text-[11px] text-muted-foreground">Total: {inr(c.qtyCommittedKg * c.pricePerKg)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FPO updates & notifications */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="flex items-center gap-2 border-b border-border pb-4 font-serif text-xl font-bold text-foreground">
                <MessageSquare className="size-5 text-primary" /> {t.fpoUpdates}
              </h3>
              {me.messages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t.noMessages}</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {me.messages.map((m) => (
                    <li key={m.id} className="rounded-2xl border border-border/60 bg-secondary/50 p-3.5 text-xs">
                      <p className="font-medium text-foreground">{m.body}</p>
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        via {m.channel} · {new Date(m.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
              <h4 className="font-serif text-base font-bold text-foreground">{t.kisanHelpline}</h4>
              <p className="mt-1 text-xs text-muted-foreground">Government of India toll-free advisory and support service for farmers.</p>
              <a
                href="tel:18001801551"
                className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
              >
                <Phone className="size-4" />
                {t.callHelplineBtn}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Buyer Demands ───────────────────────────────────────────── */}
      {activeNav === 'Orders' && (
        <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="border-b border-border pb-4">
            <h3 className="font-serif text-2xl font-bold text-foreground">{t.openDemandsTitle}</h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t.openDemandsSub}</p>
          </div>

          {openDemands.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.noDemands}</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {openDemands.map((d) => {
                const mine = available.get(d.crop) ?? 0
                const needed = Math.max(0, d.qty_target_kg - d.qty_committed_kg)
                const currentQty = commitQty[d.id] ?? (mine > 0 ? Math.min(mine, needed > 0 ? needed : mine) : 0)

                return (
                  <div key={d.id} className="flex flex-col justify-between rounded-2xl border border-border bg-background/50 p-5 shadow-xs transition-colors hover:border-primary/50">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/60 p-1.5">
                          {CROP_IMAGES[d.crop] ? (
                            <img src={CROP_IMAGES[d.crop]} alt={d.crop} className="size-full object-contain" />
                          ) : (
                            <Sprout className="size-7 text-primary" />
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">{d.code}</span>
                          {d.status === 'FUNDED' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="size-3" /> Advance in Escrow
                            </span>
                          ) : d.order_tier === 'SMALL' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-400">
                              Pooled Small Order
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              Collecting Commitments
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="mt-3 font-serif text-xl font-bold text-foreground">{cropLabel(d.crop)}</h4>
                      <p className="text-xs text-muted-foreground">{d.buyer_name}</p>

                      <div className="mt-3.5 space-y-2 rounded-xl bg-secondary/60 p-3.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.priceAgreed}</span>
                          <span className="font-bold text-foreground">
                            {inr(d.price_per_kg)}/kg
                            {d.mandi_price_per_kg != null && (
                              <span className="font-normal text-muted-foreground"> · Mandi {inr(d.mandi_price_per_kg)}</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.deliverBy}</span>
                          <span className="font-semibold text-foreground">{dayLabel(d.delivery_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Needed by buyer</span>
                          <span className="font-semibold text-foreground">{kgLabel(needed)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border/40 pt-1.5">
                          <span className="text-muted-foreground">Your available stock</span>
                          <span className={`font-bold ${mine > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                            {kgLabel(mine)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {mine > 0 ? (
                      <div className="mt-4 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCommitQty((p) => ({
                                ...p,
                                [d.id]: Math.max(10, (p[d.id] ?? currentQty) - 50),
                              }))
                            }
                            className="flex size-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground hover:bg-secondary/80"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-4" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={mine}
                            value={currentQty}
                            onChange={(e) =>
                              setCommitQty((p) => ({
                                ...p,
                                [d.id]: Math.min(mine, Math.max(0, Number(e.target.value) || 0)),
                              }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-center font-mono text-sm font-bold text-foreground outline-none focus:border-primary"
                            aria-label="Kilograms to commit"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCommitQty((p) => ({
                                ...p,
                                [d.id]: Math.min(mine, (p[d.id] ?? currentQty) + 50),
                              }))
                            }
                            className="flex size-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground hover:bg-secondary/80"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => act(d.id, { action: 'farmer_commit', committedKg: currentQty })}
                          disabled={busyId === d.id || currentQty <= 0}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 disabled:opacity-60"
                        >
                          {busyId === d.id ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                          {t.commitBtn} ({kgLabel(currentQty)})
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <button
                          onClick={onDeclareHarvest}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-secondary/40 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary"
                        >
                          <Plus className="size-3.5" />
                          {t.registerToCommit}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Clock className="size-4 text-primary" /> {t.comingUp}
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.comingUpSub}</p>
              <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-background/50">
                {upcoming.map((o) => (
                  <div key={o.id} className="flex flex-col gap-1 p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold text-foreground">
                      {kgLabel(o.qty_target_kg)} {cropLabel(o.crop)} · {o.buyer_name}
                    </span>
                    <span className="text-muted-foreground">
                      {inr(o.price_per_kg)}/kg · by {dayLabel(o.delivery_date)} ·{' '}
                      <span className="font-medium text-foreground">{stages[o.status] || o.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: GradeCam Quality Pre-Check ──────────────────────────────── */}
      {activeNav === 'Collection & grade' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h3 className="flex items-center gap-2 font-serif text-2xl font-bold text-foreground">
              <Camera className="size-6 text-primary" />
              {t.cameraTitle}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t.cameraSub}</p>

            <div className="mt-3 rounded-2xl border border-border/80 bg-secondary/50 p-3.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="size-4 text-primary" />
                {t.cameraHelp}
              </p>
            </div>

            <div className="mt-5">
              <GradeCamCamera onCapture={gradePhoto} disabled={grading || !summary?.nextDelivery} />
            </div>

            {!summary?.nextDelivery && (
              <p className="mt-3 rounded-xl border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
                Commit to an order first — quality check photos are attached to that upcoming pickup lot.
              </p>
            )}

            {grading && (
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary">
                <Loader2 className="size-4 animate-spin" /> {t.checkingPhoto}
              </p>
            )}

            {gradeResult && (
              <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-xs">
                {gradeResult.aiStatus === 'UNAVAILABLE' ? (
                  <p className="text-foreground">AI pre-check unavailable ({gradeResult.aiReasoning}). Coordinator will grade manually at collection.</p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-foreground">
                      {t.aiGradeSuggested}:{' '}
                      <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                        Grade {gradeResult.aiGrade || 'A'}
                      </span>
                      {gradeResult.aiConfidence != null && (
                        <span className="ml-2 font-normal text-muted-foreground">
                          · {Math.round(gradeResult.aiConfidence * 100)}% {t.confidence}
                        </span>
                      )}
                    </p>
                    {gradeResult.aiReasoning && <p className="text-muted-foreground">{gradeResult.aiReasoning}</p>}
                    {gradeResult.aiDefects.length > 0 && (
                      <p className="text-amber-700 dark:text-amber-400">Notes: {gradeResult.aiDefects.join('; ')}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h3 className="font-serif text-xl font-bold text-foreground">{t.gradedLotsTitle}</h3>
            {(me?.sales ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t.noGradedLots}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {me!.sales.map(({ lot }) => (
                  <div key={lot.id} className="rounded-2xl border border-border bg-background/50 p-3.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-foreground">
                        {lot.code} · {cropLabel(lot.crop)}
                      </span>
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-800 dark:text-emerald-300">
                        {lot.decision === 'REJECTED' ? 'Not accepted' : `Grade ${lot.finalGrade}`}
                      </span>
                    </div>
                    <p className="mt-1.5 text-muted-foreground">
                      Weighed {kgLabel(lot.qtyWeighedKg)} · accepted {kgLabel(lot.qtyAcceptedKg)} ·{' '}
                      {lot.decision === 'OVERRIDDEN'
                        ? `Coordinator adjusted grade: ${lot.overrideReason}`
                        : lot.decision === 'MANUAL'
                        ? 'Graded by coordinator'
                        : lot.decision === 'REJECTED'
                        ? lot.overrideReason
                        : 'AI grade confirmed'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: Passbook & Settlements ─────────────────────────────────── */}
      {activeNav === 'Settlements' && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h3 className="border-b border-border pb-4 font-serif text-2xl font-bold text-foreground">{t.passbookTitle}</h3>
            {(me?.sales ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t.noPassbook}</p>
            ) : (
              <div className="mt-4 space-y-4">
                {me!.sales.map(({ lot, settlement, advance, proof }) => (
                  <div key={lot.id} className="rounded-2xl border border-border bg-background/50 p-4 text-sm">
                    <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {lot.code} · {lot.crop} · {lot.buyerName}
                      </span>
                      <span className="font-medium text-primary">{stages[lot.orderStatus] || lot.orderStatus}</span>
                    </div>

                    {settlement ? (
                      <div className="mt-3 space-y-1.5 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {t.grossCropValue} ({kgLabel(settlement.acceptedKg)} × {inr(settlement.pricePerKg)})
                          </span>
                          <span className="font-bold text-foreground">{inr(settlement.grossAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t.advanceDeducted}</span>
                          <span className="text-foreground">−{inr(settlement.advanceDeducted)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t.transportShare}</span>
                          <span className="text-foreground">−{inr(settlement.transportShare)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-1.5 font-bold">
                          <span className="text-foreground">{t.finalBalancePaid}</span>
                          <span className="text-emerald-600">{inr(settlement.netPayable)}</span>
                        </div>
                        {proof?.farmerGain != null && (
                          <p className="mt-1 rounded-xl bg-emerald-500/10 p-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            Realised {inr(proof.farmerRealised)}/kg — {inr(proof.farmerGain)}/kg {t.realisedAboveMandi} (Mandi: {inr(proof.mandi!)}/kg)
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">
                          Advance on pickup day ({kgLabel(lot.qtyAcceptedKg)} accepted)
                        </span>
                        <span className="font-bold text-foreground">{inr(advance ?? 0)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
              <h4 className="font-serif text-lg font-bold text-foreground">{t.howPaidTitle}</h4>
              <ul className="mt-3 space-y-2.5 text-xs text-muted-foreground">
                <li className="leading-relaxed">{t.howPaid1}</li>
                <li className="leading-relaxed">{t.howPaid2}</li>
                <li className="leading-relaxed">{t.howPaid3}</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h4 className="font-serif text-base font-bold text-foreground">{t.kisanHelpline}</h4>
              <p className="mt-1 text-xs text-muted-foreground">Government of India toll-free support for agriculture queries and advisory.</p>
              <div className="mt-3 rounded-2xl border border-border bg-secondary/60 p-3 text-center">
                <span className="font-mono text-lg font-bold text-foreground">1800-180-1551</span>
              </div>
              <a
                href="tel:18001801551"
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                <Phone className="size-4" />
                {t.callHelplineBtn}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
