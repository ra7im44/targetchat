'use strict';

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const knowledge = require('../services/knowledgeService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: knowledge.MAX_FILE_BYTES, files: 1 }
});

async function workspaceGuard(req, res) {
  const workspaceId = req.body.workspace_id || req.query.workspace_id;
  const workspace = await knowledge.assertWorkspaceAccess(req.user.id, workspaceId, req.user.role);
  if (!workspace) {
    res.status(404).json({ error: 'workspace_not_found', message: 'Workspace not found or access denied' });
    return null;
  }
  return workspace;
}

function fail(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error('[knowledge]', err.message);
  return res.status(status).json({
    error: err.code || 'kb_error',
    message: status >= 500 ? 'Knowledge base operation failed' : err.message
  });
}

// GET /api/knowledge/status?workspace_id=1
router.get('/status', requireAuth, async (req, res) => {
  try {
    const workspace = await workspaceGuard(req, res);
    if (!workspace) return;
    return res.json(await knowledge.status(workspace.id));
  } catch (err) {
    return fail(res, err);
  }
});

// GET /api/knowledge/documents?workspace_id=1
router.get('/documents', requireAuth, async (req, res) => {
  try {
    const workspace = await workspaceGuard(req, res);
    if (!workspace) return;
    const documents = await knowledge.listDocuments({ workspaceId: workspace.id });
    return res.json({ documents });
  } catch (err) {
    return fail(res, err);
  }
});

// POST /api/knowledge/documents  (multipart: file, workspace_id, title?)
router.post('/documents', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'kb_missing_file', message: 'A file field is required' });
    }
    const workspace = await workspaceGuard(req, res);
    if (!workspace) return;

    const result = await knowledge.ingest({
      workspaceId: workspace.id,
      userId: req.user.id,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      title: req.body.title
    });

    return res.status(201).json({
      document: result.document,
      chunks: result.chunks,
      embeddingModel: result.embeddingModel,
      retrievalMode: result.mode
    });
  } catch (err) {
    return fail(res, err);
  }
});

// DELETE /api/knowledge/documents/:id?workspace_id=1
router.delete('/documents/:id', requireAuth, async (req, res) => {
  try {
    const workspace = await workspaceGuard(req, res);
    if (!workspace) return;
    const doc = await knowledge.removeDocument({
      workspaceId: workspace.id,
      documentId: req.params.id
    });
    if (!doc) {
      return res.status(404).json({ error: 'kb_document_not_found' });
    }
    return res.json({ success: true, id: doc.id });
  } catch (err) {
    return fail(res, err);
  }
});

// POST /api/knowledge/documents/:id/reindex
router.post('/documents/:id/reindex', requireAuth, async (req, res) => {
  try {
    const workspace = await workspaceGuard(req, res);
    if (!workspace) return;
    const result = await knowledge.reindexDocument({
      workspaceId: workspace.id,
      documentId: req.params.id
    });
    if (!result) {
      return res.status(404).json({ error: 'kb_document_not_found' });
    }
    return res.json(result);
  } catch (err) {
    return fail(res, err);
  }
});

// POST /api/knowledge/search  { workspace_id, query, limit }
router.post('/search', requireAuth, async (req, res) => {
  try {
    const workspace = await workspaceGuard(req, res);
    if (!workspace) return;
    const query = typeof req.body.query === 'string' ? req.body.query : '';
    if (!query.trim()) {
      return res.status(400).json({ error: 'kb_empty_query', message: 'query is required' });
    }
    const limit = Math.min(Math.max(Number(req.body.limit) || 4, 1), 20);
    const results = await knowledge.search({ workspaceId: workspace.id, query, limit });
    return res.json({ results });
  } catch (err) {
    return fail(res, err);
  }
});

module.exports = router;
