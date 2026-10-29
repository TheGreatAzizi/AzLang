# Sublime Text

`AzLang.sublime-syntax` provides syntax highlighting for `.az` files.
`AzLang.sublime-completions` adds keyword and snippet completions.

## Install

1. In Sublime Text choose **Preferences > Browse Packages...**.
2. Create a folder named `AzLang`.
3. Copy `AzLang.sublime-syntax` and `AzLang.sublime-completions` into it.
4. Restart Sublime Text or run **Tools > Developer > Reload Syntaxes**.

Sublime Text 3 (build 3143 or newer) and Sublime Text 4 are supported. To run a
program, use **Tools > Build System > New Build System...** with:

```json
{
  "cmd": ["azlang", "$file"],
  "selector": "source.azlang",
  "file_regex": "^(.*?):(\\d+):(\\d+): (.*)$"
}
```

Save it as `AzLang.sublime-build` in the `AzLang` package folder, then press
<kbd>Ctrl</kbd> + <kbd>B</kbd> to run the active file.
