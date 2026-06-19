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
  console.log("Fetching a post...");
  const { data: posts, error: postErr } = await supabase.from('posts').select('id').limit(1);
  if (postErr || !posts || posts.length === 0) {
    console.error("No posts found or error:", postErr);
    return;
  }
  
  const postId = posts[0].id;
  const userId = 'yfBW5ycgxQbAlJD9EfHtfFWm0kL2';
  console.log(`Cleaning up any existing reaction for post ${postId} and user ${userId}...`);
  await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", userId);

  console.log(`Inserting a test reaction for post ${postId}...`);
  
  const { data: insertedReaction, error: insertErr } = await supabase
    .from("post_reactions")
    .insert({
      post_id: postId,
      user_id: userId,
      reaction_type: 'like'
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Insert Error:", insertErr);
    return;
  }
  
  console.log("Insert Succeeded! Reaction ID:", insertedReaction.id);
  
  console.log("Cleaning up reaction...");
  await supabase.from("post_reactions").delete().eq("id", insertedReaction.id);
  console.log("Cleanup complete.");
}

run();
