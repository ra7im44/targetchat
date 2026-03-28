-- Add workspace_id column to workflows table
ALTER TABLE workflows
ADD COLUMN workspace_id INT NULL,
ADD CONSTRAINT fk_workflows_workspace
    FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_workflows_workspace_id ON workflows(workspace_id);
