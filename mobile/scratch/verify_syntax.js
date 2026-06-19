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
  const targetUserId = "yMW6kCQCIGVu5oBJERVuqYgdRM02"; // Chiemena Godswill

  console.log("1. Testing symmetric count query...");
  const { count: connCount, error: connError } = await supabase
    .from("connections")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`);

  if (connError) {
    console.error("❌ Count query error:", connError);
  } else {
    console.log(`✅ Success! Symmetrical connections count: ${connCount}`);
  }

  console.log("\n2. Testing suggestions query filtering...");
  const activeConnIds = ["yfBW5ycgxQbAlJD9EfHtfFWm0kL2", "lhCrWc5ex3XiDm4s9uAUkivDbA43"]; // mock list
  const incomingPendingIds = [];
  const sentRequestIds = ["Myb7p6oEQlRUMuTSGBUzQaiaTd82"];
  const excludeIds = [targetUserId, ...activeConnIds, ...incomingPendingIds, ...sentRequestIds];

  console.log("Excluding IDs:", excludeIds);
  const { data: suggestionsData, error: usersError } = await supabase
    .from("users")
    .select("id, full_name, username, avatar_url, bio")
    .not("id", "in", `(${excludeIds.join(",")})`)
    .limit(50);

  if (usersError) {
    console.error("❌ Suggestions query error:", usersError);
  } else {
    console.log(`✅ Success! Suggestions returned count: ${suggestionsData.length}`);
    suggestionsData.forEach(item => {
      console.log(`- ${item.full_name} (@${item.username})`);
    });
  }
}

run();
