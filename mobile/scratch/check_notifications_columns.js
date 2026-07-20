const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hdtpusakgajibsowwizb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PhtIB81Cyv8oXzCKa7XU6g_N_yAhNTz';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Checking columns of notifications table...");
  const { data, error } = await supabase
    .from('notifications')
    .select('id, story_id, story_reaction')
    .limit(1);

  if (error) {
    console.error('❌ Error querying columns of notifications table:', error);
  } else {
    console.log('✅ Columns exist! Query result:', data);
  }
}

run();
