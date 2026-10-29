// Builds index.html by running the landing page program in site/site.az.
//
// The website is written in AzLang: site/site.az prints the complete page.
// This script runs that program and writes its output to index.html as UTF-8.
const fs = require('fs');
const path = require('path');
const az = require('./azlang.js');

const root = __dirname;
const runtime = fs.readFileSync(path.join(root, 'azlang.js'), 'utf8');
const versionMatch = /var VERSION = '([^']+)'/.exec(runtime);
if (!versionMatch) {
  console.error('build-site: could not find VERSION in azlang.js');
  process.exit(1);
}
const version = versionMatch[1];
const source = fs
  .readFileSync(path.join(root, 'site', 'site.az'), 'utf8')
  .replace(/\r\n?/g, '\n');

const chunks = [];
const result = az.run(source, {
  onOutput: function (line) {
    chunks.push(String(line));
  },
  maxSteps: 20000000
});

let html = chunks
  .join('\n')
  .replace(/\r\n/g, '\n')
  .replace(/\{\{VERSION\}\}/g, version);

if (!/^<!DOCTYPE html>/.test(html) || !/<\/html>\s*$/.test(html)) {
  console.error('site/site.az did not produce a complete HTML document.');
  process.exit(1);
}

fs.writeFileSync(path.join(root, 'index.html'), html + '\n', 'utf8');

console.log(
  'index.html written: ' + html.length + ' chars, ' +
  result.steps + ' steps, ' + result.ms + ' ms'
);
