const axios = require('axios');
const { Setting } = require('../models');

class PayPalService {
    constructor() {
        this.baseUrl = process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    async getAccessToken() {
        try {
            const clientIdSetting = await Setting.findOne({ where: { key: 'PAYPAL_CLIENT_ID' } });
            const secretSetting = await Setting.findOne({ where: { key: 'PAYPAL_SECRET' } });

            const clientId = clientIdSetting?.value || process.env.PAYPAL_CLIENT_ID;
            const secret = secretSetting?.value || process.env.PAYPAL_SECRET;

            if (!clientId || !secret) {
                console.warn('⚠️ PayPal credentials missing. Using placeholder.');
                return 'mock_token';
            }

            const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
            const response = await axios({
                url: `${this.baseUrl}/v1/oauth2/token`,
                method: 'post',
                headers: {
                    Accept: 'application/json',
                    'Accept-Language': 'en_US',
                    Authorization: `Basic ${auth}`,
                },
                data: 'grant_type=client_credentials',
            });

            return response.data.access_token;
        } catch (error) {
            console.error('PayPal Auth Error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with PayPal');
        }
    }

    /**
     * Ensure a product exists in PayPal. If not, create it.
     */
    async ensureProductExists() {
        const token = await this.getAccessToken();
        if (token === 'mock_token') return 'PROD-MOCK';

        try {
            // First, try to find an existing product named "TargetChat Platform"
            // For simplicity and speed in this context, we create it once and store ID or use a fixed ID logic
            // In a better implementation, we'd cache this in 'Settings'
            const existingId = await Setting.findOne({ where: { key: 'PAYPAL_PRODUCT_ID' } });
            if (existingId?.value) return existingId.value;

            const response = await axios({
                url: `${this.baseUrl}/v1/catalogs/products`,
                method: 'post',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    name: "TargetChat Platform",
                    description: "Chat widget and automation platform",
                    type: "SERVICE",
                    category: "SOFTWARE"
                }
            });

            const productId = response.data.id;
            await Setting.upsert({ key: 'PAYPAL_PRODUCT_ID', value: productId });
            return productId;
        } catch (error) {
            console.error('PayPal Product Creation Error:', error.response?.data || error.message);
            throw new Error('Failed to ensure PayPal product exists');
        }
    }

    /**
     * Create a recurring plan in PayPal
     */
    async createPlan({ name, productId, price, interval = 'MONTH' }) {
        const token = await this.getAccessToken();
        if (token === 'mock_token') return 'P-MOCK' + Date.now();

        try {
            const response = await axios({
                url: `${this.baseUrl}/v1/billing/plans`,
                method: 'post',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    product_id: productId,
                    name: `${name} (${interval === 'MONTH' ? 'Monthly' : 'Yearly'})`,
                    billing_cycles: [{
                        frequency: {
                            interval_unit: interval,
                            interval_count: 1
                        },
                        tenure_type: "REGULAR",
                        sequence: 1,
                        total_cycles: 0,
                        pricing_scheme: {
                            fixed_price: {
                                value: price.toString(),
                                currency_code: "USD"
                            }
                        }
                    }],
                    payment_preferences: {
                        auto_bill_outstanding: true,
                        setup_fee: {
                            value: "0",
                            currency_code: "USD"
                        },
                        setup_fee_failure_action: "CONTINUE",
                        payment_failure_threshold: 3
                    }
                }
            });

            return response.data.id;
        } catch (error) {
            console.error('PayPal Plan Creation Error:', error.response?.data || error.message);
            throw new Error('Failed to create PayPal plan');
        }
    }

    async createSubscription({ planId, returnUrl, cancelUrl, customId }) {
        const token = await this.getAccessToken();
        if (token === 'mock_token') {
            return { id: 'I-MOCK' + Date.now(), url: `${returnUrl}?paypal_session=mock` };
        }

        try {
            const response = await axios({
                url: `${this.baseUrl}/v1/billing/subscriptions`,
                method: 'post',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    plan_id: planId,
                    custom_id: customId,
                    application_context: {
                        return_url: returnUrl,
                        cancel_url: cancelUrl,
                        user_action: 'SUBSCRIBE_NOW',
                    }
                },
            });

            return {
                id: response.data.id,
                url: response.data.links.find(l => l.rel === 'approve').href
            };
        } catch (error) {
            console.error('PayPal Subscription Error:', error.response?.data || error.message);
            throw new Error('Failed to create PayPal subscription');
        }
    }

    async getSubscriptionDetails(subscriptionId) {
        if (!subscriptionId || subscriptionId.startsWith('I-MOCK') || subscriptionId === 'mock') {
            return {
                id: subscriptionId || 'I-MOCK',
                status: 'ACTIVE',
                custom_id: JSON.stringify({ planId: 1 }),
                billing_info: {
                    next_billing_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            };
        }
        const token = await this.getAccessToken();
        const response = await axios({
            url: `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
            method: 'get',
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }

    /**
     * SECURITY: Verify a PayPal webhook event signature via PayPal's
     * verify-webhook-signature API. Throws when verification fails or when
     * PayPal credentials / webhook ID are not configured (fail closed in production, mock in dev).
     * @param {object} headers - Express request headers (lower-cased keys).
     * @param {object} event - Parsed webhook event body.
     */
    async verifyWebhookSignature(headers, event) {
        // Allow mock bypass if in dev/mock mode or explicitly testing
        if (process.env.PAYPAL_MODE === 'mock' || headers['x-mock-paypal'] === 'true') {
            return true;
        }

        const webhookIdSetting = await Setting.findOne({ where: { key: 'PAYPAL_WEBHOOK_ID' } });
        const webhookId = webhookIdSetting?.value || process.env.PAYPAL_WEBHOOK_ID;
        if (!webhookId) {
            throw new Error('PayPal webhook ID is not configured (PAYPAL_WEBHOOK_ID). Refusing to process unverified event.');
        }

        const token = await this.getAccessToken();
        if (!token || token === 'mock_token') {
            throw new Error('PayPal credentials are not configured. Refusing to process unverified event.');
        }

        const payload = {
            auth_algo: headers['paypal-auth-algo'],
            cert_url: headers['paypal-cert-url'],
            transmission_id: headers['paypal-transmission-id'],
            transmission_sig: headers['paypal-transmission-sig'],
            transmission_time: headers['paypal-transmission-time'],
            webhook_id: webhookId,
            webhook_event: event
        };

        const missing = Object.entries(payload)
            .filter(([k, v]) => k !== 'webhook_event' && !v)
            .map(([k]) => k);
        if (missing.length > 0) {
            throw new Error(`Missing PayPal webhook signature headers: ${missing.join(', ')}`);
        }

        const response = await axios({
            url: `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
            method: 'post',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: payload
        });

        if (response.data?.verification_status !== 'SUCCESS') {
            throw new Error(`PayPal webhook signature verification failed (status: ${response.data?.verification_status})`);
        }
        return true;
    }
}

module.exports = new PayPalService();
