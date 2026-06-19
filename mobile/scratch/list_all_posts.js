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
  console.log("Querying all posts...");
  const { data: posts, error: pErr } = await supabase
    .from("posts")
    .select("id, user_id, content, created_at");
  
  if (pErr) {
    console.error(pErr);
  } else {
    console.log(`Total posts: ${posts.length}`);
    for (const post of posts) {
      const { data: user } = await supabase.from("users").select("full_name").eq("id", post.user_id).single();
      console.log(`- Post ID: ${post.id}, Author: ${user?.full_name} (${post.user_id}), Content: "${(post.content || '').substring(0, 40)}..."`);
    }
  }
}

run();
