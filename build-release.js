'use strict';

// Builds every downloadable AzLang release artifact on Windows:
//   - AzLang-<version>-Setup.exe          (per-user installer, bundled Node)
//   - AzLang-<version>-windows-x64-portable.zip
//   - azlang-<version>.vsix               (VS Code and compatible editors)
//   - AzLang-<version>-editors.zip        (VS Code, TextMate, Sublime, Vim, Neovim)
//   - azlang.js                           (standalone runtime)
//   - SHA256SUMS.txt
//
// Requires Node.js and the .NET Framework C# compiler (included with Windows).
// There are no npm dependencies.

const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const zip = require('./packaging/zip.js');

const root = __dirname;
const buildRoot = path.join(root, 'build', 'release');
const payloadDir = path.join(buildRoot, 'payload');
const workDir = path.join(buildRoot, 'work');
const distDir = path.join(root, 'dist');
const icon = path.join(root, 'packaging', 'icon.ico');
const manifest = path.join(root, 'packaging', 'src', 'app.manifest');

function fail(message) {
  console.error('\nbuild-release: ' + message);
  process.exit(1);
}

function run(file, args, options) {
  const result = spawnSync(file, args, Object.assign({ stdio: 'inherit' }, options || {}));
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail(path.basename(file) + ' exited with code ' + result.status);
}

function readVersion() {
  const source = fs.readFileSync(path.join(root, 'azlang.js'), 'utf8');
  const match = /var VERSION = '([^']+)'/.exec(source);
  if (!match) fail('could not find VERSION in azlang.js');
  return match[1];
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyTree(from, to, filter) {
  fs.mkdirSync(to, { recursive: true });
  const items = fs.readdirSync(from, { withFileTypes: true });
  for (const item of items) {
    const source = path.join(from, item.name);
    const target = path.join(to, item.name);
    if (filter && !filter(item.name, source, item)) continue;
    if (item.isDirectory()) copyTree(source, target, filter);
    else if (item.isFile()) fs.copyFileSync(source, target);
  }
}

