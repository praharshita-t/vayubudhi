import os

code = '''"""
Google Gemini API integration client.
Constructs and generates Unified Multilingual Citizen Advisories:
- Default: 24h State/City Forecast trajectory and comparative multi-district trend outlook.
- On Hover / Selection: Hyperlocal personalized natural language advisory for that exact district,
  driven directly by real-time ML Source Attribution (Vehicular, Industrial, Dust, Biomass).
"""
import os
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load workspace root .env if present
load_dotenv()

try:
    import google.generativeai as genai
except ImportError:
    genai = None

def pm25_to_aqi(pm25: float) -> int:
    """Converts PM2.5 (ug/m3) into standard US EPA AQI"""
    p = float(pm25 or 0.0)
    if p <= 12.0:
        return round((50.0 / 12.0) * p)
    elif p <= 35.4:
        return round(51.0 + ((100.0 - 51.0) / (35.4 - 12.1)) * (p - 12.1))
    elif p <= 55.4:
        return round(101.0 + ((150.0 - 101.0) / (55.4 - 35.5)) * (p - 35.5))
    elif p <= 150.4:
        return round(151.0 + ((200.0 - 151.0) / (150.4 - 55.5)) * (p - 55.5))
    elif p <= 250.4:
        return round(201.0 + ((300.0 - 201.0) / (250.4 - 150.5)) * (p - 150.5))
    elif p <= 500.4:
        return round(301.0 + ((500.0 - 301.0) / (500.4 - 250.5)) * (p - 250.5))
    else:
        return 500

# ══════════════════════════════════════════════════════════════════════════════
# COMPREHENSIVE DISTRICT MICROCLIMATE & EMISSION PROFILES
# Covers all 33 Hyderabad districts + core Delhi, Bengaluru, Guwahati districts
# ══════════════════════════════════════════════════════════════════════════════
DISTRICT_MICROCLIMATE_PROFILES = {
    # ── HYDERABAD (All 33 GHMC / Administrative Districts) ──
    'kapra': {
        'character': 'northeastern residential zone with water body buffer',
        'drivers': 'mixed residential traffic, lake catchment airflow, and Moula Ali industrial drift',
        'dynamics': 'Morning lake breeze aids particulate clearing; evening cooler air creates mild localized pooling near arterial junctions.',
        'drivers_te': 'నివాస ప్రాంత ట్రాఫిక్, చెరువు పరిసరాల గాలి మరియు మౌలాలీ పారిశ్రామిక ప్రభావం',
        'dynamics_te': 'ఉదయం చెరువు చల్లని గాలి వల్ల కాలుష్యం తగ్గుతుంది; సాయంత్రం వేళల్లో కూడళ్ల వద్ద కొద్దిగా పెరుగుతుంది.',
        'drivers_hi': 'आवासीय यातायात, झील का प्रवाह और मौला अली औद्योगिक क्षेत्र का प्रभाव',
        'dynamics_hi': 'सुबह झील की हवा से प्रदूषण कम होता है, शाम को चौराहों पर हल्का जमाव देखा जाता है।',
        'drivers_kn': 'ವಸತಿ ಸಂಚಾರ ಮತ್ತು ಕೆರೆ ಪರಿಸರದ ನೈಸರ್ಗಿಕ ಗಾಳಿ',
        'dynamics_kn': 'ಬೆಳಗಿನ ತಂಗಾಳಿ ಮಾಲಿನ್ಯವನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ, ಸಂಜೆ ವೇಳೆ ಸಾಧಾರಣ ಧೂಳು ಇರುತ್ತದೆ.'
    },
    'uppal': {
        'character': 'major eastern transport hub and Warangal highway (NH163) corridor',
        'drivers': 'heavy interstate diesel bus traffic, metro corridor transit, and road dust',
        'dynamics': 'Intense stop-and-go morning and evening commuter surges cause localized NO2 and PM10 spikes along the main corridor.',
        'drivers_te': 'వరంగల్ హైవేపై భారీ ఆర్టీసీ బస్సులు, మెట్రో పనులు మరియు రోడ్డు దుమ్ము',
        'dynamics_te': 'ఉదయం, సాయంత్రం రద్దీ వేళల్లో హైవేపై నైట్రోజన్ డయాక్సైడ్ మరియు దుమ్ము తీవ్రత పెరుగుతుంది.',
        'drivers_hi': 'वारंगल हाईवे पर भारी डीजल बसें, मेट्रो निर्माण और सड़क की धूल',
        'dynamics_hi': 'सुबह और शाम पीक ऑवर्स में हाईवे पर वाहनों का धुआं और धूल बढ़ जाती है।',
        'drivers_kn': 'ಹೆದ್ದಾರಿ ಬಸ್‌ಗಳ ದಟ್ಟಣೆ ಮತ್ತು ಮೆಟ್ರೋ ನಿರ್ಮಾಣದ ಧೂಳು',
        'dynamics_kn': 'ಬೆಳಗ್ಗೆ ಮತ್ತು ಸಂಜೆ ವಾಹನಗಳ ಹೊಗೆಯಿಂದ ಮಾಲಿನ್ಯ ಹೆಚ್ಚಾಗಬಹುದು.'
    },
    'hayathnagar': {
        'character': 'south-eastern transit gateway on Vijayawada Highway (NH65)',
        'drivers': 'long-haul diesel freight trucking, peripheral logistics, and open soil dust',
        'dynamics': 'Open peri-urban terrain promotes daytime wind ventilation, but heavy night trucking leads to nocturnal diesel exhaust pooling.',
        'drivers_te': 'విజయవాడ హైవేపై సరుకు రవాణా లారీలు మరియు తెరిచిన ప్రాంతాల దుమ్ము',
        'dynamics_te': 'పగలు గాలి వేగం వల్ల కాలుష్యం తగ్గుతుంది, రాత్రి వేళల్లో భారీ లారీల రాకపోకల వల్ల పొగ పెరుగుతుంది.',
        'drivers_hi': 'हाईवे पर लंबी दूरी के ट्रकों का धुआं और बाहरी क्षेत्रों की खुली धूल',
        'dynamics_hi': 'दिन में हवा चलने से प्रदूषण कम रहता है, रात में ट्रकों के कारण धुआं बढ़ जाता है।',
        'drivers_kn': 'ಹೆದ್ದಾರಿ ಸರಕು ಲಾರಿಗಳ ಹೊಗೆ ಮತ್ತು ತೆರೆದ ಜಾಗದ ಧೂಳು',
        'dynamics_kn': 'ಹಗಲಿನಲ್ಲಿ ಗಾಳಿ ಉತ್ತಮವಾಗಿರುತ್ತದೆ, ರಾತ್ರಿ ಲಾರಿಗಳಿಂದ ಹೊಗೆ ಹೆಚ್ಚುತ್ತದೆ.'
    },
    'lb nagar': {
        'character': 'critical southern arterial interchange and interstate transit bottleneck',
        'drivers': 'severe vehicular stop-and-go idling, ring road bus traffic, and commuter congestion',
        'dynamics': 'Multi-direction flyover intersections create localized vehicle emission hotspots during 8:00-10:30 AM and 6:00-9:30 PM.',
        'drivers_te': 'ఎల్బీనగర్ ప్రధాన జంక్షన్ వద్ద వాహనాల నిలిచిపోవడం, రింగ్ రోడ్డు బస్సులు మరియు ట్రాఫిక్',
        'dynamics_te': 'ఫ్లైఓవర్ కూడళ్ల వద్ద ఉదయం మరియు సాయంత్రం వేళల్లో వాహన పొగ తీవ్రంగా పేరుకుపోతుంది.',
        'drivers_hi': 'प्रमुख चौराहे पर वाहनों का जाम, रिंग रोड बसें और धीमा ट्रैफिक',
        'dynamics_hi': 'फ्लाईओवर चौराहों पर सुबह और शाम को वाहनों का धुआं काफी बढ़ जाता है।',
        'drivers_kn': 'ಪ್ರಮುಖ ಜಂಕ್ಷನ್‌ನಲ್ಲಿ ವಾಹನ ದಟ್ಟಣೆ ಮತ್ತು ಬಸ್‌ಗಳ ಹೊಗೆ',
        'dynamics_kn': 'ಸಂಚಾರ ದಟ್ಟಣೆ ಹೆಚ್ಚಿರುವ ವೇಳೆ ವಾಹನಗಳ ಹೊಗೆ ನಿಲ್ಲುವ ಸಾಧ್ಯತೆ ಇದೆ.'
    },
    'saroornagar': {
        'character': 'high-density residential enclave surrounding Saroornagar Lake',
        'drivers': 'dense local residential traffic, domestic activity, and lake-edge micro-winds',
        'dynamics': 'Lake-effect thermal buffering helps moderate temperatures, while narrow inner roads trap local vehicular exhaust during evening hours.',
        'drivers_te': 'సరూర్ నగర్ చెరువు పరిసర నివాస ప్రాంతాల ట్రాఫిక్ మరియు స్థానిక రవాణా',
        'dynamics_te': 'చెరువు గాలి ఉష్ణోగ్రతను నియంత్రిస్తుంది, కానీ ఇరుకైన వీధుల్లో సాయంత్రం వాహనాల పొగ చేరుతుంది.',
        'drivers_hi': 'झील के आसपास घनी आबादी का स्थानीय ट्रैफिक और घरेलू गतिविधियां',
        'dynamics_hi': 'झील की हवा से राहत मिलती है, परंतु शाम को गलियों में वाहनों का धुआं ठहर सकता है।',
        'drivers_kn': 'ಕೆರೆ ಪಕ್ಕದ ವಸತಿ ಪ್ರದೇಶದ ಸ್ಥಳೀಯ ವಾಹನ ಸಂಚಾರ',
        'dynamics_kn': 'ಕೆರೆಯ ತಂಪಾದ ಗಾಳಿ ಸಹಾಯ ಮಾಡುತ್ತದೆ, ಸಂಜೆ ರಸ್ತೆಯಲ್ಲಿ ಧೂಳು ಇರುತ್ತದೆ.'
    },
    'malakpet': {
        'character': 'dense transit corridor connecting Old City with southern interstate highways',
        'drivers': 'diesel bus exhaust, wholesale agricultural market freight, and railway transit',
        'dynamics': 'Heavy commercial carrier idling keeps NO2 and PM10 elevated during early morning wholesale market hours and evening rush.',
        'drivers_te': 'మార్కెట్ సరుకు లారీలు, డీజిల్ బస్సులు మరియు రైల్వే రాకపోకల పొగ',
        'dynamics_te': 'వ్యవసాయ మార్కెట్ వేళల్లో మరియు సాయంత్రం రద్దీ సమయాల్లో కాలుష్య తీవ్రత ఎక్కువగా ఉంటుంది.',
        'drivers_hi': 'थोक मंडी की गाड़ियां, डीजल बसें और रेलवे जंक्शन का धुआं',
        'dynamics_hi': 'मंडी के समय और शाम के ट्रैफिक में NO2 और PM10 की मात्रा बढ़ जाती है।',
        'drivers_kn': 'ಮಾರುಕಟ್ಟೆಯ ಸರಕು ವಾಹನಗಳು ಮತ್ತು ಡೀಸೆಲ್ ಬಸ್‌ಗಳ ಹೊಗೆ',
        'dynamics_kn': 'ಮಾರುಕಟ್ಟೆ ಸಮಯ ಮತ್ತು ಸಂಜೆ ವೇಳೆ ವಾಯು ಮಾಲಿನ್ಯ ಸಾಧಾರಣ ಹೆಚ್ಚಿರುತ್ತದೆ.'
    },
    'santoshnagar': {
        'character': 'compact southern residential settlement with defense facility borders',
        'drivers': 'local commuter two-wheelers, inner arterial roads, and defense buffer green pockets',
        'dynamics': 'Proximity to DRDO green buffers provides partial filtration, maintaining moderate baseline air quality throughout the day.',
        'drivers_te': 'స్థానిక ద్విచక్ర వాహనాల రాకపోకలు మరియు రక్షణ శాఖ పచ్చదనపు ప్రాంతాలు',
        'dynamics_te': 'రక్షణ పరిశోధన సంస్థ పచ్చదనం గాలిని శుద్ధి చేయడంలో సహాయపడుతుంది.',
        'drivers_hi': 'स्थानीय दोपहिया वाहनों की आवाजाही और रक्षा क्षेत्र का हरित क्षेत्र',
        'dynamics_hi': 'हरित क्षेत्र के कारण हवा में प्राकृतिक शुद्धता बनी रहती है।',
        'drivers_kn': 'ಸ್ಥಳೀಯ ವಾಹನ ಸಂಚಾರ ಮತ್ತು ಹಸಿರು ವಲಯದ ನೈಸರ್ಗಿಕ ಗಾಳಿ',
        'dynamics_kn': 'ಹಸಿರು ವಲಯದಿಂದಾಗಿ ಗಾಳಿಯ ಗುಣಮಟ್ಟ ಮಧ್ಯಮವಾಗಿರುತ್ತದೆ.'
    },
    'chandrayangutta': {
        'character': 'southern industrial-commercial sector along the Inner Ring Road',
        'drivers': 'small manufacturing workshops, heavy transport carriers, and freight movement',
        'dynamics': 'Roadside industrial activities and heavy freight movement lead to mixed particulate and mechanical dust suspension.',
        'drivers_te': 'చిన్న తరహా పరిశ్రమల పొగ, రింగ్ రోడ్డు లారీల రాకపోకలు మరియు దుమ్ము',
        'dynamics_te': 'పరిశ్రమలు మరియు లారీల రద్దీ వల్ల గాలిలో దుమ్ము రేణువులు ఎక్కువగా ఉంటాయి.',
        'drivers_hi': 'छोटे कारखानों का धुआं, भारी मालवाहक गाड़ियां और सड़क की धूल',
        'dynamics_hi': 'कारखानों और ट्रकों की आवाजाही से धूल और धुएं का स्तर बढ़ता है।',
        'drivers_kn': 'ಸಣ್ಣ ಕಾರ್ಖಾನೆಗಳು ಮತ್ತು ಭಾರೀ ಸರಕು ಲಾರಿಗಳ ಧೂಳು',
        'dynamics_kn': 'ಕೈಗಾರಿಕೆಗಳು ಮತ್ತು ವಾಹನಗಳಿಂದಾಗಿ ಗಾಳಿಯಲ್ಲಿ ಧೂಳು ಹೆಚ್ಚಾಗಿರುತ್ತದೆ.'
    },
    'charminar': {
        'character': 'historic urban canyon with narrow dense market street network',
        'drivers': 'slow-moving two-stroke traffic, commercial market idling, and pedestrian dust',
        'dynamics': 'Dense building canyons severely restrict horizontal wind penetration, trapping tailpipe particulates near ground level.',
        'drivers_te': 'ఇరుకైన చారిత్రక వీధులు, పాత వాహనాల పొగ మరియు రద్దీ మార్కెట్ల దుమ్ము',
        'dynamics_te': 'భవనాల మధ్య గాలి ప్రసరణ తక్కువగా ఉండటం వల్ల వాహన పొగ నేలపైనే నిలిచిపోతుంది.',
        'drivers_hi': 'तंग गलियों में धीमी गति का ट्रैफिक, पुराने वाहनों का धुआं और बाजार की भीड़',
        'dynamics_hi': 'इमारतों के कारण हवा का बहाव रुकता है, जिससे धुआं जमीन के पास जमा रहता है।',
        'drivers_kn': 'ಕಿರಿದಾದ ಐತಿಹಾಸಿಕ ರಸ್ತೆಗಳು, ಹಳೆಯ ವಾಹನಗಳ ಹೊಗೆ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಧೂಳು',
        'dynamics_kn': 'ಕಟ್ಟಡಗಳ ನಡುವೆ ಗಾಳಿ ಪ್ರಸರಣ ಕಡಿಮೆಯಿರುವುದರಿಂದ ಹೊಗೆ ಕೆಳಮಟ್ಟದಲ್ಲೇ ನಿಲ್ಲುತ್ತದೆ.'
    },
    'falaknuma': {
        'character': 'elevated southern heritage ridge with undulating terrain',
        'drivers': 'residential commuter traffic, localized domestic burning, and ridge airflow',
        'dynamics': 'Higher topographical elevation enhances natural wind dispersion during midday, easing baseline pollution.',
        'drivers_te': 'ఎత్తైన ప్రాంతం, నివాస వాహనాల రాకపోకలు మరియు కొండపై గాలి ప్రసరణ',
        'dynamics_te': 'ఎత్తైన భౌగోళిక ప్రాంతం వల్ల మధ్యాహ్నం గాలి బాగా వీచి కాలుష్యం త్వరగా చెదిరిపోతుంది.',
        'drivers_hi': 'ऊंचाई वाला इलाका, आवासीय वाहन और पहाड़ी हवा का बहाव',
        'dynamics_hi': 'ऊंचाई के कारण दोपहर में हवा से प्रदूषण आसानी से बिखर जाता है।',
        'drivers_kn': 'ಎತ್ತರದ ಪ್ರದೇಶ, ಸ್ಥಳೀಯ ವಾಹನ ಸಂಚಾರ ಮತ್ತು ನೈಸರ್ಗಿಕ ಗಾಳಿ',
        'dynamics_kn': 'ಎತ್ತರದ ಪ್ರದೇಶವಾದ್ದರಿಂದ ಮಧ್ಯಾಹ್ನದ ಹೊತ್ತಿಗೆ ಮಾಲಿನ್ಯ ಬೇಗನೆ ಕಡಿಮೆಯಾಗುತ್ತದೆ.'
    },
    'rajendranagar': {
        'character': 'agricultural university and lush southern green ecological belt',
        'drivers': 'agricultural buffer vegetation, southern airflow, and minimal industrial load',
        'dynamics': 'Extensive botanical tree canopies provide natural bio-filtration, maintaining the cleanest air in southern Hyderabad.',
        'drivers_te': 'వ్యవసాయ విశ్వవిద్యాలయ పచ్చదనం, సహజ వృక్ష సంపద మరియు స్వచ్ఛమైన గాలి',
        'dynamics_te': 'దట్టమైన చెట్ల వల్ల గాలి సహజంగా శుద్ధి చేయబడి నగరంలోనే అత్యంత స్వచ్ఛంగా ఉంటుంది.',
        'drivers_hi': 'कृषि विश्वविद्यालय का हरित क्षेत्र, घने पेड़ और प्राकृतिक शुद्ध हवा',
        'dynamics_hi': 'पेड़ों के घने आवरण से हवा प्राकृतिक रूप से साफ और शुद्ध रहती है।',
        'drivers_kn': 'ಕೃಷಿ ವಿಶ್ವವಿದ್ಯಾಲಯದ ಹಸಿರು ವಲಯ ಮತ್ತು ಶುದ್ಧ ನೈಸರ್ಗಿಕ ಗಾಳಿ',
        'dynamics_kn': 'ದಟ್ಟವಾದ ಮರಗಳಿಂದಾಗಿ ಗಾಳಿ ನೈಸರ್ಗಿಕವಾಗಿ ಶುದ್ಧವಾಗಿರುತ್ತದೆ.'
    },
    'mehdipatnam': {
        'character': 'critical western commercial transit hub and airport corridor gateway',
        'drivers': 'dense diesel city bus fleet idling, PVNR Expressway corridor, and market congestion',
        'dynamics': 'High commuter bus queueing around the major depot creates sustained localized NO2 and particulate spikes during rush hours.',
        'drivers_te': 'ప్రధాన ఆర్టీసీ బస్ డిపో, ఎక్స్‌ప్రెస్‌వే ట్రాఫిక్ మరియు ఎయిర్‌పోర్ట్ కారిడార్ పొగ',
        'dynamics_te': 'బస్సు డిపో మరియు ఎక్స్‌ప్రెస్‌వే కింద వాహనాలు నిలిచిపోవడం వల్ల కాలుష్యం తీవ్రమవుతుంది.',
        'drivers_hi': 'मुख्य बस डिपो, एक्सप्रेसवे का भारी ट्रैफिक और वाहनों का धुआं',
        'dynamics_hi': 'बस स्टैंड और चौराहे पर जाम के कारण NO2 का स्तर काफी ऊंचा रहता है।',
        'drivers_kn': 'ಪ್ರಮುಖ ಬಸ್ ನಿಲ್ದಾಣ, ಎಕ್ಸ್‌ಪ್ರೆಸ್‌ವೇ ಟ್ರಾಫಿಕ್ ಮತ್ತು ವಾಹನಗಳ ಹೊಗೆ',
        'dynamics_kn': 'ಬಸ್ ನಿಲ್ದಾಣದ ಬಳಿ ವಾಹನಗಳು ನಿಲ್ಲುವುದರಿಂದ ಹೊಗೆ ಹೆಚ್ಚಿರುತ್ತದೆ.'
    },
    'karwan': {
        'character': 'historic western residential sector with textile dyeing and cottage clusters',
        'drivers': 'small-scale artisan processing, narrow street traffic, and localized emissions',
        'dynamics': 'Dense traditional settlements create micro-trapping in inner lanes during calm winter and evening wind conditions.',
        'drivers_te': 'చేనేత మరియు చిన్న పరిశ్రమల పనితీరు, ఇరుకైన వీధుల రవాణా',
        'dynamics_te': 'గాలి వేగం తక్కువగా ఉన్నప్పుడు నివాస వీధుల్లో పొగ నెమ్మదిగా చెదురుతుంది.',
        'drivers_hi': 'लघु उद्योग, संकरी गलियों का यातायात और स्थानीय धुआं',
        'dynamics_hi': 'शांत मौसम में शाम के समय गलियों में धुआं धीरे-धीरे साफ होता है।',
        'drivers_kn': 'ಸಣ್ಣ ಉದ್ಯಮಗಳು ಮತ್ತು ಕಿರಿದಾದ ರಸ್ತೆಗಳ ವಾಹನ ಸಂಚಾರ',
        'dynamics_kn': 'ಗಾಳಿ ಕಡಿಮೆ ಇರುವಾಗ ಸಂಜೆ ವೇಳೆ ಮಾಲಿನ್ಯ ಸ್ವಲ್ಪ ಸಮಯ ಉಳಿಯುತ್ತದೆ.'
    },
    'goshamahal': {
        'character': 'central wholesale trading and commercial carrier logistics district',
        'drivers': 'commercial delivery vehicles, freight loading/unloading, and dense vehicular transit',
        'dynamics': 'Continuous commercial idling and heavy loading traffic keep particulate levels elevated throughout business hours.',
        'drivers_te': 'హోల్‌సేల్ మార్కెట్ సరుకు వాహనాలు, లోడింగ్ ఆటోలు మరియు నిరంతర రద్దీ',
        'dynamics_te': 'వ్యాపార వేళల్లో సరుకు రవాణా వాహనాల వల్ల గాలిలో దుమ్ము మరియు పొగ ఎక్కువగా ఉంటాయి.',
        'drivers_hi': 'थोक व्यापारिक वाहन, लोडिंग गाड़ियां और निरंतर व्यापारिक आवाजाही',
        'dynamics_hi': 'दिनभर लोडिंग और व्यापारिक वाहनों के कारण धूल और धुआं बना रहता है।',
        'drivers_kn': 'ಸಗಟು ಮಾರುಕಟ್ಟೆ ವಾಹನಗಳು ಮತ್ತು ಸರಕು ಸಾಗಣೆ ಲಾರಿಗಳ ದಟ್ಟಣೆ',
        'dynamics_kn': 'ವ್ಯಾಪಾರದ ಸಮಯದಲ್ಲಿ ವಾಹನಗಳಿಂದಾಗಿ ಮಾಲಿನ್ಯ ಸಾಧಾರಣ ಮಟ್ಟದಲ್ಲಿರುತ್ತದೆ.'
    },
    'musheerabad': {
        'character': 'central commercial and historic leather processing corridor',
        'drivers': 'dense arterial traffic bottlenecks, commercial workshops, and heavy bus transit',
        'dynamics': 'Afternoon solar heating aids convective mixing, but evening commuter bottlenecks lead to localized particulate accumulation.',
        'drivers_te': 'ప్రధాన రహదారి ట్రాఫిక్ రద్దీ, వర్క్‌షాపులు మరియు సిటీ బస్సుల పొగ',
        'dynamics_te': 'మధ్యాహ్నం ఎండ వల్ల కాలుష్యం చెదిరిపోతుంది, కానీ సాయంత్రం రద్దీలో పొగ పెరుగుతుంది.',
        'drivers_hi': 'मुख्य सड़क पर ट्रैफिक जाम, कमर्शियल वर्कशॉप और बसें',
        'dynamics_hi': 'दोपहर में धूप से राहत मिलती है, शाम को ट्रैफिक जाम से प्रदूषण बढ़ता है।',
        'drivers_kn': 'ಮುಖ್ಯ ರಸ್ತೆಯ ಟ್ರಾಫಿಕ್ ದಟ್ಟಣೆ ಮತ್ತು ಸಿಟಿ ಬಸ್‌ಗಳ ಹೊಗೆ',
        'dynamics_kn': 'ಮಧ್ಯಾಹ್ನ ಗಾಳಿ ಚೆನ್ನಾಗಿರುತ್ತದೆ, ಸಂಜೆ ಟ್ರಾಫಿಕ್‌ನಿಂದ ಹೊಗೆ ಹೆಚ್ಚಬಹುದು.'
    },
    'amberpet': {
        'character': 'eastern transit corridor along the Musi river basin',
        'drivers': 'arterial connecting traffic, open riverbed dust suspension, and market congestion',
        'dynamics': 'River valley topography channels prevailing winds, but dry season riverbed silt can elevate coarse PM10 dust.',
        'drivers_te': 'మూసీ నది పరిసరాల రహదారి రద్దీ మరియు నదీ తీరపు దుమ్ము',
        'dynamics_te': 'నది పరివాహక ప్రాంతపు గాలి వీస్తుంది, కానీ ఎండిన కాలంలో దుమ్ము రేణువులు పెరుగుతాయి.',
        'drivers_hi': 'मूसी नदी के पास का मुख्य मार्ग और सूखी जमीन की धूल',
        'dynamics_hi': 'नदी क्षेत्र में हवा चलती है, परंतु शुष्क मौसम में धूल के कण बढ़ जाते हैं।',
        'drivers_kn': 'ಮೂಸಿ ನದಿ ಪರಿಸರದ ರಸ್ತೆ ಸಂಚಾರ ಮತ್ತು ರಸ್ತೆ ಧೂಳು',
        'dynamics_kn': 'ನದಿಯ ಗಾಳಿ ಬೀಸುತ್ತದೆ, ಒಣ ಹವೆಯಲ್ಲಿ ಧೂಳಿನ ಪ್ರಮಾಣ ಹೆಚ್ಚಿರುತ್ತದೆ.'
    },
    'khairatabad': {
        'character': 'central administrative, commercial, and lakefront nexus near Hussain Sagar',
        'drivers': 'heavy peak commuter traffic, government office corridors, and lake breezes',
        'dynamics': 'Lake breezes from Hussain Sagar facilitate convective cooling and dispersion during daytime hours.',
        'drivers_te': 'హుస్సేన్ సాగర్ పరిసర ప్రభుత్వ కార్యాలయాల రద్దీ మరియు సరస్సు గాలి',
        'dynamics_te': 'హుస్సేన్ సాగర్ చెరువు నుంచి వచ్చే చల్లని గాలి పగటిపూట కాలుష్యాన్ని తగ్గిస్తుంది.',
        'drivers_hi': 'हुसैन सागर के पास सरकारी दफ्तरों का ट्रैफिक और झील की ठंडी हवा',
        'dynamics_hi': 'झील से आने वाली हवा दिन के समय प्रदूषण को साफ करने में मदद करती है।',
        'drivers_kn': 'ಹುಸೇನ್ ಸಾಗರ್ ಕೆರೆ ಪಕ್ಕದ ಕಚೇರಿಗಳ ಸಂಚಾರ ಮತ್ತು ತಂಗಾಳಿ',
        'dynamics_kn': 'ಕೆರೆಯ ತಂಪಾದ ಗಾಳಿಯು ಹಗಲಿನಲ್ಲಿ ಮಾಲಿನ್ಯವನ್ನು ನಿಯಂತ್ರಣದಲ್ಲಿಡುತ್ತದೆ.'
    },
    'jubilee hills': {
        'character': 'upscale elevated residential and natural rocky ridge sector',
        'drivers': 'low-density private vehicular traffic, rich tree canopies, and elevated terrain',
        'dynamics': 'High topography and extensive green landscaping provide active natural bio-filtration and strong wind ventilation.',
        'drivers_te': 'ఎత్తైన కొండ ప్రాంతం, విస్తారమైన చెట్ల పచ్చదనం మరియు స్వచ్ఛమైన గాలి',
        'dynamics_te': 'ఎత్తైన ప్రాంతం మరియు దట్టమైన చెట్ల వల్ల గాలి ఎల్లప్పుడూ స్వచ్ఛంగా, ఆరోగ్యకరంగా ఉంటుంది.',
        'drivers_hi': 'ऊंचाई वाला हरा-भरा रिहायशी इलाका और पेड़ों की प्राकृतिक शुद्धि',
        'dynamics_hi': 'ऊंचाई और हरियाली के कारण हवा बहुत स्वच्छ और सेहतमंद रहती है।',
        'drivers_kn': 'ಎತ್ತರದ ಹಸಿರು ಪರಿಸರ ಮತ್ತು ಶುದ್ಧ ನೈಸರ್ಗಿಕ ಗಾಳಿ',
        'dynamics_kn': 'ಹಸಿರು ಮರಗಳು ಮತ್ತು ಎತ್ತರದ ಪ್ರದೇಶದಿಂದಾಗಿ ಗಾಳಿ ಸದಾ ಶುದ್ಧವಾಗಿರುತ್ತದೆ.'
    },
    'yousufguda': {
        'character': 'high-density mixed residential sector near commercial corridors',
        'drivers': 'commuter two-wheelers, local arterial traffic, and neighborhood street dust',
        'dynamics': 'Daytime atmospheric ventilation keeps air moderate; evening commuter returns cause mild particulate pooling.',
        'drivers_te': 'నివాస ప్రాంత ట్రాఫిక్, ద్విచక్ర వాహనాలు మరియు స్థానిక రోడ్డు దుమ్ము',
        'dynamics_te': 'పగటిపూట గాలి బాగుంటుంది, సాయంత్రం వేళల్లో వాహనాల రద్దీ వల్ల కొద్దిగా దుమ్ము పెరుగుతుంది.',
        'drivers_hi': 'आवासीय क्षेत्र की गाड़ियां, दोपहिया वाहन और स्थानीय धूल',
        'dynamics_hi': 'दिन में हवा साफ रहती है, शाम को कामकाजी लोगों के लौटने से हल्का प्रदूषण होता है।',
        'drivers_kn': 'ವಸತಿ ಪ್ರದೇಶದ ವಾಹನ ಸಂಚಾರ ಮತ್ತು ರಸ್ತೆ ಧೂಳು',
        'dynamics_kn': 'ಹಗಲು ಗಾಳಿ ಉತ್ತಮವಾಗಿರುತ್ತದೆ, ಸಂಜೆ ವಾಹನಗಳ ಸಂಚಾರದಿಂದ ಧೂಳು ಇರಬಹುದು.'
    },
    'serilingampally': {
        'character': 'high-density mixed residential and tech transit hub near Outer Ring Road',
        'drivers': 'Outer Ring Road commuter traffic, tech corridor flow, and infrastructure dust',
        'dynamics': 'Afternoon sunlight aids convective dispersal, while peak evening tech traffic causes localized particulate pooling near major junctions.',
        'drivers_te': 'రింగ్ రోడ్డు వాహనాల రద్దీ, ఐటీ ఉద్యోగుల రాకపోకలు మరియు రోడ్డు పనులు',
        'dynamics_te': 'మధ్యాహ్నం గాలి స్వచ్ఛంగా ఉంటుంది, కానీ సాయంత్రం వేళల్లో జంక్షన్ల వద్ద కాలుష్యం పెరుగుతుంది.',
        'drivers_hi': 'आउटर रिंग रोड का ट्रैफिक, आईटी कंपनियों की गाड़ियां और निर्माण धूल',
        'dynamics_hi': 'दोपहर में धूप से राहत रहती है, शाम के समय प्रमुख चौराहों पर धुआं बढ़ जाता है।',
        'drivers_kn': 'ರಿಂಗ್ ರೋಡ್ ವಾಹನ ದಟ್ಟಣೆ ಮತ್ತು ಐಟಿ ಕಾರಿಡಾರ್ ಸಂಚಾರ',
        'dynamics_kn': 'ಮಧ್ಯಾಹ್ನ ವಾತಾವರಣ ಶುದ್ಧವಾಗಿರುತ್ತದೆ, ಸಂಜೆ ಟ್ರಾಫಿಕ್‌ನಿಂದ ಹೊಗೆ ಹೆಚ್ಚಬಹುದು.'
    },
    'chandanampet': {
        'character': 'fast-growing western residential corridor along Mumbai Highway (NH65)',
        'drivers': 'heavy tech commuter traffic, highway arterial transit, and active construction dust',
        'dynamics': 'Open highway winds provide good midday clearance, though ongoing building activity elevates PM10 dust during dry afternoons.',
        'drivers_te': 'ముంబై హైవేపై ట్రాఫిక్, ఐటీ ప్రయాణికులు మరియు భవన నిర్మాణాల దుమ్ము',
        'dynamics_te': 'హైవే గాలి వల్ల పొగ త్వరగా చెదురుతుంది, కానీ నిర్మాణాల వల్ల దుమ్ము రేణువులు ఎక్కువగా ఉంటాయి.',
        'drivers_hi': 'मुंबई हाईवे का ट्रैफिक, आईटी आवाजाही और निर्माण कार्यों की धूल',
        'dynamics_hi': 'हाईवे की हवा से धुआं साफ होता है, पर निर्माण कार्यों के कारण धूल बनी रहती है।',
        'drivers_kn': 'ಮುಂಬೈ ಹೆದ್ದಾರಿ ಸಂಚಾರ ಮತ್ತು ಕಟ್ಟಡ ಕಾಮಗಾರಿಗಳ ಧೂಳು',
        'dynamics_kn': 'ಹೆದ್ದಾರಿಯ ಗಾಳಿಯಿಂದ ಹೊಗೆ ಕಡಿಮೆಯಾಗುತ್ತದೆ, ಆದರೆ ನಿರ್ಮಾಣದ ಧೂಳು ಇರುತ್ತದೆ.'
    },
    'patancheru': {
        'character': 'heavy chemical, pharmaceutical, and metallurgical industrial cluster',
        'drivers': 'industrial boiler stack plumes, chemical processing solvents, and heavy freight trucks',
        'dynamics': 'Nocturnal boundary layer lowering and surface thermal inversions trap factory emissions and SO2 near ground level during night and early morning.',
        'drivers_te': 'భారీ రసాయన, ఫార్మా ఫ్యాక్టరీల పొగ (SO₂), బాయిలర్ల ఉద్గారాలు మరియు సరుకు లారీలు',
        'dynamics_te': 'రాత్రి మరియు ఉదయపు వేళల్లో చల్లదనం వల్ల కర్మాగారాల పొగ భూమికి సమీపంలో నిలిచిపోతుంది.',
        'drivers_hi': 'भारी रासायनिक व फार्मा फैक्ट्रियों का धुआं (SO₂), बॉयलर और औद्योगिक ट्रक',
        'dynamics_hi': 'रात और सुबह ठंड के कारण फैक्ट्रियों का धुआं और सल्फर डाइऑक्साइड जमीन के पास जमा रहता है।',
        'drivers_kn': 'ಭಾರೀ ರಾಸಾಯನಿಕ ಮತ್ತು ಔಷಧ ಕಾರ್ಖಾನೆಗಳ ಹೊಗೆ (SO₂) ಹಾಗೂ ಲಾರಿಗಳ ಸಂಚಾರ',
        'dynamics_kn': 'ರಾತ್ರಿ ಮತ್ತು ಮುಂಜಾನೆ ಕಾರ್ಖಾನೆಗಳ ಹೊಗೆ ಕೆಳಮಟ್ಟದಲ್ಲೇ ಶೇಖರಣೆಯಾಗುತ್ತದೆ.'
    },
    'moosapet': {
        'character': 'commercial-industrial junction bordering Balanagar industrial zone',
        'drivers': 'metal fabrication units, heavy freight logistics, and arterial NH65 highway traffic',
        'dynamics': 'Daytime convective mixing disperses particulates, but evening freight movement keeps diesel soot and coarse dust elevated.',
        'drivers_te': 'బాలానగర్ పరిశ్రమల ప్రభావం, మెటల్ వర్క్‌షాపులు మరియు హైవే లారీల రద్దీ',
        'dynamics_te': 'పగటిపూట గాలి బాగుంటుంది, సాయంత్రం లారీల రద్దీ వల్ల డీజిల్ పొగ మరియు దుమ్ము పెరుగుతాయి.',
        'drivers_hi': 'औद्योगिक वर्कशॉप, भारी मालवाहक गाड़ियां और हाईवे का ट्रैफिक',
        'dynamics_hi': 'दिन में हवा से राहत रहती है, शाम को ट्रकों के कारण धुआं और धूल बढ़ जाती है।',
        'drivers_kn': 'ಕೈಗಾರಿಕಾ ಕಾರ್ಯಾಗಾರಗಳು ಮತ್ತು ಹೆದ್ದಾರಿ ಲಾರಿಗಳ ಹೊಗೆ',
        'dynamics_kn': 'ಹಗಲು ಗಾಳಿ ಉತ್ತಮವಾಗಿರುತ್ತದೆ, ಸಂಜೆ ವೇಳೆ ವಾಹನಗಳಿಂದ ಧೂಳು ಹೆಚ್ಚುತ್ತದೆ.'
    },
    'kukatpally': {
        'character': 'major high-density commercial arterial corridor on NH65',
        'drivers': 'heavy stop-and-go commuter traffic, metro corridor congestion, and Balanagar SME industrial drift',
        'dynamics': 'Daytime convective mixing keeps particulates dispersed, but evening boundary layer lowering traps localized vehicular emissions between 7:00 PM and 9:30 PM.',
        'drivers_te': 'NH65 ప్రధాన రహదారిపై తీవ్ర వాహనాల రద్దీ మరియు బాలానగర్ పారిశ్రామిక దుమ్ము',
        'dynamics_te': 'పగటిపూట గాలి వేగం వల్ల కాలుష్యం తగ్గుతుంది, కానీ సాయంత్రం రద్దీ వేళల్లో వాహన పొగ నిలిచిపోయే అవకాశం ఉంది.',
        'drivers_hi': 'NH65 पर भारी ट्रैफिक जाम, मेट्रो कॉरिडोर और पास के उद्योगों का धुआं',
        'dynamics_hi': 'दिन में धूप से हवा साफ होती है, पर शाम को 7 से 9:30 बजे के बीच गाड़ियों का धुआं बढ़ जाता है।',
        'drivers_kn': 'ರಾಷ್ಟ್ರೀಯ ಹೆದ್ದಾರಿ 65 ರಲ್ಲಿ ಭಾರಿ ಟ್ರಾಫಿಕ್ ಮತ್ತು ಕೈಗಾರಿಕಾ ಧೂಳು',
        'dynamics_kn': 'ಹಗಲಿನಲ್ಲಿ ಗಾಳಿ ಉತ್ತಮವಾಗಿರುತ್ತದೆ, ಸಂಜೆ ವಾಹನಗಳ ದಟ್ಟಣೆಯಿಂದ ಹೊಗೆ ಹೆಚ್ಚಾಗಬಹುದು.'
    },
    'quthbullapur': {
        'character': 'northern semi-industrial and residential mixed growth zone',
        'drivers': 'small manufacturing units, chemical fabrication, and freight transit corridors',
        'dynamics': 'Nighttime temperature drops cause localized industrial stack plume concentrations downwind of manufacturing clusters.',
        'drivers_te': 'చిన్న తరహా కర్మాగారాల పొగ, రసాయన పరిశ్రమలు మరియు సరుకు రవాణా',
        'dynamics_te': 'రాత్రి చల్లదనం వల్ల పరిశ్రమల నుంచి వచ్చే కాలుష్యం పరిసర నివాస ప్రాంతాలకు వ్యాపిస్తుంది.',
        'drivers_hi': 'छोटे उद्योग, केमिकल फैब्रिकेशन और मालवाहक ट्रकों की आवाजाही',
        'dynamics_hi': 'रात में तापमान गिरने से उद्योगों का धुआं आसपास के आवासीय इलाकों में ठहर जाता है।',
        'drivers_kn': 'ಸಣ್ಣ ಕೈಗಾರಿಕೆಗಳ ಹೊಗೆ ಮತ್ತು ರಾಸಾಯನಿಕ ಘಟಕಗಳ ಧೂಳು',
        'dynamics_kn': 'ರಾತ್ರಿ ವೇಳೆ ಕಾರ್ಖಾನೆಗಳ ಹೊಗೆ ಸುತ್ತಮುತ್ತಲಿನ ಪ್ರದೇಶಗಳಲ್ಲಿ ನಿಲ್ಲಬಹುದು.'
    },
    'gajularamaram': {
        'character': 'northern pharmaceutical manufacturing and industrial estate cluster',
        'drivers': 'industrial chemical reactors, boiler exhausts, and heavy industrial transport',
        'dynamics': 'Stagnant low-wind conditions cause temporary plume concentrations downwind of industrial estates during early mornings.',
        'drivers_te': 'ఫార్మా మరియు రసాయన పరిశ్రమల బాయిలర్ల పొగ మరియు రవాణా లారీల రద్దీ',
        'dynamics_te': 'ఉదయం గాలి వేగం తగ్గినప్పుడు పరిశ్రమల నుంచి వచ్చే కాలుష్య కారకాలు పరిసరాల్లో నిలుస్తాయి.',
        'drivers_hi': 'फार्मा फैक्ट्रियों के बॉयलर, रासायनिक उत्सर्जन और भारी ट्रांसपोर्ट',
        'dynamics_hi': 'सुबह के समय हवा धीमी होने पर फैक्ट्रियों का धुआं आसपास के क्षेत्रों में ठहर जाता है।',
        'drivers_kn': 'ಔಷಧ ಕಾರ್ಖಾನೆಗಳ ಹೊಗೆ ಮತ್ತು ಕೈಗಾರಿಕಾ ಲಾರಿಗಳ ಸಂಚಾರ',
        'dynamics_kn': 'ಮುಂಜಾನೆ ಗಾಳಿ ಕಡಿಮೆಯಿರುವಾಗ ಕಾರ್ಖಾನೆಗಳ ಹೊಗೆ ಪ್ರದೇಶದಲ್ಲಿ ಉಳಿಯಬಹುದು.'
    },
    'alwal': {
        'character': 'northern residential green belt and cantonment buffer sector',
        'drivers': 'low-density commuter traffic, cantonment tree cover, and open airflow',
        'dynamics': 'Abundant botanical tree canopy and defense buffer green spaces ensure active natural particulate absorption and high air quality.',
        'drivers_te': 'కంటోన్మెంట్ పచ్చదనం, తక్కువ వాహనాల రద్దీ మరియు సహజ వృక్ష సంపద',
        'dynamics_te': 'చెట్ల సాంద్రత వల్ల గాలి సహజంగా శుద్ధి చేయబడి ఆరోగ్యకరంగా, స్వచ్ఛంగా ఉంటుంది.',
        'drivers_hi': 'छावनी का हरा-भरा क्षेत्र, कम ट्रैफिक और प्राकृतिक पेड़-पौधे',
        'dynamics_hi': 'घने पेड़ों के कारण हवा हमेशा साफ, शुद्ध और ताजी बनी रहती है।',
        'drivers_kn': 'ಕಂಟೋನ್ಮೆಂಟ್ ಹಸಿರು ವಲಯ ಮತ್ತು ಕಡಿಮೆ ವಾಹನ ಸಂಚಾರ',
        'dynamics_kn': 'ದಟ್ಟವಾದ ಮರಗಳಿಂದಾಗಿ ಗಾಳಿ ನೈಸರ್ಗಿಕವಾಗಿ ಶುದ್ಧ ಮತ್ತು ಆರೋಗ್ಯಕರವಾಗಿರುತ್ತದೆ.'
    },
    'malkajgiri': {
        'character': 'northern high-density residential railway township',
        'drivers': 'local commuter traffic, railway yard operations, and neighborhood dust',
        'dynamics': 'Good daytime convective mixing keeps air quality moderate; mild evening spikes occur around major railway level crossings.',
        'drivers_te': 'నివాస ప్రాంత ట్రాఫిక్, రైల్వే యార్డ్ కార్యకలాపాలు మరియు స్థానిక రవాణా',
        'dynamics_te': 'పగటిపూట గాలి స్వచ్ఛంగా ఉంటుంది; సాయంత్రం రైల్వే గేట్ల వద్ద వాహనాలు ఆగినప్పుడు కొద్దిగా పొగ పెరుగుతుంది.',
        'drivers_hi': 'आवासीय कॉलोनियों का ट्रैफिक, रेलवे यार्ड और स्थानीय आवाजाही',
        'dynamics_hi': 'दिन में हवा साफ रहती है, शाम को रेलवे क्रॉसिंग पर गाड़ियों के रुकने से हल्का धुआं होता है।',
        'drivers_kn': 'ವಸತಿ ಪ್ರದೇಶದ ಸಂಚಾರ ಮತ್ತು ರೈಲ್ವೆ ಯಾರ್ಡ್‌ನ ಚಟುವಟಿಕೆಗಳು',
        'dynamics_kn': 'ಹಗಲು ಗಾಳಿ ಉತ್ತಮವಾಗಿರುತ್ತದೆ, ಸಂಜೆ ರೈಲ್ವೆ ಗೇಟ್ ಬಳಿ ಸಾಧಾರಣ ಹೊಗೆ ಇರಬಹುದು.'
    },
    'secunderabad': {
        'character': 'major twin-city railway and defense cantonment transit hub',
        'drivers': 'diesel locomotive idling, inter-city bus transit, and station commuter traffic',
        'dynamics': 'High commuter traffic around railway terminals creates localized morning spikes, easing by midday.',
        'drivers_te': 'సికింద్రాబాద్ రైల్వే జంక్షన్, ఆర్టీసీ బస్సులు మరియు నగర రవాణా పొగ',
        'dynamics_te': 'రైల్వే మరియు బస్ స్టేషన్ల వద్ద ఉదయం వేళల్లో కాలుష్యం ఎక్కువగా ఉంటుంది, మధ్యాహ్నం తగ్గుతుంది.',
        'drivers_hi': 'रेलवे स्टेशन, अंतरराज्यीय बसें और शहर के मुख्य मार्गों का धुआं',
        'dynamics_hi': 'स्टेशन और बस स्टैंड के पास सुबह के समय धुआं अधिक रहता है, दोपहर में कम हो जाता है।',
        'drivers_kn': 'ಪ್ರಮುಖ ರೈಲ್ವೆ ಜಂಕ್ಷನ್, ಬಸ್ ನಿಲ್ದಾಣ ಮತ್ತು ನಗರ ಸಾರಿಗೆ ಹೊಗೆ',
        'dynamics_kn': 'ಬೆಳಗ್ಗೆ ರೈಲ್ವೆ ನಿಲ್ದಾಣದ ಬಳಿ ಮಾಲಿನ್ಯ ಹೆಚ್ಚಿರುತ್ತದೆ, ಮಧ್ಯಾಹ್ನ ಕಡಿಮೆಯಾಗುತ್ತದೆ.'
    },
    'begumpet': {
        'character': 'central commercial corridor and legacy airport arterial zone',
        'drivers': 'heavy peak commuter traffic, flyover bottlenecks, and commercial vehicle exhaust',
        'dynamics': 'Morning and evening rush hours cause concentrated NO2 spikes along the main arterial corridor, with rapid midday clearing.',
        'drivers_te': 'బేగంపేట ప్రధాన రహదారిపై రద్దీ, ఫ్లైఓవర్ ట్రాఫిక్ మరియు వాహనాల పొగ',
        'dynamics_te': 'ఉదయం మరియు సాయంత్రం రద్దీ వేళల్లో నైట్రోజన్ డయాక్సైడ్ పెరుగుతుంది, మధ్యాహ్నం తగ్గుతుంది.',
        'drivers_hi': 'मुख्य सड़क पर भारी ट्रैफिक जाम, फ्लाईओवर की गाड़ियां और NO2 उत्सर्जन',
        'dynamics_hi': 'सुबह और शाम के पीक ऑवर्स में NO2 बढ़ जाता है, दोपहर में हवा साफ हो जाती है।',
        'drivers_kn': 'ಮುಖ್ಯ ರಸ್ತೆಯ ಭಾರಿ ಸಂಚಾರ ಮತ್ತು ವಾಹನಗಳ NO2 ಹೊಗೆ',
        'dynamics_kn': 'ಬೆಳಗ್ಗೆ ಮತ್ತು ಸಂಜೆ ರಸ್ತೆಗಳಲ್ಲಿ ಹೊಗೆ ಹೆಚ್ಚಿರುತ್ತದೆ, ಮಧ್ಯಾಹ್ನ ಶುದ್ಧವಾಗುತ್ತದೆ.'
    },
    'gachibowli': {
        'character': 'elevated IT and financial district with open rocky corridors',
        'drivers': 'peak commuter tech corridors, office transport, and infrastructure construction dust',
        'dynamics': 'Higher terrain elevation and open rocky corridors promote active wind ventilation, maintaining lower baseline concentrations throughout the afternoon.',
        'drivers_te': 'ఐటీ కారిడార్లలో రద్దీ, ఆఫీస్ క్యాబ్‌లు మరియు నిర్మాణ పనుల దుమ్ము',
        'dynamics_te': 'ఎత్తైన ప్రాంతం మరియు మంచి గాలి ప్రసరణ వల్ల కాలుష్యం త్వరగా చెదిరిపోతుంది.',
        'drivers_hi': 'आईटी हब का ट्रैफिक, ऑफिस कैब्स और निर्माण कार्यों की धूल',
        'dynamics_hi': 'ऊंचाई और खुली हवा के कारण दोपहर में प्रदूषण बहुत जल्दी बिखर जाता है।',
        'drivers_kn': 'ಐಟಿ ಕಾರಿಡಾರ್ ಸಂಚಾರ ಮತ್ತು ಕಟ್ಟಡ ಕಾಮಗಾರಿಗಳ ಧೂಳು',
        'dynamics_kn': 'ಎತ್ತರದ ಪ್ರದೇಶ ಮತ್ತು ಉತ್ತಮ ಗಾಳಿಯ ಪ್ರಸರಣದಿಂದ ಮಾಲಿನ್ಯ ಬೇಗನೆ ಕಡಿಮೆಯಾಗುತ್ತದೆ.'
    },
    'madhapur': {
        'character': 'premier high-density IT hub (HITEC City) and corporate corridor',
        'drivers': 'intense peak-hour IT commuter traffic, corporate cabs, and commercial delivery fleets',
        'dynamics': 'Heavy morning (9-11 AM) and evening (6-9 PM) vehicle queueing elevates localized tailpipe NO2 and fine particulates.',
        'drivers_te': 'హైటెక్ సిటీ ఐటీ ట్రాఫిక్, ఆఫీస్ క్యాబ్‌లు మరియు రద్దీ సమయాల పొగ',
        'dynamics_te': 'ఉదయం 9-11 మరియు సాయంత్రం 6-9 గంటల మధ్య వాహన పొగ (NO₂) తీవ్రంగా పెరుగుతుంది.',
        'drivers_hi': 'हाईटेक सिटी का भारी आईटी ट्रैफिक, ऑफिस कैब्स और शाम का जाम',
        'dynamics_hi': 'सुबह और शाम ऑफिस के समय गाड़ियों का धुआं और NO2 का स्तर काफी बढ़ जाता है।',
        'drivers_kn': 'ಹೈಟೆಕ್ ಸಿಟಿ ಐಟಿ ಸಂಚಾರ ಮತ್ತು ಕಚೇರಿ ಕ್ಯಾಬ್‌ಗಳ ಹೊಗೆ',
        'dynamics_kn': 'ಕಚೇರಿಯ ವೇಳೆಯಲ್ಲಿ ವಾಹನಗಳ ದಟ್ಟಣೆಯಿಂದ ಹೊಗೆ ಹೆಚ್ಚಾಗಬಹುದು.'
    },
    'sanathnagar': {
        'character': 'heavy industrial manufacturing and chemical processing zone',
        'drivers': 'industrial stack plumes, solvent emissions, and heavy freight transit',
        'dynamics': 'Surface thermal inversions during nighttime and early mornings trap factory particulate matter near ground level.',
        'drivers_te': 'పారిశ్రామిక కర్మాగారాల పొగ (SO₂), రసాయన ఉద్గారాలు మరియు భారీ లారీల రాకపోకలు',
        'dynamics_te': 'రాత్రి మరియు ఉదయపు వేళల్లో కాలుష్య కారకాలు భూమికి సమీపంలో నిలిచిపోతాయి.',
        'drivers_hi': 'औद्योगिक कारखानों का धुआं (SO₂), सॉल्वैंट्स और भारी मालवाहक ट्रक',
        'dynamics_hi': 'रात और सुबह के समय फैक्ट्रियों का धुआं जमीन के पास जमा रहता है।',
        'drivers_kn': 'ಭಾರೀ ಕೈಗಾರಿಕಾ ಕಾರ್ಖಾನೆಗಳ ಹೊಗೆ (SO₂) ಮತ್ತು ಸರಕು ಲಾರಿಗಳ ಸಂಚಾರ',
        'dynamics_kn': 'ರಾತ್ರಿ ಮತ್ತು ಮುಂಜಾನೆ ಕಾರ್ಖಾನೆಗಳ ಹೊಗೆ ಕೆಳಮಟ್ಟದಲ್ಲೇ ನಿಲ್ಲುತ್ತದೆ.'
    },

    # ── DELHI NCR (Core Districts) ──
    'anand vihar': {
        'character': 'major inter-state transit terminal and trans-Yamuna industrial border',
        'drivers': 'interstate diesel bus exhaust, Ghazipur border freight, and road dust',
        'dynamics': 'Low wind speeds and basin topography create intense particulate trapping, especially during evening hours.',
        'drivers_te': 'అంతర్రాష్ట్ర బస్సుల పొగ మరియు సరిహద్దు లారీల రద్దీ',
        'dynamics_te': 'గాలి వేగం తక్కువగా ఉండటం వల్ల కాలుష్యం తీవ్రంగా పేరుకుపోతుంది.',
        'drivers_hi': 'अंतरराज्यीय बसें, सीमावर्ती ट्रकों का धुआं और सड़क की धूल',
        'dynamics_hi': 'कम हवा और बेसिन जैसी स्थिति के कारण शाम को भारी प्रदूषण जमा हो जाता है।'
    },
    'dwarka': {
        'character': 'planned open residential sub-city near IGI Airport',
        'drivers': 'aviation ground operations, airport corridor traffic, and peripheral open dust',
        'dynamics': 'Open terrain allows strong wind dispersion, maintaining moderate air quality during daytime.',
        'drivers_te': 'విమానాశ్రయ కారిడార్ మరియు విశాలమైన నివాస ప్రాంతాలు',
        'dynamics_te': 'విశాలమైన మైదానాల వల్ల గాలి బాగా వీచి కాలుష్యం చెదిరిపోతుంది.',
        'drivers_hi': 'एयरपोर्ट का गलियारा, खुली रिहायशी कॉलोनियां और धूल',
        'dynamics_hi': 'खुले मैदानों के कारण दिन में हवा चलने से प्रदूषण साफ रहता है।'
    },
    'chanakyapuri': {
        'character': 'diplomatic enclave with maximum urban tree canopy in Delhi',
        'drivers': 'low traffic density and extensive forest ridge buffer',
        'dynamics': 'Thick botanical canopy absorbs airborne particulate matter, maintaining the cleanest air in NCR.',
        'drivers_te': 'దౌత్యవేత్తల ప్రాంతం మరియు దట్టమైన చెట్ల పచ్చదనం',
        'dynamics_te': 'చెట్ల రక్షణ వల్ల ఢిల్లీ నగరంలోనే ఇది అత్యంత స్వచ్ఛమైన ప్రాంతం.',
        'drivers_hi': 'डिप्लोमैटिक क्षेत्र, घने पेड़ और रिज फॉरेस्ट का सुरक्षा घेरा',
        'dynamics_hi': 'घने पेड़ों के कारण यह पूरी दिल्ली में सबसे साफ और शुद्ध हवा वाला क्षेत्र है।'
    },
    'rohini': {
        'character': 'northern residential sector with peripheral industrial borders',
        'drivers': 'unpaved peripheral construction and northern bypass trucking',
        'dynamics': 'Daytime sunshine aids dispersion, but nighttime cooling causes ground-level particulate accumulation.',
        'drivers_te': 'నిర్మాణ రంగపు దుమ్ము మరియు బైపాస్ లారీల రాకపోకలు',
        'dynamics_te': 'పగలు గాలి బాగున్నా, రాత్రి వేళల్లో చల్లదనం వల్ల దుమ్ము పేరుకుపోతుంది.',
        'drivers_hi': 'कच्ची सड़कों की धूल, निर्माण कार्य और बाईपास के ट्रक',
        'dynamics_hi': 'दिन में हवा से राहत रहती है, रात में ठंड से धूल जमीन पर बैठ जाती है।'
    },

    # ── BENGALURU (Core Districts) ──
    'peenya': {
        'character': 'major industrial manufacturing cluster',
        'drivers': 'metal fabrication, chemical manufacturing, and heavy logistics freight',
        'dynamics': 'Industrial boiler emissions and logistics corridors keep PM2.5 and PM10 elevated near industrial zones.',
        'drivers_te': 'పీన్యా భారీ పారిశ్రామిక కర్మాగారాలు మరియు లారీల రద్దీ',
        'dynamics_te': 'పరిశ్రమల పొగ వల్ల పరిసర ప్రాంతాల్లో కాలుష్యం ఎక్కువగా ఉంటుంది.',
        'drivers_kn': 'ಪೀಣ್ಯ ಭಾರೀ ಕೈಗಾರಿಕೆಗಳು, ಲೋಹ ತಯಾರಿಕೆ ಮತ್ತು ಲಾರಿಗಳ ಹೊಗೆ',
        'dynamics_kn': 'ಕಾರ್ಖಾನೆಗಳ ಬಾಯ್ಲರ್ ಹೊಗೆಯಿಂದಾಗಿ ಕೈಗಾರಿಕಾ ಪ್ರದೇಶದಲ್ಲಿ ಮಾಲಿನ್ಯ ಹೆಚ್ಚಿರುತ್ತದೆ.'
    },
    'whitefield': {
        'character': 'eastern IT corridor and high-density residential zone',
        'drivers': 'construction dust from infrastructure and Outer Ring Road traffic',
        'dynamics': 'Commuter traffic creates morning and evening peaks, while open eastern winds provide midday relief.',
        'drivers_te': 'ఐటీ కంపెనీలు, నిర్మాణ దుమ్ము మరియు ట్రాఫిక్',
        'dynamics_te': 'ఉదయం మరియు సాయంత్రం రద్దీ వేళల్లో దుమ్ము పెరుగుతుంది.',
        'drivers_kn': 'ಐಟಿ ಕಾರಿಡಾರ್ ಸಂಚಾರ ಮತ್ತು ಕಟ್ಟಡ ಕಾಮಗಾರಿಗಳ ಧೂಳು',
        'dynamics_kn': 'ಬೆಳಗ್ಗೆ ಮತ್ತು ಸಂಜೆ ಟ್ರಾಫಿಕ್‌ನಿಂದ ಧೂಳು ಹೆಚ್ಚುತ್ತದೆ, ಮಧ್ಯಾಹ್ನ ಗಾಳಿ ಚೆನ್ನಾಗಿರುತ್ತದೆ.'
    },
    'silk board': {
        'character': 'critical southern transit choke point',
        'drivers': 'severe vehicular stop-and-go idling and vehicle exhaust',
        'dynamics': 'High-volume vehicular queueing causes localized exhaust accumulation during morning and evening rush.',
        'drivers_te': 'సిల్క్ బోర్డ్ ట్రాఫిక్ జంక్షన్ మరియు వాహనాల రద్దీ',
        'dynamics_te': 'ట్రాఫిక్ నిలిచిపోవడం వల్ల వాహన పొగ తీవ్రంగా పేరుకుపోతుంది.',
        'drivers_kn': 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಟ್ರಾಫಿಕ್ ಜಂಕ್ಷನ್ ಮತ್ತು ವಾಹನಗಳ ಭಾರಿ ಹೊಗೆ',
        'dynamics_kn': 'ವಾಹನಗಳು ನಿಲ್ಲುವುದರಿಂದ ಜಂಕ್ಷನ್‌ನಲ್ಲಿ ಹೊಗೆ ಮತ್ತು ಮಾಲಿನ್ಯ ತೀವ್ರವಾಗಿರುತ್ತದೆ.'
    },
    'cubbon park': {
        'character': 'historic urban lung space with century-old botanical canopy',
        'drivers': 'minimal localized emissions and central botanical filtration',
        'dynamics': 'Dense tree cover naturally captures and filters airborne particulates, providing the cleanest air in the city.',
        'drivers_te': 'కబ్బన్ పార్క్ చారిత్రక వృక్ష సంపద మరియు పచ్చదనం',
        'dynamics_te': 'పచ్చని చెట్లు గాలిలోని దుమ్మును శుద్ధి చేసి స్వచ్ఛంగా ఉంచుతాయి.',
        'drivers_kn': 'ಕಬ್ಬನ್ ಪಾರ್ಕ್ ಐತಿಹಾಸಿಕ ಹಸಿರು ಪರಿಸರ ಮತ್ತು ನೈಸರ್ಗಿಕ ಗಾಳಿ',
        'dynamics_kn': 'ದಟ್ಟವಾದ ಮರಗಳು ಗಾಳಿಯನ್ನು ನೈಸರ್ಗಿಕವಾಗಿ ಶುದ್ಧಗೊಳಿಸಿ ನಗರದಲ್ಲೇ ಅತ್ಯುತ್ತಮ ಗಾಳಿ ನೀಡುತ್ತವೆ.'
    }
}


class GeminiAdvisorClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY', '')
        if self.api_key and genai:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
            except Exception:
                self.model = None
        else:
            self.model = None

    def get_source_tailored_actions(self, aqi: int, primary_source: str, lang: str = 'English') -> Dict[str, str]:
        """
        Returns personalized health action bullet points tailored directly to the
        district's AQI level and dominant emission source (Vehicular, Industrial, Dust, Biomass, Clean).
        """
        src = (primary_source or 'vehicular').lower()
        is_clean = aqi <= 50

        if lang == 'Telugu':
            if is_clean:
                return {
                    'workout': 'బయట వ్యాయామాలకు, మార్నింగ్ వాక్‌కు అత్యంత అనుకూలం',
                    'ventilation': 'తాజా సహజ గాలి కోసం కిటికీలను స్వేచ్ఛగా తెరవండి',
                    'mask': 'మాస్క్ ధరించాల్సిన అవసరం లేదు',
                    'vulnerable': 'పిల్లలు, వృద్ధులు అందరికీ ఆరోగ్యకరమైన స్వచ్ఛమైన వాతావరణం'
                }
            if 'industr' in src:
                if aqi <= 100:
                    return {
                        'workout': 'ఉదయం వేళల్లో తేలికపాటి వ్యాయామాలు చేయవచ్చు',
                        'ventilation': 'మధ్యాహ్న సమయాల్లో పరిశ్రమలకు ఎదురుగా లేని కిటికీలు తెరవండి',
                        'mask': 'సాధారణ ప్రజలకు మాస్క్ అవసరం లేదు',
                        'vulnerable': 'ఆస్తమా ఉన్నవారు రాత్రి వేళల్లో జాగ్రత్త వహించండి'
                    }
                elif aqi <= 200:
                    return {
                        'workout': 'పరిశ్రమల పరిసరాల్లో తీవ్రమైన అవుట్‌డోర్ వ్యాయామాలు తగ్గించండి',
                        'ventilation': 'రాత్రి మరియు ఉదయం వేళల్లో కిటికీలు గట్టిగా మూసి ఉంచండి',
                        'mask': 'రసాయన పొగ నివారణకు N95 లేదా కార్బన్ ఫిల్టర్ మాస్క్ వాడండి',
                        'vulnerable': 'శ్వాసకోశ సమస్యలు ఉన్నవారు ఇన్హేలర్లు అందుబాటులో ఉంచుకోండి'
                    }
                else:
                    return {
                        'workout': 'అత్యవసరం: బయట వ్యాయామాలను పూర్తిగా నివారించండి',
                        'ventilation': 'గదులను మూసివేసి ఎయిర్ ప్యూరిఫైయర్ వాడండి',
                        'mask': 'హై-గ్రేడ్ రెస్పిరేటర్ మాస్క్ తప్పనిసరి',
                        'vulnerable': 'సున్నిత వర్గాల వారు పూర్తిగా ఇళ్లలోనే ఉండండి'
                    }
            elif 'dust' in src:
                if aqi <= 100:
                    return {
                        'workout': 'నిర్మాణ పనులు లేని పచ్చని ప్రదేశాల్లో వ్యాయామం చేయండి',
                        'ventilation': 'దుమ్ము ఎక్కువగా ఉన్నప్పుడు కిటికీలు పాక్షికంగా మూయండి',
                        'mask': 'దుమ్ము రోడ్లపై ప్రయాణించేటప్పుడు మాస్క్ మంచిది',
                        'vulnerable': 'కళ్లలో దుమ్ము పడకుండా ప్రొటెక్టివ్ గ్లాసెస్ వాడండి'
                    }
                else:
                    return {
                        'workout': 'రోడ్లపై మరియు నిర్మాణ ప్రాంతాల వద్ద వ్యాయామం చేయవద్దు',
                        'ventilation': 'దుమ్ము చేరకుండా కిటికీలు మూసి తడి గుడ్డతో తుడవండి',
                        'mask': 'PM10 దుమ్ము రేణువుల నిరోధానికి యాంటీ-డస్ట్ మాస్క్ ధరించండి',
                        'vulnerable': 'కళ్ల మంటలు, అలర్జీ ఉన్నవారు బయట తిరగడం తగ్గించండి'
                    }
            else: # Vehicular / Default
                if aqi <= 100:
                    return {
                        'workout': 'ట్రాఫిక్ తక్కువగా ఉన్న పార్కుల్లో వ్యాయామం చేయండి',
                        'ventilation': 'మధ్యాహ్న సమయాల్లో కిటికీలు తెరవవచ్చు',
                        'mask': 'రద్దీ రోడ్లపై ప్రయాణించేటప్పుడు మాస్క్ సిఫార్సు',
                        'vulnerable': 'రద్దీ కూడళ్ల వద్ద ఎక్కువ సమయం గడపవద్దు'
                    }
                elif aqi <= 200:
                    return {
                        'workout': 'రద్దీ వేళల్లో (ఉదయం 8-10, సాయంత్రం 6-9) బయట వ్యాయామాలు వద్దు',
                        'ventilation': 'రోడ్డు వైపు ఉన్న కిటికీలు రద్దీ వేళల్లో మూసి ఉంచండి',
                        'mask': 'వాహన పొగ (NO₂/PM2.5) నివారణకు N95 మాస్క్ ధరించండి',
                        'vulnerable': 'కారులో ప్రయాణించేటప్పుడు AC రీసర్క్యులేషన్ మోడ్ వాడండి'
                    }
                else:
                    return {
                        'workout': 'అత్యవసరం: బయట అన్ని రకాల శారీరక శ్రమలను నివారించండి',
                        'ventilation': 'కిటికీలు పూర్తిగా సీల్ చేసి ఎయిర్ ప్యూరిఫైయర్ నడపండి',
                        'mask': 'బయటకు వెళ్లేటప్పుడు హై-గ్రేడ్ N95 మాస్క్ తప్పనిసరి',
                        'vulnerable': 'పిల్లలు, వృద్ధులు మరియు ఆస్తమా రోగులు ఇంట్లోనే ఉండండి'
                    }

        elif lang == 'Hindi':
            if is_clean:
                return {
                    'workout': 'बाहरी व्यायाम, दौड़ और सैर के लिए सर्वोत्तम मौसम',
                    'ventilation': 'ताजी हवा के लिए खिड़कियां खुली रखें',
                    'mask': 'मास्क की कोई आवश्यकता नहीं है',
                    'vulnerable': 'बच्चों, बुजुर्गों और सभी नागरिकों के लिए सुरक्षित'
                }
            if 'industr' in src:
                if aqi <= 100:
                    return {
                        'workout': 'सामान्य बाहरी व्यायाम सुरक्षित है',
                        'ventilation': 'दोपहर में कमरों को हवादार बनाएं',
                        'mask': 'सामान्य नागरिकों के लिए मास्क जरूरी नहीं',
                        'vulnerable': 'संवेदनशील लोग रात में सावधानी बरतें'
                    }
                else:
                    return {
                        'workout': 'औद्योगिक क्षेत्रों के पास भारी व्यायाम से बचें',
                        'ventilation': 'रात और सुबह में कारखानों की तरफ की खिड़कियां बंद रखें',
                        'mask': 'सल्फर/केमिकल धुएं से बचाव के लिए N95 मास्क पहनें',
                        'vulnerable': 'अस्थमा रोगी इनहेलर पास रखें और घर के अंदर रहें'
                    }
            elif 'dust' in src:
                return {
                    'workout': 'सड़क किनारे व निर्माण स्थलों के पास दौड़ने से बचें',
                    'ventilation': 'धूल से बचाव के लिए खिड़कियां बंद रखें',
                    'mask': 'PM10 धूल कणों से बचाव के लिए डस्ट मास्क पहनें',
                    'vulnerable': 'आंखों में जलन से बचाव के लिए चश्मा पहनें'
                }
            else: # Vehicular
                if aqi <= 100:
                    return {
                        'workout': 'पार्क या कम ट्रैफिक वाले इलाकों में व्यायाम करें',
                        'ventilation': 'दोपहर में खिड़कियां खोल सकते हैं',
                        'mask': 'ट्रैफिक जाम में मास्क पहनना बेहतर है',
                        'vulnerable': 'व्यस्त चौराहों पर अधिक देर न रुकें'
                    }
                elif aqi <= 200:
                    return {
                        'workout': 'पीक ट्रैफिक घंटों (सुबह 8-10, शाम 6-9) में बाहरी व्यायाम न करें',
                        'ventilation': 'सड़क की ओर खुलने वाली खिड़कियां बंद रखें',
                        'mask': 'वाहनों के धुएं (NO₂/PM2.5) से बचाव के लिए N95 मास्क पहनें',
                        'vulnerable': 'वाहन में AC को री-सर्कुलेशन मोड पर चलाएं'
                    }
                else:
                    return {
                        'workout': 'आपातकाल: बाहरी शारीरिक गतिविधियों से पूरी तरह बचें',
                        'ventilation': 'कमरे सील रखें और एयर प्यूरीफायर चलाएं',
                        'mask': 'उच्च श्रेणी का N95 मास्क अनिवार्य',
                        'vulnerable': 'बुजुर्ग, बच्चे और सांस के मरीज घर के अंदर रहें'
                    }

        elif lang == 'Kannada':
            if is_clean:
                return {
                    'workout': 'ಹೊರಾಂಗಣ ವ್ಯಾಯಾಮ ಮತ್ತು ನಡಿಗೆಗೆ ಅತ್ಯುತ್ತಮ',
                    'ventilation': 'ತಾಜಾ ನೈಸರ್ಗಿಕ ಗಾಳಿಗಾಗಿ ಕಿಟಕಿಗಳನ್ನು ತೆರೆಯಿರಿ',
                    'mask': 'ಮಾಸ್ಕ್ ಅಗತ್ಯವಿಲ್ಲ',
                    'vulnerable': 'ಎಲ್ಲರಿಗೂ ಆರೋಗ್ಯಕರ ಮತ್ತು ಸುರಕ್ಷಿತ ವಾತಾವರಣ'
                }
            if 'industr' in src:
                return {
                    'workout': 'ಕೈಗಾರಿಕಾ ಪ್ರದೇಶಗಳ ಬಳಿ ಕಠಿಣ ವ್ಯಾಯಾಮ ತಪ್ಪಿಸಿ',
                    'ventilation': 'ರಾತ್ರಿ ಮತ್ತು ಮುಂಜಾನೆ ಕಿಟಕಿಗಳನ್ನು ಮುಚ್ಚಿಡಿ',
                    'mask': 'ರಾಸಾಯನಿಕ ಹೊಗೆಯಿಂದ ರಕ್ಷಣೆಗೆ N95 ಮಾಸ್ಕ್ ಧರಿಸಿ',
                    'vulnerable': 'ಉಸಿರಾಟದ ಸಮಸ್ಯೆಯಿರುವವರು ಮನೆಯಲ್ಲೇ ಇರಿ'
                }
            elif 'dust' in src:
                return {
                    'workout': 'ಕಟ್ಟಡ ಕಾಮಗಾರಿಗಳ ಬಳಿ ವ್ಯಾಯಾಮ ತಪ್ಪಿಸಿ',
                    'ventilation': 'ಧೂಳು ಬರದಂತೆ ಕಿಟಕಿಗಳನ್ನು ಮುಚ್ಚಿಡಿ',
                    'mask': 'ಧೂಳಿನ ಕಣಗಳ ತಡೆಗೆ ಆಂಟಿ-ಡಸ್ಟ್ ಮಾಸ್ಕ್ ಧರಿಸಿ',
                    'vulnerable': 'ಕಣ್ಣಿನ ರಕ್ಷಣೆಗೆ ಕನ್ನಡಕ ಧರಿಸಿ'
                }
            else: # Vehicular
                if aqi <= 100:
                    return {
                        'workout': 'ಕಡಿಮೆ ಟ್ರಾಫಿಕ್ ಇರುವ ಉದ್ಯಾನವನಗಳಲ್ಲಿ ವ್ಯಾಯಾಮ ಮಾಡಿ',
                        'ventilation': 'ಮಧ್ಯಾಹ್ನ ಕಿಟಕಿಗಳನ್ನು ತೆರೆಯಬಹುದು',
                        'mask': 'ಟ್ರಾಫಿಕ್‌ನಲ್ಲಿ ಮಾಸ್ಕ್ ಧರಿಸುವುದು ಉತ್ತಮ',
                        'vulnerable': 'ದಟ್ಟಣೆಯ ಜಂಕ್ಷನ್‌ಗಳಿಂದ ದೂರವಿರಿ'
                    }
                else:
                    return {
                        'workout': 'ಪೀಕ್ ಟ್ರಾಫಿಕ್ ಸಮಯದಲ್ಲಿ ಹೊರಾಂಗಣ ವ್ಯಾಯಾಮ ತಪ್ಪಿಸಿ',
                        'ventilation': 'ರಸ್ತೆ ಕಡೆಗಿನ ಕಿಟಕಿಗಳನ್ನು ಮುಚ್ಚಿಡಿ',
                        'mask': 'ವಾಹನಗಳ ಹೊಗೆಯಿಂದ ರಕ್ಷಣೆಗೆ N95 ಮಾಸ್ಕ್ ಧರಿಸಿ',
                        'vulnerable': 'ಮಕ್ಕಳು ಮತ್ತು ಹಿರಿಯರು ಮನೆಯಲ್ಲೇ ಇರಿ'
                    }

        else: # English
            if is_clean:
                return {
                    'workout': 'Ideal for all outdoor sports, running, and morning workouts',
                    'ventilation': 'Open windows freely for pure natural ventilation',
                    'mask': 'No mask required',
                    'vulnerable': 'Safe, pristine, and healthy air quality for all age groups'
                }
            if 'industr' in src:
                if aqi <= 100:
                    return {
                        'workout': 'Safe for normal outdoor workouts away from manufacturing stacks',
                        'ventilation': 'Ventilate living spaces during daytime solar convective hours',
                        'mask': 'No mask needed for general public during daytime',
                        'vulnerable': 'Asthma patients take normal precautions during nighttime hours'
                    }
                elif aqi <= 200:
                    return {
                        'workout': 'Avoid strenuous outdoor workouts downwind of industrial plants',
                        'ventilation': 'Keep windows facing industrial estates sealed at night and early mornings',
                        'mask': 'N95 / activated carbon mask recommended against chemical particulates',
                        'vulnerable': 'Respiratory patients keep inhalers accessible and stay indoors'
                    }
                else:
                    return {
                        'workout': 'Health Alert: Strictly avoid all outdoor physical exertion',
                        'ventilation': 'Seal windows firmly and run indoor HEPA air purifiers',
                        'mask': 'High-grade chemical/particulate respirator mandatory outdoors',
                        'vulnerable': 'Emergency alert: Sensitive groups and seniors stay strictly indoors'
                    }
            elif 'dust' in src:
                if aqi <= 100:
                    return {
                        'workout': 'Exercise in paved park corridors away from construction sites',
                        'ventilation': 'Partially close windows facing active road excavation',
                        'mask': 'Light anti-dust covering recommended on unpaved roads',
                        'vulnerable': 'Wear protective eyewear against coarse grit while commuting'
                    }
                else:
                    return {
                        'workout': 'Avoid running near unpaved roads and active civil construction',
                        'ventilation': 'Keep doors and windows sealed against coarse dust infiltration',
                        'mask': 'Anti-dust N95 mask recommended to filter abrasive PM10 particulates',
                        'vulnerable': 'Allergy and eye sensitivity patients limit outdoor exposure'
                    }
            elif 'biomass' in src:
                return {
                    'workout': 'Avoid outdoor cardio during morning and evening smoke haze',
                    'ventilation': 'Keep windows tightly sealed during evening smoldering hours',
                    'mask': 'N95 mask recommended to filter fine organic carbon smoke',
                    'vulnerable': 'Children and seniors avoid outdoor areas affected by smoke plumes'
                }
            else: # Vehicular
                if aqi <= 100:
                    return {
                        'workout': 'Safe for exercise in neighborhood parks away from arterial highways',
                        'ventilation': 'Good time to ventilate living spaces between 12:00 PM and 4:00 PM',
                        'mask': 'No mask required for general public; optional in peak traffic',
                        'vulnerable': 'Sensitive individuals take precautions near arterial transit hubs'
                    }
                elif aqi <= 200:
                    return {
                        'workout': 'Shift outdoor cardio outside peak rush hours (8-10 AM & 6-9 PM)',
                        'ventilation': 'Keep street-facing windows closed during morning/evening commute',
                        'mask': 'N95 mask recommended against tailpipe fine soot and NO2',
                        'vulnerable': 'Commuters use AC recirculation mode; sensitive groups stay indoors'
                    }
                else:
                    return {
                        'workout': 'Health Alert: Strictly avoid all physical exertion outdoors',
                        'ventilation': 'Keep doors and windows sealed and run indoor air purifiers',
                        'mask': 'High-grade N95 respirator mandatory when commuting',
                        'vulnerable': 'Emergency alert: Children and elderly should remain strictly indoors'
                    }

    def generate_advisory(
        self,
        forecast: Dict[str, Any],
        attribution: Dict[str, Any],
        language: str = 'English',
        city: str = 'Delhi',
        reading: Dict[str, Any] = None,
        mode: str = 'city_forecast',
        district_name: str = None,
        district_aqi: float = None,
        best_districts: List[str] = None,
        worst_districts: List[str] = None
    ) -> Dict[str, Any]:
        """
        Generates unified multilingual natural language citizen advisory personalized for each district,
        incorporating exact ML Source Attribution (Vehicular, Industrial, Dust, Biomass) and microclimate dynamics.
        """
        reading = reading or {}
        points = forecast.get('points', [35.0])
        raw_pm25_forecast = float(points[0] if points else 35.0)
        forecast_aqi = pm25_to_aqi(raw_pm25_forecast)
        
        live_pm25 = round(float(reading.get('pm25', 25.0)), 1)
        live_pm10 = round(float(reading.get('pm10', live_pm25 * 1.5)), 1)
        live_no2 = round(float(reading.get('no2', 25.0)), 1)
        live_so2 = round(float(reading.get('so2', 10.0)), 1)
        live_aqi = round(float(district_aqi if district_aqi is not None else reading.get('aqi', 75)))
        
        target_name = district_name or f'{city} City Center'
        lang = (language or 'English').title()
        
        best_str = ', '.join(best_districts[:2]) if best_districts else 'residential zones'
        worst_str = ', '.join(worst_districts[:2]) if worst_districts else 'industrial corridors'
        
        def aqi_cat(val):
            if val <= 50: return 'Good', 'మంచిది', 'अच्छी', 'ಉತ್ತಮ'
            if val <= 100: return 'Moderate', 'మితమైనది', 'मध्यम', 'ಮಧ್ಯಮ'
            if val <= 150: return 'Unhealthy for Sensitive Groups', 'సున్నిత వర్గాలకు అహితం', 'संवेदनशील समूहों के लिए अस्वस्थ', 'ಸೂಕ್ಷ್ಮ ಜನರಿಗೆ ಅಹಿತಕರ'
            if val <= 200: return 'Unhealthy', 'అనారోగ్యకరం', 'अस्वस्थ', 'ಅನಾರೋಗ್ಯಕರ'
            if val <= 300: return 'Very Unhealthy', 'తీవ్ర అనారోగ్యకరం', 'बहुत अस्वस्थ', 'ಬಹಳ ಅನಾರೋಗ್ಯಕರ'
            return 'Hazardous', 'ప్రమాదకరం', 'खतरनाक', 'ಅಪಾಯಕಾರಿ'

        active_level = live_aqi if mode == 'district_live' else forecast_aqi
        cat_en, cat_te, cat_hi, cat_kn = aqi_cat(active_level)

        # ── Parse ML Source Attribution Distribution ──
        probs = attribution.get('probabilities', {}) if attribution else {}
        sorted_sources = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        
        if sorted_sources:
            primary_source, primary_prob = sorted_sources[0]
            secondary_source, secondary_prob = sorted_sources[1] if len(sorted_sources) > 1 else ('', 0.0)
        else:
            primary_source, primary_prob = 'vehicular', 0.65
            secondary_source, secondary_prob = 'dust', 0.20

        # Format clean percentage breakdown for UI badge/summary
        primary_pct = round(primary_prob * 100)
        secondary_pct = round(secondary_prob * 100)

        # Lookup microclimate intelligence
        dist_key = (target_name or '').lower().strip()
        profile = DISTRICT_MICROCLIMATE_PROFILES.get(dist_key)
        if not profile:
            for k, p in DISTRICT_MICROCLIMATE_PROFILES.items():
                if k in dist_key or dist_key in k:
                    profile = p
                    break

        actions = self.get_source_tailored_actions(active_level, primary_source, lang)

        # Build unified comprehensive natural text with bolded headers
        if mode == 'district_live':
            if profile:
                char_desc = profile.get('character', 'urban sector')
                drivers_desc = profile.get('drivers', 'local vehicular flow and ambient background')
                dyn_desc = profile.get('dynamics', 'Daytime solar ventilation maintains active dispersion.')
                drivers_te = profile.get('drivers_te', 'స్థానిక వాహనాల రాకపోకలు మరియు రహదారి ఉద్గారాలు')
                dyn_te = profile.get('dynamics_te', 'పగటిపూట గాలి ప్రసరణ వల్ల కాలుష్యం తగ్గుతుంది.')
                drivers_hi = profile.get('drivers_hi', 'स्थानीय वाहनों का धुआं और सामान्य आवाजाही')
                dyn_hi = profile.get('dynamics_hi', 'दिन के समय धूप और हवा से प्रदूषण आसानी से बिखर जाता है।')
                drivers_kn = profile.get('drivers_kn', 'ಸ್ಥಳೀಯ ವಾಹನ ಸಂಚಾರ ಮತ್ತು ರಸ್ತೆ ಧೂಳು')
                dyn_kn = profile.get('dynamics_kn', 'ಹಗಲಿನಲ್ಲಿ ಗಾಳಿ ಉತ್ತಮವಾಗಿರುತ್ತದೆ.')
            else:
                # Dynamic fallback derived from ML source attribution
                if 'industr' in primary_source:
                    char_desc = 'manufacturing & industrial manufacturing cluster'
                    drivers_desc = f'industrial boiler stack emissions ({primary_pct}%) and heavy freight transport ({secondary_pct}%)'
                    dyn_desc = 'Thermal inversion traps stack plumes near ground level during night and early morning hours.'
                    drivers_te = f'కర్మాగారాల బాయిలర్ల పొగ ({primary_pct}%) మరియు సరుకు లారీల రద్దీ ({secondary_pct}%)'
                    dyn_te = 'రాత్రి మరియు ఉదయపు వేళల్లో చల్లదనం వల్ల కర్మాగారాల పొగ నేలపైనే నిలిచిపోతుంది.'
                    drivers_hi = f'कारखानों के धुएं ({primary_pct}%) और भारी ट्रकों की आवाजाही ({secondary_pct}%)'
                    dyn_hi = 'रात और सुबह में ठंड के कारण फैक्ट्रियों का धुआं जमीन के पास जमा रहता है।'
                    drivers_kn = f'ಕೈಗಾರಿಕಾ ಬಾಯ್ಲರ್ ಹೊಗೆ ({primary_pct}%) ಮತ್ತು ಲಾರಿಗಳ ಸಂಚಾರ ({secondary_pct}%)'
                    dyn_kn = 'ರಾತ್ರಿ ವೇಳೆ ಕಾರ್ಖಾನೆಗಳ ಹೊಗೆ ಕೆಳಮಟ್ಟದಲ್ಲೇ ಶೇಖರಣೆಯಾಗುತ್ತದೆ.'
                elif 'dust' in primary_source:
                    char_desc = 'active infrastructure & commercial transit zone'
                    drivers_desc = f'civil construction dust ({primary_pct}%) and unpaved road mechanical suspension ({secondary_pct}%)'
                    dyn_desc = 'Dry afternoon wind conditions promote coarse PM10 particulate suspension across roadways.'
                    drivers_te = f'నిర్మాణ రంగపు దుమ్ము ({primary_pct}%) మరియు రోడ్డు ధూళి రేణువులు ({secondary_pct}%)'
                    dyn_te = 'ఎండ మరియు గాలి వేగం వల్ల దుమ్ము రేణువులు గాలిలో తేలియాడుతాయి.'
                    drivers_hi = f'निर्माण कार्यों की धूल ({primary_pct}%) और सड़क की मिट्टी ({secondary_pct}%)'
                    dyn_hi = 'दोपहर में हवा चलने से धूल के कण हवा में उड़ते हैं।'
                    drivers_kn = f'ಕಟ್ಟಡ ಕಾಮಗಾರಿಗಳ ಧೂಳು ({primary_pct}%) ಮತ್ತು ರಸ್ತೆ ಧೂಳು ({secondary_pct}%)'
                    dyn_kn = 'ಗಾಳಿಯ ವೇಗದಿಂದ ಧೂಳಿನ ಕಣಗಳು ಹೆಚ್ಚಾಗುತ್ತವೆ.'
                else:
                    char_desc = 'arterial commuter transit corridor'
                    drivers_desc = f'heavy stop-and-go vehicular exhaust ({primary_pct}%) and local commuter movement ({secondary_pct}%)'
                    dyn_desc = 'Daytime convective mixing keeps particulates dispersed, with rush-hour emission peaks between 8-10 AM and 6-9 PM.'
                    drivers_te = f'వాహనాల రద్దీ మరియు డీజిల్ పొగ ({primary_pct}%)'
                    dyn_te = 'ఉదయం మరియు సాయంత్రం రద్దీ సమయాల్లో వాహన పొగ పెరుగుతుంది.'
                    drivers_hi = f'वाहनों का धुआं ({primary_pct}%) और पीक-आवर ट्रैफिक जाम ({secondary_pct}%)'
                    dyn_hi = 'सुबह 8-10 और शाम 6-9 बजे ट्रैफिक के कारण धुआं बढ़ जाता है।'
                    drivers_kn = f'ವಾಹನಗಳ ದಟ್ಟಣೆ ಮತ್ತು ಹೊಗೆ ({primary_pct}%)'
                    dyn_kn = 'ಬೆಳಗ್ಗೆ ಮತ್ತು ಸಂಜೆ ಟ್ರಾಫಿಕ್ ಸಮಯದಲ್ಲಿ ಹೊಗೆ ಹೆಚ್ಚಾಗುತ್ತದೆ.'

            # Source attribution localized label
            src_label_en = primary_source.replace('_', ' ').title()
            src_text_en = f'Primary Source: **{src_label_en} ({primary_pct}%)**' + (f', Secondary: **{secondary_source.title()} ({secondary_pct}%)**' if secondary_prob > 0.15 else '')
            
            src_map_te = {'vehicular': 'వాహనాల పొగ', 'industrial': 'కర్మాగారాల పొగ', 'dust': 'నిర్మాణ దుమ్ము', 'biomass': 'వ్యర్థాల దహనం'}
            src_label_te = src_map_te.get(primary_source, 'వాహనాల రద్దీ')
            src_text_te = f'ప్రధాన కాలుష్య కారకం: **{src_label_te} ({primary_pct}%)**'

            src_map_hi = {'vehicular': 'वाहनों का धुआं', 'industrial': 'औद्योगिक उत्सर्जन', 'dust': 'सड़क/निर्माण धूल', 'biomass': 'कचरा दहन'}
            src_label_hi = src_map_hi.get(primary_source, 'वाहनों का धुआं')
            src_text_hi = f'मुख्य प्रदूषण स्रोत: **{src_label_hi} ({primary_pct}%)**'

            src_map_kn = {'vehicular': 'ವಾಹನಗಳ ಹೊಗೆ', 'industrial': 'ಕೈಗಾರಿಕಾ ಹೊಗೆ', 'dust': 'ಕಟ್ಟಡ ಧೂಳು', 'biomass': 'ತ್ಯಾಜ್ಯ ದಹನ'}
            src_label_kn = src_map_kn.get(primary_source, 'ವಾಹನಗಳ ಹೊಗೆ')
            src_text_kn = f'ಪ್ರಮುಖ ಮಾಲಿನ್ಯ ಮೂಲ: **{src_label_kn} ({primary_pct}%)**'

            if lang == 'Telugu':
                header = f'**{target_name} లో ప్రత్యక్ష వాతావరణం (AQI {live_aqi} • {cat_te} • PM2.5: {live_pm25} µg/m³):**'
                summary = f'ప్రస్తుతం {target_name} లో గాలి నాణ్యత {cat_te} గా ఉంది. {src_text_te}. ఇక్కడ {drivers_te} ప్రధాన ప్రభావం చూపుతున్నాయి. {dyn_te}'
                bullets = (
                    f"

• **వ్యాయామం:** {actions.get('workout', 'వ్యాయామాలకు అనుకూలం')}
"
                    f"• **కిటికీలు/గాలి:** {actions.get('ventilation', 'కిటికీలు తెరవండి')}
"
                    f"• **మాస్క్ సలహా:** {actions.get('mask', 'మాస్క్ అవసరం లేదు')}
"
                    f"• **సున్నిత వర్గాలు:** {actions.get('vulnerable', 'జాగ్రత్త వహించండి')}"
                )
                full_text = f'{header}
{summary}{bullets}'

            elif lang == 'Hindi':
                header = f'**{target_name} में लाइव वायु गुणवत्ता (AQI {live_aqi} • {cat_hi} • PM2.5: {live_pm25} µg/m³):**'
                summary = f'वर्तमान में {target_name} में वायु गुणवत्ता {cat_hi} है। {src_text_hi}। {drivers_hi} के कारण स्थानीय स्तर पर प्रभाव देखा जा रहा है। {dyn_hi}'
                bullets = (
                    f"

• **बाहरी व्यायाम:** {actions.get('workout', 'सुरक्षित')}
"
                    f"• **हवादार कमरे:** {actions.get('ventilation', 'खिड़कियां खोलें')}
"
                    f"• **मास्क सलाह:** {actions.get('mask', 'आवश्यक नहीं')}
"
                    f"• **संवेदनशील समूह:** {actions.get('vulnerable', 'सावधानी रखें')}"
                )
                full_text = f'{header}
{summary}{bullets}'

            elif lang == 'Kannada':
                header = f'**{target_name} ನಲ್ಲಿ ನೇರ ವಾಯು ಗುಣಮಟ್ಟ (AQI {live_aqi} • {cat_kn}):**'
                summary = f'ಪ್ರಸ್ತುತ {target_name} ನಲ್ಲಿ ಗಾಳಿ ಗುಣಮಟ್ಟ {cat_kn} ಆಗಿದೆ. {src_text_kn}. {drivers_kn} ಪ್ರಮುಖ ಕಾರಣವಾಗಿದೆ. {dyn_kn}'
                bullets = (
                    f"

• **ವ್ಯಾಯಾಮ:** {actions.get('workout', 'ಸೂಕ್ತ')}
"
                    f"• **ವಾತಾಯನ:** {actions.get('ventilation', 'ತೆರೆಯಿರಿ')}
"
                    f"• **ಮಾಸ್ಕ್ ಸಲಹೆ:** {actions.get('mask', 'ಅಗತ್ಯವಿಲ್ಲ')}
"
                    f"• **ಸೂಕ್ಷ್ಮ ಜನರು:** {actions.get('vulnerable', 'ಎಚ್ಚರಿಕೆ')}"
                )
                full_text = f'{header}
{summary}{bullets}'

            else: # English
                header = f'**Live Conditions for {target_name} (AQI {live_aqi} • {cat_en} • PM2.5: {live_pm25} µg/m³):**'
                summary = f'Air quality across {target_name} is currently {cat_en}. {src_text_en}. As a {char_desc}, the area is influenced by {drivers_desc}. {dyn_desc}'
                bullets = (
                    f"

• **Outdoor Exercise:** {actions.get('workout', 'Safe for workouts')}
"
                    f"• **Home Ventilation:** {actions.get('ventilation', 'Open windows')}
"
                    f"• **Mask Advisory:** {actions.get('mask', 'No mask needed')}
"
                    f"• **Sensitive Groups:** {actions.get('vulnerable', 'Normal precautions')}"
                )
                full_text = f'{header}
{summary}{bullets}'

        else: # Mode == 'city_forecast'
            if lang == 'Telugu':
                header = f'**{city} ప్రాంతానికి 24 గంటల సూచన (అంచనా AQI {forecast_aqi} • {cat_te}):**'
                if forecast_aqi <= 60:
                    summary = f'రాబోయే 24 గంటల్లో {city} నగరంలో గాలి నాణ్యత సంతృప్తికరంగా ఉండే అవకాశం ఉంది. {best_str} ప్రాంతాలలో గాలి స్వచ్ఛంగా ఉంటుంది, కానీ {worst_str} పరిసరాల్లో సాయంత్రం వేళల్లో కాలుష్యం కొద్దిగా పెరగవచ్చు.'
                elif forecast_aqi <= 120:
                    summary = f'రాబోయే 24 గంటల్లో {city} లో గాలి నాణ్యత మితంగా ఉంటుంది. పగటిపూట గాలి వేగం వల్ల కాలుష్యం తగ్గుతుంది, కానీ రాత్రి వేళల్లో {worst_str} ప్రాంతాల్లో నివాసితులు జాగ్రత్త వహించాలి.'
                else:
                    summary = f'రాబోయే 24 గంటల్లో {city} లో కాలుష్యం పెరిగే అవకాశం ఉంది. {worst_str} వంటి రద్దీ ప్రదేశాలలో కాలుష్య తీవ్రత ఎక్కువగా ఉంటుంది.'

                bullets = (
                    f"

• **వ్యాయామం:** {actions.get('workout', 'వ్యాయామాలకు అనుకూలం')}
"
                    f"• **కిటికీలు/గాలి:** {actions.get('ventilation', 'కిటికీలు తెరవండి')}
"
                    f"• **మాస్క్ సలహా:** {actions.get('mask', 'మాస్క్ అవసరం లేదు')}
"
                    f"• **సున్నిత వర్గాలు:** {actions.get('vulnerable', 'జాగ్రత్త వహించండి')}"
                )
                full_text = f'{header}
{summary}{bullets}'

            elif lang == 'Hindi':
                header = f'**{city} क्षेत्र के लिए 24 घंटे का पूर्वानुमान (पूर्वानुमानित AQI {forecast_aqi} • {cat_hi}):**'
                if forecast_aqi <= 60:
                    summary = f'अगले 24 घंटों में {city} में वायु गुणवत्ता संतोषजनक रहने का अनुमान है। {best_str} जैसे क्षेत्रों में हवा अच्छी रहेगी, जबकि {worst_str} के पास शाम को हल्का प्रदूषण देखा जा सकता है।'
                elif forecast_aqi <= 120:
                    summary = f'अगले 24 घंटों में {city} में वायु गुणवत्ता मध्यम रहेगी। दोपहर में धूप और हवा से राहत मिलेगी, पर रात में {worst_str} की ओर सावधानी रखें।'
                else:
                    summary = f'अगले 24 घंटों में {city} में वायु प्रदूषण बढ़ने की संभावना है। {worst_str} जैसे औद्योगिक इलाकों में विशेष सतर्कता बरतें।'

                bullets = (
                    f"

• **बाहरी व्यायाम:** {actions.get('workout', 'सुरक्षित')}
"
                    f"• **हवादार कमरे:** {actions.get('ventilation', 'खिड़कियां खोलें')}
"
                    f"• **मास्क सलाह:** {actions.get('mask', 'आवश्यक नहीं')}
"
                    f"• **संवेदनशील समूह:** {actions.get('vulnerable', 'सावधानी रखें')}"
                )
                full_text = f'{header}
{summary}{bullets}'

            elif lang == 'Kannada':
                header = f'**{city} ನಗರಕ್ಕೆ 24 ಗಂಟೆಗಳ ಮುನ್ಸೂಚನೆ (ಅಂದಾಜು AQI {forecast_aqi} • {cat_kn}):**'
                summary = f'ಮುಂದಿನ 24 ಗಂಟೆಗಳಲ್ಲಿ {city} ನಲ್ಲಿ ವಾಯು ಗುಣಮಟ್ಟ {cat_kn} ಆಗಿರುವ ಸಾಧ್ಯತೆಯಿದೆ. {best_str} ಪ್ರದೇಶಗಳಲ್ಲಿ ಶುದ್ಧ ಗಾಳಿ ಇರುತ್ತದೆ, ಆದರೆ {worst_str} ಬಳಿ ಮಾಲಿನ್ಯ ಹೆಚ್ಚಿರಬಹುದು.'
                bullets = (
                    f"

• **ವ್ಯಾಯಾಮ:** {actions.get('workout', 'ಸೂಕ್ತ')}
"
                    f"• **ವಾತಾಯನ:** {actions.get('ventilation', 'ತೆರೆಯಿರಿ')}
"
                    f"• **ಮಾಸ್ಕ್ ಸಲಹೆ:** {actions.get('mask', 'ಅಗತ್ಯವಿಲ್ಲ')}
"
                    f"• **ಸೂಕ್ಷ್ಮ ಜನರು:** {actions.get('vulnerable', 'ಎಚ್ಚರಿಕೆ')}"
                )
                full_text = f'{header}
{summary}{bullets}'

            else: # English
                header = f'**24-Hour Forecast Outlook for {city} Region (Projected AQI {forecast_aqi} • {cat_en}):**'
                if forecast_aqi <= 60:
                    summary = f'For {city} over the next 24 hours, overall air quality is expected to remain Satisfactory. Residential areas like **{best_str}** will enjoy cleaner air, while corridors near **{worst_str}** may see mild evening particulate spikes.'
                elif forecast_aqi <= 120:
                    summary = f'For {city} over the next 24 hours, air quality is forecasted to remain Moderate. Daytime solar ventilation will disperse pollutants, but localized traffic around **{worst_str}** will keep evening concentrations elevated.'
                else:
                    summary = f'For {city} over the next 24 hours, air pollution is forecasted to elevate into the Unhealthy range. Corridors around **{worst_str}** will experience peak smog; vulnerable citizens should plan indoor activities.'

                bullets = (
                    f"

• **Outdoor Exercise:** {actions.get('workout', 'Safe for normal exercise')}
"
                    f"• **Home Ventilation:** {actions.get('ventilation', 'Good time to ventilate')}
"
                    f"• **Mask Advisory:** {actions.get('mask', 'No mask required')}
"
                    f"• **Sensitive Groups:** {actions.get('vulnerable', 'Sensitive individuals take precautions')}"
                )
                full_text = f'{header}
{summary}{bullets}'

        # If live Gemini API key is configured, enrich the text with Gemini AI
        if self.model:
            try:
                prompt = f"""
                You are a public health air quality expert for {city}, India.
                Context:
                - Mode: {mode} (Target: {target_name})
                - AQI: {active_level} ({cat_en})
                - Primary Source: {primary_source} ({primary_pct}%)
                - Secondary Source: {secondary_source} ({secondary_pct}%)
                - Language: {lang}
                - Cleanest areas: {best_str}
                - Peak pollution areas: {worst_str}

                Draft a concise, beautifully formatted citizen advisory in {lang}.
                Include a 2-sentence situational summary mentioning the dominant pollution source, followed by 4 bullet points:
                • Outdoor Exercise:
                • Home Ventilation:
                • Mask Advisory:
                • Sensitive Groups:

                Respond strictly in {lang} with bold headers and bullet points.
                """
                resp = self.model.generate_content(prompt)
                if resp and resp.text:
                    full_text = resp.text.strip()
            except Exception:
                pass # Gracefully use structured template

        return {
            'advisory': full_text,
            'language': lang,
            'city': city,
            'mode': mode,
            'target_name': target_name,
            'aqi_level': active_level,
            'aqi_category': cat_en,
            'primary_source': primary_source,
            'source_attribution': {
                'primary': primary_source,
                'primary_pct': primary_pct,
                'secondary': secondary_source,
                'secondary_pct': secondary_pct
            },
            'actions': actions
        }
'''

with open(r'agent_advisor/src/gemini_client.py', 'w', encoding='utf-8') as f:
    f.write(code)
