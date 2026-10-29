# Vim and Neovim

The `vim` folder is a standard Vim runtime package with syntax highlighting,
filetype detection, and filetype settings for `.az` files.

## Install with a plugin manager

With [vim-plug](https://github.com/junegunn/vim-plug):

```vim
Plug 'TheGreatAzizi/AzLang', { 'rtp': 'editors/vim' }
```

With [lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  'TheGreatAzizi/AzLang',
  config = function()
    vim.opt.rtp:append(vim.fn.expand('~/.local/share/nvim/lazy/AzLang/editors/vim'))
  end,
}
```

## Manual install

Copy `syntax/azlang.vim`, `ftdetect/azlang.vim`, and `ftplugin/azlang.vim` into
the matching folders under your Vim or Neovim configuration:

- Vim: `~/.vim/`
- Neovim: `~/.config/nvim/`
- Windows Vim: `%USERPROFILE%\vimfiles\`

Then add this line to `~/.vimrc` or `~/.config/nvim/init.vim` if your setup does
not load filetype plugins automatically:

```vim
filetype plugin indent on
syntax on
```

## Running a program

Open a `.az` file and run:

```vim
:!azlang %
```

Or map it:

```vim
autocmd FileType azlang nnoremap <buffer> <leader>r :!azlang %<CR>
```

Neovim users can send the command to a terminal buffer with `:terminal azlang %`.
