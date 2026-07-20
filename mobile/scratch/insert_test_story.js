const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hdtpusakgajibsowwizb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PhtIB81Cyv8oXzCKa7XU6g_N_yAhNTz';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Inserting a test story...");
  
  const testStory = {
    user_id: 'yfBW5ycgxQbAlJD9EfHtfFWm0kL2',
    media_url: 'https://res.cloudinary.com/dcazbfdaw/image/upload/v1780331483/bz7kylfsrbxjtvwa0drq.jpg',
    media_type: 'image',
    caption: 'My awesome day at work!',
    background_color: null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  const { data, error } = await supabase
    .from('stories')
    .insert(testStory)
    .select();

  if (error) {
    console.error("❌ Error inserting test story:", error);
  } else {
    console.log("✅ Success! Test story inserted:", data);
  }
}

run();
