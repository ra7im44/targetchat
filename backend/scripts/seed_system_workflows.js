require('dotenv').config({ path: '../.env' });
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

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        const workflows = [
            {
                name: 'GPT-4',
                description: 'Most capable model, best for complex tasks.',
                icon: '🧠',
                isPublic: true,
                isActive: true,
                webhookUrl: 'https://api.openai.com/v1/chat/completions', // Placeholder
                userId: null
            },
            {
                name: 'GPT-3.5 Turbo',
                description: 'Fast and cost-effective for everyday tasks.',
                icon: '⚡',
                isPublic: true,
                isActive: true,
                webhookUrl: 'https://api.openai.com/v1/chat/completions', // Placeholder
                userId: null
            },
            {
                name: 'Claude 3.5 Sonnet',
                description: 'Balanced model with strong reasoning.',
                icon: '🎭',
                isPublic: true,
                isActive: true,
                webhookUrl: 'https://api.anthropic.com/v1/messages', // Placeholder
                userId: null
            }
        ];

        for (const w of workflows) {
            const [workflow, created] = await Workflow.findOrCreate({
                where: { name: w.name },
                defaults: w
            });
            if (created) console.log(`✅ Created: ${w.name}`);
            else console.log(`ℹ️ Exists: ${w.name}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
