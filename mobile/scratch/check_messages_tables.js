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
  console.log("Checking for messaging/chat related tables...");
  
  const commonTables = [
    'messages', 
    'conversations', 
    'chat_rooms', 
    'chats', 
    'message_requests', 
    'connection_requests',
    'connections',
    'users'
  ];
  
  for (const table of commonTables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ Table '${table}' does not exist.`);
      } else {
        console.log(`❓ Table '${table}' exists but returned error: ${error.message} (Code: ${error.code})`);
      }
    } else {
      console.log(`✅ Table '${table}' exists!`);
    }
  }
}

run();
