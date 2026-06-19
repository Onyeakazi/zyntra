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
  console.log("Subscribing to Realtime...");

  const channel = supabase
    .channel('test-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        console.log("🔥 REALTIME MESSAGE RECEIVED:", payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations'
      },
      (payload) => {
        console.log("🔥 REALTIME CONVERSATION RECEIVED:", payload);
      }
    )
    .subscribe((status, err) => {
      console.log(`Realtime Subscription Status: ${status}`);
      if (err) {
        console.error("Realtime Subscription Error:", err);
      }
    });

  console.log("Waiting for events (will run for 15 seconds)...");
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  console.log("Cleaning up and exiting...");
  supabase.removeChannel(channel);
}

run();
