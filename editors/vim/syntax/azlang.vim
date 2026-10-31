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
syn keyword azKeyword throw match case default async await import export

syn keyword azBoolean true false
syn keyword azNull null
syn keyword azLanguage this super
syn keyword azWordOperator and or not
syn keyword azBuiltin abs all any append assert avg base64_decode base64_encode bool capitalize ceil
syn keyword azBuiltin center char_code chars choice chunk clamp clock coalesce compact concat
syn keyword azBuiltin contains count count_by count_text difference discard drop each ends ends_with
syn keyword azBuiltin ensure_list ensure_map enumerate escape_html fail fallback filter find
syn keyword azBuiltin find_index find_item first flat_map flatten floor from_char from_entries
syn keyword azBuiltin from_json get get_in get_path graphql group_by has has_key has_path
syn keyword azBuiltin http_delete http_get http_get_json http_patch http_post http_post_json
syn keyword azBuiltin http_put http_request index_by index_of input insert int intersection invert
syn keyword azBuiltin is_bool is_empty is_function is_list is_map is_missing is_null is_number
syn keyword azBuiltin is_string items join json_decode json_encode keys last len lines list log
syn keyword azBuiltin lower lstrip map map_keys map_values max max_by merge min min_by num omit
syn keyword azBuiltin or_else pad_left pad_right partition pick pop pow prepend raise_for_status
syn keyword azBuiltin random random_float range reduce remove remove_prefix remove_suffix
syn keyword azBuiltin repeat_text replace replace_first response_json response_text retry reverse
syn keyword azBuiltin reverse_text reversed rfind round rstrip set sleep slice sort sort_by sorted
syn keyword azBuiltin split sqrt starts starts_with str strip substring sum sum_by take title
syn keyword azBuiltin to_json trim truncate type union unique update upper url_decode url_encode
syn keyword azBuiltin values without words zfill zip net Promise
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
