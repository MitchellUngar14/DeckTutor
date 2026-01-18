import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const sourceLogo = path.join(publicDir, 'logo.png');

async function generateIcons() {
  const image = sharp(sourceLogo);
  const metadata = await image.metadata();

  console.log(`Source image: ${metadata.width}x${metadata.height}`);

  // Create 192x192 icon (square, contain the image with transparent background)
  await sharp(sourceLogo)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  // Create 512x512 icon
  await sharp(sourceLogo)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  // Create maskable icon (with padding for safe zone - icon should be ~80% of canvas)
  // First resize to 80% of 512 = ~410, then extend to 512 with background
  await sharp(sourceLogo)
    .resize(400, 400, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .extend({
      top: 56,
      bottom: 56,
      left: 56,
      right: 56,
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .png()
    .toFile(path.join(publicDir, 'icon-maskable.png'));
  console.log('Created icon-maskable.png');

  console.log('Done!');
}

generateIcons().catch(console.error);
