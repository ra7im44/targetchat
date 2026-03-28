const Queue = require('bull');
const emailProvider = require('../services/emailProvider');
const templateEngine = require('../services/templateEngine');
const { EmailLog } = require('../models');

// Create email queue with Redis connection
const emailQueue = new Queue('emails', {
    redis: {
        host: '127.0.0.1', // Force IPv4 instead of localhost
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null, // Disable retry limit
        enableReadyCheck: false,
        retryStrategy: (times) => {
            if (times > 10) {
                console.error('❌ Redis connection failed after 10 attempts');
                return null; // Stop retrying
            }
            const delay = Math.min(times * 50, 2000);
            console.log(`⏳ Retrying Redis connection in ${delay}ms...`);
            return delay;
        }
    },
    defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
            type: 'exponential',
            delay: 2000 // Start with 2 seconds, then 4s, 8s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500 // Keep last 500 failed jobs for debugging
    }
});

/**
 * Process email jobs from the queue
 */
emailQueue.process(async (job) => {
    const { templateSlug, recipientEmail, variables, from, logId, priority } = job.data;

    try {
        console.log(`📧 Processing email job ${job.id}: ${templateSlug} → ${recipientEmail}`);

        // Ensure email provider is initialized
        if (!emailProvider.initialized) {
            console.log('⏳ Email provider not initialized, loading settings...');
            await emailProvider.loadSettings();
        }

        // Render template
        const { subject, html, text, templateId } = await templateEngine.render(
            templateSlug,
            variables,
            variables.language || 'en'
        );

        // Send via provider
        const result = await emailProvider.send({
            from,
            to: recipientEmail,
            subject,
            html,
            text
        });

        // Update log status
        await EmailLog.update(
            {
                status: 'sent',
                providerMessageId: result.messageId,
                sentAt: new Date()
            },
            { where: { id: logId } }
        );

        console.log(`✅ Email sent successfully: ${job.id}`);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        console.error(`❌ Email job ${job.id} failed:`, error.message);

        // Update log with error
        await EmailLog.update(
            {
                status: 'failed',
                errorMessage: error.message
            },
            { where: { id: logId } }
        );

        throw error; // Re-throw to trigger retry
    }
});

/**
 * Queue event listeners
 */
emailQueue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result.messageId);
});

emailQueue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

emailQueue.on('stalled', (job) => {
    console.warn(`⚠️  Job ${job.id} stalled`);
});

/**
 * Global Error Handler
 */
emailQueue.on('error', (err) => {
    console.error('❌ Redis Queue Error:', err.message);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
    console.log('📧 Closing email queue...');
    await emailQueue.close();
});

module.exports = { emailQueue };
