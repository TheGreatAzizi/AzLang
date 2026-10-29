// Builds examples.js from the files in examples/ so the IDE always ships
// the exact same programs as the command line examples.
const fs = require('fs');
const path = require('path');

const meta = [
  ['hello', '👋', 'Hello, world', 'Variables, strings, and a first program', 'Basics'],
  ['tour', '✨', 'Language tour', 'A guided tour of the entire language', 'Overview'],
  ['fibonacci', '🌀', 'Fibonacci', 'Recursion, caching, and a fast loop', 'Functions'],
  ['guessing-game', '🎯', 'Guessing game', 'Random numbers, loops, and input', 'Interactive'],
  ['inventory', '📦', 'Inventory', 'Classes, maps, JSON, and errors', 'Classes'],
  ['word-count', '📊', 'Word frequency', 'Strings, maps, and higher-order functions', 'Collections'],
  ['bank', '🏦', 'Bank account', 'Validation, custom errors, and history', 'Exceptions'],
  ['shapes', '🔷', 'Shapes', 'Inheritance, super, and polymorphism', 'Classes']
];

const examples = meta.map(function (m) {
  const file = path.join(__dirname, 'examples', m[0] + '.az');
  return {
    id: m[0],
    icon: m[1],
    title: m[2],
    desc: m[3],
    tag: m[4],
    code: fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  };
});

fs.writeFileSync(
  path.join(__dirname, 'examples.js'),
  '/* Generated from examples/*.az — run build-examples.js after editing them. */\n' +
  'window.AZ_EXAMPLES = ' + JSON.stringify(examples, null, 2) + ';\n',
  'utf8'
);

console.log('examples.js written (' + examples.length + ' examples).');
