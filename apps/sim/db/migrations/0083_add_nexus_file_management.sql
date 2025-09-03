-- Nexus Copilot File Management Enhancement
-- Migration: Add comprehensive file management tables for Nexus Copilot system

-- Create files table for workspace-scoped file management
CREATE TABLE "files" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "folder_id" text REFERENCES "folders"("id") ON DELETE SET NULL,
  "knowledge_base_id" text REFERENCES "knowledge_base"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "description" text,
  "size" integer NOT NULL DEFAULT 0,
  "mime_type" text NOT NULL,
  "file_url" text NOT NULL,
  "storage_provider" text NOT NULL DEFAULT 's3',
  "metadata" jsonb DEFAULT '{}',
  "tags" jsonb DEFAULT '[]',
  "is_public" boolean NOT NULL DEFAULT false,
  "processing_status" text NOT NULL DEFAULT 'pending',
  "processing_error" text,
  "checksum" text,
  "version" integer NOT NULL DEFAULT 1,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "updated_by" text REFERENCES "user"("id"),
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW(),
  "deleted_at" timestamp
);

-- Create folders table for hierarchical organization
CREATE TABLE "folders" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "parent_id" text REFERENCES "folders"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "color" text DEFAULT '#6B7280',
  "is_expanded" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "metadata" jsonb DEFAULT '{}',
  "file_count" integer NOT NULL DEFAULT 0,
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "updated_by" text REFERENCES "user"("id"),
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

-- Create environment_variables table for enhanced env var management
CREATE TABLE "environment_variables" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "encrypted_value" text NOT NULL,
  "description" text,
  "category" text,
  "is_secret" boolean NOT NULL DEFAULT false,
  "access_count" integer NOT NULL DEFAULT 0,
  "last_accessed_at" timestamp,
  "metadata" jsonb DEFAULT '{}',
  "created_by" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "updated_by" text REFERENCES "user"("id"),
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW(),
  UNIQUE("workspace_id", "key")
);

-- Create file_access_logs for audit trail
CREATE TABLE "file_access_logs" (
  "id" text PRIMARY KEY,
  "file_id" text NOT NULL REFERENCES "files"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "action" text NOT NULL, -- 'view', 'download', 'edit', 'delete', 'share'
  "ip_address" text,
  "user_agent" text,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

-- Indexes for files table
CREATE INDEX "files_workspace_id_idx" ON "files"("workspace_id");
CREATE INDEX "files_folder_id_idx" ON "files"("folder_id");
CREATE INDEX "files_knowledge_base_id_idx" ON "files"("knowledge_base_id");
CREATE INDEX "files_name_idx" ON "files"("name");
CREATE INDEX "files_mime_type_idx" ON "files"("mime_type");
CREATE INDEX "files_created_by_idx" ON "files"("created_by");
CREATE INDEX "files_created_at_idx" ON "files"("created_at");
CREATE INDEX "files_updated_at_idx" ON "files"("updated_at");
CREATE INDEX "files_processing_status_idx" ON "files"("processing_status");
CREATE INDEX "files_tags_gin_idx" ON "files" USING GIN ("tags");
CREATE INDEX "files_metadata_gin_idx" ON "files" USING GIN ("metadata");
CREATE INDEX "files_soft_delete_idx" ON "files"("deleted_at") WHERE "deleted_at" IS NULL;

-- Indexes for folders table
CREATE INDEX "folders_workspace_id_idx" ON "folders"("workspace_id");
CREATE INDEX "folders_parent_id_idx" ON "folders"("parent_id");
CREATE INDEX "folders_created_by_idx" ON "folders"("created_by");
CREATE INDEX "folders_sort_order_idx" ON "folders"("sort_order");
CREATE INDEX "folders_workspace_parent_idx" ON "folders"("workspace_id", "parent_id");

-- Indexes for environment_variables table
CREATE INDEX "env_vars_workspace_id_idx" ON "environment_variables"("workspace_id");
CREATE INDEX "env_vars_key_idx" ON "environment_variables"("key");
CREATE INDEX "env_vars_category_idx" ON "environment_variables"("category");
CREATE INDEX "env_vars_is_secret_idx" ON "environment_variables"("is_secret");
CREATE INDEX "env_vars_created_by_idx" ON "environment_variables"("created_by");
CREATE INDEX "env_vars_metadata_gin_idx" ON "environment_variables" USING GIN ("metadata");

-- Indexes for file_access_logs table
CREATE INDEX "file_access_logs_file_id_idx" ON "file_access_logs"("file_id");
CREATE INDEX "file_access_logs_user_id_idx" ON "file_access_logs"("user_id");
CREATE INDEX "file_access_logs_action_idx" ON "file_access_logs"("action");
CREATE INDEX "file_access_logs_created_at_idx" ON "file_access_logs"("created_at");

-- Full-text search indexes
CREATE INDEX "files_name_search_idx" ON "files" USING gin(to_tsvector('english', "name"));
CREATE INDEX "files_description_search_idx" ON "files" USING gin(to_tsvector('english', "description"));
CREATE INDEX "folders_name_search_idx" ON "folders" USING gin(to_tsvector('english', "name"));

-- Trigger to update file_count in folders
CREATE OR REPLACE FUNCTION update_folder_file_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update file count for the folder when files are added/removed/moved
  IF TG_OP = 'INSERT' THEN
    UPDATE "folders" SET "file_count" = "file_count" + 1 WHERE "id" = NEW."folder_id";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "folders" SET "file_count" = "file_count" - 1 WHERE "id" = OLD."folder_id";
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle file moving between folders
    IF OLD."folder_id" IS DISTINCT FROM NEW."folder_id" THEN
      IF OLD."folder_id" IS NOT NULL THEN
        UPDATE "folders" SET "file_count" = "file_count" - 1 WHERE "id" = OLD."folder_id";
      END IF;
      IF NEW."folder_id" IS NOT NULL THEN
        UPDATE "folders" SET "file_count" = "file_count" + 1 WHERE "id" = NEW."folder_id";
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_folder_file_count
  AFTER INSERT OR UPDATE OR DELETE ON "files"
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_file_count();

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER trigger_files_updated_at
  BEFORE UPDATE ON "files"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_folders_updated_at
  BEFORE UPDATE ON "folders"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_env_vars_updated_at
  BEFORE UPDATE ON "environment_variables"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "environment_variables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "file_access_logs" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (these would be customized based on the app's auth system)
-- Example policies (should be adapted to actual auth implementation):

-- Files policies
CREATE POLICY "files_workspace_isolation" ON "files"
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_setting('app.current_user_id')));

