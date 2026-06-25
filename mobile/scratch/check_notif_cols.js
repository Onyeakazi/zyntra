const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hdtpusakgajibsowwizb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PhtIB81Cyv8oXzCKa7XU6g_N_yAhNTz';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('notifications').select('*').limit(1);
  if (error) {
    console.error('Error fetching columns:', error);
  } else {
    console.log('Columns of notifications:', data.length > 0 ? Object.keys(data[0]) : 'No data, columns unavailable via query');
  }
}

run();
