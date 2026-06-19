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
  const userId = 'yMW6kCQCIGVu5oBJERVuqYgdRM02';
  console.log("Fetching conversations with latest message details...");
  
  // 1. Fetch conversations with only the latest message
  const { data: convs, error } = await supabase
    .from("conversations")
    .select(`
      id,
      user_1,
      user_2,
      last_sender_id,
      messages (
        id,
        sender_id,
        is_read,
        created_at
      )
    `)
    .or(`user_1.eq.${userId},user_2.eq.${userId}`)
    .order("created_at", { foreignTable: "messages", ascending: false })
    .limit(1, { foreignTable: "messages" });

  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Fetched conversations count:", convs.length);
  convs.forEach(c => {
    console.log(`\nConversation ID: ${c.id}`);
    console.log(`Messages count in payload: ${c.messages?.length}`);
    if (c.messages && c.messages.length > 0) {
      // Sort messages descending to find the latest one
      const sorted = [...c.messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latest = sorted[0];
      console.log(`Latest Message: Sender=${latest.sender_id}, IsRead=${latest.is_read}, Time=${latest.created_at}`);
    } else {
      console.log("No messages.");
    }
  });
}

run();
