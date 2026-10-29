'use strict';

// A tiny dependency-free ZIP writer. It uses deflate and a fixed timestamp so
// release artifacts are byte-for-byte reproducible for the same inputs.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// 2026-01-01 00:00:00 in MS-DOS format.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

function normalizeName(name) {
  return String(name).replace(/\\/g, '/').replace(/^\/+/, '');
}

function addFile(entries, name, data) {
  entries.push({ name: normalizeName(name), data });
}

function addText(entries, name, text) {
  addFile(entries, name, Buffer.from(text, 'utf8'));
}

function collectFiles(directory, prefix, filter, entries) {
  const base = path.resolve(directory);
  const items = fs.readdirSync(base, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const item of items) {
    const full = path.join(base, item.name);
    const name = prefix ? prefix.replace(/\/+$/, '') + '/' + item.name : item.name;
    if (filter && !filter(name, item)) continue;
    if (item.isDirectory()) {
      collectFiles(full, name, filter, entries);
    } else if (item.isFile()) {
      addFile(entries, name, fs.readFileSync(full));
    }
  }
  return entries;
}

function addDirectory(entries, directory, prefix, filter) {
  return collectFiles(directory, prefix, filter, entries);
}

function writeZip(output, entries) {
  const sorted = entries.slice().sort((a, b) => a.name.localeCompare(b.name));
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const entry of sorted) {
    const name = Buffer.from(entry.name, 'utf8');
    const source = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const compressed = zlib.deflateRawSync(source, { level: 9 });
    const crc = crc32(source);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    locals.push(local, name, compressed);
    centrals.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, Buffer.concat([Buffer.concat(locals), centralBuffer, end]));
  return sorted.length;
}

module.exports = {
  addDirectory,
  addFile,
  addText,
  writeZip
};
