/**
 * Mock citizen advisory data.
 * Simulates Gemini LLM multilingual output + exposure-dose calculations.
 */

export interface Advisory {
  ward_name: string;
  aqi: number;
  forecast_trend: 'rising' | 'stable' | 'falling';
  dominant_source: string;
  exposure_dose_outdoor: number;  // µg/h
  exposure_dose_indoor: number;   // µg/h
  schools_nearby: number;
  hospitals_nearby: number;
  advisories: {
    en: string;
    hi: string;
    kn: string;
  };
}

export const advisoryData: Advisory[] = [
  {
    ward_name: 'Anand Vihar',
    aqi: 338,
    forecast_trend: 'rising',
    dominant_source: 'Vehicular Emissions',
    exposure_dose_outdoor: 142,
    exposure_dose_indoor: 28,
    schools_nearby: 12,
    hospitals_nearby: 3,
    advisories: {
      en: '⚠️ SEVERE: Outdoor exercise is strongly discouraged. Keep windows closed and use air purifiers. Parents should avoid sending children to outdoor activities. Outdoor workers should wear N95 masks and take hourly breaks indoors.',
      hi: '⚠️ गंभीर: बाहर व्यायाम करने से बचें। खिड़कियाँ बंद रखें और एयर प्यूरीफायर का उपयोग करें। बच्चों को बाहरी गतिविधियों में न भेजें। बाहर काम करने वालों को N95 मास्क पहनना चाहिए।',
      kn: '⚠️ ತೀವ್ರ: ಹೊರಾಂಗಣ ವ್ಯಾಯಾಮವನ್ನು ಬಲವಾಗಿ ನಿರುತ್ಸಾಹಗೊಳಿಸಲಾಗಿದೆ. ಕಿಟಕಿಗಳನ್ನು ಮುಚ್ಚಿ ಮತ್ತು ಏರ್ ಪ್ಯೂರಿಫಯರ್ ಬಳಸಿ.',
    },
  },
  {
    ward_name: 'RK Puram',
    aqi: 222,
    forecast_trend: 'stable',
    dominant_source: 'Mixed (Vehicular + Dust)',
    exposure_dose_outdoor: 96,
    exposure_dose_indoor: 19,
    schools_nearby: 8,
    hospitals_nearby: 2,
    advisories: {
      en: '🟠 POOR: Walk children to school before 8 AM when outdoor dose is lower (45 µg/h). After 9 AM, dose rises to 96 µg/h. Sensitive groups should limit outdoor time to under 30 minutes.',
      hi: '🟠 खराब: सुबह 8 बजे से पहले बच्चों को स्कूल ले जाएं जब बाहरी खुराक कम होती है। 9 बजे के बाद, खुराक 96 µg/h तक बढ़ जाती है।',
      kn: '🟠 ಕಳಪೆ: ಬೆಳಿಗ್ಗೆ 8 ಗಂಟೆಗೆ ಮೊದಲು ಮಕ್ಕಳನ್ನು ಶಾಲೆಗೆ ನಡೆಸಿಕೊಂಡು ಹೋಗಿ. 9 ಗಂಟೆಯ ನಂತರ ಡೋಸ್ 96 µg/h ಗೆ ಏರುತ್ತದೆ.',
    },
  },
];

export const languageLabels: Record<string, string> = {
  en: 'English',
  hi: 'हिंदी',
  kn: 'ಕನ್ನಡ',
};
