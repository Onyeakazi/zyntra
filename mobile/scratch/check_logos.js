const fs = require('fs');
const zlib = require('zlib');

function checkTransparency(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    // Let's check if the file exists and has content
    console.log(`${filePath} size: ${data.length} bytes`);
    
    // We can do a simpler check: search for the PLTE or tRNS chunks, 
    // or just look for the IHDR chunk to see color type.
    // PNG signature is 8 bytes.
    let pos = 8;
    let colorType = -1;
    let hasTRNS = false;
    
    while (pos < data.length) {
      const length = data.readUInt32BE(pos);
      const type = data.toString('ascii', pos + 4, pos + 8);
      
      if (type === 'IHDR') {
        colorType = data[pos + 8 + 9]; // Color type is at offset 9 in IHDR
        console.log(`${filePath} Color Type: ${colorType}`);
      }
      if (type === 'tRNS') {
        hasTRNS = true;
      }
      if (type === 'IEND') {
        break;
      }
      pos += 12 + length;
    }
    
    // Color types:
    // 0: Grayscale (can have tRNS)
    // 2: Truecolor/RGB (can have tRNS)
    // 3: Indexed/Palette (can have tRNS)
    // 4: Grayscale + Alpha (always has alpha channel)
    // 6: Truecolor + Alpha/RGBA (always has alpha channel)
    
    if (colorType === 4 || colorType === 6) {
      console.log(`${filePath} has alpha channel (Color Type ${colorType})`);
    } else if (hasTRNS) {
      console.log(`${filePath} has transparency chunk (tRNS)`);
    } else {
      console.log(`${filePath} is OPAQUE (no alpha channel or transparency chunk)`);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
}

console.log('--- Checking Logos ---');
checkTransparency('mobile/assets/images/logo.png');
checkTransparency('mobile/assets/images/logo1.png');
checkTransparency('mobile/assets/images/logo2.png');
checkTransparency('mobile/assets/images/brand.png');
checkTransparency('mobile/assets/images/full-logo.png');
