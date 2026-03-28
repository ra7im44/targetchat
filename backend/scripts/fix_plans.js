const { SubscriptionPlan } = require('../src/models');

async function fixPlans() {
    try {
        console.log('🔄 Updating plans with mock Price IDs...');

        // Fix Pro Plan
        const pro = await SubscriptionPlan.findOne({ where: { name: 'Pro' } });
        if (pro) {
            pro.stripePriceIdMonthly = 'price_pro_monthly';
            pro.stripePriceIdYearly = 'price_pro_yearly';
            await pro.save();
            console.log('✅ Pro plan updated');
        } else {
            console.log('⚠️ Pro plan not found');
        }

        // Fix Enterprise Plan
        const ent = await SubscriptionPlan.findOne({ where: { name: 'Enterprise' } });
        if (ent) {
            ent.stripePriceIdMonthly = 'price_enterprise_monthly';
            ent.stripePriceIdYearly = 'price_enterprise_yearly';
            await ent.save();
            console.log('✅ Enterprise plan updated');
        } else {
            console.log('⚠️ Enterprise plan not found');
        }

    } catch (err) {
        console.error('❌ Error updating plans:', err);
    }
    process.exit();
}

fixPlans();
