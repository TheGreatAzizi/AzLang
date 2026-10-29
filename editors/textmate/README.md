# TextMate

The `AzLang.tmBundle` folder is a standard TextMate bundle. It provides syntax
highlighting and the `#` line-comment command for `.az` files.

## Install

1. Open TextMate.
2. Choose **Bundles > Edit Bundles...**.
3. Choose **File > Add Bundle...** and select `AzLang.tmBundle`.
4. Alternatively, copy `AzLang.tmBundle` into
   `~/Library/Application Support/TextMate/Bundles/` and relaunch TextMate.

The grammar is shared with the VS Code extension
(`editors/vscode/syntaxes/AzLang.tmLanguage`). Keep both copies identical when
changing the grammar.

Compatible editors that read TextMate bundles, such as Chime and older
Sublime Text setups, can also import this folder.
