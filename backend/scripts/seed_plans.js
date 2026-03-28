require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { SubscriptionPlan, sequelize } = require('../src/models');

async function seedPlans() {
    try {
        console.log('Seeding subscription plans...\n');

        const plans = [
            {
                id: uuidv4(),
                name: 'Free',
                description: 'Perfect for trying out TargetChat',
                stripePriceIdMonthly: null,
                stripePriceIdYearly: null,
                priceMonthly: 0,
                priceYearly: 0,
                features: {
                    max_chats: 10,
                    max_messages: 100,
                    basic_support: true,
                    custom_workflows: false,
                    api_access: false,
                    priority_support: false
                },
                maxChats: 10,
                maxMessagesPerMonth: 100,
                trialDays: 0,
                isActive: true
            },
            {
                id: uuidv4(),
                name: 'Pro',
                description: 'For professionals and small teams',
                stripePriceIdMonthly: 'price_pro_monthly', // Replace with actual Stripe price ID
                stripePriceIdYearly: 'price_pro_yearly',
                priceMonthly: 19.00,
                priceYearly: 190.00,
                features: {
                    unlimited_chats: true,
                    unlimited_messages: true,
                    priority_support: true,
                    custom_workflows: true,
                    api_access: false,
                    advanced_analytics: true
                },
                maxChats: -1, // unlimited
                maxMessagesPerMonth: -1, // unlimited
                trialDays: 14,
                isActive: true
            },
            {
                id: uuidv4(),
                name: 'Enterprise',
                description: 'For large organizations with advanced needs',
                stripePriceIdMonthly: 'price_enterprise_monthly',
                stripePriceIdYearly: 'price_enterprise_yearly',
                priceMonthly: 99.00,
                priceYearly: 990.00,
                features: {
                    unlimited_chats: true,
                    unlimited_messages: true,
                    priority_support: true,
                    custom_workflows: true,
                    api_access: true,
                    advanced_analytics: true,
                    dedicated_support: true,
                    custom_integrations: true,
                    sla_guarantee: true
                },
                maxChats: -1,
                maxMessagesPerMonth: -1,
                trialDays: 30,
                isActive: true
            }
        ];

        for (const planData of plans) {
            const [plan, created] = await SubscriptionPlan.findOrCreate({
                where: { name: planData.name },
                defaults: planData
            });

            if (created) {
                console.log(`✅ Created plan: ${plan.name} ($${plan.priceMonthly}/month)`);
            } else {
                console.log(`⊘ Plan already exists: ${plan.name}`);
            }
        }

        console.log('\n✅ Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding plans:', error);
        process.exit(1);
    }
}

seedPlans();
