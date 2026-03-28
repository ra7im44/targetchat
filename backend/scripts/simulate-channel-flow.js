require('dotenv').config();
const axios = require('axios');
const { Channel, User } = require('../src/models');

/**
 * SIMULATE CHANNEL SYSTEM
 * This script creates a dummy Facebook channel and sends a test message
 * to the webhook to verify routing and Inbox display.
 */
async function simulate() {
    try {
        console.log('🚀 Starting Channel Simulation...');

        // 1. Get first user
        const user = await User.findOne();
        if (!user) {
            console.error('❌ No user found. Run seeding first.');
            return;
        }

        const EXTERNAL_PAGE_ID = '123456789_FAKESHOP';
        const SENDER_ID = 'user_abc_123';

        // 2. Create Dummy Channel if not exists
        let channel = await Channel.findOne({ where: { externalId: EXTERNAL_PAGE_ID } });
        if (!channel) {
            channel = await Channel.create({
                userId: user.id,
                type: 'facebook',
                name: 'Simulation Shop (FB)',
                externalId: EXTERNAL_PAGE_ID,
                accessToken: 'fake_token',
                mode: 'human' // Start in human mode for testing Inbox
            });
            console.log('✅ Created Dummy FB Channel');
        }

        // 3. Send Fake Message to Local Webhook
        console.log('📨 Sending simulated message to webhook...');
        const webhookPayload = {
            object: 'page',
            entry: [{
                id: EXTERNAL_PAGE_ID,
                time: Date.now(),
                messaging: [{
                    sender: { id: SENDER_ID },
                    recipient: { id: EXTERNAL_PAGE_ID },
                    timestamp: Date.now(),
                    message: {
                        mid: 'm_' + Math.random().toString(36).substring(7),
                        text: 'Hello from Simulated Facebook! 🚀'
                    }
                }]
            }]
        };

        const response = await axios.post('http://localhost:3001/webhook/meta', webhookPayload);

        console.log('---');
        console.log('✅ Simulation Successful!');
        console.log('Status:', response.status, response.data);
        console.log('---');
        console.log('👉 Now go to your TargetChat Dashboard -> Inbox');
        console.log('👉 You should see a new chat with "Simulation Shop (FB)"');

        process.exit(0);
    } catch (error) {
        console.error('❌ Simulation Failed:', error.message);
        if (error.response && error.response.data) {
            console.error('--- Error Details ---');
            console.error(JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

simulate();
