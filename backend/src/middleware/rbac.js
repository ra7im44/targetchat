// RBAC Middleware for TargetChat

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Default to 'user' if role not set (for backward compatibility)
    const userRole = req.user.role || 'user';

    if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    next();
}

/**
 * Middleware to require specific role(s)
 * @param {...string} roles - Allowed roles
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRole = req.user.role || 'user';

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                message: `Forbidden: Requires one of: ${roles.join(', ')}`
            });
        }

        next();
    };
}

/**
 * Middleware to check if user is active
 */
function requireActive(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Default to true if isActive not set (for backward compatibility)
    const isActive = req.user.isActive !== undefined ? req.user.isActive : true;

    if (!isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
    }

    next();
}

module.exports = {
    requireAdmin,
    requireRole,
    requireActive
};
