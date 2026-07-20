const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Querying posts with nested users and reposts...");
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      user:user_id (
        id,
        full_name,
        avatar_url,
        username
      ),
      original_post:repost_id (
        id,
        user_id,
        content,
        media_url,
        media_type,
        created_at,
        user:user_id (
          id,
          full_name,
          avatar_url,
          username
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log(`Successfully fetched ${data.length} posts.`);
    data.slice(0, 3).forEach(post => {
      console.log(`Post: ${post.id}`);
      console.log(`- Author: ${post.user?.full_name} (@${post.user?.username})`);
      console.log(`- Content: "${post.content ? post.content.substring(0, 40) : ''}..."`);
      if (post.original_post) {
        console.log(`  [REPOST] Original Post Author: ${post.original_post.user?.full_name}`);
        console.log(`  [REPOST] Original Content: "${post.original_post.content ? post.original_post.content.substring(0, 40) : ''}..."`);
      }
    });
  }
}

run();
