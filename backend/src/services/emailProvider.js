const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const AWS = require('aws-sdk');

/**
 * EmailProvider - Unified email sending service
 * Supports SMTP, SendGrid, and AWS SES
 * Loads configuration from database settings
 */
class EmailProvider {
    constructor() {
        this.provider = null;
        this.transporter = null;
        this.ses = null;
        this.initialized = false;
    }

    /**
     * Load settings from database and initialize provider
     */
    async loadSettings() {
        try {
            const settingsService = require('./settingsService');

            // Get email provider setting
            this.provider = await settingsService.get('email_provider', 'smtp');

            // Load provider-specific settings
            const settings = {
                smtp_host: await settingsService.get('smtp_host'),
                smtp_port: await settingsService.get('smtp_port'),
                smtp_secure: await settingsService.get('smtp_secure'),
                smtp_user: await settingsService.get('smtp_user'),
                smtp_pass: await settingsService.get('smtp_pass'),
                sendgrid_api_key: await settingsService.get('sendgrid_api_key'),
                aws_ses_region: await settingsService.get('aws_ses_region'),
                aws_ses_access_key: await settingsService.get('aws_ses_access_key'),
                aws_ses_secret_key: await settingsService.get('aws_ses_secret_key')
            };

            // Initialize provider with database settings
            this.settings = settings; // Store for external access
            await this.initProvider(settings);
            this.initialized = true;

        } catch (error) {
            console.error('❌ Failed to load email settings, falling back to basic init:', error.message);
            this.provider = process.env.EMAIL_PROVIDER || 'smtp';
            await this.initProvider();
            this.initialized = true;
        }
    }

    /**
     * Initialize the selected email provider
     */
    async initProvider(settings = {}) {
        switch (this.provider) {
            case 'smtp':
                this.initSMTP(settings);
                break;
            case 'sendgrid':
                this.initSendGrid(settings);
                break;
            case 'ses':
                this.initSES(settings);
                break;
            case 'console':
                this.initConsole(settings);
                break;
            default:
                throw new Error(`Unknown email provider: ${this.provider}`);
        }
        console.log(`📧 Email Provider initialized: ${this.provider.toUpperCase()}`);
    }

    /**
     * Initialize Console Provider (Logging only)
     */
    initConsole(settings = {}) {
        console.log('📧 Email Provider: CONSOLE (Emails will be logged to terminal)');
    }

    /**
     * Initialize SMTP transporter (Gmail, Outlook, custom SMTP)
     */
    initSMTP(settings = {}) {
        const port = parseInt(settings.smtp_port || process.env.SMTP_PORT) || 587;
        const host = settings.smtp_host || process.env.SMTP_HOST;

        // Fallback to console if no host configured
        if (!host) {
            console.warn('⚠️  No SMTP Host configured. Falling back to CONSOLE provider.');
            this.provider = 'console';
            this.initConsole();
            return;
        }

        // Auto-detect secure setting based on port if not explicitly set
        // Port 465 is usually implicit SSL (secure: true)
        // Port 587 is usually STARTTLS (secure: false)
        let isSecure = (settings.smtp_secure || process.env.SMTP_SECURE) === 'true';

        if (!settings.smtp_secure && !process.env.SMTP_SECURE) {
            isSecure = port === 465;
        }

        const config = {
            host: host,
            port: port,
            secure: isSecure,
            auth: {
                user: settings.smtp_user || process.env.SMTP_USER,
                pass: settings.smtp_pass || process.env.SMTP_PASS
            },
            // Important for self-hosted/Plesk servers with self-signed certs
            tls: {
                rejectUnauthorized: false,
                ciphers: 'SSLv3'
            },
            name: host // Fixes @yourdomain.com in Message-ID
        };

        console.log(`📧 Configuring SMTP: ${config.host}:${config.port} (Secure: ${config.secure})`);

        this.transporter = nodemailer.createTransport(config);
    }

    /**
     * Initialize SendGrid
     */
    initSendGrid(settings = {}) {
        const apiKey = settings.sendgrid_api_key || process.env.SENDGRID_API_KEY;
        if (!apiKey) {
            console.warn('⚠️  SendGrid API Key missing. Falling back to CONSOLE provider.');
            this.provider = 'console';
            this.initConsole();
            return;
        }
        sgMail.setApiKey(apiKey);
    }

    /**
     * Initialize AWS SES
     */
    initSES(settings = {}) {
        const region = settings.aws_ses_region || process.env.AWS_SES_REGION;
        if (!region) {
            console.warn('⚠️  AWS SES Region missing. Falling back to CONSOLE provider.');
            this.provider = 'console';
            this.initConsole();
            return;
        }

        this.ses = new AWS.SES({
            region: region || 'us-east-1',
            accessKeyId: settings.aws_ses_access_key || process.env.AWS_SES_ACCESS_KEY,
            secretAccessKey: settings.aws_ses_secret_key || process.env.AWS_SES_SECRET_KEY
        });
    }

