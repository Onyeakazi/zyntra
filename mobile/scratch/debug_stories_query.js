const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hdtpusakgajibsowwizb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PhtIB81Cyv8oXzCKa7XU6g_N_yAhNTz';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from("stories")
    .select(`
      *,
      user:user_id (
        id,
        full_name,
        avatar_url,
        username
      )
    `)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error('SUPABASE ERROR IN ACTIVE STORIES QUERY:', error);
  } else {
    console.log('Query succeeded! Data details:', JSON.stringify(data, null, 2));
  }
}

run();
