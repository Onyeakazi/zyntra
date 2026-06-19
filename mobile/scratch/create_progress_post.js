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

const content = `Day 14 of building Zyntra 🚀

Just shipped the reposting and quote post ecosystem today! Here is what we did:

• Simple Reposts & Quote Posts: Users can now share others' posts directly to their feed (simple repost with a "shared a post" banner) or add custom commentary with a nested card layout showing the original post.
• Facebook-Style Share Sheet: Custom slide-up bottom sheet with inline SVG icons inside light-gray circle backdrops. It offers actions to Repost Now, Quote Post, Copy Link, and Share Outside.
• Decoupled Click Targets: Structured cards with sibling Pressables rather than nested Pressables. Tapping the original author's name navigates to their profile, while tapping the original post body takes you to the comments details view.
• Automated Repost Notifications: Created a Supabase trigger to notify the original author in real-time when someone reposts their content.
• Clean Feed Loading: Synced all original post and author ID parameters correctly on index and profile feeds.

Keeping the momentum going! 💪

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
