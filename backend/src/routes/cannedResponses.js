const express = require('express');
const router = express.Router();
const { CannedResponse } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');

// Ensure table exists on first load
(async () => {
  try {
    await CannedResponse.sync();
  } catch (e) {
    console.warn('[CannedResponse] Auto-sync notice:', e.message);
  }
})();

// GET /api/canned-responses - List canned responses
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId, search } = req.query;

    const where = {
      [Op.or]: [
        { userId },
        { isShared: true }
      ]
    };

    if (workspaceId) {
      where[Op.and] = [
        { [Op.or]: [{ workspaceId }, { workspaceId: null }] }
      ];
    }

    if (search) {
      where[Op.or] = [
        { shortcut: { [Op.like]: `%${search}%` } },
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const responses = await CannedResponse.findAll({
      where,
      order: [['shortcut', 'ASC']]
    });

    res.json({ cannedResponses: responses });
  } catch (err) {
    console.error('Error fetching canned responses:', err);
    res.status(500).json({ message: 'Failed to fetch canned responses' });
  }
});

// POST /api/canned-responses - Create a new canned response
router.post('/', requireAuth, async (req, res) => {
  try {
    const { shortcut, title, content, workspaceId, isShared = true } = req.body;

    if (!shortcut || !title || !content) {
      return res.status(400).json({ message: 'Shortcut, title, and content are required' });
    }

    const formattedShortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;

    const created = await CannedResponse.create({
      shortcut: formattedShortcut,
      title,
      content,
      userId: req.user.id,
      workspaceId: workspaceId || null,
      isShared
    });

    res.status(201).json({ cannedResponse: created });
  } catch (err) {
    console.error('Error creating canned response:', err);
    res.status(500).json({ message: 'Failed to create canned response' });
  }
});

// PUT /api/canned-responses/:id - Update canned response
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { shortcut, title, content, isShared } = req.body;

    const canned = await CannedResponse.findByPk(id);
    if (!canned) {
      return res.status(404).json({ message: 'Canned response not found' });
    }

    if (canned.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to edit this response' });
    }

    const updates = {};
    if (shortcut) updates.shortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;
    if (title) updates.title = title;
    if (content) updates.content = content;
    if (typeof isShared !== 'undefined') updates.isShared = isShared;

    await canned.update(updates);
    res.json({ cannedResponse: canned });
  } catch (err) {
    console.error('Error updating canned response:', err);
    res.status(500).json({ message: 'Failed to update canned response' });
  }
});

// DELETE /api/canned-responses/:id - Delete canned response
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const canned = await CannedResponse.findByPk(id);
    if (!canned) {
      return res.status(404).json({ message: 'Canned response not found' });
    }

    if (canned.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this response' });
    }

    await canned.destroy();
    res.json({ message: 'Canned response deleted' });
  } catch (err) {
    console.error('Error deleting canned response:', err);
    res.status(500).json({ message: 'Failed to delete canned response' });
  }
});

module.exports = router;
