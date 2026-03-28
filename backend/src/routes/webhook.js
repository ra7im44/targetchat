const express = require('express');
const router = express.Router();
const { Chat, Message } = require('../models');
const { validate, schemas } = require('../middleware/validation');
const { generateSignedUrl } = require('../utils/generateSignedUrl');

// POST /api/webhook/n8n
// Receives AI responses from n8n workflow
router.post('/n8n', validate(schemas.n8nWebhook), async (req, res) => {
    try {
        const { chat_id, user_id, reply, webhook_secret } = req.body;

        // Validate webhook secret
        const expectedSecret = process.env.WEBHOOK_SECRET;
        if (!expectedSecret || webhook_secret !== expectedSecret) {
            console.error('❌ Invalid webhook secret');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify chat exists and belongs to user
        const where = { id: chat_id };
        // If user_id is 0 (guest), we expect userId to be null in DB
        if (user_id && user_id !== 0 && user_id !== '0') {
            where.userId = user_id;
        } else {
            where.userId = null;
        }

        const chat = await Chat.findOne({ where });
        if (!chat) {
            console.error(`❌ Chat ${chat_id} not found for user ${user_id}`);
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Prepare database storage
        let dbText = '';
        let dbMetadata = null;

        if (reply.type === 'text') {
            dbText = reply.text || '';
        } else {
            // For media types, store the filename
            dbText = reply.filename || '';
            if (reply.type === 'file' && reply.filename) {
                // Extract filename from URL if needed
                const fname = reply.filename.split('/').pop().split('?')[0];
                dbMetadata = { name: fname };
            }
        }

        // Create AI message in database
        const aiMessage = await Message.create({
            chatId: chat_id,
            userId: (user_id && user_id !== 0 && user_id !== '0') ? user_id : null,
            sender: 'ai',
            text: dbText,
            type: reply.type,
            metadata: dbMetadata
        });

        // Prepare response with signed URLs for media
        let signedUrl = null;
        if (reply.type !== 'text' && reply.filename) {
            const fname = reply.filename.split('/').pop().split('?')[0];
            signedUrl = generateSignedUrl(fname);
        }

        const messagePayload = {
            id: aiMessage.id,
            sender: 'ai',
            type: reply.type,
            text: reply.type === 'text' ? dbText : null,
            url: signedUrl,
            filename: reply.filename,
            contentType: reply.contentType || 'text/plain',
            // Legacy fields for backward compatibility
            image: reply.type === 'image' ? signedUrl : null,
            audio: reply.type === 'audio' ? signedUrl : null,
            video: reply.type === 'video' ? signedUrl : null,
            file: reply.type === 'file' ? { url: signedUrl, name: dbMetadata?.name } : null,
            time: new Date(aiMessage.createdAt).toLocaleTimeString(),
            createdAt: aiMessage.createdAt
        };

        // Broadcast to Socket.io
        const io = req.io;
        if (io) {
            // Emit to chat room (for logged in users)
            io.to(`chat_${chat_id}`).emit('message', {
                chatId: chat_id,
                message: messagePayload
            });

            // Emit to session room (for guest users)
            let targetSessionId = req.body.session_id;

            // Fallback: Try to extract session ID from chat title if not provided
            if (!targetSessionId && chat.title && chat.title.startsWith('Guest Session ')) {
                targetSessionId = chat.title.replace('Guest Session ', '');
            }

            if (targetSessionId) {
                io.to(`session_${targetSessionId}`).emit('message', {
                    ...messagePayload,
                    sender: 'ai' // Ensure sender is set for widget client
                });
                console.log(`✅ AI message broadcast to session_${targetSessionId}`);
            }

            console.log(`✅ AI message broadcast to chat_${chat_id}`);
        } else {
            console.warn('⚠️ Socket.io not available on req.io');
        }

        // Return success
        res.json({
            success: true,
            message: {
                id: aiMessage.id,
                ...messagePayload
            }
        });

    } catch (err) {
        console.error('❌ Webhook error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
