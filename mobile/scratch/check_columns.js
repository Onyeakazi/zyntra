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
  const tables = [
    'friends', 'friendships', 'followers', 'follows', 'connections', 
    'friend_requests', 'follow', 'following', 'friend', 
    'user_followers', 'user_following', 'user_friends', 'user_connections'
  ];
  
  console.log("Checking connection tables...");
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.message.includes("Could not find the table")) {
      // Table doesn't exist
    } else if (error) {
      console.log(`✅ Table '${table}' exists! Details:`, error.message);
    } else {
      console.log(`✅ Table '${table}' exists! (Query succeeded)`);
    }
  }
}

run();
