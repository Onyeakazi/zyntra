const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hdtpusakgajibsowwizb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PhtIB81Cyv8oXzCKa7XU6g_N_yAhNTz';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .limit(1);
  if (error) {
    console.error('Error querying stories table:', error.code, error.message);
  } else {
    console.log('Stories table exists! Sample query output:', data);
  }
}

run();
