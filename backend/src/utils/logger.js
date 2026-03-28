const { ActivityLog } = require('../models');

/**
 * Logs a user activity to the database.
 * @param {number} userId - The ID of the user performing the action.
 * @param {string} action - A short string describing the action (e.g., 'LOGIN', 'DELETE_USER').
 * @param {object} details - Additional JSON details about the action.
 * @param {object} req - Express request object (optional, for IP/UserAgent).
 */
async function logActivity(userId, action, details = {}, req = null) {
    try {
        let ip_address = null;
        let user_agent = null;

        if (req) {
            ip_address = req.ip || req.connection.remoteAddress;
            user_agent = req.get('User-Agent');
        }

        await ActivityLog.create({
            user_id: userId,
            action,
            details,
            ip_address,
            user_agent
        });
    } catch (err) {
        console.error('Failed to log activity:', err);
        // Silent fail so we don't block the main flow
    }
}

module.exports = { logActivity };
