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
  const userIdA = "Myb7p6oEQlRUMuTSGBUzQaiaTd82"; // Berry
  const userIdC = "lhCrWc5ex3XiDm4s9uAUkivDbA43"; // Mary Ann

  console.log("Accepting connection between Berry and Mary Ann...");
  const { data, error } = await supabase
    .from("connections")
    .update({ status: "accepted" })
    .eq("user_id", userIdA)
    .eq("friend_id", userIdC)
    .select();

  if (error) {
    console.error("Error accepting connection:", error);
  } else {
    console.log("Updated connection row:", data);
  }

  // Verify notification
  const { data: notifs } = await supabase
    .from("notifications")
    .select("*")
    .eq("receiver_id", userIdA)
    .eq("sender_id", userIdC)
    .eq("type", "connection_accepted");

  console.log("Verified notification for Berry:", notifs);
}

run();
