# JetBrains IDEs

IntelliJ IDEA, PyCharm, WebStorm, and the other JetBrains IDEs can use the
TextMate grammar from this repository. Install the bundled **TextMate Bundles**
plugin if it is not already enabled.

## Install the grammar

1. Open **Settings** (or **Preferences** on macOS).
2. Go to **Editor > TextMate Bundles**.
3. Click **+** and select the `editors/textmate/AzLang.tmBundle` folder.
4. Apply the settings. Files ending in `.az` are highlighted automatically.

## Run a program

Create an external tool that runs the installed AzLang command:

1. Open **Settings > Tools > External Tools**.
2. Click **+** and set:
   - **Name:** Run AzLang File
   - **Program:** `azlang`
   - **Arguments:** `$FilePath$`
   - **Working directory:** `$FileDir$`
3. Assign a keyboard shortcut under **Settings > Keymap > External Tools**.

If `azlang` is not on `PATH`, use the full path to `azlang.exe`, for example
`%LOCALAPPDATA%\Programs\AzLang\bin\azlang.exe`.

## Notes

There is no dedicated AzLang plugin yet. The TextMate bundle provides syntax
highlighting only; run configurations use the command-line launcher.
