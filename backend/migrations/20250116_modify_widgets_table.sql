-- Migration: Modify Widgets Table
-- Purpose: Add workflow toggle and pre-chat form configuration

-- Add columns (MySQL doesn't support IF NOT EXISTS in ALTER TABLE, so we'll handle errors gracefully)

ALTER TABLE widgets
    ADD COLUMN workflow_status BOOLEAN DEFAULT TRUE COMMENT 'TRUE = AI/Workflow, FALSE = Human';

ALTER TABLE widgets
    ADD COLUMN last_workflow_toggle TIMESTAMP NULL;

ALTER TABLE widgets
    ADD COLUMN workflow_toggle_count INT DEFAULT 0;

ALTER TABLE widgets
    ADD COLUMN pre_chat_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE widgets
    ADD COLUMN pre_chat_fields JSON COMMENT 'Custom fields configuration';

ALTER TABLE widgets
    ADD COLUMN pre_chat_message TEXT COMMENT 'Welcome message before form';

ALTER TABLE widgets
    ADD COLUMN auto_response_text TEXT DEFAULT 'Thank you for reaching out! A team member will respond shortly.';

ALTER TABLE widgets
    ADD COLUMN auto_response_enabled BOOLEAN DEFAULT TRUE;

-- Add indexes
CREATE INDEX idx_workflow_status ON widgets(workflow_status);
CREATE INDEX idx_owner_workflow ON widgets(owner_user_id, workflow_status);
