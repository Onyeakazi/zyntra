const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hdtpusakgajibsowwizb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PhtIB81Cyv8oXzCKa7XU6g_N_yAhNTz';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("1. Querying active stories...");
  const { data: stories, error: storiesErr } = await supabase
    .from('stories')
    .select('*')
    .limit(1);

  if (storiesErr) {
    console.error('Error fetching stories:', storiesErr.message);
    return;
  }
  
  if (stories.length === 0) {
    console.log("No stories found. Please create a story first.");
    return;
  }

  const testStory = stories[0];
  console.log("Found story ID:", testStory.id);

  console.log("2. Attempting to insert a view row...");
  const testViewerId = 'yfBW5ycgxQbAlJD9EfHtfFWm0kL2'; // Let's use a dummy or existing user ID
  
  const { data: viewData, error: viewErr } = await supabase
    .from('story_views')
    .insert({
      story_id: testStory.id,
      viewer_id: testViewerId
    })
    .select();

  if (viewErr) {
    console.log("View insert info (could be unique constraint violation if already viewed):", viewErr.message);
  } else {
    console.log("Successfully inserted story view:", viewData);
  }

  console.log("3. Fetching story views list...");
  const { data: viewsList, error: listErr } = await supabase
    .from('story_views')
    .select(`
      id,
      viewer_id,
      viewer:viewer_id (
        full_name,
        avatar_url,
        username
      )
    `)
    .eq('story_id', testStory.id);

  if (listErr) {
    console.error("Error fetching views list:", listErr.message);
  } else {
    console.log("Views list count:", viewsList.length, "Details:", JSON.stringify(viewsList, null, 2));
  }

  console.log("4. Inserting a test story_reaction notification...");
  const { data: notifData, error: notifErr } = await supabase
    .from('notifications')
    .insert({
      receiver_id: testStory.user_id,
      sender_id: testViewerId,
      type: 'story_reaction',
      story_id: testStory.id,
      story_reaction: '❤️',
      is_read: false
    })
    .select();

  if (notifErr) {
    console.error("Error inserting notification:", notifErr.message);
  } else {
    console.log("Successfully inserted story_reaction notification:", notifData);
    
    // Clean up test notification
    const { error: delErr } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notifData[0].id);
    if (!delErr) {
      console.log("Successfully cleaned up test notification.");
    }
  }
}

run();
