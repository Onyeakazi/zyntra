-- 1. Create stories table (updated for photo, video, and text stories)
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_url TEXT, -- Nullable to allow text-only stories
  media_type VARCHAR DEFAULT 'image' NOT NULL, -- 'image', 'video', or 'text'
  caption TEXT, -- Caption for photos/videos, or main text for text stories
  background_color VARCHAR, -- Hex code or gradient CSS string for text stories
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '24 hours') NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for SELECT (active stories visible to everyone)
CREATE POLICY "Stories are viewable by anyone" ON public.stories
  FOR SELECT USING (expires_at > now());

-- 4. Create policies for INSERT (any user can insert)
CREATE POLICY "Allow anyone to insert stories" ON public.stories
  FOR INSERT WITH CHECK (true);

-- 5. Create policies for DELETE
CREATE POLICY "Allow anyone to delete stories" ON public.stories
  FOR DELETE USING (true);

-- 6. Enable Realtime on the stories table
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
