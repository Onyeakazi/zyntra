const fs = require('fs');
const zlib = require('zlib');

function readFirstPixel(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    let pos = 8;
    let idatBuffers = [];
    let width = 0;
    let height = 0;
    while (pos < data.length) {
      const length = data.readUInt32BE(pos);
      const type = data.toString('ascii', pos + 4, pos + 8);
      if (type === 'IHDR') {
        width = data.readUInt32BE(pos + 8);
        height = data.readUInt32BE(pos + 12);
      }
      if (type === 'IDAT') {
        idatBuffers.push(data.slice(pos + 8, pos + 8 + length));
      }
      if (type === 'IEND') break;
      pos += 12 + length;
    }
    
    const idatData = Buffer.concat(idatBuffers);
    const inflated = zlib.inflateSync(idatData);
    
    // The inflated data has scanlines. Each scanline starts with a 1-byte filter type.
    // So the first pixel starts at offset 1 of scanline 0.
    // For RGBA (Color type 6), each pixel is 4 bytes: R, G, B, A.
    const r = inflated[1];
    const g = inflated[2];
    const b = inflated[3];
    const a = inflated[4];
    console.log(`${filePath} Dimensions: ${width}x${height}`);
    console.log(`${filePath} Top-Left Pixel RGBA: (${r}, ${g}, ${b}, ${a})`);
    
    // Check if the center pixel is white or transparent
    // Let's check another pixel, e.g. at the middle of the image
    // Scanline size is: 1 + width * 4 bytes
    const scanlineSize = 1 + width * 4;
    const centerY = Math.floor(height / 2);
    const centerX = Math.floor(width / 2);
    const centerOffset = centerY * scanlineSize + 1 + centerX * 4;
    if (centerOffset + 3 < inflated.length) {
      const cr = inflated[centerOffset];
      const cg = inflated[centerOffset + 1];
      const cb = inflated[centerOffset + 2];
      const ca = inflated[centerOffset + 3];
      console.log(`${filePath} Center Pixel RGBA: (${cr}, ${cg}, ${cb}, ${ca})`);
    }
  } catch (err) {
    console.error(err.message);
  }
}

readFirstPixel('mobile/assets/images/full-logo.png');
readFirstPixel('mobile/assets/images/splash-icon.png');
readFirstPixel('mobile/assets/images/logo.png');
readFirstPixel('mobile/assets/images/brand.png');
