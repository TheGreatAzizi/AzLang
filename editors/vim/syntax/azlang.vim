" Vim syntax file for AzLang
" Language: AzLang
" Maintainer: TheGreatAzizi
" Website: https://github.com/TheGreatAzizi/AzLang

if exists('b:current_syntax')
  finish
endif

syn case match

syn keyword azKeyword let const say if elif else end while for in repeat
syn keyword azKeyword break continue fun return class extends new try catch
syn keyword azKeyword throw match case default

syn keyword azBoolean true false
syn keyword azNull null
syn keyword azLanguage this super
syn keyword azWordOperator and or not
syn keyword azBuiltin len type str num int bool assert fail clock input
syn keyword azBuiltin abs floor ceil round sqrt pow log min max sum avg clamp
syn keyword azBuiltin random random_float choice upper lower trim starts ends
syn keyword azBuiltin find replace split join chars char_code from_char append
syn keyword azBuiltin prepend insert remove discard pop sort sorted reverse
syn keyword azBuiltin reversed slice concat unique flatten index_of has list
syn keyword azBuiltin keys values items get set update range enumerate zip map
syn keyword azBuiltin each filter reduce find_item count any all json_encode
syn keyword azBuiltin json_decode to_json from_json
syn keyword azBuiltinConstant PI E TAU

syn match azComment '#.*$' contains=@Spell
syn region azRawString start=+r"""+ end=+"""+ contains=NONE
syn region azRawString start=+r'''+ end=+'''+ contains=NONE
syn region azRawString start=+r"+ end=+"+ contains=NONE
syn region azRawString start=+r'+ end=+'+ contains=NONE
syn region azString start=+"""+ end=+"""+ contains=azEscape,azInterpolation
syn region azString start=+'''+ end=+'''+ contains=azEscape,azInterpolation
syn region azString start=+"+ end=+"+ contains=azEscape,azInterpolation
syn region azString start=+'+ end=+'+ contains=azEscape,azInterpolation
syn match azEscape '\\\\.' contained
syn region azInterpolation start=+{+ end=+}+ contained contains=azBuiltin,azBoolean,azNull,azLanguage,azNumber,azOperator

syn match azFunction '\<[A-Za-z_][A-Za-z0-9_]*\ze\s*('
syn match azNumber '\<[0-9۰-۹٠-٩]\+\(\.[0-9۰-۹٠-٩]\+\)\?'
syn match azOperator '\*\*=\|//=\|\*\*\|==\|!=\|<=\|>=\|//\|=>\|+=\|-=\|\*=\|/=\|%=\|[+\-*/%=<>!]'
syn match azPunctuation '[(){}\[\],.:;]'

hi def link azKeyword Keyword
hi def link azBoolean Boolean
hi def link azNull Constant
hi def link azLanguage Constant
hi def link azWordOperator Operator
hi def link azBuiltin Function
hi def link azBuiltinConstant Constant
hi def link azComment Comment
hi def link azString String
hi def link azRawString String
hi def link azEscape SpecialChar
hi def link azInterpolation Special
hi def link azFunction Function
hi def link azNumber Number
hi def link azOperator Operator
hi def link azPunctuation Delimiter

let b:current_syntax = 'azlang'
