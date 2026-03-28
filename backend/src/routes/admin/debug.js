const express = require('express');
const router = express.Router();
const webhookTracker = require('../../utils/webhookTracker');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');

router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/debug/webhooks - Get recent webhook logs
 */
router.get('/webhooks', (req, res) => {
    res.json(webhookTracker.getLogs());
});

/**
 * DELETE /api/admin/debug/webhooks - Clear logs
 */
router.delete('/webhooks', (req, res) => {
    webhookTracker.clear();
    res.json({ message: 'Logs cleared' });
});

/**
 * POST /api/admin/debug/mock - Trigger a mock webhook event
 * This helps testing the inbox UI without a real phone.
 */
router.post('/mock', async (req, res) => {
    const { platform = 'whatsapp', sender = '123456789', text = 'Hello from Mock!' } = req.body;

    // Simulate what a real webhook might look like
    const mockBody = platform === 'whatsapp' ? {
        object: 'whatsapp_business_account',
        entry: [{
            changes: [{
                value: {
                    metadata: { display_phone_number: '123456789', phone_number_id: 'MOCK_ID' },
                    contacts: [{ profile: { name: 'Mock User' }, wa_id: sender }],
                    messages: [{ from: sender, id: 'MOCK_MSG_' + Date.now(), text: { body: text }, type: 'text', timestamp: Math.floor(Date.now() / 1000) }]
                }
            }]
        }]
    } : {
        object: 'page',
        entry: [{
            messaging: [{
                sender: { id: sender },
                recipient: { id: 'MOCK_PAGE_ID' },
                timestamp: Date.now(),
                message: { mid: 'MOCK_MID_' + Date.now(), text: text }
            }]
        }]
    };

    // We can't easily "post" to our own local server inside this handler reliably in all environments,
    // so we just log it to the tracker and let the user see it there or in the terminal.
    webhookTracker.log(`${platform}-mock`, mockBody);

    res.json({ message: 'Mock event logged to debugger', body: mockBody });
});

module.exports = router;
