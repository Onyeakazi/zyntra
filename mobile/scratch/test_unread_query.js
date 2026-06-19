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
  const userId = 'yMW6kCQCIGVu5oBJERVuqYgdRM02'; // Let's test with this user ID
  console.log("Testing unread messages query for user:", userId);
  
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversations!inner(user_1, user_2)")
    .neq("sender_id", userId)
    .eq("is_read", false)
    .or(`user_1.eq.${userId},user_2.eq.${userId}`, { foreignTable: 'conversations' });

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Succeeded! Rows found:", data.length);
    console.log("Rows:", JSON.stringify(data, null, 2));
  }
}

run();
