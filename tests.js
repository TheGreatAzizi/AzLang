/**
 * AzLang test suite
 * Run:  node tests.js
 */
const az = require('./azlang.js');
const vm = require('vm');

let pass = 0;
let fail = 0;

function report(ok, label, detail) {
  if (ok) {
    pass += 1;
    console.log('  \u2714 ' + label);
  } else {
    fail += 1;
    console.log('  \u2718 ' + label + (detail ? '\n      ' + detail : ''));
  }
}

function eq(label, code, expected) {
  const out = [];
  try {
    az.run(code, {
      ask: () => 'Ada',
      onOutput: (s) => out.push(s)
    });
  } catch (e) {
    report(false, label, 'unexpected error: ' + e.message);
    return;
  }
  const got = out.join('\n');
  report(got === expected, label, 'expected: ' + JSON.stringify(expected) + '  |  got: ' + JSON.stringify(got));
}

function err(label, code, part) {
  try {
    az.run(code, { ask: () => '', onOutput: () => {} });
    report(false, label, 'expected an error, but the program ran');
  } catch (e) {
    const isAz = e instanceof az.AzError;
    const haystack = String(e.message || '') + ' ' + String(e.hint || '');
    const hasPart = isAz && haystack.indexOf(part) !== -1;
    report(hasPart, label, 'message: ' + (e && e.message));
  }
}

console.log('\n- basics -');
eq('print one value', 'say "Hello"', 'Hello');
eq('print many values', 'say "a", 1, true, null', 'a 1 true null');
eq('say with call syntax', 'say("a", "b")', 'a b');
eq('variable and reassignment', 'let x = 2\nx = x + 3\nsay x', '5');
eq('compound assignment', 'let x = 10\nx += 5\nx *= 2\nx -= 4\nx /= 2\nsay x', '13');
eq('floor divide assign', 'let x = 13\nx //= 4\nsay x', '3');
eq('interpolation', 'let n = "Az"\nsay "Hello, {n}!"', 'Hello, Az!');
eq('interpolation expression', 'say "{2 + 3 * 2}"', '8');
eq('escaped brace', 'say "\\{x\\}"', '{x}');
eq('two statements on one line', 'let x = 1; x = x + 1; say x', '2');
eq('multi-line string', 'say """one\ntwo"""', 'one\ntwo');
eq('raw string', 'say r"a\\nb"', 'a\\nb');
eq('raw JSON braces', 'let m = json_decode(r\'{"a": 1}\')\nsay m.a', '1');
eq('persian text', 'say "سلام دنیا"', 'سلام دنیا');
eq('persian identifier', 'let شهر = "تهران"\nsay شهر', 'تهران');
eq('persian digits', 'let x = ۱۲\nsay x + ۳', '15');
eq('unicode length', 'say len("👋آز")', '3');
eq('comments', 'say 1 # trailing\n# whole line\nsay 2', '1\n2');

console.log('\n- math -');
eq('precedence', 'say 2 + 3 * 4 ** 2', '50');
eq('power is right-associative', 'say 2 ** 3 ** 2', '512');
eq('unary minus and power', 'say -2 ** 2', '-4');
eq('floor division', 'say 7 // 2, -7 // 2', '3 -4');
eq('modulo', 'say 10 % 3, -10 % 3', '1 2');
eq('division', 'say 7 / 2', '3.5');
eq('string repeat', 'say "ab" * 3', 'ababab');
eq('list repeat', 'say [1, 2] * 2', '[1, 2, 1, 2]');
eq('string plus number', 'say "n=" + 5', 'n=5');
eq('list concat', 'say [1] + [2, 3]', '[1, 2, 3]');
eq('number formatting', 'say 0.1 + 0.2', '0.3');

console.log('\n- booleans & conditions -');
eq('truthiness', 'say bool(0), bool(1), bool(""), bool("x"), bool([]), bool([0]), bool(null)', 'false true false true false true false');
eq('and/or return booleans', 'say 1 and 2, 0 or "x", false and true', 'true true false');
eq('short circuit', 'say false and (1 / 0) == 0, true or (1 / 0) == 0', 'false true');
eq('not', 'say not true, not 0, not "x"', 'false true false');
eq('if/elif/else', 'let x = 2\nif x > 3\n  say "a"\nelif x == 2\n  say "b"\nelse\n  say "c"\nend', 'b');
eq('comparison chain via and', 'say 1 < 2 and 2 < 3', 'true');
eq('membership', 'say 2 in [1, 2, 3], "da" in "Ada", "x" in {x: 1}', 'true true true');
eq('not in', 'say 5 not in [1, 2]', 'true');

