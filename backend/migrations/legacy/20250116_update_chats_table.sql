-- Drop potential existing column/constraint to ensure clean state
ALTER TABLE chats DROP FOREIGN KEY fk_chats_widget;
ALTER TABLE chats DROP COLUMN widget_id;

-- Re-add with BINARY to match Sequelize UUID
ALTER TABLE chats ADD COLUMN widget_id CHAR(36) BINARY NULL;

-- Add status if not exists (will error if exists, but caught by runner)
ALTER TABLE chats ADD COLUMN status ENUM('active', 'closed') DEFAULT 'active';

-- Add constraint
ALTER TABLE chats ADD CONSTRAINT fk_chats_widget FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE SET NULL;
