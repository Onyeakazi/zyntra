-- Run this in your Supabase SQL Editor to support story views, reactions, and milestone notifications:

-- 1. Make media_url nullable to allow text-only stories
ALTER TABLE public.stories ALTER COLUMN media_url DROP NOT NULL;

-- 2. Add the background_color column to stories table if not already added
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS background_color VARCHAR;

-- 3. Create story views table to track who viewed which story segment
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, viewer_id) -- A user can only view a story segment once
);

-- 4. Enable RLS on story_views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select of story views" ON public.story_views
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert of story views" ON public.story_views
  FOR INSERT WITH CHECK (true);

-- 5. Add story_id and story_reaction columns to public.notifications table if not already added
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS story_reaction VARCHAR;

-- 6. Recreate the notifications type check constraint to allow stories-related notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'reaction', 
    'comment', 
    'reply', 
    'connection_request', 
    'connection_accepted', 
    'mention', 
    'repost', 
    'story_reaction', 
    'story_view_milestone'
  ));
