const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Workflow } = require('../src/models');
const { Op } = require('sequelize');

async function fix() {
    try {
        // 1. Find TARGET-PLUS workflow
        // The user calls it "TARGET-PLUS" or "TARGETUP-PLUS"
        // I'll search for "Plus"
        const workflows = await Workflow.findAll({
            where: {
                name: { [Op.like]: '%Plus%' }
            }
        });

        if (workflows.length > 0) {
            for (const w of workflows) {
                console.log(`Found Workflow: ${w.name} (ID: ${w.id})`);
                console.log(`Old Webhook: ${w.webhookUrl}`);

                const newUrl = 'http://localhost:5678/webhook-test/targetplus1.105qhdy34';
                await w.update({ webhookUrl: newUrl });
                console.log(`✅ Updated to: ${newUrl}`);
            }
        } else {
            console.log('❌ Could not find any workflow with "Plus" in the name.');
            // List all to be sure
            const all = await Workflow.findAll();
            console.log('Available workflows:', all.map(x => x.name).join(', '));
        }

    } catch (e) {
        console.error(e);
    }
}

fix();
