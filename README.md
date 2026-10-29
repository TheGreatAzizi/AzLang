# AzLang

**A small language with serious features.**

AzLang is a friendly, Python-like programming language designed for people who want to learn the real ideas of programming without the ceremony. It has variables, collections, functions, closures, classes, inheritance, exceptions, pattern matching, JSON, and more than seventy built-in functions — all in a single dependency-free JavaScript file that runs in Node.js and in any modern browser.

- **Website:** <https://thegreatazizi.github.io/AzLang/>
- **Studio (browser IDE):** <https://thegreatazizi.github.io/AzLang/ide.html>
- **Documentation:** <https://thegreatazizi.github.io/AzLang/docs.html>
- **Downloads:** <https://github.com/TheGreatAzizi/AzLang/releases/latest>
- **Editor support:** [editors/](editors/)

```az
class Greeter
  fun init(name)
    this.name = name
  end

  fun greet()
    return "Hello, {this.name}!"
  end
end

for name in ["Ada", "Grace", "Linus"]
  say new Greeter(name).greet()
end
```

```
Hello, Ada!
Hello, Grace!
Hello, Linus!
```

## Install

### Windows installer (recommended)

Download `AzLang-2.0.0-Setup.exe` from the
[latest release](https://github.com/TheGreatAzizi/AzLang/releases/latest) and run
it. Setup installs for the current user, so no administrator rights are required.

The installer adds:

- `azlang.exe` on your user `PATH`, so the command works in any new terminal.
- AzLang Studio, with Start Menu and desktop shortcuts.
- The documentation, all eight examples, and a bundled Node.js runtime.
- A `.az` file association and an entry in **Settings > Apps > Uninstall**.

The default location is `%LOCALAPPDATA%\Programs\AzLang`. Uninstall from
**Settings > Apps > AzLang**, or run `uninstall.exe` in that folder. Your
autosaved Studio code is kept.

### Portable ZIP

Download `AzLang-2.0.0-windows-x64-portable.zip`, unzip it anywhere, and run
`bin\AzLangStudio.exe` or `bin\azlang.exe`. It does not change PATH, file
associations, or the registry.

Every release also includes `SHA256SUMS.txt`. Verify a download with:

```powershell
Get-FileHash .\AzLang-2.0.0-Setup.exe -Algorithm SHA256
```

### Browser

Open the [AzLang Studio](https://thegreatazizi.github.io/AzLang/ide.html) and
press <kbd>Ctrl</kbd> + <kbd>Enter</kbd>. No installation and no Node.js
required.

### Manual

For another platform or a source checkout, install Node.js 18 or newer and run:

```bash
node azlang.js examples/hello.az
```

## Why AzLang

- **Learnable in an afternoon.** One keyword per idea, blocks that close with `end`, no semicolons, no braces around blocks.
- **Modern where it matters.** Classes, inheritance, `super`, closures, default parameters, arrow lambdas, destructuring loops, and pattern matching.
- **Batteries included.** Strings, lists, maps, math, sorting, higher-order helpers, random numbers, and JSON.
- **Errors that teach.** Plain-English messages with line numbers, hints, and “did you mean?” suggestions.
- **Truly portable.** No packages, no build step, no network access. A text editor and Node.js — or just a browser.
- **Unicode by design.** Persian text, identifiers, and digits work naturally alongside English.

## Quick start

### In the browser

Open the [AzLang Studio](https://thegreatazizi.github.io/AzLang/ide.html), write a program, and press <kbd>Ctrl</kbd> + <kbd>Enter</kbd>. Nothing to install.

### From the command line

After installing on Windows, use the `azlang` command in a new terminal:

```bash
azlang examples\hello.az
azlang
azlang -e "say 6 * 7"
azlang --check examples\tour.az
```

From a source checkout, use `node azlang.js` instead. Node.js 18 or newer is
required, and there are no npm packages.

```bash
node azlang.js examples/hello.az
```

### From Windows Explorer

- Installed: double-click any `.az` file, or open **AzLang Studio** from the
  Start Menu or desktop.
- Source checkout: double-click `IDE.bat` to open the Studio, or drag a `.az`
  file onto `azlang.bat` to run it.

### Preview the website locally

```bash
node server.js
```

Then open <http://127.0.0.1:4173>.

## Language tour

```az
# Variables and output
let name = "Ada"
const MAX_SCORE = 100

say "Hello, {name}!"

# Conditions
let score = 87

if score >= 90
  say "Excellent"
elif score >= 80
  say "Very good"
else
  say "Keep practicing"
end

# Loops and collections
let numbers = range(1, 6)
let squares = map(numbers, n => n * n)

for index, value in enumerate(squares)
  say "{index}: {value}"
end

# Functions and closures
fun make_counter()
  let count = 0

  fun next()
    count += 1
    return count
  end

  return next
end

let tick = make_counter()
say tick()
say tick()

# Classes and inheritance
class Animal
  fun init(name, sound)
    this.name = name
    this.sound = sound
  end

  fun speak()
    return "{this.name} says {this.sound}"
  end
end

class Dog extends Animal
  fun init(name)
    super(name, "woof")
  end
end

say new Dog("Rex").speak()

# Exceptions
try
  throw {message: "Out of stock", code: 404}
catch problem
  say "Error {problem.code}: {problem.message}"
end

# Pattern matching
fun describe(value)
  match type(value)
    case "number"
      return "a number"
    case "string"
      return "text with {len(value)} characters"
    case _
      return "something else"
  end
end

say describe(42)
say describe("AzLang")

# JSON
let user = json_decode(r'{"name": "Ada", "tags": ["math", "logic"]}')
say user.name
```

## Command line

The installed `azlang` command and `node azlang.js` from a checkout accept the
same arguments.

| Command | What it does |
| --- | --- |
| `azlang file.az` | Run a program. Exit code is `0` on success and `1` on error. |
| `azlang` | Start the interactive shell (REPL). Variables persist between lines. |
| `azlang -e "code"` | Run a snippet directly. |
| `azlang --check file.az` | Parse a file and report syntax errors without running it. |
| `azlang -h` | Show help. |
| `azlang -v` | Print the version. |

From a source checkout, replace `azlang` with `node azlang.js`. Set
`AZLANG_VERBOSE=1` to print timing and interpreter step counts after a run.

## Editors and IDEs

Every release includes language support for the editors people already use.
All integrations are dependency-free and share the same grammar.

| Editor | What you get |
| --- | --- |
| VS Code, Cursor, Windsurf, VSCodium | VSIX extension with syntax highlighting, snippets, Run commands, status bar action, and shortcuts. |
| TextMate | `AzLang.tmBundle` with syntax highlighting and `#` comments. |
| Sublime Text | `.sublime-syntax`, completions, and a build-system example. |
| Vim and Neovim | Syntax highlighting, filetype detection, and filetype settings. |
| JetBrains IDEs | Instructions for importing the TextMate bundle and running files. |

Install the VS Code extension from the latest release:

```bash
code --install-extension azlang-2.0.0.vsix
```

The extension provides **AzLang: Run File** (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> +
<kbd>R</kbd>) and **AzLang: Run Selection** (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> +
<kbd>Shift</kbd> + <kbd>R</kbd>). See [editors/README.md](editors/README.md) for
TextMate, Sublime Text, Vim, Neovim, and JetBrains setup.

## Project structure

| File | Purpose |
| --- | --- |
| `azlang.js` | The complete language: lexer, parser, interpreter, built-ins, and CLI. |
| `index.html` | Landing page. **Generated from `site/site.az`.** |
| `site/site.az` | The AzLang program that writes the landing page. |
| `docs.html` | The complete language guide and reference. |
| `ide.html` | AzLang Studio, the browser editor and runner. |
| `404.html` | Friendly not-found page for GitHub Pages. |
| `examples/` | Eight complete example programs. |
| `examples.js` | Generated bundle of the examples used by the Studio. |
| `tests.js` | 131 automated tests. |
| `assets/site.css` | Styles for the landing page. |
| `assets/site.js` | Interactive behavior for the landing page. |
| `build-site.js` | Runs `site/site.az` and writes `index.html`. |
| `build-examples.js` | Regenerates `examples.js` from `examples/`. |
| `build-pages.js` | Assembles the deployable site in `_site/`. |
| `build-release.js` | Builds the Windows Setup, portable ZIP, editors ZIP, VSIX, and checksums. |
| `packaging/` | C# launchers, installer, uninstaller, icon, and release helpers. |
| `editors/` | VS Code, TextMate, Sublime Text, Vim, Neovim, and JetBrains integrations. |
| `server.js` | Optional local static server. |
| `.github/workflows/pages.yml` | Tests, rebuilds, and deploys the site to GitHub Pages. |
| `.github/workflows/release.yml` | Builds and publishes GitHub Releases when a `v*` tag is pushed. |
| `RELEASE_NOTES.md` | Release body published by the workflow. |
| `azlang.bat`, `IDE.bat` | Windows shortcuts for a source checkout. |

## Building

The landing page is written in AzLang. To regenerate it after editing `site/site.az` or the assets:

```bash
node build-site.js
```

To refresh the Studio's example bundle after editing a program in `examples/`:

```bash
node build-examples.js
```

To assemble the exact static site that GitHub Pages deploys:

```bash
node build-pages.js
```

The result is written to `_site/`. It is ignored by Git; the workflow builds it from source on every push.

## Building the Windows release

The release build is dependency-free: it uses the installed `node` and the
.NET Framework `csc.exe` that ships with Windows, plus a custom ZIP writer.

```bash
node build-release.js
```

It validates the version, compiles the launchers, installer, and uninstaller,
stages the language runtime, Studio, docs, examples, and editors, and writes
these files to `dist/`:

| File | What it is |
| --- | --- |
| `AzLang-2.0.0-Setup.exe` | Per-user Windows installer with a bundled Node.js runtime. |
| `AzLang-2.0.0-windows-x64-portable.zip` | Portable build; unzip and run. |
| `AzLang-2.0.0-editors.zip` | TextMate, Sublime Text, Vim, Neovim, and JetBrains files. |
| `azlang-2.0.0.vsix` | VS Code extension. |
| `azlang.js` | Standalone runtime. |
| `SHA256SUMS.txt` | SHA-256 checksums for every artifact. |

Pass `--expect-tag v2.0.0` to fail the build when the tag does not match the
version in `azlang.js`. The release workflow uses this check.

## Tests

```bash
node tests.js
```

The suite covers the lexer, parser, evaluator, collections, classes, exceptions, pattern matching, JSON, error messages, and the session API. All 131 tests pass.

## Embedding

`azlang.js` is a UMD-style module. In Node:

```js
const az = require('./azlang.js');

const result = az.run('say "Hello from embedded AzLang!"', {
  onOutput: (line) => console.log(line),
  ask: (question) => 'Ada',
  maxSteps: 1000000
});

console.log(result.steps, result.ms);
```

To keep variables between calls, use a session:

```js
const session = az.createSession();
session.execute('let total = 0');
session.execute('total += 42');
session.execute('say total');
```

In the browser, load `azlang.js` with a `<script>` tag and use `window.AzLang`. See the [embedding guide](https://thegreatazizi.github.io/AzLang/docs.html#embedding) for the full API.

## Unicode and Persian

AzLang is English-first: keywords, diagnostics, documentation, and the interface are all English. The language itself is fully Unicode-aware:

```az
let شهر = "تهران"
say "{شهر} — {۱۲ + ۳}"
```

Persian letters are valid in identifiers, Persian and Arabic-Indic digits are valid in number literals, and strings, interpolation, `len`, indexing, and iteration all operate on Unicode characters.

## GitHub Pages

The site is live at <https://thegreatazizi.github.io/AzLang/>. The workflow in
`.github/workflows/pages.yml` runs on every push to `main`:

1. runs the test suite,
2. regenerates `examples.js` and the landing page from `site/site.az`,
3. assembles the deployable site in `_site/` and uploads it as a Pages artifact,
4. deploys it with the official GitHub Pages actions.

For a fork where Pages is not enabled, open **Settings → Pages** and choose
**GitHub Actions** as the source.

## Releases

Releases are built on Windows by `.github/workflows/release.yml`. Push a tag
that matches the version in `azlang.js`:

```bash
git tag v2.0.0
git push origin v2.0.0
```

The workflow runs the tests, regenerates generated files, builds the artifacts
with `--expect-tag`, verifies every SHA-256 checksum, uploads the build, and
publishes a GitHub Release with the files in `dist/` and the body from
`RELEASE_NOTES.md`. A manual `workflow_dispatch` run builds and uploads the same
artifacts without publishing a release.

## License

MIT. See [LICENSE](LICENSE).
