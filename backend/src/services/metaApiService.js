const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);
const settingsService = require('./settingsService');

/**
 * Meta API Service - Handles outbound messaging for FB, IG, and WA
 */
class MetaApiService {
    /**
     * Send message to Facebook Messenger
     */
    async sendFacebookMessage(pageAccessToken, recipientId, text) {
        try {
            console.log(`[MetaService] Sending FB Message to ${recipientId}`);
            const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`;
            const response = await axios.post(url, {
                recipient: { id: recipientId },
                message: { text: text },
                messaging_type: 'RESPONSE'
            });
            return response.data;
        } catch (error) {
            this.handleError('Facebook', error);
        }
    }

    /**
     * Send message to Instagram DM
     */
    async sendInstagramMessage(pageAccessToken, recipientId, text) {
        try {
            console.log(`[MetaService] Sending IG Message to ${recipientId}`);
            const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`;
            const response = await axios.post(url, {
                recipient: { id: recipientId },
                message: { text: text }
            });
            return response.data;
        } catch (error) {
            this.handleError('Instagram', error);
        }
    }

    /**
     * Send message to WhatsApp Cloud API
     */
    async sendWhatsAppMessage(phoneNumberId, systemUserToken, to, text) {
        try {
            console.log(`[MetaService] Sending WhatsApp Message to ${to}`);
            const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
            const response = await axios.post(url, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: { body: text }
            }, {
                headers: { Authorization: `Bearer ${systemUserToken}` }
            });
            return response.data;
        } catch (error) {
            this.handleError('WhatsApp', error);
        }
    }

    /**
     * Fetch user profile data from Meta Graph API
     */
    async getUserProfile(platform, identifier, accessToken) {
        try {
            console.log(`[MetaService] Fetching ${platform} profile for ${identifier}`);
            let url;
            if (platform === 'facebook') {
                url = `https://graph.facebook.com/v19.0/${identifier}?fields=first_name,last_name,profile_pic&access_token=${accessToken}`;
            } else if (platform === 'instagram') {
                url = `https://graph.facebook.com/v19.0/${identifier}?fields=username,name,profile_picture_url&access_token=${accessToken}`;
            } else {
                return null;
            }

            const response = await axios.get(url);
            const data = response.data;

            return {
                name: platform === 'facebook' ? `${data.first_name} ${data.last_name}` : (data.name || data.username),
                picture: platform === 'facebook' ? data.profile_pic : data.profile_picture_url
            };
        } catch (error) {
            console.warn(`[MetaService] Profile enrichment failed for ${identifier}:`, error.message);
            return null;
        }
    }

    /**
     * Download media from Meta and save local copy
     */
    async downloadMedia(url, fileName) {
        try {
            const uploadDir = path.join(__dirname, '../../public/uploads/channels');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const localPath = path.join(uploadDir, fileName);
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });

            await pipeline(response.data, fs.createWriteStream(localPath));

            // Return public URL path
            return `/uploads/channels/${fileName}`;
        } catch (error) {
            console.error('[MetaService] Media download failed:', error.message);
            return null;
        }
    }

    /**
     * Fetch WhatsApp Media URL from Media ID
     */
    async getWhatsAppMediaUrl(mediaId, accessToken) {
        try {
            const url = `https://graph.facebook.com/v19.0/${mediaId}`;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            return response.data.url;
        } catch (error) {
            console.error('[MetaService] Failed to fetch WA media URL:', error.message);
            return null;
        }
    }

    /**
     * Send Seen/Typing indicators
     */
    async sendAction(platform, pageAccessToken, recipientId, action = 'mark_seen') {
        if (platform === 'whatsapp') return; // WhatsApp uses separate read receipts
        try {
            const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`;
            await axios.post(url, {
                recipient: { id: recipientId },
                sender_action: action // 'mark_seen', 'typing_on', 'typing_off'
            });
        } catch (error) {
            console.warn(`[MetaService] Failed to send ${action} to ${platform}`);
        }
    }

    /**
     * Exchange OAuth Code for User Access Token
     */
    async getUserAccessToken(code, redirectUri) {
        try {
            const appId = await settingsService.get('FACEBOOK_APP_ID');
            const appSecret = await settingsService.get('FACEBOOK_APP_SECRET');

            const url = `https://graph.facebook.com/v19.0/oauth/access_token`;
            const response = await axios.get(url, {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    redirect_uri: redirectUri,
                    code: code
                }
            });
            return response.data.access_token;
        } catch (error) {
            this.handleError('Meta OAuth', error);
        }
    }

    /**
     * Exchange short-lived token for long-lived (60 day) user token
     */
    async getLongLivedUserAccessToken(shortLivedToken) {
        try {
            const appId = await settingsService.get('FACEBOOK_APP_ID');
            const appSecret = await settingsService.get('FACEBOOK_APP_SECRET');

            const url = `https://graph.facebook.com/v19.0/oauth/access_token`;
            const response = await axios.get(url, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: shortLivedToken
                }
            });
            return response.data.access_token;
        } catch (error) {
            this.handleError('Meta Token Exchange', error);
        }
    }

    /**
     * Fetch all Pages a user has access to
     */
    async getUserPages(userAccessToken) {
        try {
            const url = `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}&fields=name,id,access_token,tasks,picture,instagram_business_account{id,username,name,profile_picture_url}`;
            const response = await axios.get(url);
            return response.data.data;
        } catch (error) {
            this.handleError('Meta Pages Discovery', error);
        }
    }

    handleError(platform, error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`❌ ${platform} API Error:`, errorMsg);
        throw new Error(`${platform} delivery failed: ${errorMsg}`);
    }
}

module.exports = new MetaApiService();