console.log('\n- loops -');
eq('for over range', 'for i in range(3)\n  say i\nend', '0\n1\n2');
eq('for over string', 'for c in "آز"\n  say c\nend', 'آ\nز');
eq('for over map keys', 'for k in {a: 1, b: 2}\n  say k\nend', 'a\nb');
eq('for over map pairs', 'for k, v in {a: 1, b: 2}\n  say k, v\nend', 'a 1\nb 2');
eq('destructuring enumerate', 'for i, v in enumerate(["a", "b"])\n  say i, v\nend', '0 a\n1 b');
eq('zip', 'for a, b in zip([1, 2], ["x", "y"])\n  say a, b\nend', '1 x\n2 y');
eq('while and break', 'let i = 0\nwhile true\n  i += 1\n  if i == 3\n    break\n  end\nend\nsay i', '3');
eq('continue', 'let out = []\nfor i in range(5)\n  if i % 2 == 0\n    continue\n  end\n  append(out, i)\nend\nsay out', '[1, 3]');
eq('repeat', 'repeat 2\n  say "x"\nend', 'x\nx');
eq('range with step', 'say range(5, 0, -2)', '[5, 3, 1]');

console.log('\n- functions -');
eq('function', 'fun add(a, b)\n  return a + b\nend\nsay add(2, 3)', '5');
eq('default parameter', 'fun greet(name = "world")\n  return "Hello " + name\nend\nsay greet(), greet("Ada")', 'Hello world Hello Ada');
eq('closure', 'fun make(n)\n  return x => x + n\nend\nlet add5 = make(5)\nsay add5(2)', '7');
eq('recursion', 'fun fib(n)\n  if n < 2\n    return n\n  end\n  return fib(n - 1) + fib(n - 2)\nend\nsay fib(10)', '55');
eq('lambda', 'let f = (a, b) => a * b\nsay f(3, 4)', '12');
eq('higher-order map', 'say map([1, 2, 3], x => x * x)', '[1, 4, 9]');
eq('higher-order filter', 'say filter(range(6), x => x % 2 == 0)', '[0, 2, 4]');
eq('reduce', 'say reduce([1, 2, 3], (a, b) => a + b)', '6');
eq('find_item', 'say find_item([1, 5, 8], x => x > 4)', '5');
eq('count predicate', 'say count([1, 2, 3, 4], x => x % 2 == 0)', '2');
eq('any/all', 'say any([0, 0, 1]), all([1, 2, 3])', 'true true');

console.log('\n- collections -');
eq('append/prepend', 'let a = [2]\nappend(a, 3)\nprepend(a, 1)\nsay a', '[1, 2, 3]');
eq('insert/remove', 'let a = [1, 2]\ninsert(a, 1, 9)\nremove(a, 0)\nsay a', '[9, 2]');
eq('discard', 'let a = [1, 2, 2, 3]\ndiscard(a, 2)\nsay a', '[1, 2, 3]');
eq('pop last', 'let a = [1, 2, 3]\nsay pop(a), a', '3 [1, 2]');
eq('pop index', 'let a = [1, 2, 3]\nsay pop(a, 0), a', '1 [2, 3]');
eq('sort', 'say sort([3, 1, 2])', '[1, 2, 3]');
eq('sort descending', 'say sort([3, 1, 2], "desc")', '[3, 2, 1]');
eq('sorted copy', 'let a = [3, 1]\nlet b = sorted(a)\nsay a, b', '[3, 1] [1, 3]');
eq('reverse', 'say reverse([1, 2, 3])', '[3, 2, 1]');
eq('slice', 'say slice([0, 1, 2, 3], 1, 3), slice("hello", 1)', '[1, 2] ello');
eq('unique', 'say unique([1, 2, 2, 3, 1])', '[1, 2, 3]');
eq('flatten', 'say flatten([[1, 2], [3], 4])', '[1, 2, 3, 4]');
eq('index of', 'say index_of([1, 2, 3], 2)', '1');
eq('list conversion', 'say list("abc")', '["a", "b", "c"]');
eq('map functions', 'let m = {a: 1}\nset(m, "b", 2)\nupdate(m, {c: 3})\nsay keys(m), values(m), len(m)', '["a", "b", "c"] [1, 2, 3] 3');
eq('get fallback', 'let m = {a: 1}\nsay get(m, "a"), get(m, "z", 0)', '1 0');
eq('items', 'say items({a: 1, b: 2})', '[["a", 1], ["b", 2]]');
eq('map merge', 'say {a: 1} + {b: 2}', '{a: 1, b: 2}');
eq('deep equality', 'say [1, [2]] == [1, [2]], {a: 1} == {a: 1}, 1 == "1"', 'true true false');
eq('negative index', 'let a = [10, 20, 30]\nsay a[-1], a[-2]', '30 20');

