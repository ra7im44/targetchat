require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize, SubscriptionPlan } = require('../src/models');

async function fixLimits() {
    try {
        const proPlan = await SubscriptionPlan.findOne({ where: { name: 'Pro' } });
        if (proPlan) {
            console.log('Found Pro Plan. Updating limits...');
            proPlan.maxMessagesPerMonth = 5000;
            proPlan.maxChats = 10;
            await proPlan.save();
            console.log('✅ Pro Plan limits updated to: 5,000 Messages, 10 Widgets.');
        } else {
            console.log('❌ Pro Plan not found.');
        }

        const freePlan = await SubscriptionPlan.findOne({ where: { name: 'Free' } });
        if (freePlan) {
            console.log('Found Free Plan. Updating limits...');
            freePlan.maxMessagesPerMonth = 100;
            freePlan.maxChats = 1;
            await freePlan.save();
            console.log('✅ Free Plan limits updated to: 100 Messages, 1 Widget.');
        }

    } catch (error) {
        console.error('Error updating limits:', error);
    } finally {
        await sequelize.close();
    }
}

fixLimits();
