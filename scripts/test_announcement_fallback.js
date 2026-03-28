const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

// Adjust paths based on where the script is run
// Assuming we run: node scripts/test_announcement_fallback.js FROM ROOT
// But we need backend node_modules. 

// Better approach: Run from root, but point to backend node_modules for dotenv? No.
// Let's assume we run this script using: cd backend && node ../scripts/test_announcement_fallback.js

const { User, EmailTemplate } = require('../backend/src/models');
const emailService = require('../backend/src/services/emailService');

async function testFallback() {
    try {
        console.log('🧪 Testing Email Service Fallback (Redis Down Simulation)...');

        // Create a fake user/recipient
        const recipient = 'test@example.com';
        const templateSlug = 'admin-announcement';

        // Ensure template exists
        let template = await EmailTemplate.findOne({ where: { slug: templateSlug } });
        if (!template) {
            console.log('Creating test template...');
            template = await EmailTemplate.create({
                name: 'Admin Announcement',
                slug: templateSlug,
                subject: 'Test Announcement',
                htmlBody: '<p>This is a test.</p>',
                category: 'system',
                isActive: true
            });
        }

        console.log('📧 Attempting to send system email...');
        const result = await emailService.sendSystemEmail(templateSlug, recipient, {
            subject: 'Fallback Test',
            message: 'Testing fallback mechanism'
        });

        console.log('✅ Result:', result);

        if (result.fallback) {
            console.log('🎉 Fallback mechanism triggered successfully!');
        } else {
            console.log('ℹ️  Standard queue mechanism used (Redis might be active?)');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        process.exit();
    }
}

testFallback();
