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

const userIds = [
  "yMW6kCQCIGVu5oBJERVuqYgdRM02",
  "Myb7p6oEQlRUMuTSGBUzQaiaTd82",
  "lhCrWc5ex3XiDm4s9uAUkivDbA43",
  "yfBW5ycgxQbAlJD9EfHtfFWm0kL2"
];

async function checkUserFeed(userId) {
  console.log(`\n--------------------------------------------`);
  console.log(`Checking feed for user ID: ${userId}`);
  try {
    const { data, error } = await supabase
      .from("home_feed")
      .select("*")
      .eq("viewer_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`❌ DB Error for ${userId}:`, error);
      return;
    }

    console.log(`✅ Success fetching database records. Found ${data.length} items.`);

    // Let's run the exact mapping code from index.jsx
    console.log("Running mapping code...");
    const formattedFeeds = (data || []).map((post) => {
      // Safety checks corresponding to index.jsx
      if (!post.post_id) {
        console.warn("⚠️ Warning: post.post_id is null/undefined in post:", post);
      }
      
      return {
        id: post.post_id ? post.post_id.toString() : null,
        author_id: post.author_id,
        user: {
          name: post.author_name || "User",
          profilePic:
            post.author_avatar && post.author_avatar.trim() !== ""
              ? { uri: post.author_avatar }
              : "fallback_image", // Stand-in for require()
        },
        content: post.content,
        time: post.created_at ? new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Unknown",
        image: post.media_url ? { uri: post.media_url } : null,
        likes: "0",
        comments: "0",
      };
    });

    console.log(`✅ Mapping completed successfully. Formatted count: ${formattedFeeds.length}`);
  } catch (err) {
    console.error(`❌ Mapping Error for user ${userId}:`, err);
  }
}

async function run() {
  for (const uid of userIds) {
    await checkUserFeed(uid);
  }
}

run();