console.log('\n- strings -');
eq('case and trim', 'say upper("abc"), lower("ABC"), trim("  x  ")', 'ABC abc x');
eq('starts/ends', 'say starts("hello", "he"), ends("hello", "lo")', 'true true');
eq('replace', 'say replace("a-b-c", "-", "+")', 'a+b+c');
eq('split/join', 'say split("a b c"), join(["a", "b"], "-")', '["a", "b", "c"] a-b');
eq('split separator', 'say split("a,b", ",")', '["a", "b"]');
eq('find/index_of', 'say find("hello", "ll"), index_of("hello", "ll")', '2 2');
eq('chars', 'say chars("آز")', '["آ", "ز"]');
eq('char code', 'say char_code("A"), from_char(66)', '65 B');

console.log('\n- math builtins -');
eq('rounding', 'say abs(-4), floor(2.9), ceil(2.1), round(2.567, 2)', '4 2 3 2.57');
eq('sqrt/pow/log', 'say sqrt(81), pow(2, 8), log(100, 10)', '9 256 2');
eq('min/max/sum/avg', 'say min([4, 1]), max(3, 9), sum([1, 2, 3]), avg([2, 4])', '1 9 6 3');
eq('clamp', 'say clamp(15, 0, 10)', '10');
eq('constants', 'say PI > 3.14, E > 2.7', 'true true');
eq('random in range', 'let r = random(5, 5)\nsay r', '5');

console.log('\n- JSON -');
eq('encode', 'say json_encode({a: 1, b: [true, null]})', '{"a":1,"b":[true,null]}');
eq('decode', 'let m = json_decode(r\'{"a": [1, 2]}\')\nsay m.a[1], type(m)', '2 map');
eq('encode instance', 'class P\n  fun init(x)\n    this.x = x\n  end\nend\nsay json_encode(new P(3))', '{"x":3}');

console.log('\n- classes -');
eq('class basics', 'class Point\n  fun init(x, y)\n    this.x = x\n    this.y = y\n  end\n  fun sum()\n    return this.x + this.y\n  end\nend\nlet p = new Point(2, 3)\nsay p.sum(), p.x\np.x = 10\nsay p.sum()', '5 2\n13');
eq('inheritance and super', 'class Animal\n  fun init(name)\n    this.name = name\n  end\n  fun speak()\n    return this.name + " makes a sound"\n  end\nend\nclass Dog extends Animal\n  fun init(name)\n    super(name)\n  end\n  fun speak()\n    return super.speak() + ": woof"\n  end\nend\nsay new Dog("Rex").speak()', 'Rex makes a sound: woof');
eq('type of class and instance', 'class A\nend\nsay type(A), type(new A())', 'class instance');
eq('method calls method', 'class Counter\n  fun init()\n    this.n = 0\n  end\n  fun bump()\n    this.n += 1\n    return this.n\n  end\n  fun twice()\n    this.bump()\n    return this.bump()\n  end\nend\nlet c = new Counter()\nsay c.twice()', '2');
eq('instance repr', 'class P\n  fun init()\n    this.x = 1\n  end\nend\nsay new P()', 'P {x: 1}');

console.log('\n- exceptions -');
eq('throw string', 'try\n  throw "boom"\ncatch e\n  say "caught", e\nend', 'caught boom');
eq('runtime error is catchable', 'try\n  say 1 / 0\ncatch e\n  say e.message\nend', 'Cannot divide by zero');
eq('throw map', 'try\n  throw {message: "bad", code: 7}\ncatch e\n  say e.message, e.code\nend', 'bad 7');
err('try without catch propagates', 'try\n  throw "x"\nend', 'Uncaught value');
eq('assert passes', 'assert(1 == 1, "no")\nsay "ok"', 'ok');

