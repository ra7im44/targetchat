require('dotenv').config();
const { ActivityLog, User, sequelize } = require('../src/models');
const { Op } = require('sequelize');

async function checkDeletions() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        const recentDeletes = await ActivityLog.findAll({
            where: {
                action: { [Op.like]: '%DELETE%' }
            },
            include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
            order: [['created_at', 'DESC']],
            limit: 20
        });

        if (recentDeletes.length === 0) {
            console.log('ℹ️ No recent DELETE actions found in ActivityLog.');
        } else {
            console.log('🚨 RECENT DELETE ACTIONS:');
            recentDeletes.forEach(log => {
                console.log(`- [${log.created_at}] User: ${log.user?.name || 'Unknown'} (${log.user?.email || 'N/A'})`);
                console.log(`  Action: ${log.action}`);
                console.log(`  Details: ${JSON.stringify(log.details)}`);
            });
        }

        // Also check if any tables are suspiciously empty
        const tables = ['users', 'chats', 'messages', 'leads', 'widgets', 'channels'];
        console.log('\n📊 RECORD COUNTS:');
        for (const table of tables) {
            const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`- ${table}: ${result[0].count}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Check failed:', err);
        process.exit(1);
    }
}

checkDeletions();
