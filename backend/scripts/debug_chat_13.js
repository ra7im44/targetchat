const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Chat, Workflow } = require('../src/models');

async function debugChat() {
    try {
        const chatId = 13;
        const chat = await Chat.findByPk(chatId, {
            include: [{ model: Workflow, as: 'workflow' }]
        });

        if (!chat) {
            console.log(`Chat ${chatId} not found.`);
            return;
        }

        console.log(`--- Chat ${chatId} ---`);
        console.log(`Title: ${chat.title}`);
        console.log(`Workflow ID: ${chat.workflowId}`);

        if (chat.workflow) {
            console.log(`Workflow Name: ${chat.workflow.name}`);
            console.log(`Workflow Webhook URL: ${chat.workflow.webhookUrl}`);
        } else {
            console.log('No Workflow associated (or not found).');
        }
        console.log('--------------------');

    } catch (error) {
        console.error('Error:', error);
    }
}

debugChat();
