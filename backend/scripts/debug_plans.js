const { SubscriptionPlan } = require('../src/models');

async function checkPlans() {
    try {
        const plans = await SubscriptionPlan.findAll();
        console.log('--- Plans Debug ---');
        console.log(JSON.stringify(plans, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

checkPlans();
