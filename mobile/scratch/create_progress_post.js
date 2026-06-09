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

const userId = "yMW6kCQCIGVu5oBJERVuqYgdRM02"; // Chiemena Godswill

const content = `Day 12 of building Zyntra 🚀

Picked up from where I left off after yesterday's power outage. Just shipped a complete social engagement system:

• Facebook-style Reactions: Long-press to love, care, laugh, cry, wow, or get angry. Select any emoji with a floating selector.
• Overlapping Emoji Badges & direct action counts sitting close to each icon (Likes, Comments, Shares, Bookmarks).
• Full-screen Keyboard-Avoiding Comments view with real-time sync.
• Bookmarks / Saved Posts showing active bookmark state and total saves count.
• Refactored Link Sharing (Native Share sheet + Clipboard Copy link) with real-time share counters.

Powering it all with React Native (Expo) & Supabase Postgres real-time channels! ⚡

#buildinpublic #reactnative #supabase #indiedev #mobiledev`;

async function run() {
  console.log("Creating progress post in database...");
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content: content,
      created_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error("❌ Error creating post:", error);
  } else {
    console.log("✅ Success! Post created successfully:", data);
  }
}

run();
