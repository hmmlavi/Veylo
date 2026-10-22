import { mkdir, readFile, readdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const logoPath = path.join(root, 'public', 'veylo-logo.svg');
const logo = await readFile(logoPath);

async function render(destination, size) {
  await mkdir(path.dirname(destination), { recursive: true });
  await sharp(logo, { density: 144 })
    .resize(size, size, { fit: 'contain' })
    .png()
    .toFile(destination);
}

for (const size of [192, 512]) {
  await render(path.join(root, `public/icons/icon-${size}.png`), size);
}

const densities = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];

for (const [density, legacySize, foregroundSize] of densities) {
  const directory = path.join(root, 'android/app/src/main/res', `mipmap-${density}`);
  await render(path.join(directory, 'ic_launcher.png'), legacySize);
  await render(path.join(directory, 'ic_launcher_round.png'), legacySize);
  await render(path.join(directory, 'ic_launcher_foreground.png'), foregroundSize);
}

const resourceRoot = path.join(root, 'android/app/src/main/res');
for (const entry of await readdir(resourceRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('drawable')) continue;
  const splashPath = path.join(resourceRoot, entry.name, 'splash.png');
  let splashSource;
  try {
    splashSource = await readFile(splashPath);
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }

  {
    const metadata = await sharp(splashSource).metadata();
    const iconSize = Math.round(Math.min(metadata.width, metadata.height) * 0.48);
    const icon = await sharp(logo, { density: 144 })
      .resize(iconSize, iconSize, { fit: 'contain' })
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: metadata.width,
        height: metadata.height,
        channels: 4,
        background: '#061631',
      },
    })
      .composite([{ input: icon, gravity: 'centre' }])
      .png()
      .toFile(splashPath + '.generated.png');
    await rename(splashPath + '.generated.png', splashPath);
  }
}

console.log('Generated web, Android launcher, and splash assets from public/veylo-logo.svg');
