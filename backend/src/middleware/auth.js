const jwt = require('jsonwebtoken');
const { User, ApiToken } = require('../models');
const crypto = require('crypto');
const { getJwtSecret } = require('../config/secrets');

const requireAuth = async function (req, res, next) {
  let token = null;
  const auth = req.headers.authorization;

  if (auth && auth.startsWith('Bearer ')) {
    token = auth.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  // API Token Authentication
  if (token.startsWith('tc_')) {
    try {
      // Hash the incoming token
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find token in DB
      const apiToken = await ApiToken.findOne({ where: { tokenHash } });

      if (!apiToken) {
        return res.status(401).json({ message: 'Invalid API token' });
      }

      // Check expiration
      if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
        return res.status(401).json({ message: 'API token expired' });
      }

      // Update last used (fire and forget, don't await/block)
      apiToken.update({ lastUsedAt: new Date() }).catch(err => console.error('Error updating token last usage:', err));

      // Get associated user
      const user = await User.findByPk(apiToken.userId);
      if (!user || user.isActive === false) {
        return res.status(401).json({ message: 'User inactive or not found' });
      }

      // Set user and token context
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        isActive: user.isActive !== undefined ? user.isActive : true,
        isVerified: user.isVerified
      };

      if (user.isVerified === false) {
        return res.status(403).json({ message: 'Email not verified', requiresVerification: true });
      }

      req.apiToken = apiToken; // Access to permissions if needed

      return next();
    } catch (err) {
      console.error('API Token Auth Error:', err);
      return res.status(500).json({ message: 'Server error during authentication' });
    }
  }

  // JWT Authentication
  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findByPk(payload.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      isActive: user.isActive !== undefined ? user.isActive : true,
      isVerified: user.isVerified
    };

    if (user.isVerified === false) {
      return res.status(403).json({ message: 'Email not verified', requiresVerification: true });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const requireAdmin = async function (req, res, next) {
  // Reuse the auth logic first
  await requireAuth(req, res, () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
  });
};

module.exports = { requireAuth, requireAdmin };
