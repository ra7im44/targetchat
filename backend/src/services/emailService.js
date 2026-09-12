const { emailQueue } = require('../queues/emailQueue');
const { EmailLog, EmailPreference, EmailTemplate } = require('../models');
const emailProvider = require('./emailProvider');
const templateEngine = require('./templateEngine');
const { ensureEmailTemplate } = require('./emailTemplateSeeder');

/**
 * EmailService - Central email sending service
 * Handles queuing, logging, and preference checking
 */
class EmailService {
    /**
     * Send a system email using a template
     * @param {string} templateSlug - Template identifier (e.g., 'welcome', 'password-reset')
     * @param {string} recipientEmail - Recipient email address
     * @param {Object} variables - Template variables
     * @param {Object} [options] - Additional options
     * @param {string} [options.from] - Sender email (defaults to env)
     * @param {string} [options.priority] - 'urgent', 'normal', 'low'
     * @param {number} [options.userId] - User ID for preference checking
     * @param {string} [options.language] - Template language
     * @returns {Promise<Object>} - { jobId, logId }
     */
    async sendSystemEmail(templateSlug, recipientEmail, variables = {}, options = {}) {
        let log;
        try {
            // 1. Load template to get category (self-heal: seed defaults on fresh DBs)
            let template = await EmailTemplate.findOne({
                where: { slug: templateSlug, isActive: true }
            });

            if (!template) {
                template = await ensureEmailTemplate(templateSlug);
            }

            if (!template) {
                throw new Error(`Template not found or inactive: ${templateSlug}`);
            }

            // 2. Check user preferences (if userId provided)
            if (options.userId) {
                const canSend = await this.checkUserPreferences(options.userId, template.category);
                if (!canSend) {
                    console.log(`⏭️  Skipping email to user ${options.userId}: unsubscribed from ${template.category}`);
                    return { skipped: true, reason: 'user_unsubscribed' };
                }
            }

            // 3. Determine sender address based on category
            const from = options.from || this.getSenderAddress(template.category);

            // 4. Create log entry
            log = await EmailLog.create({
                templateId: template.id,
                userId: options.userId || null, // Direct userId for associations
                recipientEmail,
                subject: template.subject, // Will be updated after rendering
                status: 'queued',
                metadata: {
                    variables,
                    userId: options.userId,
                    priority: options.priority || 'normal',
                    category: template.category
                }
            });

            // 5. Add to queue with Fallback
            try {
                const job = await emailQueue.add(
                    {
                        templateSlug,
                        recipientEmail,
                        variables: { ...variables, language: options.language || 'en' },
                        from,
                        logId: log.id,
                        priority: options.priority || 'normal'
                    },
                    {
                        priority: this.getPriorityValue(options.priority),
                        delay: options.delay || 0 // Optional delay in ms
                    }
                );

                console.log(`📧 Email queued: ${templateSlug} → ${recipientEmail} (Job: ${job.id})`);

                return {
                    jobId: job.id,
                    logId: log.id,
                    status: 'queued'
                };

            } catch (queueError) {
                console.warn(`⚠️  Redis Queue failed, falling back to direct send for ${templateSlug} to ${recipientEmail}`);

                // FALLBACK: Send directly
                if (!emailProvider.initialized) {
                    await emailProvider.loadSettings();
                }

                // Render
                const { subject, html, text } = await templateEngine.render(
                    templateSlug,
                    variables,
                    options.language || 'en'
                );

                console.log(`📤 Attempting direct send | From: ${from} | To: ${recipientEmail} | Provider: ${emailProvider.provider}`);

                let result;
                try {
                    // Attempt Direct Send (SMTP/SendGrid)
                    result = await emailProvider.send({
                        from,
                        to: recipientEmail,
                        subject,
                        html,
                        text
                    });
                } catch (providerError) {
                    console.error(`❌ Direct Send failed for ${recipientEmail}: ${providerError.message}. Falling back to CONSOLE mock.`);

                    // DOUBLE FALLBACK: Console Mock
                    await emailProvider.sendViaConsole({
                        from, to: recipientEmail, subject, html, text
                    });

                    result = { messageId: `mock-fallback-${Date.now()}` };

                    // Update log to reflect partial failure/mock
                    if (log) {
                        await log.update({
                            status: 'sent',
                            providerMessageId: result.messageId,
                            sentAt: new Date(),
                            errorMessage: `Fallback Mock (Original Error: ${providerError.message})`,
                            subject
                        });
                    }

                    return {
                        jobId: 'console-mock',
                        logId: log.id,
                        status: 'sent',
                        fallback: true,
                        mock: true
                    };
                }

                // Update Log for Successful Direct Send
                await log.update({
                    status: 'sent',
                    providerMessageId: result.messageId,
                    sentAt: new Date(),
                    subject
                });

                console.log(`✅ Direct send successful to ${recipientEmail} (ID: ${result.messageId})`);

                return {
                    jobId: 'direct-send',
                    logId: log.id,
                    status: 'sent',
                    fallback: true
                };
            }

        } catch (error) {
            console.error(`❌ Failed to send email (${templateSlug}):`, error.message);
            if (log) {
                await log.update({
                    status: 'failed',
                    errorMessage: error.message
                });
            }
            throw error;
        }
    }

