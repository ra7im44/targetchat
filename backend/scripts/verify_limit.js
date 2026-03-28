const { User, Message, Subscription, SubscriptionPlan, sequelize } = require('../src/models');
const usageLimit = require('../src/middleware/usageLimit');

async function testLimit() {
    try {
        console.log('🧪 Testing Usage Limits...');

        // 1. Create a Test User (No Subscription)
        const user = await User.create({
            name: 'Limit Tester',
            email: `limit_${Date.now()}@test.com`,
            password: 'pass',
            role: 'user'
        });
        console.log(`👤 Created Test User: ${user.id}`);

        // 2. Seed 10 messages for today
        const messages = [];
        for (let i = 0; i < 10; i++) {
            messages.push({
                userId: user.id,
                chatId: 1, // Mock chat ID
                sender: 'user',
                text: 'test',
                type: 'text'
            });
        }
        await Message.bulkCreate(messages);
        console.log('📝 Seeded 10 messages');

        // 3. Mock Request/Response
        const req = {
            user: { id: user.id }
        };
        const res = {
            status: (code) => {
                console.log(`Response Status: ${code}`);
                return res;
            },
            json: (data) => {
                console.log('Response JSON:', data);
            }
        };
        const next = () => {
            console.log('✅ Next called (Limit NOT reached)');
        };

        // 4. Run Middleware
        console.log('🚀 Running usageLimit middleware...');
        await usageLimit(req, res, next);

        // Cleanup
        await user.destroy(); // Cascade deletes messages? Usually logic helper needed.
        // We leave it for now or delete manually.
        await Message.destroy({ where: { userId: user.id } });
        await user.destroy();

    } catch (err) {
        console.error('❌ Test Error:', err);
    }
    process.exit();
}

testLimit();
