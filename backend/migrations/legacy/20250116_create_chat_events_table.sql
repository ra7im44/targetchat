-- Migration: Create Chat Events Table
-- Purpose: Track chat events for analytics and auditing

CREATE TABLE IF NOT EXISTS chat_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chat_id INT NOT NULL,
    
    -- Event Details
    event_type ENUM(
        'chat_started',
        'lead_created',
        'routed_to_workflow',
        'routed_to_human',
        'human_joined',
        'human_left',
        'workflow_toggled',
        'chat_resolved',
        'chat_abandoned'
    ) NOT NULL,
    
    -- Event Data
    event_data JSON,
    triggered_by INT NULL COMMENT 'User ID if applicable',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_chat_event (chat_id, event_type),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