    /**
     * Send bulk emails (batch processing with rate limiting)
     * @param {string} templateSlug - Template slug
     * @param {Array<Object>} recipients - Array of { email, variables, userId }
     * @param {Object} [options] - Additional options
     * @returns {Promise<Array>} - Array of job results
     */
    async sendBulk(templateSlug, recipients, options = {}) {
        const results = [];
        const batchSize = 10; // Send 10 at a time
        const delayBetweenBatches = 1000; // 1 second delay

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            const batchPromises = batch.map(recipient =>
                this.sendSystemEmail(
                    templateSlug,
                    recipient.email,
                    recipient.variables || {},
                    { ...options, userId: recipient.userId }
                ).catch(err => ({ error: err.message, email: recipient.email }))
            );

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Delay between batches to avoid rate limits
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }

        console.log(`📧 Bulk email queued: ${results.length} emails for template "${templateSlug}"`);
        return results;
    }

    /**
     * Get email delivery status
     * @param {number} logId - EmailLog ID
     * @returns {Promise<Object>} - Log details
     */
    async getEmailStatus(logId) {
        const log = await EmailLog.findByPk(logId, {
            include: [{ model: EmailTemplate, as: 'template' }]
        });

        if (!log) {
            throw new Error(`Email log not found: ${logId}`);
        }

        return {
            id: log.id,
            recipient: log.recipientEmail,
            subject: log.subject,
            status: log.status,
            template: log.template ? log.template.name : null,
            sentAt: log.sentAt,
            deliveredAt: log.deliveredAt,
            openedAt: log.openedAt,
            error: log.errorMessage
        };
    }

    /**
     * Retry a failed email
     * @param {number} logId - EmailLog ID
     * @returns {Promise<Object>} - New job result
     */
    async retryEmail(logId) {
        const log = await EmailLog.findByPk(logId, {
            include: [{ model: EmailTemplate, as: 'template' }]
        });

        if (!log) {
            throw new Error(`Email log not found: ${logId}`);
        }

        if (log.status !== 'failed') {
            throw new Error(`Cannot retry email with status: ${log.status}`);
        }

        // Re-queue the email
        const metadata = log.metadata || {};
        return this.sendSystemEmail(
            log.template.slug,
            log.recipientEmail,
            metadata.variables || {},
            {
                userId: metadata.userId,
                priority: metadata.priority || 'normal'
            }
        );
    }

    /**
     * Check if user has opted out of a category
     * @param {number} userId - User ID
     * @param {string} category - Email category
     * @returns {Promise<boolean>} - true if can send, false if unsubscribed
     */
    async checkUserPreferences(userId, category) {
        const pref = await EmailPreference.findOne({
            where: { userId, category }
        });

        // If no preference exists, default to enabled
        return pref ? pref.enabled : true;
    }

    /**
     * Get sender address based on category
     * @param {string} category - Email category
     * @returns {string} - Sender email address
     */
    getSenderAddress(category) {
        // Get configured name and email
        const appName = process.env.APP_NAME || 'TargetChat';
        const senderName = process.env.EMAIL_SENDER_NAME || appName;

        // Use SMTP user as default "From" email to prevent blocks
        // Priority: Env var -> DB Setting -> Hardcoded
        const defaultEmail = process.env.EMAIL_FROM_ADDRESS ||
            emailProvider.settings?.smtp_user ||
            'info@targetchat.ai';

        const email = (category === 'auth' && process.env.EMAIL_FROM_SYSTEM) ? process.env.EMAIL_FROM_SYSTEM :
            (category === 'billing' && process.env.EMAIL_FROM_BILLING) ? process.env.EMAIL_FROM_BILLING :
                defaultEmail;

        // If email already has <brackets>, return as is
        if (email.includes('<')) return email;

        // Otherwise format as "Name <email>"
        return `"${senderName}" <${email}>`;
    }

    /**
     * Convert priority string to numeric value (lower = higher priority)
     * @param {string} priority - 'urgent', 'normal', 'low'
     * @returns {number} - Priority value
     */
    getPriorityValue(priority) {
        const priorities = {
            urgent: 1,
            normal: 5,
            low: 10
        };
        return priorities[priority] || 5;
    }
}

module.exports = new EmailService();
