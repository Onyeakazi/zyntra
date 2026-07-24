const path = require('path');
const fs = require('fs');

// Load env variables
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

const backendUrl = 'http://localhost:5000';
const receiverId = 'yMW6kCQCIGVu5oBJERVuqYgdRM02'; // Chiemena
const senderId = 'Myb7p6oEQlRUMuTSGBUzQaiaTd82'; // Eze Berry

async function sendTest() {
  console.log("Triggering test push notification...");
  try {
    const response = await fetch(`${backendUrl}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiverId,
        senderId,
        title: 'Diagnostic Test',
        body: 'Hello from Zyntra backend diagnostic test!',
        data: { type: 'chat', conversationId: 'test-conv-id' }
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Test Trigger Failed:", text);
    } else {
      const json = await response.json();
      console.log("✅ Test Trigger Succeeded! Response:", json);
    }
  } catch (e) {
    console.error("❌ Exception during request:", e);
  }
}

sendTest();
