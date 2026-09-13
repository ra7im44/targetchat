require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const { Chat, Channel, Lead } = require('./models');
const metaApiService = require('./services/metaApiService');

const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./config/secrets');

const app = express();
const server = http.createServer(app);

// SECURITY: Trust the reverse proxy ONLY when the operator explicitly declares
// how many proxy hops are in front of this app (TRUST_PROXY_HOPS). Without a
// proxy, X-Forwarded-For is attacker-controlled and trusting it lets clients
// spoof their IP (IP blocking, rate limiting, and audit logs all key on it).
// All client-IP reads must go through utils/requestContext.getClientIp().
const proxyHops = parseInt(process.env.TRUST_PROXY_HOPS || '0', 10);
if (Number.isFinite(proxyHops) && proxyHops > 0) {
  app.set('trust proxy', proxyHops);
}

// Stripe/PayPal webhooks (must be BEFORE express.json() for raw body if needed)
app.use('/webhook/stripe', require('./routes/webhooks/stripe'));
app.use('/webhook/paypal', require('./routes/webhooks/paypal'));

// Comma-separated list of allowed origins for CORS / Socket.io.
// Defaults to the local frontend during development.
function getAllowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000';
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

const allowedOrigins = getAllowedOrigins();

function corsOrigin(origin, callback) {
  // Allow same-origin / server-to-server requests with no Origin header.
  if (!origin) return callback(null, true);
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || allowedOrigins.includes(normalized)) {
    return callback(null, true);
  }
  return callback(null, false);
}

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make the Socket.io server reachable from routes via req.app.get('io')
app.set('io', io);

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  // Allow anonymous access for widgets.
  // SECURITY: a guest may only join the room for the exact widget slug it was
  // issued for; the server derives the room name from the handshake, never
  // from a client-supplied room string.
  if (token === 'anonymous') {
    const sessionId = socket.handshake.auth.sessionId;
    const widgetSlug = socket.handshake.auth.widgetSlug;
    if (!sessionId || typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(sessionId)) {
      return next(new Error('Valid Session ID required for anonymous access'));
    }
    if (!widgetSlug || typeof widgetSlug !== 'string' || !/^[A-Za-z0-9_-]{2,64}$/.test(widgetSlug)) {
      return next(new Error('Valid widget slug required for anonymous access'));
    }

    // SECURITY: Require mandatory server-issued capability token bound to widget and session
    const sessionToken = socket.handshake.auth.sessionToken;
    if (!sessionToken || typeof sessionToken !== 'string') {
      return next(new Error('Server-issued guest session capability token is required'));
    }

    let verifiedWidgetId = null;
    try {
      const decoded = jwt.verify(sessionToken, getJwtSecret(), {
        issuer: 'targetchat',
        audience: 'targetchat:widget'
      });
      if (decoded.type !== 'widget_guest' || decoded.widgetSlug !== widgetSlug) {
        return next(new Error('Invalid guest session capability token'));
      }
      if (!decoded.sessionId || decoded.sessionId !== sessionId) {
        return next(new Error('Session capability token does not match session ID'));
      }
      verifiedWidgetId = decoded.widgetId;
    } catch (err) {
      return next(new Error('Expired or invalid guest session capability token'));
    }

    // Verify widget exists and is active
    require('./models').Widget.findOne({
      where: { id: verifiedWidgetId },
      attributes: ['id', 'status', 'allowedDomains']
    }).then(widget => {
      if (!widget || widget.status === 'inactive') {
        return next(new Error('Widget is unavailable or disabled'));
      }
      // Strict allowed domains check: require origin header when restrictions are configured
      const origin = socket.handshake.headers.origin;
      if (Array.isArray(widget.allowedDomains) && widget.allowedDomains.length > 0 && !widget.allowedDomains.includes('*')) {
        if (!origin) {
          return next(new Error('Origin header required when allowed domains are configured'));
        }
        try {
          const originHost = new URL(origin).host.toLowerCase();
          const allowed = widget.allowedDomains.some(entry => {
            if (typeof entry !== 'string') return false;
            const clean = entry.trim().replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
            return originHost === clean || originHost.endsWith('.' + clean);
          });
          if (!allowed) {
            return next(new Error('Origin domain not allowed for this widget'));
          }
        } catch (e) {
          return next(new Error('Invalid origin header'));
        }
      }

      socket.userId = 'guest_' + sessionId;
      socket.isGuest = true;
      socket.sessionId = sessionId;
      socket.widgetSlug = widgetSlug;
      socket.widgetId = widget.id;
      next();
    }).catch(() => {
      next(new Error('Authentication error'));
    });
    return;
  }

  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'targetchat',
      audience: 'targetchat:api'
    });
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Authorisation helper: a chat may be acted upon by its widget owner, channel owner,
// assignee, or creator. Admins/superadmins and members of the chat's or widget's
// workspace are also permitted so support teams can monitor and respond.
async function canAccessChat(userId, chat) {
  if (!chat) return false;
  if (chat.assignedTo === userId) return true;
  if (chat.userId === userId) return true;
  if (chat.channel && chat.channel.userId === userId) return true;
  if (chat.channelId) {
    const channel = await require('./models').Channel.findByPk(chat.channelId, { attributes: ['userId'] });
    if (channel && channel.userId === userId) return true;
  }
  if (chat.widgetId) {
    const widget = await require('./models').Widget.findByPk(chat.widgetId, { attributes: ['userId', 'workspaceId'] });
    if (widget && widget.userId === userId) return true;
    if (widget && widget.workspaceId) {
      const isMember = await require('./models').WorkspaceMember.findOne({
        where: { workspace_id: widget.workspaceId, user_id: userId },
        attributes: ['id']
      });
      if (isMember) return true;
    }
  }
  if (chat.workspace_id) {
    const isMember = await require('./models').WorkspaceMember.findOne({
      where: { workspace_id: chat.workspace_id, user_id: userId },
      attributes: ['id']
    });
    if (isMember) return true;
  }
  // Admin / superadmin bypass last: avoids a User query on the common path.
  const user = await require('./models').User.findByPk(userId, { attributes: ['id', 'role'] });
  if (user && (user.role === 'admin' || user.role === 'superadmin')) return true;
  return false;
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  if (socket.isGuest) {
    // Join session room scoped strictly to this widget and session pair
    // SECURITY: guest sockets are isolated strictly to their widget-bound session room.
    const sessionRoom = `widget_${socket.widgetId}_session_${socket.sessionId}`;
    socket.join(sessionRoom);
    console.log(`🔌 Guest Socket ${socket.id} joined room: ${sessionRoom}`);
  } else {
    // Join user room for logged in users
    socket.join(`user_${socket.userId}`);
  }

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // Client (Visitor) Typing Indicator
  socket.on('client:typing', async (payload) => {
    try {
      if (!payload || typeof payload !== 'object') return;
      const { chatId, isTyping } = payload;
      if (!chatId) return;
      const chat = await Chat.findByPk(chatId, {
        include: [{ model: require('./models').Widget, as: 'widget' }]
      });
      if (!chat) return;

      const targetRooms = new Set();
      if (chat.widget && chat.widget.userId) targetRooms.add(`user_${chat.widget.userId}`);
      if (chat.assignedTo) targetRooms.add(`user_${chat.assignedTo}`);
      for (const room of targetRooms) {
        io.to(room).emit('chat:typing', { chatId, isTyping, sender: 'client' });
      }
    } catch (err) {
      console.error('[Socket] Client typing error:', err.message);
    }
  });

  // Meta & Web Agent Typing Indicator
  socket.on('agent:typing', async (payload) => {
    try {
      if (!payload || typeof payload !== 'object') return;
      const { chatId, typing, isTyping } = payload;
      if (!chatId) return;
      const activeTyping = typeof isTyping !== 'undefined' ? isTyping : !!typing;

      const chat = await Chat.findByPk(chatId, {
        include: [
          { model: Channel, as: 'channel' },
          { model: Lead, as: 'lead' }
        ]
      });
      if (!chat) return;
      if (!(await canAccessChat(socket.userId, chat))) return;

      // 1. Broadcast to visitor widget session room
      const sessionMatch = chat.title && chat.title.match(/Guest Session (.+)/);
      if (sessionMatch && sessionMatch[1]) {
        const guestSessionId = sessionMatch[1].trim();
        const guestRoom = chat.widgetId ? `widget_${chat.widgetId}_session_${guestSessionId}` : `session_${guestSessionId}`;
        io.to(guestRoom).emit('chat:typing', { chatId, isTyping: activeTyping, sender: 'agent' });
      }
      io.to(`chat_${chatId}`).emit('chat:typing', { chatId, isTyping: activeTyping, sender: 'agent' });

      // 2. Meta/WhatsApp action
      if (chat.channel && chat.channel.type !== 'whatsapp' && chat.channel.accessToken && chat.lead) {
        const action = activeTyping ? 'typing_on' : 'typing_off';
        await metaApiService.sendAction(chat.channel.type, chat.channel.accessToken, chat.lead.metaId, action);
      }
    } catch (err) {
      console.error('[Socket] Typing indicator error:', err.message);
    }
  });

  // Join a chat room for live updates.
  // SECURITY: room joining is authorized — an authenticated user may only join
  // chats they own, are assigned to, or whose widget/channel they own. Guest
  // sockets may only join the session room of the exact widget+session pair
  // their capability token was issued for.
  socket.on('chat:join', async (chatId) => {
    try {
      if (typeof chatId === 'number') {
        chatId = String(chatId);
      }
      if (typeof chatId !== 'string' || !/^\d+$/.test(chatId)) return;

      const chat = await Chat.findByPk(chatId, {
        include: [
          { model: Channel, as: 'channel' },
          { model: require('./models').Widget, as: 'widget' }
        ]
      });
      if (!chat) return;

      if (socket.isGuest) {
        // Guest sockets may only observe their own widget-bound session chat.
        const sessionMatch = chat.title && chat.title.match(/Guest Session (.+)/);
        const sameSession = !!(sessionMatch && sessionMatch[1] && sessionMatch[1].trim() === socket.sessionId);
        if (String(chat.widgetId) !== String(socket.widgetId) || !sameSession) return;
      } else if (!(await canAccessChat(socket.userId, chat))) {
        return;
      }

      socket.join(`chat_${chatId}`);
    } catch (err) {
      console.error('[Socket] chat:join error:', err.message);
    }
  });

  socket.on('agent:seen', async (payload) => {
    try {
      if (!payload || typeof payload !== 'object') return;
      const { chatId } = payload;
      if (!chatId) return;
      const chat = await Chat.findByPk(chatId, {
        include: [
          { model: Channel, as: 'channel' },
          { model: Lead, as: 'lead' }
        ]
      });
      if (!chat) return;
      if (!(await canAccessChat(socket.userId, chat))) return;
      if (chat.channel && chat.channel.type !== 'whatsapp' && chat.channel.accessToken && chat.lead) {
        await metaApiService.sendAction(chat.channel.type, chat.channel.accessToken, chat.lead.metaId, 'mark_seen');
      }
    } catch (err) {
      console.error('[Socket] Seen indicator error:', err.message);
    }
  });
});

