const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Setting, sequelize } = require('../src/models');

async function seedSettings() {
    try {
        console.log('Seeding payment settings...\n');

        const settings = [
            {
                section: 'payment',
                key: 'STRIPE_SECRET_KEY',
                value: 'sk_test_placeholder_key_must_be_replaced',
                type: 'password', // Masked in UI
                description: 'Stripe Secret API Key',
                isPublic: false
            },
            {
                section: 'payment',
                key: 'STRIPE_PUBLISHABLE_KEY',
                value: 'pk_test_placeholder_key_must_be_replaced',
                type: 'string',
                description: 'Stripe Publishable API Key',
                isPublic: true
            },
            {
                section: 'payment',
                key: 'STRIPE_WEBHOOK_SECRET',
                value: 'whsec_placeholder_secret_must_be_replaced',
                type: 'password', // Masked
                description: 'Stripe Webhook Signing Secret',
                isPublic: false
            },
            {
                section: 'payment',
                key: 'STRIPE_PRICE_PRO_ID',
                value: 'price_placeholder_pro_plan',
                type: 'string',
                description: 'Pro Plan Price ID (e.g. price_123...)',
                isPublic: true
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

        console.log('\n✅ Settings seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding settings:', error);
        process.exit(1);
    }
}

seedSettings();
