-- Migration: Create Widget Assignees Table (Without Foreign Keys First)
-- Purpose: Manage human agents assigned to widgets for handoff

CREATE TABLE IF NOT EXISTS widget_assignees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    widget_id VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    
    -- Assignment Details
    is_primary BOOLEAN DEFAULT FALSE,
    notification_enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE KEY unique_assignment (widget_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_widget (widget_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
