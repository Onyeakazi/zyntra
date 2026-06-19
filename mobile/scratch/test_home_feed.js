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
  const currentUserId = "yMW6kCQCIGVu5oBJERVuqYgdRM02"; // Chiemena Godswill

  console.log("Fetching home_feed for Chiemena Godswill...");
  const { data: feed, error: feedErr } = await supabase
    .from("home_feed")
    .select("*")
    .eq("viewer_id", currentUserId);

  if (feedErr) {
    console.error("Feed error:", feedErr);
  } else {
    console.log(`Feed count: ${feed.length}`);
    console.log("Feed posts authors:");
    feed.forEach(item => {
      console.log(`- Author: ${item.author_name} (ID: ${item.author_id}), Content preview: "${item.content.substring(0, 40)}..."`);
    });
  }
}

run();
