require('dotenv').config({ path: './backend/.env' });
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
    'targetchatv1',
    'root',
    'root',
    {
        host: '127.0.0.1',
        dialect: 'mysql',
        logging: false
    }
);

const Workflow = require('../src/models/Workflow')(sequelize, DataTypes);

async function fixUrls() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        const n8nUrl = process.env.N8N_WEBHOOK_URL;
        if (!n8nUrl) {
            console.error('❌ N8N_WEBHOOK_URL not found in .env');
            process.exit(1);
        }

        console.log(`🔄 Updating system workflows to use: ${n8nUrl}`);

        // Update all system workflows (where userId is null) to use the n8n URL
        // instead of the placeholder OpenAI URLs
        const [updated] = await Workflow.update(
            { webhookUrl: n8nUrl },
            {
                where: {
                    userId: null,
                    // Only update if it currently points to openai/anthropic
                    webhookUrl: {
                        [Sequelize.Op.or]: [
                            { [Sequelize.Op.like]: '%api.openai.com%' },
                            { [Sequelize.Op.like]: '%api.anthropic.com%' }
                        ]
                    }
                }
            }
        );

        console.log(`✅ Updated ${updated} workflows.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Update failed:', error);
        process.exit(1);
    }
}

fixUrls();