const { ipBlocker } = require('./middleware/ipBlocker');
const maintenanceMiddleware = require('./middleware/maintenance');

// ----------------------------
// 1. CORS - MUST BE FIRST
// SECURITY: restrict browser cross-origin access to the configured frontend
// origin(s) instead of reflecting every origin.
app.use('/api', cors({ origin: corsOrigin, credentials: true }));

// 2. Security Middlewares
app.use(ipBlocker);
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(maintenanceMiddleware);

// SECURITY: capture the raw request body ONLY for the webhook routes that
// verify HMAC signatures (X-Hub-Signature-256) against the exact bytes the
// provider sent. Global JSON parsing stays untouched so ordinary API requests
// do not retain raw buffers in memory.
const metaJsonParser = bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
});

// Meta & WhatsApp webhooks (Expect JSON)
app.use('/webhook/meta', metaJsonParser, require('./routes/webhooks/meta'));
app.use('/webhook/whatsapp', metaJsonParser, require('./routes/webhooks/whatsapp'));

// Global JSON parser for all remaining API routes. Webhook requests never
// reach this (their route-level parser above handles and terminates them).
app.use(bodyParser.json());

// --- Rate Limiters ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth', authLimiter);

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit uploads to 30 per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Upload rate limit exceeded. Please wait a few minutes.' }
});
app.use('/api/upload', uploadLimiter);

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Sending messages too quickly. Please slow down.' }
});
app.use('/api/chat/send', chatLimiter);
app.use('/widget/public', chatLimiter);

