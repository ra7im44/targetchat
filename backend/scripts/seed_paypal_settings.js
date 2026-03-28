const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Setting, sequelize } = require('../src/models');

async function seedPayPalSettings() {
    try {
        console.log('Seeding PayPal settings...\n');

        const settings = [
            {
                section: 'payment',
                key: 'PAYPAL_CLIENT_ID',
                value: process.env.PAYPAL_CLIENT_ID || 'placeholder_client_id',
                type: 'string',
                description: 'PayPal Client ID',
                isPublic: true
            },
            {
                section: 'payment',
                key: 'PAYPAL_SECRET',
                value: process.env.PAYPAL_SECRET || 'placeholder_secret',
                type: 'password',
                description: 'PayPal Secret Key',
                isPublic: false
            },
            {
                section: 'payment',
                key: 'PAYPAL_MODE',
                value: process.env.PAYPAL_MODE || 'sandbox',
                type: 'string',
                description: 'PayPal Mode (sandbox or live)',
                isPublic: true
            },
            {
                section: 'payment',
                key: 'PAYPAL_WEBHOOK_ID',
                value: '',
                type: 'string',
                description: 'PayPal Webhook ID (from PayPal dashboard)',
                isPublic: false
            }
        ];

        for (const data of settings) {
            const [setting, created] = await Setting.findOrCreate({
                where: { key: data.key },
                defaults: data
            });

            if (created) {
                console.log(`✅ Created setting: ${data.key}`);
            } else {
                console.log(`♻️ Updated setting: ${data.key}`);
                await setting.update(data);
            }
        }

        console.log('\n✅ PayPal Settings seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding settings:', error);
        process.exit(1);
    }
}

seedPayPalSettings();
