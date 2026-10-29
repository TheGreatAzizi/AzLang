// Assembles the static GitHub Pages artifact in _site/.
//
// Only the files the deployed website needs are copied, so the artifact stays
// small and never contains local build or editor files.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const out = path.join(root, '_site');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const files = [
  'index.html',
  'docs.html',
  'ide.html',
  '404.html',
  '.nojekyll',
  'azlang.js',
  'examples.js',
  'README.md',
  'LICENSE'
];

for (const name of files) {
  const from = path.join(root, name);
  if (!fs.existsSync(from)) {
    console.error('build-pages: missing ' + name);
    process.exit(1);
  }
  fs.copyFileSync(from, path.join(out, name));
}

for (const dir of ['assets', 'examples', 'site']) {
  fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
}

console.log('_site ready: ' + files.length + ' files and 3 directories.');
