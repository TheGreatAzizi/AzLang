if exists('b:did_ftplugin')
  finish
endif
let b:did_ftplugin = 1

setlocal commentstring=#\ %s
setlocal suffixesadd=.az
setlocal iskeyword+=_,$,@,%,#

let b:undo_ftplugin = 'setlocal commentstring< suffixesadd< iskeyword<'
