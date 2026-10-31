# Editor and IDE support for AzLang

AzLang ships language support for popular editors. All integrations are
dependency-free and use the same language rules as the interpreter.

| Editor | Folder | What you get |
| --- | --- | --- |
| VS Code, Cursor, Windsurf, VSCodium | [`vscode/`](vscode/) | Extension with syntax highlighting, snippets, Run commands, and a status bar action. Packaged as a VSIX in every release. |
| TextMate | [`textmate/`](textmate/) | `AzLang.tmBundle` with syntax highlighting and `#` comments. |
| Sublime Text | [`sublime/`](sublime/) | `.sublime-syntax`, completions, and a build-system example. |
| Vim and Neovim | [`vim/`](vim/) | Syntax highlighting, filetype detection, and filetype settings. |
| JetBrains IDEs | [`jetbrains/`](jetbrains/) | Instructions for importing the TextMate bundle and running files. |

## Quick install

### VS Code and compatible editors

Download `azlang-2.1.0.vsix` from the
[latest release](https://github.com/TheGreatAzizi/AzLang/releases/latest), then:

```sh
code --install-extension azlang-2.1.0.vsix
```

Or open the Extensions view, choose **Views and More Actions... > Install from
VSIX...**, and select the file.

### TextMate

Open **Bundles > Edit Bundles...**, choose **File > Add Bundle...**, and select
`textmate/AzLang.tmBundle`.

### Sublime Text

Copy `sublime/AzLang.sublime-syntax` and
`sublime/AzLang.sublime-completions` into a folder named `AzLang` under
**Preferences > Browse Packages...**.

### Vim and Neovim

Add `editors/vim` to your runtime path, or copy its folders into your Vim or
Neovim configuration directory. See [`vim/README.md`](vim/README.md) for
plugin-manager examples.

### JetBrains IDEs

Install the **TextMate Bundles** plugin, then add
`textmate/AzLang.tmBundle` under **Editor > TextMate Bundles**. See
[`jetbrains/README.md`](jetbrains/README.md) for run-configuration steps.

## Run command

The VS Code extension and the examples above call the installed `azlang`
command:

```sh
azlang program.az
```

Install AzLang for Windows from the latest release to get the command, a
bundled Node.js runtime, and AzLang Studio. The browser Studio at
<https://thegreatazizi.github.io/AzLang/ide.html> needs no installation.

## Grammar maintenance

`vscode/syntaxes/AzLang.tmLanguage` is the canonical TextMate grammar. The copy
in `textmate/AzLang.tmBundle/Syntaxes/` must stay identical. The Sublime and Vim
integrations mirror the same keyword and built-in lists; update them together
when the language changes.
