require('dotenv').config();
const { EmailTemplate } = require('./src/models');

async function checkTemplates() {
    try {
        console.log('🔍 Checking Email Templates...\n');

        const templates = await EmailTemplate.findAll({
            attributes: ['id', 'name', 'slug', 'category', 'language', 'isActive'],
            order: [['id', 'ASC']]
        });

        console.log(`✅ Found ${templates.length} templates in database:\n`);

        templates.forEach((t, i) => {
            console.log(`${i + 1}. ${t.name}`);
            console.log(`   Slug: ${t.slug}`);
            console.log(`   Category: ${t.category}`);
            console.log(`   Language: ${t.language}`);
            console.log(`   Active: ${t.isActive ? '✅ Yes' : '❌ No'}`);
            console.log('');
        });

        if (templates.length === 0) {
            console.log('❌ NO TEMPLATES FOUND!');
            console.log('Run: node scripts/seed_email_templates.js');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkTemplates();
