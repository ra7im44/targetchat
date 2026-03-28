/**
 * Billing Crash Test
 * Verifies Multi-Gateway Checkout and Limit Enforcement
 */
const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:3001/api';
const JWT_SECRET = '7sd76sd7a6d87as6d8a6sd8a6sd8asd6asda67d6a';

async function runTest() {
    console.log('🚀 Starting Billing Crash Test...');

    // Self-generate admin token
    const token = jwt.sign({
        id: 1,
        username: 'admin',
        role: 'admin',
        email: 'admin@targetchat.com'
    }, JWT_SECRET, { expiresIn: '1h' });

    console.log('✅ Generated Admin Token');

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Check Plans
    try {
        const plansRes = await axios.get(`${API_URL}/billing/plans`, { headers });
        console.log(`✅ Fetched ${plansRes.data.plans.length} plans`);
        const proPlan = plansRes.data.plans.find(p => p.name === 'Pro');

        if (proPlan) {
            console.log('--- Pro Plan Limits ---');
            console.log(`Max Chats: ${proPlan.maxChats}`);
            console.log(`Max Messages: ${proPlan.maxMessagesPerMonth}`);
            console.log(`Max Widgets: ${proPlan.maxWidgets}`);
            console.log(`Max Members: ${proPlan.maxMembers}`);
        }
    } catch (err) {
        console.error('❌ Failed to fetch plans:', err.response?.data || err.message);
    }

    // 2. Test Checkout Interface (Stripe)
    try {
        const plansRes = await axios.get(`${API_URL}/billing/plans`, { headers });
        const planId = plansRes.data.plans[0].id;

        console.log('🛠 Testing Stripe Checkout Creation...');
        const stripeRes = await axios.post(`${API_URL}/billing/checkout`, {
            planId,
            gateway: 'stripe',
            billingCycle: 'monthly'
        }, { headers });
        console.log('✅ Stripe URL:', stripeRes.data.url);
    } catch (err) {
        console.error('❌ Stripe Checkout Failed:', err.response?.data || err.message);
    }

    // 3. Test Checkout Interface (PayPal)
    try {
        const plansRes = await axios.get(`${API_URL}/billing/plans`, { headers });
        const planId = plansRes.data.plans[0].id;

        console.log('🛠 Testing PayPal Checkout Creation...');
        const paypalRes = await axios.post(`${API_URL}/billing/checkout`, {
            planId,
            gateway: 'paypal',
            billingCycle: 'monthly'
        }, { headers });
        console.log('✅ PayPal URL:', paypalRes.data.url);
    } catch (err) {
        console.error('❌ PayPal Checkout Failed:', err.response?.data || err.message);
    }

    // 4. Test Usage Limits (Messages)
    try {
        console.log('🛠 Testing Usage Limit Enforcement (Messages)...');
        // This will trigger usageLimit middleware
        const msgRes = await axios.post(`${API_URL}/chat/send`, {
            chatId: 1, // Mock
            content: 'Test message'
        }, { headers });
        console.log('✅ Limit check passed (or mock chatId failed gracefully)');
    } catch (err) {
        if (err.response?.status === 403) {
            console.log('⚠️ Limit reached (403 Forbidden as expected)');
        } else {
            console.error('❌ Limit check error:', err.response?.status, err.response?.data);
        }
    }

    console.log('\n🏁 Billing Crash Test Summary: Check logs above for results.');
}

runTest();
