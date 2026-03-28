const { Setting } = require('../models');

// In-memory cache for maintenance mode
let isMaintenanceMode = false;
let lastCheck = 0;
const CHECK_INTERVAL = 30000; // 30 seconds

const checkMaintenanceStatus = async () => {
    try {
        const setting = await Setting.findOne({ where: { key: 'maintenance_mode' } });
        isMaintenanceMode = setting ? setting.value === 'true' : false;
        lastCheck = Date.now();
    } catch (err) {
        console.error('Error checking maintenance mode:', err);
    }
};

const maintenanceMiddleware = async (req, res, next) => {
    // 1. Always allow preflight (OPTIONS) requests
    if (req.method === 'OPTIONS') {
        return next();
    }

    // 2. Allow Public Settings and Auth Routes (always needed for frontend to stay alive)
    if (
        req.path.startsWith('/api/auth') ||
        req.path.startsWith('/api/settings/public')
    ) {
        return next();
    }

    // Refresh status if stale
    if (Date.now() - lastCheck > CHECK_INTERVAL) {
        await checkMaintenanceStatus();
    }

    if (isMaintenanceMode) {
        // 3. Allow Admin Routes
        if (req.path.startsWith('/api/admin')) {
            return next();
        }

        // 4. IMPORTANT: Allow ANY request if the user is already authenticated as an Admin/Superadmin
        // This allows admins to test the dashboard while normal users get the 503.
        // Note: req.user is populated by requireAuth which usually runs AFTER this in index.js
        // We might need to move this middleware down or check the token manually here.
        // For now, let's keep the path-based allowance for admins.

        return res.status(503).json({
            message: 'Service Unavailable',
            error: 'The system is currently undergoing maintenance. Please try again later.'
        });
    }

    next();
};

module.exports = maintenanceMiddleware;