    /**
     * Send email via the configured provider
     * @param {Object} options - Email options
     * @param {string} options.from - Sender email address
     * @param {string} options.to - Recipient email address
     * @param {string} options.subject - Email subject
     * @param {string} options.html - HTML body
     * @param {string} [options.text] - Plain text body (optional)
     * @param {Object} [options.metadata] - Additional metadata for logging
     * @returns {Promise<Object>} - { messageId, status }
     */
    async send({ from, to, subject, html, text, metadata = {} }) {
        try {
            let result;

            switch (this.provider) {
                case 'smtp':
                    result = await this.sendViaSMTP({ from, to, subject, html, text });
                    break;
                case 'sendgrid':
                    result = await this.sendViaSendGrid({ from, to, subject, html, text });
                    break;
                case 'ses':
                    result = await this.sendViaSES({ from, to, subject, html, text });
                    break;
                case 'console':
                    result = await this.sendViaConsole({ from, to, subject, html, text });
                    break;
                default:
                    // Final fallback
                    console.warn(`Unknown provider ${this.provider}, using console.`);
                    result = await this.sendViaConsole({ from, to, subject, html, text });
            }

            console.log(`✅ Email sent to ${to} via ${this.provider} | ID: ${result.messageId}`);
            return {
                messageId: result.messageId,
                status: 'sent',
                provider: this.provider
            };
        } catch (error) {
            console.error(`❌ Email send failed (${this.provider}):`, error.message);
            throw error;
        }
    }

    /**
     * Send via Console (Log only)
     */
    async sendViaConsole({ from, to, subject, html, text }) {
        console.log('---------------------------------------------------');
        console.log(`📧 [MOCK EMAIL] To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`From: ${from}`);
        console.log(`Body (Preview): ${this.stripHTML(html).substring(0, 100)}...`);
        console.log('---------------------------------------------------');
        return { messageId: `mock-${Date.now()}` };
    }

    /**
     * Send via SMTP (Nodemailer)
     */
    async sendViaSMTP({ from, to, subject, html, text }) {
        const info = await this.transporter.sendMail({
            from,
            to,
            subject,
            html,
            text: text || this.stripHTML(html)
        });
        return { messageId: info.messageId };
    }

    /**
     * Send via SendGrid
     */
    async sendViaSendGrid({ from, to, subject, html, text }) {
        const msg = {
            to,
            from,
            subject,
            html,
            text: text || this.stripHTML(html)
        };
        const [response] = await sgMail.send(msg);
        return { messageId: response.headers['x-message-id'] };
    }

    /**
     * Send via AWS SES
     */
    async sendViaSES({ from, to, subject, html, text }) {
        const params = {
            Source: from,
            Destination: {
                ToAddresses: [to]
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: 'UTF-8'
                },
                Body: {
                    Html: {
                        Data: html,
                        Charset: 'UTF-8'
                    },
                    Text: {
                        Data: text || this.stripHTML(html),
                        Charset: 'UTF-8'
                    }
                }
            }
        };

        const result = await this.ses.sendEmail(params).promise();
        return { messageId: result.MessageId };
    }

    /**
     * Get delivery status from provider (for webhook-less providers)
     * @param {string} messageId - Provider message ID
     * @returns {Promise<Object>} - { status, deliveredAt, openedAt, etc. }
     */
    async getDeliveryStatus(messageId) {
        // Note: This is provider-specific and may require webhooks
        // For now, return a placeholder
        return {
            messageId,
            status: 'unknown',
            note: 'Delivery tracking requires webhook integration'
        };
    }

    /**
     * Strip HTML tags for plain text fallback
     * @param {string} html - HTML string
     * @returns {string} - Plain text
     */
    stripHTML(html) {
        return html.replace(/<[^>]*>/g, '').trim();
    }

    /**
     * Verify provider configuration (test connection)
     * @returns {Promise<boolean>}
     */
    async verify() {
        try {
            switch (this.provider) {
                case 'smtp':
                    await this.transporter.verify();
                    break;
                case 'sendgrid':
                    // SendGrid doesn't have a verify method, assume OK if API key is set
                    if (!process.env.SENDGRID_API_KEY) throw new Error('SendGrid API key missing');
                    break;
                case 'ses':
                    // Test SES connection
                    await this.ses.getSendQuota().promise();
                    break;
                case 'console':
                    return true;
            }
            console.log(`✅ ${this.provider.toUpperCase()} provider verified successfully`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.provider.toUpperCase()} verification failed:`, error.message);
            return false;
        }
    }
}

// Create singleton instance
const emailProvider = new EmailProvider();

// Initialize with database settings on first require
emailProvider.loadSettings().catch(err => {
    console.error('Failed to initialize email provider:', err);
});

module.exports = emailProvider;