// Health Check Endpoints
app.get(['/health', '/api/health'], async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      database: 'connected',
      memory: {
        rss: Math.round(process.memoryUsage().rss / (1024 * 1024)) + ' MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)) + ' MB'
      },
      mode: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: err.message
    });
  }
});
// ----------------------------

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve uploads statically - REMOVED for security
// app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/auth/meta', require('./routes/auth/meta'));
app.use('/api/chat', chatRoutes);
app.use('/api/workflows', require('./routes/workflows')); // Workflow management
app.use('/api/leads', require('./routes/leads')); // Leads management
app.use('/api/inbox', require('./routes/inbox')); // Human inbox
app.use('/api/channels', require('./routes/channels')); // User channel management
app.use('/api/canned-responses', require('./routes/cannedResponses')); // Canned responses / Quick replies
app.use('/api/upload', require('./routes/upload'));
app.use('/secure-file', require('./routes/secureFile'));
app.use('/api/file', require('./routes/secureFile')); // For refresh-url
app.use('/api/webhook', require('./routes/webhook')); // For n8n responses
app.use('/webhook/email', require('./routes/webhooks/emailWebhook')); // Email delivery tracking

// Admin routes (protected by RBAC)
app.use('/api/admin/workflows', require('./routes/admin/workflows'));
app.use('/api/admin/stats', require('./routes/admin/stats'));
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/activity', require('./routes/admin/activity'));
app.use('/api/admin/activity-logs', require('./routes/admin/activity'));
app.use('/api/admin/settings', require('./routes/admin/settings'));
app.use('/api/admin/debug', require('./routes/admin/debug'));
app.use('/api/admin/tokens', require('./routes/admin/tokens'));
app.use('/api/admin/billing', require('./routes/admin/billing'));
app.use('/api/admin/billing', require('./routes/admin/billingLogs'));
app.use('/api/admin/announcements', require('./routes/admin/announcements'));
app.use('/api/admin/email-templates', require('./routes/admin/emailTemplates'));
app.use('/api/admin/email-logs', require('./routes/admin/emailLogs'));
app.use('/api/admin/plans', require('./routes/admin/plans'));
app.use('/api/admin/coupons', require('./routes/admin/coupons'));
app.use('/api/admin/system', require('./routes/admin/system'));
app.use('/api/admin/widgets', require('./routes/admin/widgets'));
app.use('/api/admin/security', require('./routes/admin/security'));
app.use('/api/admin/files', require('./routes/admin/files'));
app.use('/api/admin/intelligence', require('./routes/admin/intelligence'));
app.use('/api/admin/channels', require('./routes/admin/channels'));

