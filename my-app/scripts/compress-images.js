/**
 * Comprime imágenes en public/: redimensiona las muy grandes (max 800px ancho) y optimiza PNG/JPEG.
 * Solo sobrescribe si el resultado es más pequeño.
 * Ejecutar: node scripts/compress-images.js
 */
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_WIDTH = 800;

async function compressImages() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Instala sharp: npm install --save-dev sharp');
    process.exit(1);
  }

  const files = [];
  function collect(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) collect(full);
      else if (/\.(png|jpe?g)$/i.test(ent.name)) files.push(full);
    }
  }
  collect(PUBLIC_DIR);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const filePath of files) {
    const rel = path.relative(PUBLIC_DIR, filePath);
    const stat = fs.statSync(filePath);
    totalBefore += stat.size;

    try {
      const buffer = fs.readFileSync(filePath);
      let pipeline = sharp(buffer);
      const meta = await pipeline.metadata();
      const needResize = meta.width > MAX_WIDTH;
      if (needResize) pipeline = pipeline.resize(MAX_WIDTH, null, { withoutEnlargement: true });

      const ext = path.extname(filePath).toLowerCase();
      let out;
      if (ext === '.png') {
        out = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
      } else {
        out = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      }

      if (out.length < stat.size) {
        fs.writeFileSync(filePath, out);
        totalAfter += out.length;
        const saved = ((1 - out.length / stat.size) * 100).toFixed(1);
        console.log(`${rel}: ${(stat.size / 1024).toFixed(1)} KB → ${(out.length / 1024).toFixed(1)} KB (-${saved}%)`);
      } else {
        totalAfter += stat.size;
        console.log(`${rel}: ${(stat.size / 1024).toFixed(1)} KB (sin cambios, ya optimizado)`);
      }
    } catch (err) {
      console.error(`Error ${rel}:`, err.message);
      totalAfter += stat.size;
    }
  }

  const savedTotal = totalBefore ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : 0;
  console.log(`\nTotal: ${(totalBefore / 1024).toFixed(0)} KB → ${(totalAfter / 1024).toFixed(0)} KB (-${savedTotal}%)`);
}

compressImages().catch((e) => {
  console.error(e);
  process.exit(1);
});
