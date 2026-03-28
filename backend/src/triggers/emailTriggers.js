const emailService = require('../services/emailService');

/**
 * Email Triggers - Automatic email sending on platform events
 * 
 * Usage:
 * const { triggers } = require('./triggers/emailTriggers');
 * await triggers['user.registered'](user);
 */

const triggers = {
    /**
     * Trigger: User Registration
     * Sends welcome email with verification link
     */
    'user.registered': async (user, verificationToken) => {
        try {
            const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

            await emailService.sendSystemEmail(
                'welcome',
                user.email,
                {
                    username: user.name || user.email.split('@')[0],
                    verificationLink,
                    email: user.email
                },
                {
                    userId: user.id,
                    priority: 'normal'
                }
            );

            console.log(`📧 Welcome email sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send welcome email:', error.message);
        }
    },

    /**
     * Trigger: Email Verification Request
     * Sends verification code/link
     */
    'user.email_verification': async (user, verificationToken, otp = null) => {
        try {
            const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

            await emailService.sendSystemEmail(
                'email-verification',
                user.email,
                {
                    username: user.name || user.email.split('@')[0],
                    verificationLink,
                    otp: otp || 'N/A',
                    expiresIn: '24 hours'
                },
                {
                    userId: user.id,
                    priority: 'urgent'
                }
            );

            console.log(`📧 Verification email sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send verification email:', error.message);
        }
    },

    /**
     * Trigger: Password Reset Request
     * Sends password reset link
     */
    'user.password_reset': async (user, resetToken) => {
        try {
            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

            await emailService.sendSystemEmail(
                'password-reset',
                user.email,
                {
                    username: user.name || user.email.split('@')[0],
                    resetLink,
                    expiresIn: '1 hour',
                    email: user.email
                },
                {
                    userId: user.id,
                    priority: 'urgent'
                }
            );

            console.log(`📧 Password reset email sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send password reset email:', error.message);
        }
    },

    /**
     * Trigger: Payment Success
     * Sends payment confirmation with invoice
     */
    'billing.payment_success': async (user, invoice) => {
        try {
            await emailService.sendSystemEmail(
                'payment-success',
                user.email,
                {
                    username: user.name || user.email.split('@')[0],
                    amount: `$${parseFloat(invoice.amount).toFixed(2)}`,
                    plan: invoice.plan?.name || 'Subscription',
                    date: new Date(invoice.createdAt).toLocaleDateString(),
                    invoiceUrl: invoice.invoicePdf || '#',
                    nextBillingDate: invoice.nextBillingDate
                        ? new Date(invoice.nextBillingDate).toLocaleDateString()
                        : 'N/A'
                },
                {
                    userId: user.id,
                    priority: 'normal'
                }
            );

            console.log(`📧 Payment success email sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send payment success email:', error.message);
        }
    },

    /**
     * Trigger: Payment Failed
     * Sends payment failure notice with retry link
     */
    'billing.payment_failed': async (user, invoice) => {
        try {
            const retryUrl = `${process.env.FRONTEND_URL}/billing/retry/${invoice.id}`;

            await emailService.sendSystemEmail(
                'payment-failed',
                user.email,
                {
                    username: user.name || user.email.split('@')[0],
                    amount: `$${parseFloat(invoice.amount).toFixed(2)}`,
                    plan: invoice.plan?.name || 'Subscription',
                    retryUrl,
                    reason: invoice.errorMessage || 'Payment declined',
                    supportEmail: process.env.SUPPORT_EMAIL || 'support@targetchat.com'
                },
                {
                    userId: user.id,
                    priority: 'urgent'
                }
            );

            console.log(`📧 Payment failed email sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send payment failed email:', error.message);
        }
    },

    /**
     * Trigger: Subscription Canceled
     * Sends cancellation confirmation
     */
    'billing.subscription_canceled': async (user, subscription) => {
        try {
            await emailService.sendSystemEmail(
                'subscription-canceled',
                user.email,
                {
                    username: user.name || user.email.split('@')[0],
                    plan: subscription.plan?.name || 'Subscription',
                    expiresAt: subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : 'immediately',
                    feedbackUrl: `${process.env.FRONTEND_URL}/feedback`
                },
                {
                    userId: user.id,
                    priority: 'normal'
                }
            );

            console.log(`📧 Subscription canceled email sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send subscription canceled email:', error.message);
        }
    },

    /**
     * Trigger: Workflow Completed Successfully
     * Sends workflow success notification
     */
    'workflow.completed': async (user, workflow, result) => {
        try {
            await emailService.sendSystemEmail(
                'workflow-complete',
                user.email,
                {
                    username: user.name || user.email.split('@')[0],
                    workflowName: workflow.name,
                    status: 'Success',
                    completedAt: new Date(result.timestamp || Date.now()).toLocaleString(),
                    resultUrl: result.url || `${process.env.FRONTEND_URL}/workflows/${workflow.id}`,
                    duration: result.duration || 'N/A'
                },
                {
                    userId: user.id,
                    priority: 'low'
                }
            );

            console.log(`📧 Workflow completion email sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send workflow completion email:', error.message);
        }
    },

    /**
     * Trigger: Workflow Failed
     * Sends workflow error notification
     */
    'workflow.failed': async (user, workflow, error) => {
        try {
            await emailService.sendSystemEmail(
                'workflow-failed',
                user.email,
                {
                    username: user.name || user.email.split('@')[0],
                    workflowName: workflow.name,
                    error: error.message || 'Unknown error',
                    failedAt: new Date(error.timestamp || Date.now()).toLocaleString(),
                    supportUrl: `${process.env.FRONTEND_URL}/support`,
                    workflowUrl: `${process.env.FRONTEND_URL}/workflows/${workflow.id}`
                },
                {
                    userId: user.id,
                    priority: 'normal'
                }
            );

            console.log(`📧 Workflow failure email sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send workflow failure email:', error.message);
        }
    },

    /**
     * Trigger: Admin Announcement
     * Sends platform-wide announcement
     */
    'admin.announcement': async (user, announcement) => {
        try {
            await emailService.sendSystemEmail(
                'admin-announcement',
                user.email,
                {
                    username: user.name || user.email.split('@')[0],
                    title: announcement.title,
                    message: announcement.message,
                    ctaLink: announcement.ctaLink || '',
                    ctaText: announcement.ctaText || 'Learn More',
                    date: new Date().toLocaleDateString()
                },
                {
                    userId: user.id,
                    priority: announcement.priority || 'low'
                }
            );

            console.log(`📧 Admin announcement sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send admin announcement:', error.message);
        }
    }
};

/**
 * Helper function to trigger an event
 * @param {string} eventName - Event name (e.g., 'user.registered')
 * @param {...any} args - Event arguments
 */
async function triggerEvent(eventName, ...args) {
    const trigger = triggers[eventName];

    if (!trigger) {
        console.warn(`⚠️  No email trigger found for event: ${eventName}`);
        return;
    }

    try {
        await trigger(...args);
    } catch (error) {
        console.error(`❌ Email trigger failed for ${eventName}:`, error.message);
    }
}

module.exports = { triggers, triggerEvent };
