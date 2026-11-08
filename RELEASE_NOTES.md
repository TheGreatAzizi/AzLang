# AzLang 2.1.1

AzLang 2.1.1 is a small patch release for the browser Studio. The language,
runtime, CLI, and editor integrations are unchanged from 2.1.0.

## Fixed

- The hosted Studio no longer sends heartbeat requests when it is served from a
  static host such as GitHub Pages. Those requests produced a 404 in the browser
  console every minute.
- The installed and portable Studio still use the heartbeat, so the local server
  can stop after the last tab closes.
- The heartbeat guard recognizes IPv4 loopback, `localhost`, and IPv6 loopback
  addresses.

Existing 2.1.0 installations can install 2.1.1 over the top. Settings and
autosaved Studio code are kept.

## Download

| File | What it is |
| --- | --- |
| `AzLang-2.1.1-Setup.exe` | Recommended Windows installer. Installs the `azlang` command, the browser Studio, documentation, examples, a bundled Node.js runtime, PATH support, `.az` association, and shortcuts. No administrator rights required. |
| `AzLang-2.1.1-windows-x64-portable.zip` | Portable build. Unzip anywhere and run `studio\AzLang Studio.vbs` or `bin\azlang.exe`. |
| `azlang-2.1.1.vsix` | VS Code extension for VS Code, Cursor, Windsurf, and VSCodium. |
| `AzLang-2.1.1-editors.zip` | TextMate, Sublime Text, Vim, Neovim, and JetBrains integrations. |
| `azlang.js` | Standalone runtime for Node.js and the browser. |
| `SHA256SUMS.txt` | SHA-256 checksums for every file above. |

## Install on Windows

1. Download `AzLang-2.1.1-Setup.exe`.
2. Run it and choose **Install**. The default location is
   `%LOCALAPPDATA%\Programs\AzLang`.
3. Open a new terminal and run:

   ```powershell
   azlang --version
   azlang examples\hello.az
   azlang examples\modules.az
   azlang examples\network.az
   ```

Open **AzLang Studio** from the Start Menu or the desktop shortcut. The shortcut
starts a local server with the bundled runtime and opens your default browser at
`http://127.0.0.1:4173/ide.html`. When the last Studio tab closes, the server
exits after ten minutes without a heartbeat.

The same page is available online at
<https://thegreatazizi.github.io/AzLang/ide.html> with no installation. For a
source checkout, run `node studio-server.js` or `IDE.bat`.

## Command line

Programs run asynchronously, so top-level `await` works in scripts:

```powershell
azlang examples/network.az
azlang --timeout 10000 --max-requests 20 examples/network.az
azlang --request-timeout 5000 --max-response 1048576 examples/network.az
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--timeout <ms>` | 60000 | Total execution time; `0` disables it |
| `--request-timeout <ms>` | 30000 | Time per HTTP request; `0` disables it |
| `--max-requests <n>` | 100 | HTTP requests per run; `0` disables it |
| `--max-response <bytes>` | 5242880 | Response body size; `0` disables it |

The synchronous `az.run` embedding API still works for programs without
`await`. Use `az.runAsync` and `session.executeAsync` for async code.

## Verification

- All 167 automated tests pass on Node.js 22 in CI and in the release build.
- The installer, portable ZIP, VSIX, and editor archive are built from the same
  tagged commit and listed in `SHA256SUMS.txt`.
- The hosted Studio is checked without heartbeat errors.

## Editors and IDEs

Install the VSIX from the command line:

```bash
code --install-extension azlang-2.1.1.vsix
```

Or open the Extensions view, choose **Views and More Actions... > Install from
VSIX...**, and select the file. The extension works in VS Code 1.75 and newer,
Cursor, Windsurf, and VSCodium. It provides syntax highlighting for async,
modules, and the expanded standard library, snippets, **AzLang: Run File** and
**AzLang: Run Selection** commands, and keyboard shortcuts:

- <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>R</kbd> — run the active file
- <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> — run the selection

TextMate, Sublime Text, Vim, Neovim, and JetBrains instructions are in
`AzLang-2.1.1-editors.zip` and in the
[editors folder](https://github.com/TheGreatAzizi/AzLang/tree/main/editors).

## Documentation and 2.1.0 features

The complete English guide is at
<https://thegreatazizi.github.io/AzLang/docs.html> and in the installed
`studio\docs.html` file. It covers async, modules, networking, null-safe data,
API errors, resource limits, and the embedding API.

The 2.1.0 release introduced async/await and promises, HTTP/HTTPS and GraphQL,
modules, null-safe data helpers, the expanded standard library, resource limits,
and the browser-based Studio. See the
[2.1.0 release](https://github.com/TheGreatAzizi/AzLang/releases/tag/v2.1.0)
for the full feature announcement.

## Checksums

Verify a download on Windows:

```powershell
Get-FileHash .\AzLang-2.1.1-Setup.exe -Algorithm SHA256
```

Compare the result with the matching line in `SHA256SUMS.txt`.

AzLang is MIT licensed. It has no telemetry. Network requests happen only when an
AzLang program explicitly makes them.
