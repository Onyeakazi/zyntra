const fs = require('fs');

function printDims(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    console.log(`${filePath}: ${width} x ${height}`);
  } catch (err) {
    console.error(err.message);
  }
}

printDims('mobile/assets/images/logo.png');
printDims('mobile/assets/images/logo1.png');
printDims('mobile/assets/images/logo2.png');
printDims('mobile/assets/images/brand.png');
printDims('mobile/assets/images/full-logo.png');