console.log('\n- match -');
eq('match values', 'fun f(x)\n  match x\n    case 0\n      return "zero"\n    case 1, 2\n      return "small"\n    case _\n      return "big"\n  end\nend\nsay f(0), f(2), f(9)', 'zero small big');
eq('match default', 'match "x"\n  case "a"\n    say "a"\n  default\n    say "other"\nend', 'other');
eq('match list', 'match [1, 2]\n  case [1, 2]\n    say "yes"\n  case _\n    say "no"\nend', 'yes');

console.log('\n- errors -');
err('undefined variable', 'say missing', 'not defined');
err('suggestion', 'let count = 1\nsay cuont', 'Did you mean');
err('division by zero', 'say 1 / 0', 'divide by zero');
err('index out of range', 'say [1][5]', 'out of range');
err('missing map key', 'say {a: 1}.b', 'not in this map');
err('missing argument', 'fun f(a)\n  return a\nend\nf()', 'missing argument');
err('too many arguments', 'fun f(a)\n  return a\nend\nf(1, 2)', 'at most');
err('break outside loop', 'break', 'inside a loop');
err('return outside function', 'return 1', 'inside a function');
err('unterminated string', 'say "hello', 'Unterminated');
err('missing end', 'if true\n  say 1', 'closing "end"');
err('else if', 'if true\n  say 1\nelse if false\n  say 2\nend', 'else if');
err('print migration', 'print("x")', 'say');
err('loop over number', 'for x in 5\nend', 'cannot be looped');
err('len type', 'len(5)', 'len works');
err('constant assignment', 'const x = 1\nx = 2', 'constant');
err('bad parent class', 'let n = 1\nclass A extends n\nend', 'not a class');
err('class called directly', 'class A\nend\nA()', 'new A');
err('missing property', 'class A\n  fun init()\n    this.x = 1\n  end\nend\nsay new A().y', 'no property');
err('uncaught throw', 'throw "boom"', 'Uncaught value');
err('invalid JSON', 'json_decode(r"{")', 'Invalid JSON');
err('runaway recursion', 'fun f()\n  return f()\nend\nf()', 'nested function calls');

console.log('\n- strings and collections -');
eq('string case and trim', 'say strip("  hi  "), capitalize("hELLO"), title("hello world")', 'hi Hello Hello World');
eq('string padding', 'say pad_left("7", 3, "0"), pad_right("x", 3, "."), center("ab", 6), zfill("-7", 4)', '007 x..   ab   -007');
eq('string search', 'say count_text("banana", "a"), rfind("banana", "a"), contains("abc", "b"), starts_with("abc", "a"), ends_with("abc", "c")', '3 5 true true true');
eq('string prefix and suffix', 'say remove_prefix("unhappy", "un"), remove_suffix("file.az", ".az")', 'happy file');
eq('string lines and words', 'say lines("a\\n\\nb"), words("  one   two  "), reverse_text("abc"), repeat_text("ab", 2)', '["a", "", "b"] ["one", "two"] cba abab');
eq('string truncate and slice', 'say truncate("abcdef", 5, ".."), substring("abcdef", 1, 4), replace_first("aXaX", "X", "Y")', 'abc.. bcd aYaX');
eq('string encoding', 'say url_encode("a b&c"), url_decode("a%20b%26c"), base64_decode(base64_encode("سلام")), escape_html("<a>&")', 'a%20b%26c a b&c سلام &lt;a&gt;&amp;');

