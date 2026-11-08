# AzLang Roadmap – تکمیل قابلیت‌ها

این فایل وضعیت پیاده‌سازی درخواست‌های توسعه را نشان می‌دهد.

## تکمیل شده
- [x] File System built-ins: `read_file`, `write_file`, `append_file`, `file_exists`, `make_dir`, `list_dir`, `remove_file`
- [x] Environment Variables: `env_get`, `env_has`
- [x] Regular Expressions: `regex_match`, `regex_search`, `regex_replace`, `regex_split`
- [x] Date & Time: `date_now`, `date_iso`, `date_parse`, `date_diff`
- [x] Bitwise helpers: `bit_and`, `bit_or`, `bit_xor`, `bit_not`, `bit_shl`, `bit_shr`, `bit_ushr`

همهٔ تغییرات به GitHub پوش شده‌اند و تست‌ها همچنان 167/167 پاس می‌شوند.

## در صف
- تکمیل String Handling: `format`, `pad`, `center` تکمیلی، `truncate` با ellipsis هوشمند
- رفع مشکلات Lexer و Parser: پشتیبانی از اعداد علمی، کامنت‌های inline پیشرفته
- Package Manager: `azpm` CLI، `package.az` manifest، نصب از GitHub
- Project Configuration: `azlang.json` برای تنظیمات اجرا، محدودیت‌ها و پلاگین‌ها
- Testing Framework: `test` بلاک، `expect` assertions، گزارش خروجی
- Formatter و Linter: `azfmt` و `azlint` داخلی
- Debugger: breakpoints، step، watch در Studio
- LSP: سرور زبان برای ویرایشگرها
- مستندات API استاندارد: تولید خودکار از کامنت‌ها
- Optional Static Typing: type hints با `:`
- Generics: `list<T>`, `map<K,V>`
- Interfaces: تعریف قرارداد کلاس‌ها
- Result و Option: انواع `ok`/`err` و `some`/`none`
- Advanced Pattern Matching: destructuring در `match`
- Concurrency: `spawn`, `channel`
- Workerها: `worker` API برای Node وب‌کارگرها
- Bytecode VM یا Compiler: کامپایل به JS بهینه
- JIT Compilation: بهینه‌سازی اجرا در زمان اجرا
- HTTP Server: `http_server`, `route`, `middleware`
- Database Drivers: SQLite, Postgres، Mongo
- WebSocket: `ws_client`, `ws_server`
- Cross-platform Distribution: نصب macOS/Linux، داکر
- Native Interoperability: FFI به C/C++

## نحوه مشارکت
هر بخش به‌صورت PR جداگانه با تست‌های واحد پیاده‌سازی می‌شود. کامیت‌ها به صورت خودکار به `https://github.com/TheGreatAzizi/AzLang` پوش می‌شوند.
