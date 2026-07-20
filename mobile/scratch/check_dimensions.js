const https = require('https');
const sizeOf = require('image-size');

const url = 'https://res.cloudinary.com/dcazbfdaw/image/upload/v1779316398/yvfuxkltvwygkdbaqvo1.jpg';

https.get(url, function (response) {
  const chunks = [];
  response.on('data', function (chunk) {
    chunks.push(chunk);
  }).on('end', function() {
    const buffer = Buffer.concat(chunks);
    try {
      const dimensions = sizeOf(buffer);
      console.log("Dimensions:", dimensions);
    } catch (e) {
      console.error("Error reading size:", e.message);
    }
  });
});
