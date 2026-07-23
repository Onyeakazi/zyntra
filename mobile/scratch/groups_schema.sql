-- 1. Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  privacy TEXT NOT NULL DEFAULT 'public', -- 'public' or 'private'
  banner_url TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'moderator', 'member'
  status TEXT NOT NULL DEFAULT 'approved', -- 'pending' (requesting to join private group), 'approved'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, user_id)
);

-- 3. Add group_id to posts table to link posts to a specific group
ALTER TABLE posts ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Disable Row Level Security (RLS) on new tables since app uses Firebase Auth and calls Supabase anonymously
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Allow read access to public groups for all users" ON groups
  FOR SELECT USING (privacy = 'public');

CREATE POLICY "Allow read access to private groups for members" ON groups
  FOR SELECT USING (
    privacy = 'private' AND 
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid()::text AND group_members.status = 'approved'
    )
  );

CREATE POLICY "Allow group creators and admins to update groups" ON groups
  FOR UPDATE USING (
    created_by = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid()::text AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Allow group creators and admins to delete groups" ON groups
  FOR DELETE USING (
    created_by = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid()::text AND group_members.role = 'admin'
    )
  );

CREATE POLICY "Allow authenticated users to create groups" ON groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for group_members
CREATE POLICY "Allow members to view group member lists" ON group_members
  FOR SELECT USING (
    auth.role() = 'authenticated' -- Breaks RLS infinite recursion
  );

CREATE POLICY "Allow anyone to request to join a group" ON group_members
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Allow group admins/moderators to update memberships" ON group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members my_membership
      WHERE my_membership.group_id = group_members.group_id 
        AND my_membership.user_id = auth.uid()::text 
        AND my_membership.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Allow group admins/moderators to delete memberships" ON group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_members my_membership
      WHERE my_membership.group_id = group_members.group_id 
        AND my_membership.user_id = auth.uid()::text 
        AND my_membership.role IN ('admin', 'moderator')
    ) OR
    auth.uid()::text = user_id -- Allow leaving group
  );
