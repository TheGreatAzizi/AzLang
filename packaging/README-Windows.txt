AzLang {{VERSION}} for Windows ({{ARCH}})
==========================================

AzLang is a friendly, Python-like language with classes, lambdas, exceptions,
pattern matching, async/await, modules, HTTP networking, and a zero-dependency
runtime. This package includes its own Node.js runtime, so nothing else needs
to be installed.

QUICK START
-----------

1. Open "AzLang Studio" from the Start Menu (installed copy), or run
   studio\AzLang Studio.vbs (portable copy).
2. Your default browser opens the Studio at http://127.0.0.1:4173/ide.html.
3. Write a program and press Ctrl+Enter.
4. Or open a new terminal and run:

       azlang --version
       azlang examples\hello.az

COMMAND LINE
------------

    azlang <file.az>       run a program
    azlang                 start the interactive shell
    azlang -e "<code>"     run a snippet
    azlang --check <file>  parse a file without running it
    azlang -h              show help

Programs run asynchronously, so async functions, await, Promise, HTTP requests,
and modules work from the command line. Resource limits are configurable:

    --timeout <ms>         execution time limit (default 60000)
    --request-timeout <ms> per-request timeout (default 30000)
    --max-requests <n>     HTTP request limit (default 100)
    --max-response <n>     response size limit in bytes (default 5242880)

The installed copy adds its bin folder to your user PATH. Open a new terminal
after installing so the change is visible.

AZLANG STUDIO
-------------

AzLang Studio is the included browser-based editor: explorer, tabs, syntax
highlighting, examples, output and problems panels, a terminal, a command
palette, search, minimap, and autosave. A tiny local server
(studio\studio-server.js) serves the files to your default browser. Programs
execute inside the browser tab, not in a desktop application. The server stops
itself after ten minutes without a Studio heartbeat, so closing the last tab
eventually releases the bundled runtime.

The Studio works with async programs, Promise helpers, the net library, and
module imports. Imported modules are fetched relative to the Studio URL, so
files placed in the studio folder (including studio\examples) can be imported
directly. Everything runs locally.

INSTALL LOCATION
----------------

The default installed location is:

    %LOCALAPPDATA%\Programs\AzLang

UNINSTALL
---------

Use Settings > Apps > AzLang > Uninstall, or run uninstall.exe in the AzLang
folder. Close Studio tabs before uninstalling so the bundled runtime is not in
use. Your autosaved Studio code is kept.

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

AzLang is MIT licensed. It has no telemetry. Network requests happen only when
an AzLang program explicitly makes them.
