export type Language = 'en' | 'hi' | 'te' | 'gu'

export interface TranslationDictionary {
  appName: string
  tagline: string
  goodMorning: string
  roleCoordinator: string
  roleBuyer: string
  roleFarmer: string
  viewAs: string
  signOut: string
  refresh: string
  notifications: string
  newOrder: string
  resetSeed: string
  teamAccess: string
  language: string

  // Nav
  navOverview: string
  navOrders: string
  navFarmerNetwork: string
  navCollectionGrade: string
  navRoutes: string
  navSettlements: string

  // Screen titles
  titleOverview: string
  titleOrders: string
  titleFarmerNetwork: string
  titleCollectionGrade: string
  titleRoutes: string
  titleSettlements: string

  // Metrics
  statActiveOrderValue: string
  statCommittedVolume: string
  statFarmerRealised: string
  statPilotVolume: string
  statBuffer: string
  statIntermediaryMargin: string

  // Actions
  actionNotifyFarmers: string
  actionFarmersNotified: string
  actionPostOrder: string
  actionExportManifest: string
  actionExportLedger: string
  actionExportRoster: string
  actionExportOrder: string
  actionPrintInvoice: string
  actionPrintWaybill: string
  actionDispatch: string
  actionConfirmDelivery: string
  actionAcceptLot: string

  // Farmer SMS previews
  smsPreviewTitle: string
  smsSampleOrder: string
  smsSampleLot: string
  smsSamplePayment: string
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    appName: 'AgriLink',
    tagline: 'FARM TO COMMONS',
    goodMorning: 'Good morning',
    roleCoordinator: 'Coordinator',
    roleBuyer: 'Buyer',
    roleFarmer: 'Farmer',
    viewAs: 'View as',
    signOut: 'Sign out',
    refresh: 'Refresh data',
    notifications: 'Activity & Notifications',
    newOrder: 'New order',
    resetSeed: 'Reset seed',
    teamAccess: 'Team & RBAC',
    language: 'Language',

    navOverview: 'Overview',
    navOrders: 'Orders',
    navFarmerNetwork: 'Farmer network',
    navCollectionGrade: 'Collection & grade',
    navRoutes: 'Routes',
    navSettlements: 'Settlements',

    titleOverview: 'Demand finds the harvest.',
    titleOrders: 'Orders before harvest.',
    titleFarmerNetwork: 'The crop registry, activated.',
    titleCollectionGrade: 'Trust at the collection point.',
    titleRoutes: 'Every lot has a route.',
    titleSettlements: 'Transparent money movement.',

    statActiveOrderValue: 'Active order value',
    statCommittedVolume: 'Committed volume',
    statFarmerRealised: 'Farmer realised',
    statPilotVolume: 'Pilot volume',
    statBuffer: '15% standby buffer',
    statIntermediaryMargin: 'Direct marketplace price comparison',

    actionNotifyFarmers: 'Notify matched farmers',
    actionFarmersNotified: 'Farmers notified',
    actionPostOrder: 'Post order to registry',
    actionExportManifest: 'Export Manifest (CSV)',
    actionExportLedger: 'Export Ledger (CSV)',
    actionExportRoster: 'Export Roster (CSV)',
    actionExportOrder: 'Export Order (CSV)',
    actionPrintInvoice: 'Print APMC Invoice (PDF)',
    actionPrintWaybill: 'Print Bill of Lading (PDF)',
    actionDispatch: 'Dispatch vehicle (₹1,200)',
    actionConfirmDelivery: 'Confirm buyer delivery & settle',
    actionAcceptLot: 'Accept lot & record advance',

