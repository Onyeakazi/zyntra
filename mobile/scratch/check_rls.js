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
  console.log("Checking RLS policies...");
  
  // Query pg_policies
  const { data: policies, error } = await supabase.rpc('get_policies_for_tables'); // if exists
  
  // Or we can just run a query using SQL via pgmgr or select * from information_schema if we can, 
  // or we can write a quick query to fetch policies using a raw sql query (if we have access to execute sql, but anon client can't run raw sql unless there's an RPC).
  // Wait, let's see if there is an error when we listen to realtime messages table from another user.
  // Let's print out if there's any RLS info.
  // Actually, we can run a postgres query by creating a temporary function or just checking if we can get policy information.
  // Let's query information_schema or pg_policies via pg_class if RPC exists, otherwise let's just see.
  
  // Let's check if we can query from a system table.
  const { data: policyData, error: policyErr } = await supabase
    .from('pg_policies') // this won't work directly if RLS is on pg_policies or if it's not exposed
    .select('*');
  console.log("pg_policies direct query:", policyData, policyErr);
}

run();
