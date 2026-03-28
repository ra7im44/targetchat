require('dotenv').config();
const { sequelize, Setting } = require('../src/models');
const dns = require('dns').promises;

async function check() {
    console.log('🔍 Starting Production Readiness Check...\n');

    let issues = 0;

    // 1. Database Connection
    try {
        await sequelize.authenticate();
        console.log('✅ Database: Connection successful.');
    } catch (e) {
        console.error('❌ Database: Connection failed! Check your DB credentials.');
        issues++;
    }

    // 2. JWT Secret
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
        console.warn('⚠️  Security: JWT_SECRET is missing or using default. Change it for production!');
        issues++;
    } else {
        console.log('✅ Security: JWT_SECRET is set.');
    }

    // 3. Backend URL (from DB)
    const backendUrl = await Setting.findOne({ where: { key: 'BACKEND_URL' } });
    if (!backendUrl || !backendUrl.value.startsWith('http')) {
        console.warn('⚠️  Cloud: BACKEND_URL is not configured in DB. Meta/WA webhooks will fail.');
        issues++;
    } else {
        console.log(`✅ Cloud: BACKEND_URL configured as ${backendUrl.value}`);
        if (backendUrl.value.includes('localhost')) {
            console.warn('⚠️  Cloud: BACKEND_URL is set to localhost. Change this to your VPS IP/Domain!');
        }
    }

    // 4. Port Check
    const port = process.env.PORT || 3001;
    console.log(`ℹ️  Infrastructure: Backend running on port ${port}`);

    console.log(`\n🏁 Check finished with ${issues} issue(s).`);
    if (issues === 0) {
        console.log('✨ System looks ready for VPS deployment!');
    } else {
        console.log('💡 Fix the issues above before moving to production.');
    }

    process.exit(issues > 0 ? 1 : 0);
}

check();
