/**
 * GeoIP and Device extraction helpers for TargetChat
 * Matches U-Axis Admin SPA parsing & conventions
 */

function parseUserAgent(ua) {
    if (!ua) {
        return {
            os: 'Unknown OS',
            browser: 'Unknown Browser',
            deviceType: 'desktop',
            formatted: 'Unknown Device'
        };
    }

    // Flutter / Mobile native
    if (/dart/i.test(ua)) {
        if (/android/i.test(ua)) {
            return { os: 'Android', browser: 'Flutter App', deviceType: 'mobile', formatted: 'Android (Flutter)' };
        }
        if (/ios|iphone|ipad/i.test(ua)) {
            return { os: 'iOS', browser: 'Flutter App', deviceType: 'mobile', formatted: 'iOS (Flutter)' };
        }
        return { os: 'Mobile App', browser: 'Flutter', deviceType: 'mobile', formatted: 'Mobile App (Flutter)' };
    }

    let os = 'Unknown OS';
    let deviceType = 'desktop';

    if (/Windows NT 10/i.test(ua)) os = 'Windows 10+';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Android\s?([\d.]*)/i.test(ua)) {
        os = 'Android ' + (ua.match(/Android\s?([\d.]*)/i)?.[1] || '');
        deviceType = 'mobile';
    }
    else if (/iPhone/i.test(ua)) {
        os = 'iOS';
        deviceType = 'mobile';
    }
    else if (/iPad/i.test(ua)) {
        os = 'iPadOS';
        deviceType = 'tablet';
    }
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = '';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else browser = 'Browser';

    const formatted = browser ? `${browser} · ${os}` : os;
    return { os, browser, deviceType, formatted };
}

function detectGeo(req, clientIp = '') {
    if (!req) return { country: 'EG', city: 'Cairo' };

    // 1. Check Cloudflare / CDN headers
    const cfCountry = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || req.headers['x-forwarded-country'] || req.headers['x-vercel-ip-country'];
    const cfCity = req.headers['cf-ipcity'] || req.headers['x-city'] || req.headers['x-vercel-ip-city'];

    if (cfCountry && cfCountry.length === 2 && cfCountry !== 'XX') {
        return {
            country: cfCountry.toUpperCase(),
            city: cfCity ? decodeURIComponent(cfCity) : ''
        };
    }

    // 2. Check if client explicitly sent in body/header
    if (req.body && req.body.country) {
        return {
            country: String(req.body.country).toUpperCase().slice(0, 2),
            city: req.body.city ? String(req.body.city) : ''
        };
    }

    // 3. Fallback for Localhost / Development IP
    const ip = clientIp || req.ip || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {
            country: 'EG',
            city: 'Cairo'
        };
    }

    return {
        country: 'EG',
        city: 'Cairo'
    };
}

module.exports = {
    parseUserAgent,
    detectGeo
};
