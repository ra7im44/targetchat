'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const registry = require('../services/ai/registry');

/**
 * GET /api/ai/status
 * Reports the effective provider/model, whether the local backend is reachable,
 * installed Ollama models, and any configuration mismatch. Never exposes keys.
 */
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const status = await aiService.status({ force: req.query.force === '1' });
    return res.json(status);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/ai/providers
 * Catalog of supported providers with configured/selected flags (no secrets).
 */
router.get('/providers', requireAuth, (req, res) => {
  return res.json({ providers: registry.catalog() });
});

module.exports = router;
