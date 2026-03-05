ALTER TABLE notifications ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_creator ON notifications(creator_id);
