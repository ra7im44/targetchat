# Email System - Quick Start Guide

## 🚀 Quick Setup

### 1. Install Dependencies
Already installed:
- nodemailer
- @sendgrid/mail
- aws-sdk
- bull
- redis

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Email Provider (choose one)
EMAIL_PROVIDER=smtp  # or 'sendgrid', 'ses'

# SMTP (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Sender Addresses
EMAIL_FROM_NOREPLY=no-reply@targetchat.com
EMAIL_FROM_SYSTEM=system@targetchat.com
EMAIL_FROM_BILLING=billing@targetchat.com
EMAIL_FROM_WORKFLOWS=workflows@targetchat.com

# Redis (for queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 3. Start Redis
```bash
# Windows (if using Laragon, Redis might be included)
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis
```

### 4. Database is Ready
Tables already created:
- ✅ email_templates
- ✅ email_logs
- ✅ email_preferences

Templates already seeded (9 templates).

## 📧 Usage Examples

### Send Welcome Email
```javascript
const { triggerEvent } = require('./src/triggers/emailTriggers');

// On user registration
await triggerEvent('user.registered', user, verificationToken);
```

### Send Password Reset
```javascript
await triggerEvent('user.password_reset', user, resetToken);
```

### Send Custom Email
```javascript
const emailService = require('./src/services/emailService');

await emailService.sendSystemEmail(
  'welcome',  // template slug
  'user@example.com',
  {
    username: 'John Doe',
    verificationLink: 'https://app.com/verify/token123'
  },
  {
    userId: 42,
    priority: 'urgent'
  }
);
```

## 🔧 Admin API Endpoints

### Templates
- `GET /api/admin/email-templates` - List all
- `POST /api/admin/email-templates` - Create
- `GET /api/admin/email-templates/:id` - Get one
- `PATCH /api/admin/email-templates/:id` - Update
- `DELETE /api/admin/email-templates/:id` - Delete
- `POST /api/admin/email-templates/:id/preview` - Preview
- `POST /api/admin/email-templates/:id/test` - Send test

### Logs
- `GET /api/admin/email-logs` - List with filters
- `GET /api/admin/email-logs/:id` - Get details
- `POST /api/admin/email-logs/:id/retry` - Retry failed
- `GET /api/admin/email-logs/stats/analytics` - Analytics

### Webhooks
- `POST /webhook/email/sendgrid` - SendGrid events
- `POST /webhook/email/ses` - AWS SES events

## 🎯 Next Steps

1. **Configure your email provider** (SMTP/SendGrid/SES)
2. **Start Redis** for the queue system
3. **Test sending an email** using the API
4. **Build the frontend dashboard** (Phase 16.9)

## 📊 Current Status

**Backend: 100% Complete** ✅
- Database schema
- Email provider
- Template engine
- Queue system
- Email service
- Event triggers
- Admin API routes
- Webhook handlers

**Frontend: 0% Complete** ⏳
- Email templates page
- Email logs page
- Analytics dashboard

## 🐛 Troubleshooting

**Redis connection error?**
- Make sure Redis is running on port 6379
- Check REDIS_HOST and REDIS_PORT in .env

**Emails not sending?**
- Verify EMAIL_PROVIDER is set correctly
- Check SMTP credentials (for Gmail, use App Password)
- Check email provider logs in console

**Templates not found?**
- Run: `node scripts/seed_email_templates.js`

## 📚 Documentation

See `email_system_plan.md` and `email_system_walkthrough.md` for full details.
