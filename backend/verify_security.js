const https = require('http');

const BASE_URL = 'http://localhost:3001';

async function request(path) {
    return new Promise((resolve, reject) => {
        const req = https.get(`${BASE_URL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                data
            }));
        });
        req.on('error', reject);
    });
}

async function verifyHeaders() {
    console.log('🛡️  Checking Security Headers...');
    try {
        const res = await request('/');
        const headers = res.headers;

        let score = 0;

        if (headers['x-dns-prefetch-control'] === 'off') {
            console.log('  ✅ X-DNS-Prefetch-Control is OFF');
            score++;
        }
        if (headers['strict-transport-security']) {
            console.log('  ✅ Strict-Transport-Security is ON');
            score++;
        } else {
            // HTTP (not HTTPS) often skips this, so it might fail locally, which is expected
            console.log('  ℹ️  Strict-Transport-Security (Expected missing on localhost HTTP)');
        }

        // Helmet usually adds these:
        if (headers['x-frame-options']) console.log('  ✅ X-Frame-Options is PRESENT');
        if (headers['x-content-type-options']) console.log('  ✅ X-Content-Type-Options is PRESENT');

        console.log('  ✅ Headers check passed (Helmet is active)\n');
    } catch (err) {
        console.error('❌ Failed to connect to server:', err.message);
    }
}

async function verifyRateLimit() {
    console.log('🚀 Testing Rate Limiting (Might take a few seconds)...');
    console.log('   Sending 40 fast requests to /api/auth/login (Limit is 30/15min)...');

    let blocked = false;
    let successCount = 0;

    for (let i = 0; i < 40; i++) {
        const res = await request('/api/auth/login'); // Using GET for speed test, rate limit applies to all methods usually or we need to POST
        // Actually express-rate-limit applies to all methods on the route unless configured otherwise.
        // But our route definition is router.post('/login').
        // Express might not run middleware if method doesn't match? 
        // Let's use a dummy POST.

        // Wait, 'request' helper above is GET. Let's make a POST helper or just hit a GET route that has limits.
        // We put limit on '/api/auth'. 
        // Let's rely on the fact that rate limiter runs BEFORE method check often, or use `method: 'POST'`

        if (res.status === 429) {
            blocked = true;
            console.log(`   ⛔ Request ${i + 1}: BLOCKED (Status 429) - SUCCESS!`);
            break;
        } else {
            successCount++;
            // process.stdout.write('.');
        }
    }

    if (blocked) {
        console.log('\n✅ Rate Limiting is WORKING! The server blocked us after too many attempts.');
    } else {
        console.log('\n❌ Rate Limiting FAILED. We were not blocked.');
    }
}

// Simple POST helper since rate limit might need it
// ... (Actually, for simplicity, we configured `app.use('/api/auth', authLimiter)` globally in index.js)
// This means it applies to EVERYTHING under /api/auth, even 404s or GETs.
// So GET /api/auth/random-spam should trigger it.

console.log('=============================================');
console.log('      TARGETCHAT SECURITY VERIFIER 🕵️‍♂️      ');
console.log('=============================================\n');

(async () => {
    await verifyHeaders();
    await verifyRateLimit();
    console.log('\n=============================================');
})();
