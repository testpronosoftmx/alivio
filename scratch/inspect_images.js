const fs = require('fs');
const path = require('path');

// A simple PNG parser to read width and height from the IHDR chunk
function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG signature is 8 bytes, IHDR chunk starts at byte 12
  // Width is 4 bytes starting at byte 16, Height is 4 bytes starting at byte 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

const dir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\523d588c-93a6-4cf1-90cb-25f00f674beb';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.png')) {
    try {
      const { width, height } = getPngDimensions(path.join(dir, file));
      console.log(`${file}: ${width}x${height} (Ratio: ${(width/height).toFixed(2)})`);
    } catch(e) {}
  }
});
