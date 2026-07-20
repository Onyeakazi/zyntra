const fs = require('fs');

const files = [
  'mobile/app/(auth)/forgotpassword.jsx',
  'mobile/app/(auth)/login.jsx',
  'mobile/app/(tabs)/addFriends.jsx',
  'mobile/app/(tabs)/index.jsx',
  'mobile/app/(tabs)/message.jsx',
  'mobile/app/(tabs)/notification.jsx',
  'mobile/app/(tabs)/profile.jsx',
  'mobile/app/chat.jsx',
  'mobile/app/comments.jsx',
  'mobile/app/editprofile.jsx',
  'mobile/app/onboarding.jsx',
  'mobile/components/Button.jsx',
  'mobile/components/CustomAlertModal.jsx',
  'mobile/components/Feed.jsx',
  'mobile/components/Input.jsx',
  'mobile/components/Preloader.jsx',
  'mobile/components/Story.jsx',
  'mobile/components/StoryCreator.jsx',
  'mobile/components/StoryViewer.jsx'
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasStyleSheetUsage = content.includes('StyleSheet.');
  const hasStyleSheetImport = content.includes('StyleSheet');
  
  if (hasStyleSheetUsage && !hasStyleSheetImport) {
    console.error(`❌ ERROR: ${file} uses 'StyleSheet.' but doesn't import 'StyleSheet'!`);
  } else if (hasStyleSheetUsage) {
    console.log(`ℹ️ ${file} uses 'StyleSheet.' and imports it.`);
  } else {
    console.log(`✅ ${file} is clean (no 'StyleSheet.' usage).`);
  }
});
