# AzLang

**A small language with serious features.**

AzLang is a friendly, Python-like programming language designed for people who want to learn the real ideas of programming without the ceremony. It has variables, collections, functions, closures, classes, inheritance, exceptions, pattern matching, JSON, and more than seventy built-in functions — all in a single dependency-free JavaScript file that runs in Node.js and in any modern browser.

- **Website:** <https://thegreatazizi.github.io/AzLang/>
- **Studio (browser IDE):** <https://thegreatazizi.github.io/AzLang/ide.html>
- **Documentation:** <https://thegreatazizi.github.io/AzLang/docs.html>

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

Requires Node.js 18 or newer. There are no npm packages.

```bash
node azlang.js examples/hello.az
```

Start the interactive shell:

```bash
node azlang.js
```

Run a snippet:

```bash
node azlang.js -e "say 6 * 7"
```

Check syntax without running anything:

```bash
node azlang.js --check examples/tour.az
```

### From Windows Explorer

- Double-click `IDE.bat` to open the Studio.
- Drag a `.az` file onto `azlang.bat` to run it.

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

| Command | What it does |
| --- | --- |
| `node azlang.js file.az` | Run a program. Exit code is `0` on success and `1` on error. |
| `node azlang.js` | Start the interactive shell (REPL). Variables persist between lines. |
| `node azlang.js -e "code"` | Run a snippet directly. |
| `node azlang.js --check file.az` | Parse a file and report syntax errors without running it. |
| `node azlang.js -h` | Show help. |
| `node azlang.js -v` | Print the version. |

Set `AZLANG_VERBOSE=1` to print timing and interpreter step counts after a run.

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
| `server.js` | Optional local static server. |
| `.github/workflows/pages.yml` | Tests, rebuilds, and deploys the site to GitHub Pages. |
| `azlang.bat`, `IDE.bat` | Windows shortcuts for the CLI and the Studio. |

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

This repository is ready for GitHub Pages. The workflow in `.github/workflows/pages.yml`:

1. runs the test suite,
2. regenerates `examples.js` and the landing page from `site/site.az`,
3. assembles the deployable site in `_site/` and uploads it as a Pages artifact,
4. deploys it with the official GitHub Pages actions.

If Pages is not enabled yet, the workflow asks GitHub to enable it. You can also open **Settings → Pages** in the repository and choose **GitHub Actions** as the source. After the first successful workflow run the site is available at <https://thegreatazizi.github.io/AzLang/>.

## License

MIT. See [LICENSE](LICENSE).
