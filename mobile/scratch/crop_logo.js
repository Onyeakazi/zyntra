const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Install jimp locally in scratch folder to avoid modifying main project package.json
const scratchDir = __dirname;
console.log('Scratch dir:', scratchDir);

try {
  // Always run install to ensure the correct version (0.16.1) is present
  console.log('Installing stable jimp@0.16.1...');
  execSync('npm install --no-save jimp@0.16.1', { cwd: scratchDir, stdio: 'inherit' });
  
  const Jimp = require('jimp');
  
  // Load icon-only.png
  const inputPath = path.resolve(scratchDir, '../assets/images/icon-only.png');
  const outputPath = path.resolve(scratchDir, '../assets/images/zyntra-square-icon.png');
  
  Jimp.read(inputPath).then(image => {
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    console.log(`Original image size: ${width}x${height}`);
    
    // We want to crop to a square. The height is 354, so square size is 354.
    const size = height;
    const x = Math.floor((width - size) / 2);
    const y = 0;
    
    image.crop(x, y, size, size);
    console.log(`Cropped image size: ${image.bitmap.width}x${image.bitmap.height}`);
    
    // Resize to a high-quality standard size like 512x512
    image.resize(512, 512);
    console.log(`Resized to 512x512`);
    
    image.write(outputPath, (err) => {
      if (err) throw err;
      console.log(`Success! Saved custom square transparent icon to: ${outputPath}`);
    });
  }).catch(err => {
    console.error('Error processing image:', err);
  });
} catch (err) {
  console.error('Error running script:', err);
}
