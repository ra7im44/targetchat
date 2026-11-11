'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const { KbDocument, KbChunk, Workspace, WorkspaceMember, sequelize } = require('../models');
const registry = require('./ai/registry');
const { OllamaProvider } = require('./ai/providers/ollama');

/**
 * Workspace knowledge base.
 *
 * Design notes:
 *  - Documents and chunks carry workspace_id and every query filters on it, so
 *    one workspace can never retrieve another's content.
 *  - Embeddings are used when a local embedding model is installed
 *    (AI_EMBED_MODEL, default nomic-embed-text). qwen2.5:3b is a *chat* model and
 *    is never used for embeddings. With no embedding model the system falls back
 *    to a deterministic BM25-style lexical ranker — no downloads, no paid API.
 *  - Unsupported binary formats (PDF/DOCX/XLSX/PPTX) are rejected explicitly
 *    instead of being silently indexed as mojibake.
 */

const MAX_FILE_BYTES = Number(process.env.KB_MAX_FILE_BYTES) || 10 * 1024 * 1024;
const CHUNK_SIZE = Number(process.env.KB_CHUNK_SIZE) || 1000;
const CHUNK_OVERLAP = Number(process.env.KB_CHUNK_OVERLAP) || 150;
const DEFAULT_EMBED_MODEL = process.env.AI_EMBED_MODEL || 'nomic-embed-text';

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'html', 'htm',
  'xml', 'yml', 'yaml', 'log', 'js', 'jsx', 'ts', 'tsx', 'py', 'cs', 'java',
  'go', 'php', 'rb', 'rs', 'sql', 'sh', 'css', 'ini', 'cfg', 'conf'
]);

class KnowledgeError extends Error {
  constructor(message, { code = 'kb_error', status = 400 } = {}) {
    super(message);
    this.name = 'KnowledgeError';
    this.code = code;
    this.status = status;
  }
}

