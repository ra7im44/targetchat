require('dotenv').config({ path: './backend/.env' });
const { BillingLog } = require('../src/models');

async function check() {
    try {
        const logs = await BillingLog.findAll({
            limit: 5,
            order: [['created_at', 'DESC']]
        });
        console.log('--- LATEST BILLING LOGS ---');
        console.log(JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error('Error fetching logs:', err);
    }
}

check();
