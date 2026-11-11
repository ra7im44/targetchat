-- Migration: Modify Chats Table
-- Purpose: Add lead association and human handoff support

-- Add columns
ALTER TABLE chats
    ADD COLUMN lead_id INT NULL COMMENT 'Associated lead from pre-chat form';

ALTER TABLE chats
    ADD COLUMN is_human_handled BOOLEAN DEFAULT FALSE;

ALTER TABLE chats
    ADD COLUMN assigned_to INT NULL COMMENT 'User ID of assigned human';

ALTER TABLE chats
    ADD COLUMN assigned_at TIMESTAMP NULL;

ALTER TABLE chats
    ADD COLUMN routing_type ENUM('workflow', 'human', 'hybrid') DEFAULT 'workflow';

ALTER TABLE chats
    ADD COLUMN first_response_time INT NULL COMMENT 'Seconds until first response';

ALTER TABLE chats
    ADD COLUMN resolution_time INT NULL COMMENT 'Seconds until resolved';

ALTER TABLE chats
    ADD COLUMN customer_satisfaction TINYINT NULL COMMENT 'Rating 1-5';

-- Add indexes
CREATE INDEX idx_lead ON chats(lead_id);
CREATE INDEX idx_assigned ON chats(assigned_to);
CREATE INDEX idx_human_handled ON chats(is_human_handled);
CREATE INDEX idx_routing_type ON chats(routing_type);