eq('collection edges', 'say first([]), first([], "none"), last([1, 2]), take([1, 2, 3], 2), drop([1, 2, 3], 2), chunk([1, 2, 3, 4, 5], 2)', 'null none 2 [1, 2] [3] [[1, 2], [3, 4], [5]]');
eq('collection cleanup', 'say compact([1, null, 2]), without([1, 2, 1], 1), difference([1, 2, 3], [2]), intersection([1, 2, 3], [2, 3, 4]), union([1, 2], [2, 3])', '[1, 2] [2] [1, 3] [2, 3] [1, 2, 3]');
eq('map helpers', 'say merge({a: 1}, {b: 2}), has_key({a: 1}, "a"), pick({a: 1, b: 2}, ["a"]), omit({a: 1, b: 2}, ["b"]), from_entries([["x", 1]]), invert({a: "b"})', '{a: 1, b: 2} true {a: 1} {a: 1} {x: 1} {b: "a"}');
eq('higher-order grouping', 'say flat_map([1, 2], x => [x, x]), find_index([5, 6, 7], x => x == 6), sort_by([{n: 2}, {n: 1}], x => x.n), group_by([1, 2, 3, 4], x => x % 2)', '[1, 1, 2, 2] 1 [{n: 1}, {n: 2}] {"0": [2, 4], "1": [1, 3]}');
eq('higher-order summaries', 'say count_by(["a", "b", "a"], x => x), index_by([{id: 1}, {id: 2}], x => x.id), min_by([{n: 2}, {n: 1}], x => x.n), max_by([{n: 2}, {n: 1}], x => x.n), sum_by([{n: 2}, {n: 3}], x => x.n)', '{a: 2, b: 1} {"1": {id: 1}, "2": {id: 2}} {n: 1} {n: 2} 5');
eq('partition and map transforms', 'say partition([1, 2, 3, 4], x => x % 2 == 0), map_values({a: 1}, v => v + 1), map_keys({a: 1}, k => upper(k))', '[[2, 4], [1, 3]] {a: 2} {A: 1}');

console.log('\n- null-safe data -');
eq('type checks', 'say is_null(null), is_missing(null), is_map({}), is_list([]), is_string(""), is_number(1), is_bool(true), is_empty([]), is_empty(null)', 'true true true true true true true true true');
eq('fallbacks', 'say coalesce(null, null, "x"), fallback(null, 2), or_else("a", "b"), ensure_map(null), ensure_list(null)', 'x 2 a {} []');
eq('safe paths', 'let d = {user: {name: "Ada", tags: ["x"]}}\nsay get_path(d, "user.name"), get_path(d, "user.age", 0), get_path(d, "user.tags[0]"), has_path(d, "user.tags[0]"), has_path(d, "user.nope")', 'Ada 0 x true false');
eq('safe paths on wrong types', 'say get_path(null, "a.b"), get_path([1], "x"), get_path("text", "0"), get_path({a: null}, "a.b", "fallback")', 'null null t fallback');

console.log('\n- sessions -');
const seen = [];
const session = az.createSession({ onOutput: (s) => seen.push(s) });
session.execute('let x = 40');
session.execute('x += 2');
session.execute('say x');
report(seen.join('') === '42', 'REPL-style variables persist', 'got: ' + JSON.stringify(seen));

console.log('\n- async, network, and modules -');

async function asyncEq(label, code, expected, options) {
  const out = [];
  try {
    await az.runAsync(code, Object.assign({
      ask: () => 'Ada',
      onOutput: (s) => out.push(s)
    }, options || {}));
  } catch (e) {
    report(false, label, 'unexpected error: ' + e.message);
    return;
  }
  const got = out.join('\n');
  report(got === expected, label, 'expected: ' + JSON.stringify(expected) + '  |  got: ' + JSON.stringify(got));
}

async function asyncErr(label, code, part, options) {
  try {
    await az.runAsync(code, Object.assign({ ask: () => '', onOutput: () => {} }, options || {}));
    report(false, label, 'expected an error, but the program ran');
  } catch (e) {
    const haystack = String(e.message || '') + ' ' + String(e.hint || '');
    report(e instanceof az.AzError && haystack.includes(part), label,
      'expected error containing ' + JSON.stringify(part) + ', got: ' + e.message);
  }
}

