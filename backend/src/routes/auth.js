const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Subscription, SubscriptionPlan } = require('../models');
const { validate, schemas } = require('../middleware/validation');
const { logActivity } = require('../utils/logger');
const { triggerEvent } = require('../triggers/emailTriggers');

const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { getJwtSecret } = require('../config/secrets');
const { getClientIp } = require('../utils/requestContext');

router.post('/register', validate(schemas.register), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    // 1. Create User
    const hash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name,
      email,
      password: hash,
      isVerified: false,
      verificationToken,
      registrationIp: getClientIp(req)
    });

    // 2. Assign Free Plan
    const freePlan = await SubscriptionPlan.findOne({ where: { priceMonthly: 0 } });
    if (freePlan) {
      await Subscription.create({
        userId: user.id,
        planId: freePlan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 100)) // Forever
      });
    }

    // 3. Trigger Email
    await triggerEvent('user.registered', user, verificationToken).catch(err => console.error('Failed to trigger welcome email:', err));

    // 4. Return Success message (No Token)
    return res.json({
      message: 'Registration successful! Please check your email to verify your account.',
      requireVerification: true
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });

    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    // Generate Login Token
    const sessionToken = jwt.sign(
      { id: user.id, iss: 'targetchat', aud: 'targetchat:api' },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    return res.json({
      message: 'Email verified successfully',
      token: sessionToken
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check Verification
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email first.',
        requiresVerification: true
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login and IP
    user.lastLogin = new Date();
    user.lastIp = getClientIp(req);
    await user.save();

    await logActivity(user.id, 'LOGIN', {}, req);

    const token = jwt.sign(
      { id: user.id, iss: 'targetchat', aud: 'targetchat:api' },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    // Return both token and user object (excluding sensitive data)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    };

    return res.json({ token, user: userData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

// Update profile (name, email)
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Not found' });
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
    }
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
    return res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Not found' });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();
    return res.json({ message: 'Password changed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete account (and cascade chats/messages)
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Not found' });
    await user.destroy();
    return res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal user existence
      return res.json({ message: 'If an account exists, a password reset email has been sent.' });
    }

    // Generate token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    // Trigger email
    await triggerEvent('user.password_reset', user, token).catch(err => console.error('Failed to trigger reset email:', err));

    return res.json({ message: 'If an account exists, a password reset email has been sent.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Missing fields' });

    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() } // Expires > Now
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
