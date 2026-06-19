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
  const userIdA = "Myb7p6oEQlRUMuTSGBUzQaiaTd82"; // Berry (sender / receiver of connection_accepted notif)
  const userIdB = "yMW6kCQCIGVu5oBJERVuqYgdRM02"; // Chiemena (receiver of request / sender of connection_accepted notif)

  console.log("Setting up connections row as pending...");
  // Make sure they are pending
  await supabase
    .from("connections")
    .delete()
    .or(`and(user_id.eq.${userIdA},friend_id.eq.${userIdB}),and(user_id.eq.${userIdB},friend_id.eq.${userIdA})`);

  const { data: insertRes, error: insertErr } = await supabase
    .from("connections")
    .insert({
      user_id: userIdA,
      friend_id: userIdB,
      status: "pending"
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Insert pending error:", insertErr);
    return;
  }
  console.log("Pending connection row created:", insertRes);

  // Clean up any existing connection_accepted notifications for Berry to make the test clear
  await supabase
    .from("notifications")
    .delete()
    .eq("receiver_id", userIdA)
    .eq("type", "connection_accepted");

  console.log("\nSubscribing to Berry's notifications channel...");
  const uniqueChannelName = `notif-test-${userIdA}-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(uniqueChannelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `receiver_id=eq.${userIdA}`
      },
      (payload) => {
        console.log("🎉 REALTIME EVENT RECEIVED!");
        console.log("Payload:", JSON.stringify(payload, null, 2));
      }
    )
    .subscribe((status) => {
      console.log(`Subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        // Trigger the accept database update
        console.log("\nAccepting connection...");
        supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", insertRes.id)
          .then(({ data, error }) => {
            if (error) console.error("Accept error:", error);
            else console.log("Connection accepted in DB.");
          });
      }
    });

  // Wait for 10 seconds to see if the event fires
  await new Promise(resolve => setTimeout(resolve, 8000));
  console.log("\nCleaning up test connection...");
  await supabase
    .from("connections")
    .delete()
    .eq("id", insertRes.id);

  supabase.removeChannel(channel);
  console.log("Done.");
}

run();
