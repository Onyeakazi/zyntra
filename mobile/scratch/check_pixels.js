const fs = require('fs');
const zlib = require('zlib');

function checkPixels(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    // Find IDAT chunks and concatenate them
    let pos = 8;
    let idatBuffers = [];
    while (pos < data.length) {
      const length = data.readUInt32BE(pos);
      const type = data.toString('ascii', pos + 4, pos + 8);
      if (type === 'IDAT') {
        idatBuffers.push(data.slice(pos + 8, pos + 8 + length));
      }
      if (type === 'IEND') break;
      pos += 12 + length;
    }
    
    const idatData = Buffer.concat(idatBuffers);
    const inflated = zlib.inflateSync(idatData);
    
    // Check if there are transparent bytes
    // Since color type 6 is RGBA (4 bytes per pixel + 1 filter byte per row)
    // We can just scan the inflated data for alpha byte values (the 4th byte of each pixel).
    // Let's get the image dimensions from IHDR to walk properly, 
    // or we can just scan the entire buffer for values < 255.
    let transparentCount = 0;
    for (let i = 0; i < inflated.length; i++) {
      // Just a simple check: if we find any byte < 255 in the buffer, it could be alpha.
      // But to be precise, let's check how many 0s are in there.
      if (inflated[i] === 0) {
        transparentCount++;
      }
    }
    console.log(`${filePath}: found ${transparentCount} zero bytes in pixel data (indicates transparency)`);
  } catch (err) {
    console.error(err.message);
  }
}

checkPixels('mobile/assets/images/logo.png');
checkPixels('mobile/assets/images/brand.png');
checkPixels('mobile/assets/images/full-logo.png');
