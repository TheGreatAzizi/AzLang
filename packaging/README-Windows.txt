AzLang {{VERSION}} for Windows ({{ARCH}})
==========================================

AzLang is a friendly, Python-like language with classes, lambdas, exceptions,
pattern matching, and a zero-dependency runtime. This package includes its own
Node.js runtime, so nothing else needs to be installed.

QUICK START
-----------

1. Open "AzLang Studio" from the Start Menu (installed copy), or run
   bin\AzLangStudio.exe (portable copy).
2. Write a program and press Ctrl+Enter.
3. Or open a new terminal and run:

       azlang --version
       azlang examples\hello.az

COMMAND LINE
------------

    azlang <file.az>       run a program
    azlang                 start the interactive shell
    azlang -e "<code>"     run a snippet
    azlang --check <file>  parse a file without running it
    azlang -h              show help

The installed copy adds its bin folder to your user PATH. Open a new terminal
after installing so the change is visible.

AZLANG STUDIO
-------------

AzLang Studio is the included editor: explorer, tabs, syntax highlighting,
examples, output and problems panels, a terminal, a command palette, search,
minimap, and autosave. It uses an Edge or Chrome app window when available and
falls back to your default browser. Everything runs locally.

INSTALL LOCATION
----------------

The default installed location is:

    %LOCALAPPDATA%\Programs\AzLang

UNINSTALL
---------

Use Settings > Apps > AzLang > Uninstall, or run uninstall.exe in the AzLang
folder. Your autosaved Studio code is kept.

EDITOR SUPPORT
--------------

The release includes a VS Code extension (VSIX) with syntax highlighting,
snippets, and Run commands. VS Code, Cursor, Windsurf, and VSCodium can install
it with:

    code --install-extension azlang-{{VERSION}}.vsix

TextMate, Sublime Text, Vim, and Neovim syntax files are in the editors folder
of this package and of the repository:

    https://github.com/TheGreatAzizi/AzLang/tree/main/editors

DOCUMENTATION
-------------

Open studio\docs.html, the Start Menu documentation shortcut, or:

    https://thegreatazizi.github.io/AzLang/docs.html

AzLang is MIT licensed. It has no telemetry and never sends your code anywhere.
