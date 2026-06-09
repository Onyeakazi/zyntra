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

const TEST_USER_ID = "yMW6kCQCIGVu5oBJERVuqYgdRM02"; // Chiemena
const TEST_POST_ID = "e5426817-6ea4-40d7-a52f-4e256b161f99"; // Existing post

async function run() {
  console.log("1. Attempting to insert a test comment...");
  const { data: insertData, error: insertError } = await supabase
    .from("post_comments")
    .insert({
      post_id: TEST_POST_ID,
      user_id: TEST_USER_ID,
      content: "This is a test diagnostic comment from node script!"
    })
    .select();

  if (insertError) {
    console.error("❌ Comment Insert Failed:", insertError);
  } else {
    console.log("✅ Comment Insert Successful! Data:", insertData);
  }

  console.log("\n2. Attempting to query comments for the post...");
  const { data: selectData, error: selectError } = await supabase
    .from("post_comments")
    .select(`
      id,
      post_id,
      content,
      created_at,
      users (
        full_name,
        username
      )
    `)
    .eq("post_id", TEST_POST_ID);

  if (selectError) {
    console.error("❌ Comment Query Failed:", selectError);
  } else {
    console.log("✅ Comment Query Successful! Count:", selectData.length);
    console.log("Data:", JSON.stringify(selectData, null, 2));
  }
}

run();