(async function runAsyncTests() {
  const http = require('http');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  let flaky = 0;
  const sockets = new Set();
  const server = http.createServer(function (req, res) {
    const url = new URL(req.url, 'http://studio.local');
    let body = '';
    req.on('data', function (chunk) { body += chunk; });
    req.on('end', function () {
      function json(value, status) {
        res.writeHead(status || 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(value));
      }

      if (url.pathname === '/json') {
        res.setHeader('X-Test', 'yes');
        let parsed = null;
        try { parsed = body ? JSON.parse(body) : null; } catch (e) { /* plain body */ }
        json({
          ok: true,
          method: req.method,
          path: url.pathname,
          q: url.searchParams.get('q'),
          header: req.headers['x-test'] || null,
          type: req.headers['content-type'] || null,
          body: body,
          n: parsed && parsed.n !== undefined ? parsed.n : null
        });
        return;
      }
      if (url.pathname === '/text') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('hello');
        return;
      }
      if (url.pathname === '/gql') {
        let query = '';
        try { query = JSON.parse(body).query || ''; } catch (e) { /* ignore */ }
        if (query.indexOf('fail') !== -1) {
          json({ errors: [{ message: 'bad field' }], data: null });
        } else {
          json({ data: { hello: 'world' } });
        }
        return;
      }
      if (url.pathname === '/bad') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{oops');
        return;
      }
      if (url.pathname === '/big') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('x'.repeat(2000));
        return;
      }
      if (url.pathname === '/missing') {
        json({ error: 'not found' }, 404);
        return;
      }
      if (url.pathname === '/slow') {
        return;
      }
      if (url.pathname === '/flaky') {
        flaky += 1;
        if (flaky < 3) json({ error: 'try again' }, 500);
        else json({ ok: 1 });
        return;
      }
      if (url.pathname === '/module.az') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('export fun add(a, b)\n  return a + b\nend\n');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hi');
    });
  });

  server.on('connection', function (socket) {
    sockets.add(socket);
    socket.on('close', function () { sockets.delete(socket); });
  });

  await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
  const base = 'http://127.0.0.1:' + server.address().port;

  try {
    await asyncEq('async function and await', [
      'async fun double(x)',
      '  await sleep(5)',
      '  return x * 2',
      'end',
      'say await double(21)',
      'say await map([1, 2], async x => await double(x))'
    ].join('\n'), '42\n[2, 4]');

    await asyncEq('async callbacks in collection helpers', [
      'async fun double(x)',
      '  await sleep(1)',
      '  return x * 2',
      'end',
      'say await filter([1, 2, 3, 4], async x => (await double(x)) > 4)',
      'say await reduce([1, 2, 3], async (a, b) => a + b, 0)'
    ].join('\n'), '[3, 4]\n6');

    await asyncEq('Promise helpers', [
      'async fun double(x)',
      '  await sleep(2)',
      '  return x * 2',
      'end',
      'async fun boom()',
      '  throw {message: "nope"}',
      'end',
      'let all = await Promise.all([double(1), double(2)])',
      'let settled = await Promise.all_settled([double(1), boom()])',
      'say all',
      'say settled[0].status, settled[1].status',
      'say await Promise.race([double(1), sleep(40)])'
    ].join('\n'), '[2, 4]\nfulfilled rejected\n2');

    await asyncEq('HTTP GET, headers, and query parameters', [
      'let r = await http_get("' + base + '/json", {headers: {"X-Test": "yes"}, query: {q: "a b"}})',
      'say r.status, r.ok, r.headers["x-test"], r.json.q, r.json.header'
    ].join('\n'), '200 true yes a b yes');

    await asyncEq('HTTP JSON body and content type', [
      'let r = await http_post("' + base + '/json", {name: "Ada", n: 2})',
      'say r.json.method, r.json.type, response_json(r).n',
      'say (await http_post_json("' + base + '/json", {n: 7})).n'
    ].join('\n'), 'POST application/json; charset=utf-8 2\n7');

    await asyncEq('response text and JSON fallback', [
      'let r = await http_get("' + base + '/text")',
      'say response_text(r), r.has_json, response_json(r, "fallback")',
      'let bad = await http_get("' + base + '/bad")',
      'say bad.has_json, bad.json_error != null, response_json(bad, "fallback")'
    ].join('\n'), 'hello false fallback\nfalse true fallback');

    await asyncEq('HTTP errors are catchable', [
      'try',
      '  let r = await http_get("' + base + '/missing")',
      '  raise_for_status(r)',
      'catch e',
      '  say e.kind, e.status',
      'end'
    ].join('\n'), 'http 404');

    await asyncEq('GraphQL data and errors', [
      'let data = await graphql("' + base + '/gql", r"query { hello }")',
      'say data.hello',
      'try',
      '  await graphql("' + base + '/gql", r"query { fail }")',
      'catch e',
      '  say e.kind, e.errors[0].message, e.data',
      'end'
    ].join('\n'), 'world\ngraphql bad field null');

    await asyncEq('response size limit', [
      'try',
      '  await http_get("' + base + '/big", {max_bytes: 100})',
      'catch e',
      '  say e.kind',
      'end'
    ].join('\n'), 'limit');

    await asyncErr('request timeout',
      'await http_get("' + base + '/slow", {timeout_ms: 50})', 'timed out');

    await asyncErr('request count limit',
      'await http_get("' + base + '/text")\nawait http_get("' + base + '/text")',
      'Request limit', { maxRequests: 1 });

    await asyncErr('execution time limit',
      'while true\n  let x = 1\nend', 'time limit', { maxTimeMs: 50 });

    await asyncEq('net namespace and retry', [
      'import net from "net"',
      'say net.build_query({a: 1, b: "x y"})',
      'let r = await net.get("' + base + '/json")',
      'say net.raise_for_status(r).status',
      'say (await net.get_json("' + base + '/json")).ok',
      'say await retry(async i => await http_get_json("' + base + '/flaky"), 4, 5)'
    ].join('\n'), 'a=1&b=x%20y\n200\ntrue\n{ok: 1}');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azlang-tests-'));
    const modulePath = path.join(dir, 'math.az');
    const mainPath = path.join(dir, 'main.az');
    fs.writeFileSync(modulePath, [
      'export fun add(a, b)',
      '  return a + b',
      'end',
      'export const answer = 42',
      'export default "root"',
      'export class Point',
      '  fun init(x)',
      '    this.x = x',
      '  end',
      'end',
      'let hidden = 1',
      'fun next()',
      '  return hidden + 1',
      'end',
      'export { next as bump }',
      ''
    ].join('\n'));
    fs.writeFileSync(mainPath, [
      'import math from "./math.az"',
      'import { add, answer as n, bump } from "./math.az"',
      'say math.add(2, 3), add(4, 5), n, math.default, bump()',
      'let p = new math.Point(7)',
      'say p.x',
      ''
    ].join('\n'));

    await asyncEq('local modules and exports',
      fs.readFileSync(mainPath, 'utf8'), '5 9 42 root 2\n7', { filename: mainPath });

    await asyncErr('module missing export',
      'import { nope } from "./math.az"\nsay nope', 'does not export', { filename: mainPath });

    await asyncEq('remote modules over HTTP',
      'import { add } from "' + base + '/module.az"\nsay add(10, 5)', '15',
      { filename: base + '/main.az' });

    // A browser has no require or filesystem. Relative imports must resolve
    // against the page URL, not fail with "no module loader".
    const browserSandbox = {
      console: console,
      fetch: fetch,
      URL: URL,
      TextDecoder: TextDecoder,
      TextEncoder: TextEncoder,
      AbortController: AbortController,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      document: { baseURI: base + '/ide.html' },
      location: { protocol: 'http:', href: base + '/ide.html' }
    };
    vm.createContext(browserSandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'azlang.js'), 'utf8'),
      browserSandbox, { filename: 'azlang.js' });
    const browserOutput = [];
    await browserSandbox.AzLang.runAsync(
      'import { add } from "./module.az"\nsay add(20, 22)',
      { onOutput: function (s) { browserOutput.push(s); } }
    );
    report(browserOutput.join('\n') === '42', 'browser modules resolve against the page URL',
      'got: ' + JSON.stringify(browserOutput.join('\n')));

    const seen = [];
    const session = az.createSession({ onOutput: function (s) { seen.push(s); } });
    await session.executeAsync('async fun triple(x)\n  return x * 3\nend');
    await session.executeAsync('say await triple(4)');
    report(seen.join('\n') === '12', 'async session execution', 'got: ' + JSON.stringify(seen));

    let syncBlocked = false;
    try {
      az.run('say await sleep(1)');
    } catch (e) {
      syncBlocked = e instanceof az.AzError && /asynchronous/i.test(e.message);
    }
    report(syncBlocked, 'sync run rejects async code');
  } finally {
    server.close();
    for (const socket of sockets) socket.destroy();
  }

  console.log('\n' + (fail === 0
    ? '\u2714 all ' + pass + ' tests passed.'
    : '\u2718 ' + fail + ' failed, ' + pass + ' passed.') + '\n');

  process.exit(fail === 0 ? 0 : 1);
})();