function extensionOf(filename) {
  const name = String(filename || '');
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

function decodeText(buffer) {
  // Text formats are UTF-8; invalid sequences are replaced rather than throwing.
  return buffer.toString('utf8').replace(/\u0000/g, '');
}

function stripHtml(input) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function extractText(buffer, filename) {
  if (!buffer || !buffer.length) {
    throw new KnowledgeError('The uploaded file is empty', { code: 'kb_empty_file' });
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new KnowledgeError('File is too large', { code: 'kb_file_too_large', status: 413 });
  }

  const ext = extensionOf(filename);
  const head = buffer.slice(0, 8).toString('latin1');
  if (head.startsWith('%PDF')) {
    throw new KnowledgeError(
      'PDF extraction is not enabled on this deployment. Convert the document to text/Markdown, or install a PDF extractor.',
      { code: 'kb_unsupported_pdf', status: 415 }
    );
  }
  if (head.startsWith('PK')) {
    throw new KnowledgeError(
      'Office documents (DOCX/XLSX/PPTX) are not supported yet. Upload text, Markdown, CSV or JSON.',
      { code: 'kb_unsupported_office', status: 415 }
    );
  }
  if (!TEXT_EXTENSIONS.has(ext)) {
    throw new KnowledgeError(
      `Unsupported file type${ext ? ` ".${ext}"` : ''}. Supported: ${[...TEXT_EXTENSIONS].join(', ')}.`,
      { code: 'kb_unsupported_type', status: 415 }
    );
  }

  let text = decodeText(buffer);
  if (ext === 'html' || ext === 'htm') text = stripHtml(text);

  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  if (!cleaned) {
    throw new KnowledgeError('No readable text was found in this file', { code: 'kb_no_text' });
  }
  return cleaned;
}

function chunkText(text, { size = CHUNK_SIZE, overlap = CHUNK_OVERLAP } = {}) {
  const clean = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(clean.length, start + size);
    if (end < clean.length) {
      const candidates = [
        clean.lastIndexOf('\n\n', end),
        clean.lastIndexOf('\n', end),
        clean.lastIndexOf('. ', end),
        clean.lastIndexOf(' ', end)
      ].filter((idx) => idx > start + Math.floor(size * 0.5));
      if (candidates.length) end = Math.max(...candidates) + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function tokenize(text) {
  return (String(text || '').toLowerCase().match(/[\p{L}\p{N}_]+/gu) || [])
    .filter((t) => t.length > 1);
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4));
}

function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

let embedCache = { at: 0, model: null };

async function resolveEmbedModel() {
  if (Date.now() - embedCache.at < 60000) return embedCache.model;
  let model = null;
  if (DEFAULT_EMBED_MODEL) {
    try {
      const models = await registry.listOllamaModels({});
      const found = models.find(
        (m) => m.name === DEFAULT_EMBED_MODEL || m.name.startsWith(`${DEFAULT_EMBED_MODEL}:`)
      );
      model = found ? found.name : null;
    } catch (e) {
      model = null;
    }
  }
  embedCache = { at: Date.now(), model };
  return model;
}

async function embedTexts(texts) {
  const model = await resolveEmbedModel();
  if (!model) return { model: null, vectors: null };
  const provider = new OllamaProvider({
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    timeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 120000
  });
  try {
    const vectors = await provider.embed({ model, input: texts });
    if (!Array.isArray(vectors) || vectors.length !== texts.length) {
      return { model: null, vectors: null };
    }
    return { model, vectors };
  } catch (err) {
    console.warn('[knowledge] embedding failed, falling back to lexical search:', err.message);
    return { model: null, vectors: null };
  }
}

async function assertWorkspaceAccess(userId, workspaceId, role) {
  const id = Number(workspaceId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const workspace = await Workspace.findByPk(id);
  if (!workspace) return null;
  if (role === 'admin' || role === 'superadmin') return workspace;
  if (String(workspace.owner_id) === String(userId)) return workspace;
  const member = await WorkspaceMember.findOne({
    where: { workspace_id: id, user_id: userId },
    attributes: ['id']
  });
  return member ? workspace : null;
}

async function ingest({ workspaceId, userId, filename, mimeType, buffer, title }) {
  const safeName = String(filename || 'document.txt').replace(/[\u0000-\u001f]/g, '').slice(0, 255);
  const size = buffer ? buffer.length : 0;
  const checksum = buffer ? crypto.createHash('sha256').update(buffer).digest('hex') : null;

  const doc = await KbDocument.create({
    workspace_id: workspaceId,
    user_id: userId || null,
    title: (title && String(title).trim().slice(0, 255)) || safeName,
    filename: safeName,
    mime_type: mimeType || null,
    size_bytes: size,
    checksum,
    status: 'processing'
  });

  try {
    const text = extractText(buffer, safeName);
    const chunks = chunkText(text);
    if (!chunks.length) throw new KnowledgeError('No indexable text', { code: 'kb_no_text' });

    const { model, vectors } = await embedTexts(chunks);
    const rows = chunks.map((chunk, index) => ({
      document_id: doc.id,
      workspace_id: workspaceId,
      chunk_index: index,
      text: chunk,
      token_count: estimateTokens(chunk),
      embedding: vectors ? vectors[index] : null
    }));
    await KbChunk.bulkCreate(rows);

    await doc.update({
      status: 'ready',
      chunk_count: rows.length,
      embedding_model: model,
      error: null
    });
    return { document: doc, chunks: rows.length, embeddingModel: model, mode: model ? 'embedding' : 'lexical' };
  } catch (err) {
    await doc.update({
      status: 'failed',
      error: String(err.message || 'Ingestion failed').slice(0, 500)
    }).catch(() => {});
    throw err;
  }
}

async function listDocuments({ workspaceId }) {
  return KbDocument.findAll({
    where: { workspace_id: workspaceId },
    order: [['created_at', 'DESC']],
    attributes: [
      'id', 'workspace_id', 'user_id', 'title', 'filename', 'mime_type',
      'size_bytes', 'status', 'error', 'chunk_count', 'embedding_model', 'created_at'
    ]
  });
}

async function getDocument({ workspaceId, documentId }) {
  return KbDocument.findOne({ where: { id: documentId, workspace_id: workspaceId } });
}

async function removeDocument({ workspaceId, documentId }) {
  const doc = await getDocument({ workspaceId, documentId });
  if (!doc) return null;
  await KbChunk.destroy({ where: { document_id: doc.id, workspace_id: workspaceId } });
  await doc.destroy();
  return doc;
}

/**
 * Re-chunk an existing document from its stored chunks' concatenated text.
 * (Original binaries are not retained, so this rebuilds from indexed text.)
 */
async function reindexDocument({ workspaceId, documentId }) {
  const doc = await getDocument({ workspaceId, documentId });
  if (!doc) return null;
  const existing = await KbChunk.findAll({
    where: { document_id: doc.id, workspace_id: workspaceId },
    order: [['chunk_index', 'ASC']]
  });
  if (!existing.length) {
    throw new KnowledgeError('Document has no indexed text to reindex', { code: 'kb_no_text', status: 409 });
  }
  const text = existing.map((c) => c.text).join('\n\n');
  const chunks = chunkText(text);
  if (!chunks.length) {
    throw new KnowledgeError('Document has no indexed text to reindex', { code: 'kb_no_text', status: 409 });
  }
  const { model, vectors } = await embedTexts(chunks);

  const transaction = await sequelize.transaction();
  try {
    await KbChunk.destroy({ where: { document_id: doc.id, workspace_id: workspaceId }, transaction });
    await KbChunk.bulkCreate(chunks.map((chunk, index) => ({
      document_id: doc.id,
      workspace_id: workspaceId,
      chunk_index: index,
      text: chunk,
      token_count: estimateTokens(chunk),
      embedding: vectors ? vectors[index] : null
    })), { transaction });
    await doc.update({ chunk_count: chunks.length, embedding_model: model, status: 'ready', error: null }, { transaction });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  return { document: doc, chunks: chunks.length, embeddingModel: model };
}

function lexicalSearch(chunks, query, limit) {
  const qTerms = [...new Set(tokenize(query))];
  if (!qTerms.length) return [];

  const docs = chunks.map((chunk) => {
    const terms = tokenize(chunk.text);
    const counts = new Map();
    for (const term of terms) counts.set(term, (counts.get(term) || 0) + 1);
    return { chunk, counts, length: Math.max(terms.length, 1) };
  });

  const df = new Map();
  for (const { counts } of docs) {
    for (const term of qTerms) if (counts.has(term)) df.set(term, (df.get(term) || 0) + 1);
  }
  const N = docs.length;
  const avgLen = docs.reduce((sum, d) => sum + d.length, 0) / Math.max(N, 1);
  const k1 = 1.5;
  const b = 0.75;

  const scored = docs.map(({ chunk, counts, length }) => {
    let score = 0;
    for (const term of qTerms) {
      const tf = counts.get(term) || 0;
      if (!tf) continue;
      const idf = Math.log(1 + N / (1 + (df.get(term) || 0)));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (length / avgLen))));
    }
    return { chunk, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, limit);
}

/**
 * Retrieve the most relevant chunks for a workspace. Returns [] for
 * unknown/empty workspaces — never data from another tenant.
 */
async function search({ workspaceId, query, limit = 4 }) {
  const id = Number(workspaceId);
  if (!Number.isInteger(id) || id <= 0) return [];
  const q = String(query || '').trim();
  if (!q) return [];

  const rows = await KbChunk.findAll({
    where: { workspace_id: id },
    include: [{
      model: KbDocument,
      as: 'document',
      attributes: ['id', 'title', 'status', 'workspace_id'],
      required: true,
      where: { status: 'ready' }
    }],
    order: [['document_id', 'ASC'], ['chunk_index', 'ASC']],
    limit: 5000
  });
  if (!rows.length) return [];

  const candidates = rows.map((row) => ({
    text: row.text,
    documentId: row.document_id,
    documentTitle: row.document ? row.document.title : null,
    chunkIndex: row.chunk_index,
    embedding: row.embedding,
    score: 0
  }));

  const embedModel = await resolveEmbedModel();
  const canEmbed = Boolean(embedModel) && candidates.some((c) => Array.isArray(c.embedding));

  if (canEmbed) {
    const { vectors } = await embedTexts([q]);
    if (vectors && vectors[0]) {
      const queryVector = vectors[0];
      const ranked = candidates
        .map((c) => ({
          ...c,
          score: Array.isArray(c.embedding) ? cosine(queryVector, c.embedding) : 0
        }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      if (ranked.length) {
        return ranked.map((c) => ({
          text: c.text,
          documentId: c.documentId,
          documentTitle: c.documentTitle,
          chunkIndex: c.chunkIndex,
          score: Number(c.score.toFixed(4)),
          mode: 'embedding'
        }));
      }
    }
  }

  return lexicalSearch(candidates, q, limit).map(({ chunk, score }) => ({
    text: chunk.text,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    chunkIndex: chunk.chunkIndex,
    score: Number(score.toFixed(4)),
    mode: 'lexical'
  }));
}

async function status(workspaceId) {
  const embedModel = await resolveEmbedModel();
  const documents = workspaceId
    ? await KbDocument.count({ where: { workspace_id: Number(workspaceId) } })
    : null;
  const chunks = workspaceId
    ? await KbChunk.count({ where: { workspace_id: Number(workspaceId) } })
    : null;
  return {
    embeddingModel: embedModel,
    retrievalMode: embedModel ? 'embedding' : 'lexical',
    documents,
    chunks,
    maxFileBytes: MAX_FILE_BYTES,
    supportedExtensions: [...TEXT_EXTENSIONS]
  };
}

module.exports = {
  KnowledgeError,
  TEXT_EXTENSIONS,
  MAX_FILE_BYTES,
  extractText,
  chunkText,
  ingest,
  listDocuments,
  getDocument,
  removeDocument,
  reindexDocument,
  search,
  status,
  assertWorkspaceAccess,
  resolveEmbedModel
};
