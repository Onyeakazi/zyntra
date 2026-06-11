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

const content = `Day 13 of building Zyntra 🚀

Shipped the next core pillars of our social infrastructure today:

• Real-time Notification Engine: Automatically triggers alerts for reactions, comments, replies, mentions, and connection requests.
• Bottom tab notification badge counters syncing in real-time.
• Full Notification Hub with inline Connection Request actions (instant Accept/Decline) and Mark-as-read/Mark-all-as-read options.
• Clickable User Mentions: Highlighted in blue and bold inside posts, comments, and replies, routing directly to the user's profile.
• Premium Autocomplete Mention Suggestions: Floating user matching dropdown triggered when typing '@' in comments or post creators.
• Reddit-style Comment Thread Lines: Vertical connector line segments and horizontal branch lines linking nested replies to parent comment avatars.
• Home Header Declutter: Cleaned up duplicate icons and built a toggleable inline search feed filter.

Powering it all with React Native (Expo) & Supabase Postgres triggers + real-time subscription! ⚡

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
