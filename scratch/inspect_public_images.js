const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

const dir = 'd:\\Proyectos\\2026\\Amen SAAS\\public';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.png')) {
    try {
      const { width, height } = getPngDimensions(path.join(dir, file));
      console.log(`${file}: ${width}x${height}`);
    } catch(e) {}
  }
});
