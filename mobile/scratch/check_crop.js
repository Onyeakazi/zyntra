const fs = require('fs');
const zlib = require('zlib');

function checkCrop(filePath) {
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
    
    const scanlineSize = 1 + width * 4;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    
    for (let y = 0; y < height; y++) {
      const rowStart = y * scanlineSize + 1; // skip filter byte
      for (let x = 0; x < width; x++) {
        const offset = rowStart + x * 4;
        const alpha = inflated[offset + 3];
        if (alpha > 10) { // non-transparent
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    console.log(`${filePath}:`);
    console.log(`  Dimensions: ${width}x${height}`);
    console.log(`  Bounding Box of visible content: X: [${minX}, ${maxX}], Y: [${minY}, ${maxY}]`);
    console.log(`  Visible width: ${maxX - minX + 1}, Visible height: ${maxY - minY + 1}`);
    console.log(`  Right whitespace: ${width - 1 - maxX}px, Left whitespace: ${minX}px`);
  } catch (err) {
    console.error(err.message);
  }
}

checkCrop('mobile/assets/images/brand.png');
checkCrop('mobile/assets/images/full-logo.png');
checkCrop('mobile/assets/images/logo2.png');
checkCrop('mobile/assets/images/logo.png');
checkCrop('mobile/assets/images/logo1.png');
