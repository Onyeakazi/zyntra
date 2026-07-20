const fs = require('fs');
const content = fs.readFileSync('mobile/app/(tabs)/profile.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('StyleSheet.')) {
    console.log(`${index + 1}: ${line}`);
  }
});
