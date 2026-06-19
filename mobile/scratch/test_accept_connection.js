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
  const userIdB = "yMW6kCQCIGVu5oBJERVuqYgdRM02"; // Chiemena

  console.log("=== BEFORE ACCEPTING ===");
  const { data: userA_before } = await supabase.from("users").select("id, full_name, followers_count, following_count").eq("id", userIdA).single();
  const { data: userB_before } = await supabase.from("users").select("id, full_name, followers_count, following_count").eq("id", userIdB).single();
  console.log("User A (Berry):", userA_before);
  console.log("User B (Chiemena):", userB_before);

  console.log("\nAccepting connection...");
  const { data: updateRes, error: updateErr } = await supabase
    .from("connections")
    .update({ status: "accepted" })
    .eq("user_id", userIdA)
    .eq("friend_id", userIdB)
    .select();

  if (updateErr) {
    console.error("Update error:", updateErr);
  } else {
    console.log("Update response:", updateRes);
  }

  console.log("\n=== AFTER ACCEPTING ===");
  const { data: userA_after } = await supabase.from("users").select("id, full_name, followers_count, following_count").eq("id", userIdA).single();
  const { data: userB_after } = await supabase.from("users").select("id, full_name, followers_count, following_count").eq("id", userIdB).single();
  console.log("User A (Berry):", userA_after);
  console.log("User B (Chiemena):", userB_after);

  console.log("\nReverting connection back to pending...");
  const { error: revertErr } = await supabase
    .from("connections")
    .update({ status: "pending" })
    .eq("user_id", userIdA)
    .eq("friend_id", userIdB);
  if (revertErr) console.error("Revert error:", revertErr);
  else console.log("Reverted successfully.");
}

run();
