# AzLang 2.1.0

AzLang is a friendly, Python-like language with classes, inheritance, exceptions,
pattern matching, closures, async/await, modules, HTTP and GraphQL, JSON, and more
than 130 built-in functions. The runtime is a single dependency-free JavaScript
file for Node.js and the browser.

This release turns AzLang into a networked language and replaces the desktop IDE
executable with AzLang Studio, a browser application served by a small local
Node.js process.

## Highlights

- **Async/await and promises** — `async fun`, async lambdas, async methods,
  `await`, `Promise.all`, `Promise.race`, `Promise.all_settled`,
  `Promise.resolve`, `Promise.reject`, `sleep`, and `retry`.
- **HTTP and HTTPS** — global helpers and a built-in `net` library, with headers,
  query parameters, JSON bodies, redirects, timeouts, response-size limits, and
  structured errors.
- **GraphQL** — `graphql(url, query, variables?, options?)` checks the HTTP
  status and raises GraphQL errors with every error in `err.errors`.
- **Modules** — `import`, namespace and named imports, `export`, default exports,
  caching, relative resolution, and remote module URLs.
- **Null-safe data** — `get_path`, `has_path`, `coalesce`, `fallback`, type
  predicates, and `ensure_map` / `ensure_list` for incomplete API responses.
- **More standard library** — padding, truncation, URL/base64 encoding, HTML
  escaping, chunking, set operations, grouping, indexing, and aggregation.
- **Resource limits** — execution time, request count, response size, and
  per-request time, configurable from the CLI and embedding API.
- **Browser-based Studio** — the installable IDE is now an ordinary web page
  hosted by `studio-server.js`; the separate desktop executable is gone.

## Download

| File | What it is |
| --- | --- |
| `AzLang-2.1.0-Setup.exe` | Recommended Windows installer. Installs the `azlang` command, the browser Studio, documentation, examples, a bundled Node.js runtime, PATH support, `.az` association, and shortcuts. No administrator rights required. |
| `AzLang-2.1.0-windows-x64-portable.zip` | Portable build. Unzip anywhere and run `studio\AzLang Studio.vbs` or `bin\azlang.exe`. |
| `azlang-2.1.0.vsix` | VS Code extension for VS Code, Cursor, Windsurf, and VSCodium. |
| `AzLang-2.1.0-editors.zip` | TextMate, Sublime Text, Vim, Neovim, and JetBrains integrations. |
| `azlang.js` | Standalone runtime for Node.js and the browser. |
| `SHA256SUMS.txt` | SHA-256 checksums for every file above. |

## Install on Windows

1. Download `AzLang-2.1.0-Setup.exe`.
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
`http://127.0.0.1:4173/ide.html`. The Studio includes an explorer, tabs, syntax
highlighting, examples, output and problems panels, a terminal, command palette,
search, a minimap, and autosave. When the last Studio tab closes, the server exits
after ten minutes without a heartbeat.

The same page is available online at
<https://thegreatazizi.github.io/AzLang/ide.html> with no installation. For a
source checkout, run `node studio-server.js` or `IDE.bat`.

## Command line

Programs now run asynchronously, so top-level `await` works in scripts:

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

## Editors and IDEs

Install the VSIX from the command line:

```bash
code --install-extension azlang-2.1.0.vsix
```

Or open the Extensions view, choose **Views and More Actions... > Install from
VSIX...**, and select the file. The extension works in VS Code 1.75 and newer,
Cursor, Windsurf, and VSCodium. It provides syntax highlighting for async,
modules, and the expanded standard library, snippets, **AzLang: Run File** and
**AzLang: Run Selection** commands, and keyboard shortcuts:

- <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>R</kbd> — run the active file
- <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> — run the selection

TextMate, Sublime Text, Vim, Neovim, and JetBrains instructions are in
`AzLang-2.1.0-editors.zip` and in the
[editors folder](https://github.com/TheGreatAzizi/AzLang/tree/main/editors).

## Documentation

The complete English guide is at
<https://thegreatazizi.github.io/AzLang/docs.html> and in the installed
`studio\docs.html` file. It now covers async, modules, networking, null-safe data,
API errors, resource limits, and the updated embedding API.

## Checksums

Verify a download on Windows:

```powershell
Get-FileHash .\AzLang-2.1.0-Setup.exe -Algorithm SHA256
```

Compare the result with the matching line in `SHA256SUMS.txt`.

AzLang is MIT licensed. It has no telemetry. Network requests happen only when an
AzLang program explicitly makes them.