function findCompiler() {
  const candidates = [
    process.env.CSC,
    'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
    'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  fail('the .NET Framework C# compiler (csc.exe) was not found. Run this build on Windows.');
}

function compile(csc, options) {
  const args = [
    '/nologo',
    '/target:' + options.target,
    '/platform:anycpu',
    '/optimize+',
    '/warn:4',
    '/win32icon:' + icon,
    '/win32manifest:' + manifest
  ];
  const references = options.references || [];
  for (const reference of references) args.push('/r:' + reference);
  if (options.resource) {
    args.push('/resource:' + options.resource.file + ',' + options.resource.name);
  }
  args.push('/out:' + options.out);
  for (const source of options.sources) args.push(source);
  fs.mkdirSync(path.dirname(options.out), { recursive: true });
  run(csc, args);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function formatSize(bytes) {
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes > 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

function main() {
  const version = readVersion();
  const tagIndex = process.argv.indexOf('--expect-tag');
  if (tagIndex !== -1) {
    const tag = process.argv[tagIndex + 1];
    if (!tag || tag !== 'v' + version) {
      fail('tag ' + (tag || '(missing)') + ' does not match azlang.js version ' + version);
    }
  }

  if (process.platform !== 'win32') fail('release artifacts must be built on Windows.');
  const arch = process.arch;
  if (arch !== 'x64' && arch !== 'arm64') fail('unsupported Node architecture: ' + arch);

  const csc = findCompiler();
  console.log('AzLang release build');
  console.log('  version: ' + version);
  console.log('  arch:    ' + arch);
  console.log('  node:    ' + process.execPath);
  console.log('  csc:     ' + csc);

  fs.rmSync(buildRoot, { recursive: true, force: true });
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(payloadDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(distDir, { recursive: true });

  console.log('\n[1/6] Compiling the CLI launcher and the uninstaller');
  compile(csc, {
    target: 'exe',
    out: path.join(payloadDir, 'bin', 'azlang.exe'),
    sources: [path.join(root, 'packaging', 'src', 'AzLangLauncher.cs')]
  });
  compile(csc, {
    target: 'winexe',
    out: path.join(payloadDir, 'uninstall.exe'),
    sources: [
      path.join(root, 'packaging', 'src', 'Uninstaller.cs'),
      path.join(root, 'packaging', 'src', 'InstallerEngine.cs'),
      path.join(root, 'packaging', 'src', 'AzInstall.cs')
    ],
    references: [
      'System.Windows.Forms.dll',
      'System.Drawing.dll',
      'System.IO.Compression.dll',
      'System.IO.Compression.FileSystem.dll'
    ]
  });

  console.log('\n[2/6] Staging the language, runtime, Studio, and docs');
  copyFile(process.execPath, path.join(payloadDir, 'runtime', 'node.exe'));
  copyFile(path.join(root, 'azlang.js'), path.join(payloadDir, 'lib', 'azlang.js'));
  copyTree(path.join(root, 'examples'), path.join(payloadDir, 'examples'));

  const studioDir = path.join(payloadDir, 'studio');
  fs.mkdirSync(studioDir, { recursive: true });
  for (const name of ['ide.html', 'docs.html', 'index.html', '404.html', 'azlang.js', 'examples.js', 'studio-server.js']) {
    copyFile(path.join(root, name), path.join(studioDir, name));
  }
  copyFile(path.join(root, 'packaging', 'studio-launcher.vbs'), path.join(studioDir, 'AzLang Studio.vbs'));
  copyTree(path.join(root, 'assets'), path.join(studioDir, 'assets'));
  copyTree(path.join(root, 'site'), path.join(studioDir, 'site'));
  copyTree(path.join(root, 'examples'), path.join(studioDir, 'examples'));
  copyTree(path.join(root, 'editors'), path.join(payloadDir, 'editors'));

  copyFile(path.join(root, 'README.md'), path.join(payloadDir, 'README.md'));
  copyFile(path.join(root, 'LICENSE'), path.join(payloadDir, 'LICENSE'));
  const windowsReadme = fs.readFileSync(path.join(root, 'packaging', 'README-Windows.txt'), 'utf8')
    .replace(/\{\{VERSION\}\}/g, version)
    .replace(/\{\{ARCH\}\}/g, arch)
    .replace(/\r?\n/g, '\r\n');
  fs.writeFileSync(path.join(payloadDir, 'README-Windows.txt'), windowsReadme, 'utf8');
  fs.writeFileSync(path.join(payloadDir, 'version.txt'), 'AzLang ' + version + '\r\n', 'utf8');

  const runner =
    '@echo off\r\n' +
    'setlocal\r\n' +
    '"%~dp0azlang.exe" %*\r\n' +
    'if not defined AZLANG_NO_PAUSE (\r\n' +
    '  echo.\r\n' +
    '  pause\r\n' +
    ')\r\n';
  fs.mkdirSync(path.join(payloadDir, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(payloadDir, 'bin', 'azlang-run.cmd'), runner, 'utf8');

  console.log('\n[3/6] Packing the installer payload and Setup.exe');
  const payloadZip = path.join(workDir, 'payload.zip');
  const payloadEntries = zip.addDirectory([], payloadDir, '', (name) => {
    const base = path.basename(name).toLowerCase();
    return base !== '.ds_store' && base !== 'thumbs.db';
  });
  zip.writeZip(payloadZip, payloadEntries);
  console.log('  payload: ' + payloadEntries.length + ' files, ' + formatSize(fs.statSync(payloadZip).size));

  const setupName = arch === 'x64'
    ? 'AzLang-' + version + '-Setup.exe'
    : 'AzLang-' + version + '-' + arch + '-Setup.exe';
  const setupPath = path.join(distDir, setupName);
  compile(csc, {
    target: 'winexe',
    out: setupPath,
    sources: [
      path.join(root, 'packaging', 'src', 'Installer.cs'),
      path.join(root, 'packaging', 'src', 'InstallerEngine.cs'),
      path.join(root, 'packaging', 'src', 'AzInstall.cs')
    ],
    references: [
      'System.Windows.Forms.dll',
      'System.Drawing.dll',
      'System.IO.Compression.dll',
      'System.IO.Compression.FileSystem.dll'
    ],
    resource: { file: payloadZip, name: 'payload.zip' }
  });

  console.log('\n[4/6] Building the portable and editor archives');
  const portableName = 'AzLang-' + version + '-windows-' + arch + '-portable.zip';
  const portablePath = path.join(distDir, portableName);
  const portableEntries = zip.addDirectory([], payloadDir, 'AzLang-' + version + '-windows-' + arch, (name) => {
    const base = path.basename(name).toLowerCase();
    return base !== 'uninstall.exe' && base !== '.ds_store' && base !== 'thumbs.db';
  });
  zip.writeZip(portablePath, portableEntries);

  const editorsName = 'AzLang-' + version + '-editors.zip';
  const editorsPath = path.join(distDir, editorsName);
  const editorEntries = zip.addDirectory([], path.join(root, 'editors'), 'AzLang-' + version + '-editors', (name) => {
    const base = path.basename(name).toLowerCase();
    return base !== '.ds_store' && base !== 'thumbs.db';
  });
  zip.writeZip(editorsPath, editorEntries);

  console.log('\n[5/6] Building the VS Code extension');
  const vsixStage = path.join(workDir, 'vsix');
  const extensionDir = path.join(vsixStage, 'extension');
  copyTree(path.join(root, 'editors', 'vscode'), extensionDir);
  copyFile(path.join(root, 'LICENSE'), path.join(extensionDir, 'LICENSE.txt'));
  const extensionManifest = {
    name: 'azlang',
    displayName: 'AzLang',
    description: 'AzLang language support: syntax highlighting, snippets, diagnostics, and Run commands for VS Code, Cursor, Windsurf, and VSCodium.',
    version: version,
    publisher: 'thegreatazizi',
    license: 'MIT',
    icon: 'icon.png',
    engines: { vscode: '^1.75.0' },
    categories: ['Programming Languages', 'Snippets'],
    keywords: ['azlang', 'language', 'syntax highlighting', 'persian'],
    activationEvents: [
      'onLanguage:azlang',
      'onCommand:azlang.runFile',
      'onCommand:azlang.runSelection',
      'onCommand:azlang.openStudio'
    ],
    main: './extension.js',
    contributes: {
      languages: [{
        id: 'azlang',
        aliases: ['AzLang', 'azlang'],
        extensions: ['.az'],
        configuration: './language-configuration.json'
      }],
      grammars: [{
        language: 'azlang',
        scopeName: 'source.azlang',
        path: './syntaxes/AzLang.tmLanguage'
      }],
      snippets: [{
        language: 'azlang',
        path: './snippets/azlang.json'
      }],
      commands: [
        { command: 'azlang.runFile', title: 'AzLang: Run File', category: 'AzLang' },
        { command: 'azlang.runSelection', title: 'AzLang: Run Selection', category: 'AzLang' },
        { command: 'azlang.openStudio', title: 'AzLang: Open AzLang Studio', category: 'AzLang' },
        { command: 'azlang.openDocs', title: 'AzLang: Open Documentation', category: 'AzLang' }
      ],
      keybindings: [
        {
          command: 'azlang.runFile',
          key: 'ctrl+alt+r',
          mac: 'cmd+alt+r',
          when: 'editorLangId == azlang'
        },
        {
          command: 'azlang.runSelection',
          key: 'ctrl+alt+shift+r',
          mac: 'cmd+alt+shift+r',
          when: 'editorLangId == azlang && editorHasSelection'
        }
      ],
      menus: {
        'editor/title': [{
          command: 'azlang.runFile',
          when: 'resourceLangId == azlang',
          group: 'navigation@10'
        }],
        'editor/context': [{
          command: 'azlang.runFile',
          when: 'resourceLangId == azlang',
          group: 'azlang@1'
        }, {
          command: 'azlang.runSelection',
          when: 'editorHasSelection && resourceLangId == azlang',
          group: 'azlang@2'
        }],
        commandPalette: [
          { command: 'azlang.runFile' },
          { command: 'azlang.runSelection' },
          { command: 'azlang.openStudio' },
          { command: 'azlang.openDocs' }
        ]
      },
      configuration: {
        title: 'AzLang',
        properties: {
          'azlang.executablePath': {
            type: 'string',
            default: 'azlang',
            description: 'Path to the azlang executable. The default uses the installed command from PATH.'
          },
          'azlang.studioUrl': {
            type: 'string',
            default: 'https://thegreatazizi.github.io/AzLang/ide.html',
            description: 'URL opened by the "AzLang: Open AzLang Studio" command.'
          },
          'azlang.docsUrl': {
            type: 'string',
            default: 'https://thegreatazizi.github.io/AzLang/docs.html',
            description: 'URL opened by the "AzLang: Open Documentation" command.'
          }
        }
      }
    }
  };
  fs.writeFileSync(path.join(extensionDir, 'package.json'), JSON.stringify(extensionManifest, null, 2) + '\n', 'utf8');

  const vsixManifest = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">',
    '  <Metadata>',
    '    <Identity Language="en-US" Id="azlang" Version="' + version + '" Publisher="thegreatazizi" />',
    '    <DisplayName>AzLang</DisplayName>',
    '    <Description xml:space="preserve">AzLang language support: syntax highlighting, snippets, and Run commands.</Description>',
    '    <Categories>Programming Languages,Snippets</Categories>',
    '    <GalleryFlags>Public</GalleryFlags>',
    '    <Icon>extension/icon.png</Icon>',
    '    <Properties>',
    '      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.75.0" />',
    '      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />',
    '      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />',
    '      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="en-US" />',
    '      <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="https://github.com/TheGreatAzizi/AzLang" />',
    '    </Properties>',
    '    <License>extension/LICENSE.txt</License>',
    '  </Metadata>',
    '  <Installation>',
    '    <InstallationTarget Id="Microsoft.VisualStudio.Code" />',
    '  </Installation>',
    '  <Dependencies />',
    '  <Assets>',
    '    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />',
    '    <Asset Type="Microsoft.VisualStudio.Code.Readme" Path="extension/README.md" Addressable="true" />',
    '    <Asset Type="Microsoft.VisualStudio.Code.Changelog" Path="extension/CHANGELOG.md" Addressable="true" />',
    '    <Asset Type="Microsoft.VisualStudio.Code.License" Path="extension/LICENSE.txt" Addressable="true" />',
    '  </Assets>',
    '</PackageManifest>',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(vsixStage, 'extension.vsixmanifest'), vsixManifest, 'utf8');

  const contentTypes = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '  <Default Extension="json" ContentType="application/json" />',
    '  <Default Extension="vsixmanifest" ContentType="text/xml" />',
    '  <Default Extension="md" ContentType="text/markdown" />',
    '  <Default Extension="txt" ContentType="text/plain" />',
    '  <Default Extension="js" ContentType="application/javascript" />',
    '  <Default Extension="png" ContentType="image/png" />',
    '  <Default Extension="tmLanguage" ContentType="text/xml" />',
    '  <Default Extension="xml" ContentType="text/xml" />',
    '</Types>',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(vsixStage, '[Content_Types].xml'), contentTypes, 'utf8');

  const vsixName = 'azlang-' + version + '.vsix';
  const vsixPath = path.join(distDir, vsixName);
  const vsixEntries = zip.addDirectory([], vsixStage, '', (name) => {
    const base = path.basename(name).toLowerCase();
    return base !== '.ds_store' && base !== 'thumbs.db';
  });
  // Ensure the OPC package marker is present even on unusual filesystems.
  if (!vsixEntries.some((entry) => entry.name === '[Content_Types].xml')) {
    fail('VSIX is missing [Content_Types].xml');
  }
  zip.writeZip(vsixPath, vsixEntries);

  console.log('\n[6/6] Writing checksums');
  copyFile(path.join(root, 'azlang.js'), path.join(distDir, 'azlang.js'));

  const assets = fs.readdirSync(distDir)
    .filter((name) => name !== 'SHA256SUMS.txt')
    .sort((a, b) => a.localeCompare(b));
  const checksums = assets.map((name) => sha256(path.join(distDir, name)) + '  ' + name).join('\n') + '\n';
  fs.writeFileSync(path.join(distDir, 'SHA256SUMS.txt'), checksums, 'utf8');

  console.log('\nRelease artifacts in dist/');
  const all = fs.readdirSync(distDir).sort((a, b) => a.localeCompare(b));
  for (const name of all) {
    console.log('  ' + name.padEnd(48) + formatSize(fs.statSync(path.join(distDir, name)).size));
  }
  console.log('\nSHA256SUMS.txt contains ' + assets.length + ' checksums.');
}

main();
