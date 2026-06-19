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
  console.log("Fetching all messages in DB...");
  const { data: messages, error } = await supabase.from('messages').select('*');
  if (error) {
    console.error("Error fetching messages:", error);
    return;
  }
  
  console.log(`Total messages: ${messages.length}`);
  messages.forEach(m => {
    console.log(`Msg ID: ${m.id}, Conv ID: ${m.conversation_id}, Sender: ${m.sender_id}, Content: "${m.content}", Read: ${m.is_read}`);
  });
}

run();
