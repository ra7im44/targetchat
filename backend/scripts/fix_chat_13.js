const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Chat, Workflow } = require('../src/models');
const { Op } = require('sequelize');

async function fixChat() {
    try {
        const chatId = 13;

        // Find TARGET-PLUS workflow
        const targetPlusWorkflow = await Workflow.findOne({
            where: {
                name: { [Op.like]: '%Plus%' }
            }
        });

        if (!targetPlusWorkflow) {
            console.log('Could not find TARGET-PLUS workflow');
            return;
        }

        console.log(`Found TARGET-PLUS Workflow: ${targetPlusWorkflow.name} (ID: ${targetPlusWorkflow.id})`);

        // Find Chat
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            console.log('Chat 13 not found');
            return;
        }

        // Update Chat
        await chat.update({ workflowId: targetPlusWorkflow.id });
        console.log(`✅ Updated Chat 13 to use workflow: ${targetPlusWorkflow.name}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

fixChat();