    smsPreviewTitle: 'Farmer Vernacular SMS Preview',
    smsSampleOrder: 'AgriLink Alert: Buyer demand committed for {crop}. Price: ₹{price}/kg. Reply 1 to accept {qty}kg.',
    smsSampleLot: 'AgriLink Update: Lot #LOT-1001 Grade A verified. Weighed {qty}kg. Advance payment processing.',
    smsSamplePayment: 'AgriLink: ₹{amount} settlement recorded for Lot #LOT-1001. Check your bank/FPO statement for the transfer.',
  },

  hi: {
    appName: 'एग्रीलिंक',
    tagline: 'खेत से साझा बाज़ार',
    goodMorning: 'शुभ प्रभात',
    roleCoordinator: 'समन्वयक (कोऑर्डिनेटर)',
    roleBuyer: 'संस्थागत खरीदार',
    roleFarmer: 'किसान',
    viewAs: 'भूमिका चुनें',
    signOut: 'लॉग आउट',
    refresh: 'डेटा रीफ्रेश करें',
    notifications: 'गतिविधि और अलर्ट',
    newOrder: 'नया ऑर्डर',
    resetSeed: 'डेटा रीसेट',
    teamAccess: 'टीम और अनुमतियाँ',
    language: 'भाषा',

    navOverview: 'अवलोकन (Overview)',
    navOrders: 'ऑर्डर्स (Orders)',
    navFarmerNetwork: 'किसान नेटवर्क',
    navCollectionGrade: 'संग्रह और ग्रेडिंग',
    navRoutes: 'वाहन मार्ग (Routes)',
    navSettlements: 'भुगतान निपटान',

    titleOverview: 'मांग फसल कटाई से पहले पहुंचे।',
    titleOrders: 'कटाई पूर्व सुरक्षित अनुबंध।',
    titleFarmerNetwork: 'सक्रिय किसान फसल रजिस्ट्री।',
    titleCollectionGrade: 'संग्रह केंद्र पर गुणवत्ता और विश्वास।',
    titleRoutes: 'हर लाट का अनुकूलित वाहन मार्ग।',
    titleSettlements: 'पारदर्शी एवं त्वरित बैंक भुगतान।',

    statActiveOrderValue: 'सक्रिय ऑर्डर मूल्य',
    statCommittedVolume: 'प्रतिबद्ध फसल मात्रा',
    statFarmerRealised: 'किसान प्राप्त मूल्य',
    statPilotVolume: 'पायलट वॉल्यूम',
    statBuffer: '15% अतिरिक्त सुरक्षा बफर',
    statIntermediaryMargin: 'सीधी कीमत तुलना',

    actionNotifyFarmers: 'किसानों को सूचित करें',
    actionFarmersNotified: 'सूचनाएं प्रेषित',
    actionPostOrder: 'रजिस्ट्री में ऑर्डर दर्ज करें',
    actionExportManifest: 'मार्ग सूची डाउनलोड (CSV)',
    actionExportLedger: 'बहीखाता डाउनलोड (CSV)',
    actionExportRoster: 'किसान सूची डाउनलोड (CSV)',
    actionExportOrder: 'ऑर्डर अनुबंध डाउनलोड (CSV)',
    actionPrintInvoice: 'APMC चालान प्रिंट (PDF)',
    actionPrintWaybill: 'वाहन बिल्टी प्रिंट (PDF)',
    actionDispatch: 'वाहन रवाना करें (₹1,200)',
    actionConfirmDelivery: 'डिलीवरी पुष्टि एवं अंतिम भुगतान',
    actionAcceptLot: 'लाट स्वीकारें एवं 30% अग्रिम भेजें',

    smsPreviewTitle: 'किसान एसएमएस / व्हाट्सएप पूर्वावलोकन (हिंदी)',
    smsSampleOrder: 'एग्रीलिंक सूचना: {crop} के लिए मांग अनुबंध सुरक्षित। मूल्य: ₹{price}/किग्रा। {qty}किग्रा हेतु 1 भेजें।',
    smsSampleLot: 'एग्रीलिंक अपडेट: लाट #LOT-1001 ग्रेड A प्रमाणित। वजन {qty}किग्रा। 30% अग्रिम भुगतान जारी।',
    smsSamplePayment: 'एग्रीलिंक: लॉट #LOT-1001 के लिए ₹{amount} का भुगतान रिकॉर्ड हुआ। बैंक/FPO स्टेटमेंट देखें।',
  },

  te: {
    appName: 'అగ్రిలింక్',
    tagline: 'రైతు పొలం నుండి నేరుగా మార్కెట్‌కు',
    goodMorning: 'శుభోదయం',
    roleCoordinator: 'సమన్వయకర్త (కోఆర్డినేటర్)',
    roleBuyer: 'సంస్థాగత కొనుగోలుదారు',
    roleFarmer: 'రైతు మిత్రుడు',
    viewAs: 'పాత్రను ఎంచుకోండి',
    signOut: 'లాగ్ అవుట్',
    refresh: 'డేటా రిఫ్రెష్ చేయండి',
    notifications: 'కార్యకలాపాలు & అలర్ట్‌లు',
    newOrder: 'కొత్త ఆర్డర్',
    resetSeed: 'డేటా రీసెట్',
    teamAccess: 'బృందం & అనుమతులు',
    language: 'భాష',

    navOverview: 'సమీక్ష (Overview)',
    navOrders: 'ఆర్డర్లు (Orders)',
    navFarmerNetwork: 'రైతు నెట్‌వర్క్',
    navCollectionGrade: 'సేకరణ & గ్రేడింగ్',
    navRoutes: 'వాహన మార్గాలు (Routes)',
    navSettlements: 'చెల్లింపుల పరిష్కారం',

    titleOverview: 'కోతకు ముందే కొనుగోలుదారు ఒప్పందం.',
    titleOrders: 'పంట కోతకు ముందు పక్కా ఆర్డర్ ఒప్పందం.',
    titleFarmerNetwork: 'నమోదిత రైతుల క్రియాశీల నెట్‌వర్క్.',
    titleCollectionGrade: 'సేకరణ కేంద్రం వద్ద ఖచ్చితమైన నాణ్యతా ప్రమాణాలు.',
    titleRoutes: 'ప్రతి లాట్ కోసం అత్యుత్తమ రవాణా మార్గం.',
    titleSettlements: 'పారదర్శక మరియు తక్షణ బ్యాంక్ చెల్లింపులు.',

    statActiveOrderValue: 'క్రియాశీల ఆర్డర్ విలువ',
    statCommittedVolume: 'రైతులు అంగీకరించిన పంట పరిమాణం',
    statFarmerRealised: 'రైతుకు లభించిన నికర ధర',
    statPilotVolume: 'పైలట్ పరిమాణం',
    statBuffer: '15% అదనపు రక్షణ బఫర్',
    statIntermediaryMargin: 'నేరుగా ధర పోలిక',

    actionNotifyFarmers: 'రైతులకు సమాచారం పంపండి',
    actionFarmersNotified: 'సమాచారం పంపబడింది',
    actionPostOrder: 'రిజిస్ట్రీలో ఆర్డర్ నమోదు చేయండి',
    actionExportManifest: 'రవాణా జాబితా డౌన్‌లోడ్ (CSV)',
    actionExportLedger: 'లెడ్జర్ డౌన్‌లోడ్ (CSV)',
    actionExportRoster: 'రైతుల జాబితా డౌన్‌లోడ్ (CSV)',
    actionExportOrder: 'ఆర్డర్ ఒప్పందం డౌన్‌లోడ్ (CSV)',
    actionPrintInvoice: 'APMC ఇన్‌వాయిస్ ప్రింట్ (PDF)',
    actionPrintWaybill: 'రవాణా బిల్లు ప్రింట్ (PDF)',
    actionDispatch: 'వాహనం బయలుదేరనీయండి (₹1,200)',
    actionConfirmDelivery: 'డెలివరీ నిర్ధారణ & చెల్లింపు',
    actionAcceptLot: 'లాట్ ఆమోదించి 30% ముందస్తు చెల్లించండి',

    smsPreviewTitle: 'రైతు SMS / వాట్సాప్ ప్రివ్యూ (తెలుగు)',
    smsSampleOrder: 'అగ్రిలింక్ అలర్ట్: {crop} కోసం కొనుగోలుదారు ఒప్పందం ఖరారైంది. ధర: ₹{price}/కిలో. {qty}కిలో ఇవ్వడానికి 1 అని రిప్లై ఇవ్వండి.',
    smsSampleLot: 'అగ్రిలింక్ అప్‌డేట్: లాట్ #LOT-1001 గ్రేడ్ A ధృవీకరించబడింది. బరువు {qty}కిలో. అడ్వాన్స్ చెల్లింపు జరుగుతోంది.',
    smsSamplePayment: 'అగ్రిలింక్: లాట్ #LOT-1001 కోసం ₹{amount} సెటిల్‌మెంట్ నమోదు చేయబడింది. బ్యాంక్/FPO స్టేట్‌మెంట్ చూడండి.',
  },

  gu: {
    appName: 'એગ્રીલિંક',
    tagline: 'ખેતરથી સીધા બજાર સુધી',
    goodMorning: 'સુપ્રભાત',
    roleCoordinator: 'સંયોજક (કોઓર્ડિનેટર)',
    roleBuyer: 'સંસ્થાકીય ખરીદદાર',
    roleFarmer: 'ખેડૂત મિત્ર',
    viewAs: 'ભૂમિકા પસંદ કરો',
    signOut: 'લૉગ આઉટ',
    refresh: 'માહિતી તાજી કરો',
    notifications: 'પ્રવૃત્તિ અને સૂચનાઓ',
    newOrder: 'નવો ઓર્ડર',
    resetSeed: 'ડેટા રીસેટ',
    teamAccess: 'ટીમ અને અધિકારો',
    language: 'ભાષા',

    navOverview: 'ઝાંખી (Overview)',
    navOrders: 'ઓર્ડર્સ (Orders)',
    navFarmerNetwork: 'ખેડૂત નેટવર્ક',
    navCollectionGrade: 'સંગ્રહ અને ગ્રેડિંગ',
    navRoutes: 'વાહન રૂટ (Routes)',
    navSettlements: 'નાણાકીય ચૂકવણી',

    titleOverview: 'લણણી પહેલાં ખરીદદારની ખાતરી.',
    titleOrders: 'કાપણી પૂર્વે ઓર્ડર કરાર.',
    titleFarmerNetwork: 'નોંધાયેલ ખેડૂતોનું સક્રિય નેટવર્ક.',
    titleCollectionGrade: 'સંગ્રહ કેન્દ્ર પર ચોક્કસ ગુણવત્તા તપાસ.',
    titleRoutes: 'દરેક જથ્થા માટે ઓપ્ટિમાઇઝ્ડ રૂટ.',
    titleSettlements: 'પારદર્શક અને તાત્કાલિક બેંક ચુકવણી.',

    statActiveOrderValue: 'સક્રિય ઓર્ડર મૂલ્ય',
    statCommittedVolume: 'ખાતરી કરેલ જથ્થો',
    statFarmerRealised: 'ખેડૂતને મળેલ ભાવ',
    statPilotVolume: 'પાયલોટ વોલ્યુમ',
    statBuffer: '15% સુરક્ષા બફર સ્ટોક',
    statIntermediaryMargin: 'સીધી કિંમત સરખામણી',

    actionNotifyFarmers: 'ખેડૂતોને મેસેજ મોકલો',
    actionFarmersNotified: 'મેસેજ મોકલાઈ ગયા',
    actionPostOrder: 'નવો ઓર્ડર દાખલ કરો',
    actionExportManifest: 'રૂટ લિસ્ટ ડાઉનલોડ (CSV)',
    actionExportLedger: 'ખાતાવહી ડાઉનલોડ (CSV)',
    actionExportRoster: 'ખેડૂત યાદી ડાઉનલોડ (CSV)',
    actionExportOrder: 'ઓર્ડર કોન્ટ્રાક્ટ ડાઉનલોડ (CSV)',
    actionPrintInvoice: 'APMC બિલ પ્રિન્ટ (PDF)',
    actionPrintWaybill: 'વાહન બિલ્ટી પ્રિન્ટ (PDF)',
    actionDispatch: 'વાહન રવાના કરો (₹1,200)',
    actionConfirmDelivery: 'ડિલિવરી સ્વીકાર અને ચૂકવણી',
    actionAcceptLot: 'જથ્થો સ્વીકારો અને 30% એડવાન્સ જમા કરો',

    smsPreviewTitle: 'ખેડૂત એસએમએસ / વ્હોટ્સએપ પ્રિવ્યૂ (ગુજરાતી)',
    smsSampleOrder: 'એગ્રીલિંક એલર્ટ: {crop} માટે ખરીદદાર ઓર્ડર મંજૂર. ભાવ: ₹{price}/કિલો. {qty}કિલો માટે 1 લખી મોકલો.',
    smsSampleLot: 'એગ્રીલિંક અપડેટ: લોટ #LOT-1001 ગ્રેડ A માન્ય. વજન {qty}કિલો. એડવાન્સ ચૂકવણી પ્રોસેસમાં છે.',
    smsSamplePayment: 'એગ્રીલિંક: લોટ #LOT-1001 માટે ₹{amount} સેટલમેન્ટ નોંધાયું. બેંક/FPO સ્ટેટમેન્ટ જુઓ.',
  },
}

export function getT(lang: Language): TranslationDictionary {
  return translations[lang] || translations.en
}
