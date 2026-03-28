# 📧 TargetChat Email System Setup Guide

Complete guide to setting up and configuring the email system in TargetChat.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Email Provider Configuration](#email-provider-configuration)
4. [Redis Setup](#redis-setup)
5. [Environment Variables](#environment-variables)
6. [Seeding Default Templates](#seeding-default-templates)
7. [Testing the System](#testing-the-system)
8. [Admin Dashboard Usage](#admin-dashboard-usage)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

Before setting up the email system, ensure you have:

- ✅ Node.js (v14 or higher)
- ✅ MySQL database running
- ✅ Redis server installed
- ✅ Email provider account (Gmail, SendGrid, or AWS SES)

---

## 💾 Database Setup

### Step 1: Run Email Tables Migration

```bash
cd backend
node migrations/run_email_migration.js
```

This creates three tables:
- `email_templates` - Stores email templates
- `email_logs` - Tracks email delivery
- `email_preferences` - User unsubscribe settings

### Step 2: Verify Tables

Check your database to confirm the tables were created:

```sql
SHOW TABLES LIKE 'email_%';
```

---

## 📮 Email Provider Configuration

Choose ONE of the following providers:

### Option 1: SMTP (Gmail, Outlook, etc.)

**For Gmail:**

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Create a new app password
   - Copy the 16-character password

**Configuration:**
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### Option 2: SendGrid

1. Sign up at https://sendgrid.com
2. Create an API key:
   - Go to Settings → API Keys
   - Create API Key with "Full Access"
   - Copy the API key

**Configuration:**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
```

### Option 3: AWS SES

1. Sign up for AWS SES
2. Verify your sender email/domain
3. Create IAM credentials with SES permissions

**Configuration:**
```env
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY=AKIAXXXXXXXXXXXXXXXX
AWS_SES_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔴 Redis Setup

### Install Redis

**Windows (using Chocolatey):**
```bash
choco install redis-64
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Mac
brew install redis
```

### Start Redis Server

**Windows:**
```bash
redis-server
```

**Linux/Mac:**
```bash
redis-server
# Or as service:
sudo systemctl start redis
```

### Verify Redis is Running

```bash
redis-cli ping
# Should return: PONG
```

---

## ⚙️ Environment Variables

### Step 1: Copy Example Config

```bash
cd backend
cp .env.example .env
```

### Step 2: Configure Email Settings

Add these to your `.env` file:

```env
# ============================================
# EMAIL SYSTEM CONFIGURATION
# ============================================

# Email Provider (smtp, sendgrid, or ses)
EMAIL_PROVIDER=smtp

# SMTP Settings (if using SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SendGrid Settings (if using SendGrid)
SENDGRID_API_KEY=

# AWS SES Settings (if using SES)
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY=
AWS_SES_SECRET_KEY=

# Sender Email Addresses
EMAIL_FROM_NOREPLY=no-reply@yourdomain.com
EMAIL_FROM_SYSTEM=system@yourdomain.com
EMAIL_FROM_BILLING=billing@yourdomain.com
EMAIL_FROM_WORKFLOWS=workflows@yourdomain.com

# Redis Configuration (for email queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Support Email
SUPPORT_EMAIL=support@yourdomain.com
```

---

## 🌱 Seeding Default Templates

### Step 1: Seed Email Templates

```bash
cd backend
node scripts/seed_email_templates.js
```

This creates 9 default templates:
- ✅ Welcome Email
- ✅ Email Verification
- ✅ Password Reset
- ✅ Payment Success
- ✅ Payment Failed
- ✅ Subscription Canceled
- ✅ Workflow Completed
- ✅ Workflow Failed
- ✅ Admin Announcement

### Step 2: Seed Email Settings

```bash
node scripts/seed_email_settings.js
```

This adds email configuration to the admin settings panel.

---

## 🧪 Testing the System

### Test 1: Send a Test Email via Code

Create a test file `test-email.js`:

```javascript
const { triggerEvent } = require('./src/triggers/emailTriggers');

async function test() {
  await triggerEvent('user.registered', {
    id: 1,
    username: 'testuser',
    email: 'your-test-email@gmail.com'
  }, 'test-verification-token');
  
  console.log('✅ Test email sent!');
  process.exit(0);
}

test();
```

Run it:
```bash
node test-email.js
```

### Test 2: Check Email Queue

```bash
# In another terminal, monitor Redis queue
redis-cli
> KEYS *
> LLEN bull:email:wait
```

### Test 3: Check Email Logs

```sql
SELECT * FROM email_logs ORDER BY createdAt DESC LIMIT 10;
```

---

## 🎛️ Admin Dashboard Usage

### Access Email Management

1. **Login as Admin:**
   - Go to `http://localhost:3000/login`
   - Login with admin credentials

2. **Navigate to Emails:**
   - Click "📧 Emails" in sidebar
   - You'll see 3 sections:
     - 📧 Email Templates
     - 📨 Email Logs
     - 📊 Email Analytics

### Managing Templates

**View Templates:**
- Click "📧 Email Templates"
- See all 9 default templates

**Create New Template:**
1. Click "New Template" button
2. Fill in:
   - Name (e.g., "Order Confirmation")
   - Slug (e.g., "order-confirmation")
   - Category (auth, billing, workflow, system, admin)
   - Subject with variables: `Order #{{orderNumber}} Confirmed`
   - HTML Body with variables: `<h1>Hi {{username}}!</h1>`
3. Click "Create Template"

**Test Template:**
1. Click "Test" button on any template
2. Enter your email address
3. Click "Send Test"
4. Check your inbox!

**Preview Template:**
- Click "Preview" to see how it looks

**Edit/Delete:**
- Click ✏️ to edit
- Click 🗑️ to delete

### Viewing Email Logs

**Access Logs:**
- Click "📨 Email Logs"

**Filter Logs:**
- Filter by status (sent, delivered, opened, failed)
- Search by recipient email
- Click "Refresh" to update

**View Details:**
- Click "👁️ View" to see full log details
- See timestamps, provider ID, error messages

**Retry Failed Emails:**
- Click "🔄 Retry" on failed emails

### Checking Analytics

**Access Analytics:**
- Click "📊 Email Analytics"

**View Metrics:**
- Total Sent
- Delivery Rate
- Open Rate
- Failure Rate

**Change Period:**
- Select: 24h, 7d, 30d, or 90d

**See Breakdown:**
- Status breakdown (sent, delivered, opened)
- Category breakdown (auth, billing, workflow)
- Top templates by usage

---

## 🔧 Troubleshooting

### Problem: Emails Not Sending

**Check 1: Redis Running?**
```bash
redis-cli ping
# Should return: PONG
```

**Check 2: Queue Processing?**
```bash
# Check backend logs for:
📧 Email Provider initialized: SMTP
✅ Email queue processor started
```

**Check 3: Email Logs**
```sql
SELECT * FROM email_logs WHERE status = 'failed' ORDER BY createdAt DESC;
```

### Problem: SMTP Authentication Failed

**Gmail:**
- ✅ 2FA enabled?
- ✅ Using App Password (not regular password)?
- ✅ "Less secure apps" NOT needed with App Password

**Check credentials:**
```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your-email@gmail.com', pass: 'your-app-password' }
});
transport.verify().then(() => console.log('✅ SMTP OK')).catch(console.error);
"
```

### Problem: Redis Connection Error

**Check Redis:**
```bash
# Is Redis running?
redis-cli ping

# Check port
netstat -an | grep 6379
```

**Fix:**
```bash
# Start Redis
redis-server

# Or on Linux:
sudo systemctl start redis
```

### Problem: Templates Not Showing

**Re-seed templates:**
```bash
cd backend
node scripts/seed_email_templates.js
```

**Check database:**
```sql
SELECT COUNT(*) FROM email_templates;
-- Should return: 9
```

---

## 📚 Additional Resources

### Email System Files

**Backend:**
- `backend/src/services/emailProvider.js` - Email sending
- `backend/src/services/emailService.js` - Main email API
- `backend/src/services/templateEngine.js` - Template rendering
- `backend/src/queues/emailQueue.js` - Queue processing
- `backend/src/triggers/emailTriggers.js` - Event triggers
- `backend/src/routes/admin/emailTemplates.js` - Template API
- `backend/src/routes/admin/emailLogs.js` - Logs API

**Frontend:**
- `frontend/pages/admin/emails.js` - Main email page
- `frontend/pages/admin/email-templates.js` - Templates UI
- `frontend/pages/admin/email-logs.js` - Logs UI
- `frontend/pages/admin/email-analytics.js` - Analytics UI

### Sending Emails Programmatically

```javascript
// Using triggers
const { triggerEvent } = require('./src/triggers/emailTriggers');

// Welcome email
await triggerEvent('user.registered', user, verificationToken);

// Password reset
await triggerEvent('user.password_reset', user, resetToken);

// Custom email
const emailService = require('./src/services/emailService');
await emailService.sendSystemEmail(
  'template-slug',
  'recipient@example.com',
  { username: 'John', customVar: 'value' }
);
```

---

## ✅ Setup Complete!

Your email system is now ready! 🎉

**Next Steps:**
1. ✅ Test sending emails
2. ✅ Customize templates in admin panel
3. ✅ Monitor logs and analytics
4. ✅ Configure email features in Settings

**Need Help?**
- Check logs: `backend/logs/`
- View email logs in admin panel
- Check Redis queue: `redis-cli`

---

**Built with ❤️ for TargetChat**
