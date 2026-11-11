-- Migration: Create Leads Table (Without Foreign Keys First)
-- Purpose: Store lead information from pre-chat forms

CREATE TABLE IF NOT EXISTS leads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    widget_id VARCHAR(255) NOT NULL,
    owner_user_id INT NOT NULL,
    
    -- Lead Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    custom_field TEXT,
    
    -- Status & Tracking
    status ENUM('new', 'contacted', 'converted', 'lost') DEFAULT 'new',
    tags JSON,
    notes TEXT,
    
    -- Timestamps
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_widget_owner (widget_id, owner_user_id),
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
