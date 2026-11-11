'use strict';

const DEFAULT_HISTORY_LIMIT = 12;
const MAX_MESSAGE_CHARS = 12000;

/**
 * Persona-aware system prompt. Kept separate from provider code so every
 * backend (local or cloud) receives identical instructions.
 */
function buildSystemPrompt({ persona = 'default', workflow = null, extraInstructions = '', knowledge = [] } = {}) {
  const modelName = (workflow && workflow.name) || 'Target Assistant';
  let base = `You are ${modelName}, a highly capable, knowledgeable, and helpful AI assistant powered by TargetChat.
You converse naturally, accurately, and politely.
- Always respond in the same language the user uses (if Arabic, reply in natural, fluent Arabic; if English, in English).
- Format your responses using clean Markdown (headings, bullet points, code blocks).
- Be truthful, insightful, and concise unless a comprehensive explanation is requested.`;

  switch (persona) {
    case 'coder':
      base += `\n\nSPECIAL ROLE: Senior Full-Stack Software Engineer & Architect.
- Write clean, modular, production-ready code with syntax-highlighted blocks.
- Explain key concepts clearly with best practices and error handling.`;
      break;
    case 'writer':
      base += `\n\nSPECIAL ROLE: Expert Creative Writer & Copywriter.
- Craft engaging, persuasive, and beautifully phrased copy, stories, and articles.`;
      break;
    case 'business':
      base += `\n\nSPECIAL ROLE: Senior Business Consultant & Strategist.
- Deliver data-driven insights, actionable plans, SWOT analyses, and ROI strategies.`;
      break;
    default:
      break;
  }

  if (extraInstructions && String(extraInstructions).trim()) {
    base += `\n\nADDITIONAL INSTRUCTIONS:\n${String(extraInstructions).trim().slice(0, 4000)}`;
  }

  const context = formatKnowledge(knowledge);
  if (context) {
    base += `\n\nWORKSPACE KNOWLEDGE (retrieved from documents the user uploaded):
Use the following excerpts when they are relevant. If they do not answer the question, say so plainly and answer from general knowledge. Never invent a source or a citation.
${context}`;
  }

  return base;
}

function formatKnowledge(knowledge = []) {
  if (!Array.isArray(knowledge) || knowledge.length === 0) return '';
  const maxChars = Number(process.env.AI_KNOWLEDGE_MAX_CHARS) || 6000;
  let used = 0;
  const blocks = [];
  for (const item of knowledge) {
    const text = String((item && item.text) || '').trim();
    if (!text) continue;
    const title = item.documentTitle || item.title || `Document ${item.documentId || ''}`.trim();
    const block = `--- ${title}${item.chunkIndex != null ? ` (part ${item.chunkIndex + 1})` : ''} ---\n${text}`;
    if (used + block.length > maxChars) break;
    blocks.push(block);
    used += block.length;
  }
  return blocks.join('\n\n');
}

/**
 * Map stored messages to provider-neutral chat turns.
 */
function toChatMessages({ history = [], userMessage = '', system = '', limit } = {}) {
  const maxTurns = Number(process.env.AI_HISTORY_LIMIT) || limit || DEFAULT_HISTORY_LIMIT;
  const turns = [];

  for (const item of Array.isArray(history) ? history.slice(-maxTurns) : []) {
    if (!item) continue;
    const raw = item.content != null ? item.content : item.text;
    const content = String(raw || '').trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;
    // Media messages are stored as filenames; never feed those to the LLM.
    const type = item.type || 'text';
    if (type !== 'text') continue;
    const sender = item.sender || item.role;
    const role = sender === 'ai' || sender === 'assistant' ? 'assistant' : 'user';
    turns.push({ role, content });
  }

  const finalText = String(userMessage || '').trim().slice(0, MAX_MESSAGE_CHARS);
  // The caller usually passes history that already contains the just-saved user
  // message; dedupe it so the model does not see it twice.
  if (finalText && turns.length) {
    const last = turns[turns.length - 1];
    if (last.role === 'user' && last.content === finalText) turns.pop();
  }

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push(...turns);
  if (finalText) messages.push({ role: 'user', content: finalText });
  return messages;
}

module.exports = { buildSystemPrompt, toChatMessages, formatKnowledge };
