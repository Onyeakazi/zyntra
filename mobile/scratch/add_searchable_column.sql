-- Run this in your Supabase Dashboard SQL Editor to support the "Allow Global Search" privacy setting:
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN DEFAULT true;
