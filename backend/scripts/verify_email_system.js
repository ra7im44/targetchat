require('dotenv').config();
const emailProvider = require('../src/services/emailProvider');
const Queue = require('bull');

async function testEmailSystem() {
    let smtpStatus = 'UNKNOWN';
    let redisStatus = 'UNKNOWN';

    // 1. Check Provider Config
    try {
        await emailProvider.loadSettings();
        if (await emailProvider.verify()) {
            smtpStatus = 'OK';
        } else {
            smtpStatus = 'FAIL_AUTH';
        }
    } catch (err) {
        smtpStatus = `ERROR: ${err.message}`;
    }

    // 2. Check Redis
    try {
        const testQueue = new Queue('test-email-connection', {
            redis: {
                host: '127.0.0.1',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD
            }
        });
        await testQueue.client.info();
        redisStatus = 'OK';
        await testQueue.close();
    } catch (err) {
        redisStatus = `FAIL: ${err.message}`;
    }

    console.log(`FINAL_RESULT: SMTP=${smtpStatus} | REDIS=${redisStatus}`);
    process.exit();
}

testEmailSystem();
