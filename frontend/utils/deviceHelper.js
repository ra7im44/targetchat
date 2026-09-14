/**
 * Device & Country parsing utility for TargetChat Admin
 * Directly matching U-Axis Admin SPA conventions
 */

export const countryMap = {
  EG: 'Egypt', SA: 'Saudi Arabia', AE: 'UAE', US: 'United States', GB: 'United Kingdom',
  DE: 'Germany', FR: 'France', TR: 'Turkey', IQ: 'Iraq', JO: 'Jordan', KW: 'Kuwait',
  QA: 'Qatar', BH: 'Bahrain', OM: 'Oman', LB: 'Lebanon', SY: 'Syria', PS: 'Palestine',
  LY: 'Libya', TN: 'Tunisia', DZ: 'Algeria', MA: 'Morocco', SD: 'Sudan', YE: 'Yemen',
  IN: 'India', PK: 'Pakistan', BD: 'Bangladesh', CN: 'China', JP: 'Japan', KR: 'South Korea',
  RU: 'Russia', BR: 'Brazil', CA: 'Canada', AU: 'Australia', IT: 'Italy', ES: 'Spain',
  NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', PL: 'Poland', NG: 'Nigeria',
  ZA: 'South Africa', MX: 'Mexico', AR: 'Argentina', CO: 'Colombia', CL: 'Chile',
  MY: 'Malaysia', ID: 'Indonesia', TH: 'Thailand', PH: 'Philippines', VN: 'Vietnam',
  SG: 'Singapore', NZ: 'New Zealand', IE: 'Ireland', PT: 'Portugal', AT: 'Austria',
  CH: 'Switzerland', BE: 'Belgium', FI: 'Finland', CZ: 'Czechia', GR: 'Greece', RO: 'Romania',
  HU: 'Hungary', UA: 'Ukraine', IL: 'Israel', KE: 'Kenya', GH: 'Ghana', TZ: 'Tanzania'
};

/**
 * ISO 3166-1 alpha-2 country code → Unicode emoji flag
 */
export function countryFlag(code) {
  if (!code || typeof code !== 'string' || code.length !== 2) return '🌐';
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)));
  } catch (_) {
    return '🌐';
  }
}

/**
 * ISO country code → Flag + Country Name
 */
export function countryName(code) {
  if (!code) return 'Unknown Location';
  const cleanCode = String(code).toUpperCase().trim();
  const name = countryMap[cleanCode] || cleanCode;
  return `${countryFlag(cleanCode)} ${name}`;
}

/**
 * Parse raw User-Agent into a clean device string (OS · Browser)
 * Matching U-Axis Admin SPA
 */
export function parseDevice(ua) {
  if (!ua) return 'Unknown Device';

  // Flutter / Mobile
  if (/dart/i.test(ua)) {
    if (/android/i.test(ua)) return 'Android (Flutter)';
    if (/ios|iphone|ipad/i.test(ua)) return 'iOS (Flutter)';
    return 'Mobile App (Flutter)';
  }

  let os = 'Unknown OS';
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10+';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android\s?([\d.]*)/i.test(ua)) os = 'Android ' + (ua.match(/Android\s?([\d.]*)/i)?.[1] || '');
  else if (/iPhone/i.test(ua)) os = 'iOS';
  else if (/iPad/i.test(ua)) os = 'iPadOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = '';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  return browser ? `${browser} · ${os}` : os;
}