// Workspace routes
app.use('/api/workspaces', require('./routes/workspaces'));

// User settings
app.use('/api/user', require('./routes/userSettings'));
app.use('/api/user', require('./routes/avatar'));

// Billing routes
// Billing routes
app.use('/api/billing', require('./routes/billing'));

// Dashboard routes
app.use('/api/dashboard', require('./routes/dashboard'));

// API Keys routes
app.use('/api/api-keys', require('./routes/apiTokens'));

// Widget routes
// Widget routes
app.use('/api/widgets', require('./routes/widgets'));
app.use('/widget/public', require('./routes/publicWidgets'));

// Public settings (app config)
app.use('/api/settings', require('./routes/settings'));

app.get('/', (req, res) => res.json({ app: 'TargetChat API' }));

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection OK');

    // Disabled auto-sync to prevent ALTER TABLE conflicts
    // Use migration scripts instead (scripts/add-user-roles.js, etc.)

    // Initialize email queue processor
    const { emailQueue } = require('./queues/emailQueue');

    // Initialize Email Provider (load settings)
    const emailProvider = require('./services/emailProvider');
    await emailProvider.loadSettings();
    console.log('✅ Email provider initialized');

    console.log('✅ Email queue processor started');


    server.listen(PORT, () => console.log(`TargetChat backend running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

// Prevent server crash on unhandled rejections (e.g. Redis connection loss)
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Ideally restart the server, but for now just log
});
