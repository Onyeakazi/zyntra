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
  const currentUserId = "Myb7p6oEQlRUMuTSGBUzQaiaTd82"; // Berry

  console.log(`Querying notifications for Berry (${currentUserId})...`);
  const { data, error } = await supabase
    .from("notifications")
    .select(`
      id,
      receiver_id,
      sender_id,
      type,
      post_id,
      comment_id,
      is_read,
      created_at,
      sender:users!notifications_sender_id_fkey (
        full_name,
        avatar_url,
        username
      ),
      posts (
        content,
        repost_id
      ),
      post_comments (
        content
      )
    `)
    .eq("receiver_id", currentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Query Error details:", error);
  } else {
    console.log(`Success! Found ${data.length} notifications:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
