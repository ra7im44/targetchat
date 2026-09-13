const axios = require('axios');
const { Channel, Lead, Chat, Message } = require('../models');
const metaApiService = require('./metaApiService');

class MessagingService {
    /**
     * Core Routing Logic for Meta Messages (FB/IG)
     */
    async processMetaMessage(event, platformType, io = null) {
        const senderId = event.sender?.id || event.from?.id;
        const recipientId = event.recipient?.id || event.to?.id;
        const messageText = event.message?.text || '';
        const messageId = event.message?.mid || event.id;

        const channel = await Channel.findOne({ where: { externalId: recipientId } });
        if (!channel) return;

        await channel.update({ lastActiveAt: new Date() });

        let lead = await Lead.findOne({ where: { metaId: senderId, ownerUserId: channel.userId } });
        if (!lead) {
            const profile = await metaApiService.getUserProfile(channel.type, senderId, channel.accessToken);
            lead = await Lead.create({
                ownerUserId: channel.userId,
                name: profile?.name || `Meta User ${senderId.slice(-4)}`,
                metaId: senderId,
                avatar_url: profile?.picture,
                status: 'new'
            });
        }

        let chat = await Chat.findOne({
            where: { leadId: lead.id, channelId: channel.id, status: 'active' }
        });

        if (!chat) {
            chat = await Chat.create({
                leadId: lead.id,
                channelId: channel.id,
                title: `${channel.type === 'facebook' ? 'FB' : 'IG'} Chat with ${lead.name}`,
                userId: channel.userId,
                status: 'active'
            });
        }

        await Message.create({
            chatId: chat.id,
            sender: 'user',
            text: messageText,
            externalId: messageId,
            metadata: { raw: event }
        });

        if (channel.type !== 'whatsapp' && channel.accessToken) {
            await metaApiService.sendAction(channel.type, channel.accessToken, senderId, 'mark_seen');
        }

        let routedToWorkflow = false;
        if (channel.isActive && channel.mode === 'workflow' && channel.workflowUrl) {
            routedToWorkflow = await this.forwardToWorkflow(channel.workflowUrl, event, chat, channel);
        }

        if (!routedToWorkflow && io) {
            io.to(`user_${channel.userId}`).emit('message:new', {
                chatId: chat.id,
                message: await Message.findOne({ where: { externalId: messageId } })
            });
        }
    }

    /**
     * Core Routing Logic for WhatsApp Messages
     */
    async processWhatsAppMessage(message, metadata, contact, io = null) {
        const from = message.from;
        const wamid = message.id;
        const type = message.type;
        const phoneNumberId = metadata.phone_number_id;

        let channel = await Channel.findOne({ where: { externalId: phoneNumberId, type: 'whatsapp' } });

        if (!channel && metadata.display_phone_number) {
            const displayPhone = metadata.display_phone_number;
            channel = await Channel.findOne({
                where: { type: 'whatsapp', externalId: { [require('sequelize').Op.like]: `%${displayPhone}%` } }
            });
            if (channel) await channel.update({ externalId: phoneNumberId });
        }

        if (!channel) return;

        await channel.update({ lastActiveAt: new Date() });

        let lead = await Lead.findOne({ where: { whatsappId: from, ownerUserId: channel.userId } });
        const contactName = contact?.profile?.name || `WA User ${from.slice(-4)}`;

        if (!lead) {
            lead = await Lead.create({
                ownerUserId: channel.userId,
                name: contactName,
                whatsappId: from,
                phone: from,
                status: 'new'
            });
        }

        let chat = await Chat.findOne({ where: { leadId: lead.id, channelId: channel.id, status: 'active' } });
        if (!chat) {
            chat = await Chat.create({
                leadId: lead.id,
                channelId: channel.id,
                title: `WhatsApp Chat with ${from}`,
                userId: channel.userId,
                status: 'active'
            });
        }

        await Message.create({
            chatId: chat.id,
            sender: 'user',
            text: message.text?.body || '',
            externalId: wamid,
            metadata: { raw: message }
        });

        let routedToWorkflow = false;
        if (channel.isActive && channel.mode === 'workflow' && channel.workflowUrl) {
            routedToWorkflow = await this.forwardToWorkflow(channel.workflowUrl, message, chat, channel);
        }

        if (!routedToWorkflow && io) {
            io.to(`user_${channel.userId}`).emit('message:new', {
                chatId: chat.id,
                message: await Message.findOne({ where: { externalId: wamid } })
            });
        }
    }

    /**
     * Handle Read Receipts
     */
    async handleReadReceipt(event, io) {
        const senderId = event.sender.id;
        const recipientId = event.recipient.id;
        const channel = await Channel.findOne({ where: { externalId: recipientId } });
        if (!channel) return;
        const lead = await Lead.findOne({ where: { metaId: senderId, ownerUserId: channel.userId } });
        if (!lead) return;
        const chat = await Chat.findOne({ where: { leadId: lead.id, channelId: channel.id, status: 'active' } });
        if (!chat) return;
        if (io) {
            io.to(`user_${channel.userId}`).emit('chat:read', {
                chatId: chat.id,
                watermark: event.read.watermark
            });
        }
    }

    /**
     * Handle Delivery Receipts
     */
    async handleDeliveryReceipt(event, io) {
        const senderId = event.sender.id;
        const recipientId = event.recipient.id;
        const channel = await Channel.findOne({ where: { externalId: recipientId } });
        if (!channel) return;
        const lead = await Lead.findOne({ where: { metaId: senderId, ownerUserId: channel.userId } });
        if (!lead) return;
        const chat = await Chat.findOne({ where: { leadId: lead.id, channelId: channel.id, status: 'active' } });
        if (!chat) return;
        if (io) {
            io.to(`user_${channel.userId}`).emit('chat:delivery', {
                chatId: chat.id,
                watermark: event.delivery.watermark
            });
        }
    }

    /**
     * Handle Typing Indicators
     */
    async handleTypingIndicator(event, io) {
        const senderId = event.sender.id;
        const recipientId = event.recipient.id;
        const channel = await Channel.findOne({ where: { externalId: recipientId } });
        if (!channel) return;
        const lead = await Lead.findOne({ where: { metaId: senderId, ownerUserId: channel.userId } });
        if (!lead) return;
        const chat = await Chat.findOne({ where: { leadId: lead.id, channelId: channel.id, status: 'active' } });
        if (!chat) return;
        if (io) {
            io.to(`user_${channel.userId}`).emit('chat:typing', {
                chatId: chat.id,
                typing: event.typing.action === 'typing_on'
            });
        }
    }

    async forwardToWorkflow(webhookUrl, event, chat, channel) {
        try {
            // SECURITY: SSRF gate — never dial private/loopback/metadata targets.
            await require('../utils/ssrfGuard').assertSafeWebhookUrl(webhookUrl);

            const payload = {
                chatId: chat.id,
                leadId: chat.leadId,
                channel: { id: channel.id, type: channel.type, name: channel.name },
                message: event.message || event,
                sender: event.sender || event.from
            };
            await axios.post(webhookUrl, payload, {
                headers: { 'X-TargetChat-Signature': 'verified' },
                timeout: 5000
            });
            return true;
        } catch (err) {
            console.error('❌ Failed to forward to workflow:', err.message);
            return false;
        }
    }
}

module.exports = new MessagingService();
