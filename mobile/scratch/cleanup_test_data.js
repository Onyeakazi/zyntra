/**
 * Cleanup script: removes test messages inserted during development/debugging.
 * Run with: node scratch/cleanup_test_data.js
 *
 * This uses the ANON key and deletes only the specific test entries.
 * If RLS blocks deletes, run the SQL query directly in the Supabase Dashboard:
 *   DELETE FROM messages WHERE content ILIKE 'Test Message at %';
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load .env.local (same as other scratch scripts)
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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanup() {
  console.log("🧹 Starting cleanup of test data...\n");

  // 1. First FIND the test messages so we know what we're deleting
  const { data: foundMsgs, error: findErr } = await supabase
    .from("messages")
    .select("id, content, conversation_id, created_at")
    .ilike("content", "Test Message at %");

  if (findErr) {
    console.error("❌ Failed to find test messages:", findErr.message);
    return;
  }

  if (!foundMsgs || foundMsgs.length === 0) {
    console.log("✅ No test messages found — database is already clean!");
    return;
  }

  console.log(`Found ${foundMsgs.length} test message(s) to delete:`);
  foundMsgs.forEach(m => console.log(`   • [${m.id}] "${m.content}" (conv: ${m.conversation_id})`));

  // 2. Delete them
  const { data: deletedMsgs, error: msgErr } = await supabase
    .from("messages")
    .delete()
    .ilike("content", "Test Message at %")
    .select("id");

  if (msgErr) {
    console.error("\n❌ Failed to delete test messages:", msgErr.message);
    console.log("\n💡 If RLS is blocking, run this SQL in the Supabase Dashboard:");
    console.log("   DELETE FROM messages WHERE content ILIKE \'Test Message at %\';");
  } else {
    console.log(`\n✅ Deleted ${deletedMsgs?.length || 0} test message(s)`);
  }

  // 3. Fix up any conversations whose last_message is still showing a test string
  const { data: stalConvs, error: convFindErr } = await supabase
    .from("conversations")
    .select("id, last_message")
    .ilike("last_message", "Test Message at %");

  if (!convFindErr && stalConvs && stalConvs.length > 0) {
    console.log(`\nFound ${stalConvs.length} conversation(s) with stale last_message. Clearing...`);
    const { error: convUpdateErr } = await supabase
      .from("conversations")
      .update({ last_message: null, last_sender_id: null })
      .ilike("last_message", "Test Message at %");

    if (convUpdateErr) {
      console.error("❌ Failed to clear stale conversation last_message:", convUpdateErr.message);
    } else {
      console.log("✅ Cleared stale last_message on affected conversations.");
    }
  } else if (!convFindErr) {
    console.log("\n✅ No stale conversation last_messages found.");
  }

  console.log("\n🎉 Cleanup complete.");
}

cleanup().catch(console.error);
