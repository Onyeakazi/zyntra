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
  const users = [
    { id: "yMW6kCQCIGVu5oBJERVuqYgdRM02", name: "Chiemena Godswill" },
    { id: "Myb7p6oEQlRUMuTSGBUzQaiaTd82", name: "Eze Berry" },
    { id: "lhCrWc5ex3XiDm4s9uAUkivDbA43", name: "Mary Ann" },
    { id: "yfBW5ycgxQbAlJD9EfHtfFWm0kL2", name: "Godwin Ibe" }
  ];

  for (const user of users) {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, sender_id, receiver_id, is_read, created_at")
      .eq("receiver_id", user.id);

    console.log(`=== Notifications for ${user.name} (${user.id}) ===`);
    if (error) {
      console.error(error);
    } else {
      console.log(`Count: ${data.length}`);
      data.forEach(n => {
        const sender = users.find(u => u.id === n.sender_id);
        console.log(`- ID: ${n.id}, Type: ${n.type}, Sender: ${sender ? sender.name : n.sender_id}, IsRead: ${n.is_read}`);
      });
    }
    console.log();
  }
}

run();
