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

const app = express();
const server = http.createServer(app);

// Stripe/PayPal webhooks (must be BEFORE express.json() for raw body if needed)
app.use('/webhook/stripe', require('./routes/webhooks/stripe'));
app.use('/webhook/paypal', require('./routes/webhooks/paypal'));

const io = new Server(server, {
  cors: {
    origin: '*', // In production, set this to your frontend URL
    methods: ['GET', 'POST']
  }
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  // Allow anonymous access for widgets
  if (token === 'anonymous') {
    const sessionId = socket.handshake.auth.sessionId;
    if (!sessionId) return next(new Error('Session ID required for anonymous access'));
    socket.userId = 'guest_' + sessionId;
    socket.isGuest = true;
    socket.sessionId = sessionId;
    return next();
  }

  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme_in_production');
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  if (socket.isGuest) {
    // Join session room for guest users
    const sessionRoom = `session_${socket.sessionId}`;
    socket.join(sessionRoom);
    console.log(`🔌 Guest Socket ${socket.id} joined room: ${sessionRoom}`);

    // Also join widget room if provided (for broadcast updates if needed)
    const widgetSlug = socket.handshake.auth.widgetSlug;
    if (widgetSlug) {
      const widgetRoom = `widget_${widgetSlug}`;
      socket.join(widgetRoom);
      console.log(`🔌 Guest Socket ${socket.id} joined room: ${widgetRoom}`);
    }
  } else {
    // Join user room for logged in users
    socket.join(`user_${socket.userId}`);
  }

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // Meta Real-time Indicators (Typing/Seen)
  socket.on('agent:typing', async ({ chatId, typing }) => {
    try {
      const chat = await Chat.findByPk(chatId, { include: [Channel, Lead] });
      if (chat && chat.channel && chat.channel.type !== 'whatsapp' && chat.channel.accessToken) {
        const action = typing ? 'typing_on' : 'typing_off';
        await metaApiService.sendAction(chat.channel.type, chat.channel.accessToken, chat.lead.metaId, action);
      }
    } catch (err) {
      console.error('[Socket] Typing indicator error:', err.message);
    }
  });

  socket.on('agent:seen', async ({ chatId }) => {
    try {
      const chat = await Chat.findByPk(chatId, { include: [Channel, Lead] });
      if (chat && chat.channel && chat.channel.type !== 'whatsapp' && chat.channel.accessToken) {
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
app.use(cors());

// 2. Security Middlewares
app.use(ipBlocker);
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(maintenanceMiddleware);

app.use(bodyParser.json());

// Meta & WhatsApp webhooks (Expect JSON)
app.use('/webhook/meta', require('./routes/webhooks/meta'));
app.use('/webhook/whatsapp', require('./routes/webhooks/whatsapp'));

// --- Security Middleware ---
// Helmet moved up

// 2. Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api', globalLimiter);

// 3. Stricter Auth Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login/register attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth', authLimiter);
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
