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
  const convId = '4a82c1eb-4511-41a2-9813-bb6b981cfa17';
  const senderId = 'yfBW5ycgxQbAlJD9EfHtfFWm0kL2';
  console.log("Inserting a test message...");
  
  const { data: insertedMsg, error: insertErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: convId,
      sender_id: senderId,
      content: `Test Message at ${new Date().toISOString()}`,
      is_read: false
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Insert Error:", insertErr);
    return;
  }
  
  console.log("Insert Succeeded! Message ID:", insertedMsg.id);
  
  console.log("Updating parent conversation...");
  const { error: convErr } = await supabase
    .from("conversations")
    .update({
      last_message: insertedMsg.content,
      last_sender_id: senderId,
      updated_at: new Date().toISOString()
    })
    .eq("id", convId);
    
  if (convErr) {
    console.error("Conversation Update Error:", convErr);
  } else {
    console.log("Conversation Update Succeeded!");
  }
}

run();
