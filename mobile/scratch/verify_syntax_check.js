const fs = require('fs');
const parser = require('@babel/parser');

const files = [
  'mobile/app/(tabs)/index.jsx',
  'mobile/app/(tabs)/profile.jsx'
];

files.forEach(file => {
  try {
    const code = fs.readFileSync(file, 'utf8');
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'objectRestSpread', 'exportDefaultFrom']
    });
    console.log(`✅ ${file} parsed successfully with no syntax errors!`);
  } catch (err) {
    console.error(`❌ Error parsing ${file}:`, err.message);
  }
});
