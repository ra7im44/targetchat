require('dotenv').config();
const { User, sequelize } = require('../src/models');

async function createTestUser() {
    try {
        const email = `test_sub_${Date.now()}@example.com`;
        const password = 'password123';

        await User.create({
            name: 'Subscription Tester',
            email,
            password,
            role: 'user',
            isActive: true
        });

        console.log(`USER_CREATED: ${email} ${password}`);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

createTestUser();
