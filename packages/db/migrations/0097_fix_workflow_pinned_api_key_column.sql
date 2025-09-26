-- Fix workflow table column name mismatch
-- Rename pinned_api_key to pinned_api_key_id to match schema

ALTER TABLE "workflow" RENAME COLUMN "pinned_api_key" TO "pinned_api_key_id";

-- Update foreign key constraint name for consistency
ALTER TABLE "workflow" DROP CONSTRAINT IF EXISTS "workflow_pinned_api_key_api_key_id_fk";
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_pinned_api_key_id_api_key_id_fk"
  FOREIGN KEY ("pinned_api_key_id") REFERENCES "api_key"("id") ON DELETE SET NULL;