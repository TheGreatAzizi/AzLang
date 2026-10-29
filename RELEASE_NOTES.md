# AzLang 2.0.0

AzLang 2.0 is a friendly, Python-like language with classes, inheritance,
exceptions, pattern matching, closures, JSON, and more than seventy built-in
functions. The runtime is a single dependency-free JavaScript file.

This release adds a real Windows installation, an installable desktop Studio,
editor integrations, and automated builds.

## Download

| File | What it is |
| --- | --- |
| `AzLang-2.0.0-Setup.exe` | Recommended Windows installer. Installs the `azlang` command, AzLang Studio, the documentation, examples, a bundled Node.js runtime, PATH support, `.az` file association, and shortcuts. No administrator rights required. |
| `AzLang-2.0.0-windows-x64-portable.zip` | Portable build. Unzip anywhere and run `bin\AzLangStudio.exe` or `bin\azlang.exe`. |
| `azlang-2.0.0.vsix` | VS Code extension for VS Code, Cursor, Windsurf, and VSCodium. |
| `AzLang-2.0.0-editors.zip` | TextMate, Sublime Text, Vim, Neovim, and JetBrains integrations. |
| `azlang.js` | Standalone runtime for Node.js and the browser. |
| `SHA256SUMS.txt` | SHA-256 checksums for every file above. |

## Install on Windows

1. Download `AzLang-2.0.0-Setup.exe`.
2. Run it and choose **Install**. The default location is
   `%LOCALAPPDATA%\Programs\AzLang`.
3. Open a new terminal and run:

   ```powershell
   azlang --version
   azlang examples\hello.az
   ```

Open **AzLang Studio** from the Start Menu or the desktop shortcut. The Studio
includes an explorer, tabs, syntax highlighting, examples, output and problems
panels, a terminal, a command palette, search, a minimap, and autosave.

To remove AzLang, use **Settings > Apps > AzLang > Uninstall** or run
`uninstall.exe` in the installation folder. Uninstalling keeps your autosaved
Studio code.

## Editors and IDEs

Install the VSIX from the command line:

```bash
code --install-extension azlang-2.0.0.vsix
```

Or open the Extensions view, choose **Views and More Actions... > Install from
VSIX...**, and select the file. The extension works in VS Code 1.75 and newer,
Cursor, Windsurf, and VSCodium. It provides syntax highlighting, snippets,
**AzLang: Run File** and **AzLang: Run Selection** commands, and keyboard
shortcuts:

- <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>R</kbd> — run the active file
- <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> — run the selection

TextMate, Sublime Text, Vim, Neovim, and JetBrains instructions are in
`AzLang-2.0.0-editors.zip` and in the
[editors folder](https://github.com/TheGreatAzizi/AzLang/tree/main/editors).

## Browser Studio

The Studio also runs without installation:
<https://thegreatazizi.github.io/AzLang/ide.html>

## Documentation

The complete English guide is at
<https://thegreatazizi.github.io/AzLang/docs.html> and in the installed
`studio\docs.html` file.

## Checksums

Verify a download on Windows:

```powershell
Get-FileHash .\AzLang-2.0.0-Setup.exe -Algorithm SHA256
```

Compare the result with the matching line in `SHA256SUMS.txt`.

AzLang is MIT licensed. It has no telemetry and never sends your code anywhere.
