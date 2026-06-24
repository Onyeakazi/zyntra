const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hdtpusakgajibsowwizb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PhtIB81Cyv8oXzCKa7XU6g_N_yAhNTz';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, username, avatar_url, bio');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users in database:');
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