-- Folders policies  
CREATE POLICY "folders_workspace_isolation" ON "folders"
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_setting('app.current_user_id')));

-- Environment variables policies
CREATE POLICY "env_vars_workspace_isolation" ON "environment_variables"
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_setting('app.current_user_id')));

-- File access logs policies
CREATE POLICY "file_access_logs_user_access" ON "file_access_logs"
  USING (user_id = current_setting('app.current_user_id') OR 
         file_id IN (SELECT id FROM files WHERE workspace_id IN 
           (SELECT workspace_id FROM workspace_members WHERE user_id = current_setting('app.current_user_id'))));

-- Add comments for documentation
COMMENT ON TABLE "files" IS 'Comprehensive file management table for workspace-scoped file operations';
COMMENT ON TABLE "folders" IS 'Hierarchical folder structure for organizing files within workspaces';
COMMENT ON TABLE "environment_variables" IS 'Encrypted environment variables with enhanced metadata and categorization';
COMMENT ON TABLE "file_access_logs" IS 'Audit trail for file access and operations';

COMMENT ON COLUMN "files"."metadata" IS 'Flexible metadata storage for file-specific properties';
COMMENT ON COLUMN "files"."tags" IS 'Array of tags for file categorization and search';
COMMENT ON COLUMN "files"."processing_status" IS 'Status of file processing: pending, processing, completed, failed';
COMMENT ON COLUMN "files"."storage_provider" IS 'Storage backend: s3, azure, gcs, local';
COMMENT ON COLUMN "files"."checksum" IS 'File integrity checksum (SHA-256)';

COMMENT ON COLUMN "environment_variables"."encrypted_value" IS 'AES-256-GCM encrypted variable value';
COMMENT ON COLUMN "environment_variables"."category" IS 'Organization category: api, database, auth, etc.';
COMMENT ON COLUMN "environment_variables"."access_count" IS 'Number of times variable has been accessed';

-- Grant permissions (adjust based on actual roles)
GRANT ALL ON "files" TO authenticated;
GRANT ALL ON "folders" TO authenticated;
GRANT ALL ON "environment_variables" TO authenticated;
GRANT ALL ON "file_access_logs" TO authenticated;