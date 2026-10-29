# AzLang for VS Code

Language support for [AzLang](https://thegreatazizi.github.io/AzLang/), a friendly,
Python-like language with classes, lambdas, exceptions, pattern matching, and a
zero-dependency runtime.

Works in VS Code, Cursor, Windsurf, VSCodium, and other VS Code-compatible editors.

## Features

- Syntax highlighting for keywords, classes, functions, strings, interpolation,
  numbers, built-ins, comments, and Unicode identifiers.
- Smart indentation and folding for AzLang blocks that close with `end`.
- Snippets for functions, classes, loops, `try`/`catch`, `match`, and complete programs.
- **AzLang: Run File** — runs the active file in an integrated terminal.
- **AzLang: Run Selection** — runs only the selected code.
- **AzLang: Open AzLang Studio** and **AzLang: Open Documentation** commands.
- A status bar Run button shown while editing `.az` files.

## Requirements

Install AzLang for Windows so the `azlang` command is available, or point the
extension at an executable:

```json
{
  "azlang.executablePath": "C:\\Users\\you\\AppData\\Local\\Programs\\AzLang\\bin\\azlang.exe"
}
```

The browser Studio requires no installation:
<https://thegreatazizi.github.io/AzLang/ide.html>

## Usage

1. Open a folder containing `.az` files.
2. Open a file and click the play button in the editor title bar, or use the
   **AzLang: Run File** command.
3. Press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>R</kbd> to run the current file.
4. Select code and press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>
   to run the selection.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `azlang.executablePath` | `azlang` | The command or full path used to run programs. |
| `azlang.studioUrl` | GitHub Pages Studio | URL opened by **Open AzLang Studio**. |
| `azlang.docsUrl` | GitHub Pages docs | URL opened by **Open Documentation**. |

## Snippets

| Prefix | Inserts |
| --- | --- |
| `fun` | Function definition |
| `if` | If / else block |
| `for` | For loop |
| `while` | While loop |
| `repeat` | Repeat block |
| `class` | Class with a constructor and method |
| `try` | Try / catch block |
| `match` | Match block |
| `sayf` | `say` with string interpolation |
| `azmain` | Complete starter program |

## Other editors

The AzLang repository includes TextMate, Sublime Text, Vim, and Neovim syntax
files in the `editors/` folder, plus instructions for JetBrains IDEs.

## License

MIT. See `LICENSE.txt`.
