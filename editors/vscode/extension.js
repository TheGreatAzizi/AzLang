'use strict';

const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');

let terminal = null;
let statusItem = null;
const temporaryDirectories = [];

function configuration() {
  return vscode.workspace.getConfiguration('azlang');
}

function executable() {
  const configured = String(configuration().get('executablePath') || '').trim();
  return configured || 'azlang';
}

function quote(value) {
  if (process.platform === 'win32') {
    return '"' + String(value).replace(/"/g, '""') + '"';
  }
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function shellPrefix() {
  if (process.platform !== 'win32') return '';
  const shell = path.basename(String(vscode.env.shell || '')).toLowerCase();
  if (shell.indexOf('powershell') !== -1 || shell === 'pwsh.exe' || shell === 'pwsh') return '& ';
  return '';
}

function runCommand(file) {
  return shellPrefix() + quote(executable()) + ' ' + quote(file);
}

function workspaceDirectory() {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length) return folders[0].uri.fsPath;
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.scheme === 'file') {
    return path.dirname(editor.document.uri.fsPath);
  }
  return undefined;
}

function getTerminal(cwd) {
  if (terminal === null) {
    terminal = vscode.window.createTerminal({ name: 'AzLang', cwd: cwd });
  }
  terminal.show(true);
  return terminal;
}

function send(command, cwd) {
  const target = getTerminal(cwd);
  try {
    target.sendText(command, true);
  } catch (error) {
    terminal = vscode.window.createTerminal({ name: 'AzLang', cwd: cwd });
    terminal.show(true);
    terminal.sendText(command, true);
  }
}

function temporaryFile(text) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'azlang-'));
  temporaryDirectories.push(directory);
  const file = path.join(directory, 'selection.az');
  fs.writeFileSync(file, text, 'utf8');
  return file;
}

async function preparedFile(document) {
  if (document.uri.scheme === 'file') {
    if (document.isDirty) await document.save();
    return document.uri.fsPath;
  }
  return temporaryFile(document.getText());
}

async function runFile(uri) {
  try {
    let document = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : null;
    if (uri && uri.scheme === 'file') {
      document = await vscode.workspace.openTextDocument(uri);
    }
    if (!document) {
      vscode.window.showWarningMessage('Open an AzLang file first.');
      return;
    }
    const file = await preparedFile(document);
    send(runCommand(file), workspaceDirectory() || path.dirname(file));
    vscode.window.setStatusBarMessage('Running ' + path.basename(file), 2500);
  } catch (error) {
    vscode.window.showErrorMessage('AzLang: ' + (error && error.message ? error.message : String(error)));
  }
}

async function runSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Open an AzLang file first.');
    return;
  }
  if (editor.selection.isEmpty) {
    await runFile(editor.document.uri);
    return;
  }
  try {
    const source = editor.document.getText(editor.selection);
    const file = temporaryFile(source);
    send(runCommand(file), workspaceDirectory() || path.dirname(file));
    vscode.window.setStatusBarMessage('Running selected AzLang code', 2500);
  } catch (error) {
    vscode.window.showErrorMessage('AzLang: ' + (error && error.message ? error.message : String(error)));
  }
}

function openUrl(setting, fallback) {
  const url = String(configuration().get(setting) || fallback);
  vscode.env.openExternal(vscode.Uri.parse(url));
}

function updateStatusItem() {
  if (!statusItem) return;
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.languageId === 'azlang') statusItem.show();
  else statusItem.hide();
}

function activate(context) {
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20);
  statusItem.text = '$(play) AzLang';
  statusItem.tooltip = 'Run the active AzLang file';
  statusItem.command = 'azlang.runFile';
  context.subscriptions.push(statusItem);
  updateStatusItem();

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusItem));
  context.subscriptions.push(vscode.commands.registerCommand('azlang.runFile', runFile));
  context.subscriptions.push(vscode.commands.registerCommand('azlang.runSelection', runSelection));
  context.subscriptions.push(vscode.commands.registerCommand('azlang.openStudio', function () {
    openUrl('studioUrl', 'https://thegreatazizi.github.io/AzLang/ide.html');
  }));
  context.subscriptions.push(vscode.commands.registerCommand('azlang.openDocs', function () {
    openUrl('docsUrl', 'https://thegreatazizi.github.io/AzLang/docs.html');
  }));
}

function deactivate() {
  for (const directory of temporaryDirectories) {
    try {
      fs.rmSync(directory, { recursive: true, force: true });
    } catch (error) {
      // Temporary files are safe to leave behind.
    }
  }
  temporaryDirectories.length = 0;
  if (terminal) {
    terminal.dispose();
    terminal = null;
  }
}

module.exports = { activate, deactivate };
