require('dotenv').config();
const { Workflow, sequelize } = require('../src/models');

async function seedWorkflows() {
    try {
        console.log('🔌 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected');

        console.log('🌱 Seeding workflows...');

        const workflows = [
            {
                name: 'GPT-4',
                description: 'General purpose chat with GPT-4',
                webhookUrl: 'http://host.docker.internal:5678/webhook/gpt4',
                icon: '🤖',
                isActive: true
            },
            {
                name: 'Claude',
                description: 'Content writing and analysis with Claude',
                webhookUrl: 'http://host.docker.internal:5678/webhook/claude',
                icon: '✍️',
                isActive: true
            },
            {
                name: 'Gemini',
                description: 'Data analysis and coding with Gemini',
                webhookUrl: 'http://host.docker.internal:5678/webhook/gemini',
                icon: '📊',
                isActive: true
            }
        ];

        for (const workflow of workflows) {
            const existing = await Workflow.findOne({ where: { name: workflow.name } });
            if (!existing) {
                await Workflow.create(workflow);
                console.log(`✅ Created workflow: ${workflow.name}`);
            } else {
                console.log(`⏭️  Workflow already exists: ${workflow.name}`);
            }
        }

        console.log('✅ Workflow seeding completed!');
        await sequelize.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding workflows:', err);
        process.exit(1);
    }
}

seedWorkflows();
