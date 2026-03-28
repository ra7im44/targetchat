require('dotenv').config({ path: '../backend/.env' });
const emailProvider = require('../backend/src/services/emailProvider');

async function checkProvider() {
    console.log('Testing Email Provider Fallback');
    await emailProvider.loadSettings();

    console.log(`Provider selected: ${emailProvider.provider}`);

    // Attempt send
    try {
        await emailProvider.send({
            from: 'test@system.com',
            to: 'admin@local.host',
            subject: 'Test Console Provider',
            html: '<p>This should log to console</p>'
        });
        console.log('✅ Send Success');
    } catch (e) {
        console.error('❌ Send Failed:', e.message);
    }
}

checkProvider();
