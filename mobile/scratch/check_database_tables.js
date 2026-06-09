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

async function run() {
  console.log("Checking for database tables...");
  
  // Since we cannot run raw SQL easily via normal Postgrest, 
  // we can attempt a dummy query on common table names to see if they exist.
  const commonTables = ['post_reactions', 'reactions', 'post_comments', 'comments', 'saved_posts', 'bookmarks'];
  
  for (const table of commonTables) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ Table '${table}' does not exist.`);
      } else {
        console.log(`❓ Table '${table}' exists but returned error: ${error.message} (Code: ${error.code})`);
      }
    } else {
      console.log(`✅ Table '${table}' exists!`);
    }
  }
}

run();
