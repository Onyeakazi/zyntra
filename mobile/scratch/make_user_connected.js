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

  // 1. Delete any existing connection row to start fresh
  console.log("Cleaning up old connection rows...");
  await supabase
    .from("connections")
    .delete()
    .or(`and(user_id.eq.${userIdA},friend_id.eq.${userIdB}),and(user_id.eq.${userIdB},friend_id.eq.${userIdA})`);

  // 2. Clean up old connection notifications
  console.log("Cleaning up old connection accepted notifications...");
  await supabase
    .from("notifications")
    .delete()
    .eq("receiver_id", userIdA)
    .eq("type", "connection_accepted");

  // 3. Insert pending connection
  console.log("Inserting pending connection from Berry to Chiemena...");
  const { data: conn, error: insertErr } = await supabase
    .from("connections")
    .insert({
      user_id: userIdA,
      friend_id: userIdB,
      status: "pending"
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Insert error:", insertErr);
    return;
  }
  console.log("Pending connection row created:", conn);

  // 4. Update to accepted to trigger notifications
  console.log("Accepting connection...");
  const { data: updatedConn, error: updateErr } = await supabase
    .from("connections")
    .update({ status: "accepted" })
    .eq("id", conn.id)
    .select()
    .single();

  if (updateErr) {
    console.error("Update error:", updateErr);
    return;
  }
  console.log("Connection accepted in DB:", updatedConn);

  // 5. Verify notification was created
  console.log("Checking if notification was created for Berry...");
  const { data: notifs } = await supabase
    .from("notifications")
    .select("*")
    .eq("receiver_id", userIdA)
    .eq("type", "connection_accepted");
  
  console.log("Created notifications in DB:", notifs);
}

run();
