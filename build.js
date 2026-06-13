const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const step = (n, total, msg) => console.log(`\n[${n}/${total}] ${msg}`);
const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit' });

async function build() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  WhatsApp Manager Desktop — Build v1.0.0');
  console.log('═══════════════════════════════════════════════════\n');

  // [1/6] Install dependencies
  step(1, 6, 'Installing dependencies...');
  run('npm install --no-audit --legacy-peer-deps');

  // [2/6] Build React renderer
  step(2, 6, 'Building React renderer...');
  run('npm run build:renderer');

  // [3/6] Compile server TypeScript
  step(3, 6, 'Compiling Express server...');
  run('npm run build:server');

  // [4/6] Compile Electron main process
  step(4, 6, 'Compiling Electron main process...');
  run('npm run build:electron');

  // [5/6] Ensure Chromium
  step(5, 6, 'Checking Chromium...');
  ensureChromium();

  // [6/6] Package with electron-packager
  step(6, 6, 'Packaging application...');
  const { version } = require('./package.json');

  const packagerArgs = [
    'npx @electron/packager .',
    '"WhatsApp Manager"',
    '--platform=win32',
    '--arch=x64',
    '--electron-version=28.3.3',
    '--out=releases',
    '--overwrite',
    '--asar',
    '--asar-unpack=**/{chromium,wa-tokens}/**',
    '--prune',
    `--app-version=${version}`,
    '--ignore="renderer/src"',
    '--ignore="server"',
    '--ignore="\\.git"',
    '--ignore="releases"',
    '--ignore="node_modules/.cache"',
    '--version-string.CompanyName="WhatsApp Manager"',
    `--version-string.FileDescription="WhatsApp Manager Desktop v${version}"`,
    '--version-string.ProductName="WhatsApp Manager"',
  ].join(' ');

  run(packagerArgs);

  // Create ZIP
  const appDir = `WhatsApp Manager-win32-x64`;
  const zipName = `WhatsApp-Manager-v${version}-win32-x64.zip`;
  const releasesDir = path.join(ROOT, 'releases');

  if (process.platform === 'win32') {
    run(`powershell Compress-Archive -Path "${appDir}" -DestinationPath "${zipName}" -Force`, releasesDir);
  } else {
    run(`zip -r "${zipName}" "${appDir}"`, releasesDir);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`✅ Build complete!`);
  console.log(`   EXE:  releases/${appDir}/WhatsApp Manager.exe`);
  console.log(`   ZIP:  releases/${zipName}`);
  console.log('═══════════════════════════════════════════════════\n');
  console.log('ℹ️  First run creates wa-manager.db next to the .exe');
  console.log('   Default login: admin / 123456');
  console.log('   Change the password immediately after first login.\n');
}

function ensureChromium() {
  const chromiumDest = path.join(ROOT, 'resources', 'chromium');

  if (fs.existsSync(path.join(chromiumDest, 'chrome.exe'))) {
    console.log('  ✅ Chromium already present');
    return;
  }

  fs.mkdirSync(chromiumDest, { recursive: true });

  // Search Puppeteer cache
  const cacheBase = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.cache', 'puppeteer', 'chrome'
  );

  if (fs.existsSync(cacheBase)) {
    const versions = fs.readdirSync(cacheBase).sort().reverse();
    for (const ver of versions) {
      const winDir = path.join(cacheBase, ver, 'chrome-win64');
      if (fs.existsSync(winDir)) {
        console.log(`  Copying Chromium from: ${winDir}`);
        copyDir(winDir, chromiumDest);
        console.log('  ✅ Chromium copied');
        return;
      }
    }
  }

  // Download if not found
  console.log('  Downloading Chromium for Windows x64...');
  execSync('npx puppeteer browsers install chrome --platform win64', { cwd: ROOT, stdio: 'inherit' });
  ensureChromium(); // retry
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

build().catch((err) => {
  console.error('\n❌ Build failed:', err.message || err);
  process.exit(1);
});
