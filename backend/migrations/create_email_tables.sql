-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  category ENUM('auth', 'billing', 'workflow', 'system', 'admin') NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSON COMMENT 'Array of available placeholders like ["username", "otp", "link"]',
  language VARCHAR(5) DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_category (category),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed') DEFAULT 'queued',
  provider_message_id VARCHAR(255),
  error_message TEXT,
  metadata JSON COMMENT 'Variables used, user_id, priority, etc.',
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  opened_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
  INDEX idx_recipient (recipient_email),
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  INDEX idx_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Preferences Table (User unsubscribe management)
CREATE TABLE IF NOT EXISTS email_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  category VARCHAR(50) NOT NULL COMMENT 'auth, billing, workflow, system, admin, marketing',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_category (user_id, category),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
