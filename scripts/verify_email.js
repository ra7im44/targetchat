const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const emailProvider = require('../backend/src/services/emailProvider');

async function verifyConfig() {
    console.log('🔍 Verifying Email Configuration...');

    try {
        await emailProvider.loadSettings();
        console.log(`Current Provider: ${emailProvider.provider}`);
        console.log('Settings present:', emailProvider.settings ? Object.keys(emailProvider.settings) : 'None');

        const isVerified = await emailProvider.verify();
        console.log(`Verification Result: ${isVerified ? '✅ Success' : '❌ Failed'}`);

        if (!isVerified) {
            console.log('⚠️  Email sending will likely fail.');
        }

    } catch (error) {
        console.error('❌ Verification Error:', error.message);
    }
}

verifyConfig();
