const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'components', 'Feed.jsx'),
  path.join(__dirname, '..', 'app', 'comments.jsx'),
  path.join(__dirname, '..', 'app', '(tabs)', 'notification.jsx'),
  path.join(__dirname, '..', 'app', '(tabs)', '_layout.jsx'),
  path.join(__dirname, '..', 'app', '(tabs)', 'index.jsx'),
  path.join(__dirname, '..', 'app', 'create-post.jsx')
];

let hasError = false;

for (const file of files) {
  console.log(`Parsing and compiling: ${file}`);
  try {
    const code = fs.readFileSync(file, 'utf8');
    babel.transformSync(code, {
      filename: file,
      presets: ['babel-preset-expo'], // Use the Expo babel preset
    });
    console.log(`✅ Success! No syntax errors found in ${path.basename(file)}`);
  } catch (err) {
    console.error(`❌ Syntax/Compilation Error in ${path.basename(file)}:`);
    console.error(err.message);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log("\n🎉 All syntax verification checks passed successfully!");
}
