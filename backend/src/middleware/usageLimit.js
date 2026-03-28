const { Subscription, SubscriptionPlan, Message, Chat, Widget } = require('../models');
const { Op } = require('sequelize');

/**
 * Dynamic Usage Limit Middleware
 * Enforces limits based on the user's active SubscriptionPlan.
 */
module.exports = async function (req, res, next) {
    try {
        const userId = req.user.id;

        // 1. Fetch active subscription with plan details
        const subscription = await Subscription.findOne({
            where: {
                userId,
                status: 'active',
                currentPeriodEnd: { [Op.gt]: new Date() }
            },
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });

        const plan = subscription?.plan || {
            name: 'Free',
            maxMessagesPerMonth: 50,
            maxChats: 2,
            maxWidgets: 1,
            maxMembers: 1
        };

        // 2. Identify resource being accessed (optional hint from route)
        const resourceType = req.usageResourceType; // Expected: 'messages', 'chats', 'widgets'

        if (resourceType === 'messages') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const count = await Message.count({
                where: {
                    userId,
                    created_at: { [Op.gte]: startOfMonth },
                    sender: 'user'
                }
            });

            if (plan.maxMessagesPerMonth !== -1 && count >= plan.maxMessagesPerMonth) {
                return res.status(429).json({
                    error: 'Monthly message limit reached',
                    message: `You have reached your limit of ${plan.maxMessagesPerMonth} messages. Upgrade your plan to continue.`,
                    limitReached: true
                });
            }
        }

        if (resourceType === 'chats') {
            const count = await Chat.count({ where: { userId } });
            if (plan.maxChats !== -1 && count >= plan.maxChats) {
                return res.status(429).json({
                    error: 'Chat limit reached',
                    message: `You have reached your limit of ${plan.maxChats} chats. Upgrade your plan to create more.`,
                    limitReached: true
                });
            }
        }

        if (resourceType === 'widgets') {
            const count = await Widget.count({ where: { userId } });
            if (plan.maxWidgets !== -1 && count >= plan.maxWidgets) {
                return res.status(429).json({
                    error: 'Widget limit reached',
                    message: `You have reached your limit of ${plan.maxWidgets} widgets. Upgrade your plan to create more.`,
                    limitReached: true
                });
            }
        }

        // Attach plan to request for downstream use (e.g., feature checks)
        req.userPlan = plan;
        next();
    } catch (err) {
        console.error('Usage Limit Middleware Error:', err);
        res.status(500).json({ error: 'Server error checking limits' });
    }
};
