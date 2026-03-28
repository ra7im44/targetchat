-- Safe in-place migration for messages.chatId FK
-- 1) Backup messages table
CREATE TABLE IF NOT EXISTS messages_backup LIKE messages;
INSERT INTO messages_backup SELECT * FROM messages;

-- 2) Inspect orphan messages (run and review output before proceeding)
SELECT m.id, m.chatId, m.userId FROM messages m LEFT JOIN chats c ON m.chatId = c.id WHERE c.id IS NULL LIMIT 200;

-- 3) Create placeholder chats for affected users (one per user)
SET @ts = UNIX_TIMESTAMP();
INSERT INTO chats (`title`, `userId`, `createdAt`, `updatedAt`)
SELECT CONCAT('Recovered chat ', @ts, ' user ', userId), userId, NOW(), NOW()
FROM (
  SELECT DISTINCT userId FROM messages m LEFT JOIN chats c ON m.chatId = c.id WHERE c.id IS NULL
) AS t;

-- 4) Re-point orphan messages to the placeholder chat for that user
UPDATE messages m
JOIN chats c ON c.userId = m.userId AND c.title LIKE CONCAT('Recovered chat ', @ts, '%')
SET m.chatId = c.id
WHERE m.chatId IS NULL OR m.chatId NOT IN (SELECT id FROM chats);

-- 5) Verify no orphan messages remain
SELECT COUNT(1) AS orphan_count FROM messages m LEFT JOIN chats c ON m.chatId = c.id WHERE c.id IS NULL;

-- 6) Ensure types match (use UNSIGNED if chats.id is UNSIGNED)
ALTER TABLE messages MODIFY chatId INT UNSIGNED NOT NULL;

-- 7) (Re)create the FK constraint (drop existing if necessary)
-- If a foreign key exists with a different name, drop it first. Example:
-- ALTER TABLE messages DROP FOREIGN KEY messages_chat_fk;
ALTER TABLE messages
ADD CONSTRAINT `messages_chat_fk` FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE;

-- 8) Final checks
SELECT COUNT(1) AS orphan_count FROM messages m LEFT JOIN chats c ON m.chatId = c.id WHERE c.id IS NULL;
SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'chatId' AND REFERENCED_TABLE_NAME = 'chats';
