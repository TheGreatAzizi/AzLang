/*!
 * AzLang 2.0 — a small language with serious features.
 * Zero dependencies. Runs in Node.js and in the browser.
 *
 *   node azlang.js program.az
 *   node azlang.js                 (REPL)
 *   node azlang.js -e "say 1 + 1"
 *   node azlang.js --check file.az
 *
 * Documentation: docs.html
 */
(function (root) {
  'use strict';

  var VERSION = '2.0.0';

  /* ============================================================
     ERRORS
     ============================================================ */

  class AzError extends Error {
    constructor(message, line, kind) {
      super(message);
      this.name = 'AzError';
      this.line = line || 0;
      this.kind = kind || 'runtime';
      this.hint = null;
    }
  }

  function syntaxError(message, line, hint) {
    const err = new AzError(message, line, 'syntax');
    if (hint) err.hint = hint;
    return err;
  }

  /* ============================================================
     LEXER
     ============================================================ */

  const KEYWORDS = new Set([
    'let', 'const', 'say', 'if', 'elif', 'else', 'end',
    'while', 'for', 'in', 'repeat', 'break', 'continue',
    'fun', 'return', 'true', 'false', 'null', 'and', 'or', 'not',
    'class', 'extends', 'new', 'this', 'super',
    'try', 'catch', 'throw', 'match', 'case', 'default'
  ]);

  const ID_START = /[A-Za-z_\p{L}]/u;
  const ID_PART = /[A-Za-z0-9_\p{L}\p{N}\p{Mn}\p{Mc}]/u;

  const THREE_CHAR = new Set(['**=', '//=']);
  const TWO_CHAR = new Set([
    '**', '==', '!=', '<=', '>=', '//', '+=', '-=', '*=', '/=', '%=', '=>'
  ]);
  const ONE_CHAR = new Set('+-*/%=<>()[]{},.:');

  function isDigit(ch) {
    if (ch >= '0' && ch <= '9') return true;
    const c = ch.charCodeAt(0);
    return (c >= 0x06f0 && c <= 0x06f9) || (c >= 0x0660 && c <= 0x0669);
  }

  function asciiDigit(ch) {
    const c = ch.charCodeAt(0);
    if (c >= 0x06f0 && c <= 0x06f9) return String(c - 0x06f0);
    if (c >= 0x0660 && c <= 0x0669) return String(c - 0x0660);
    return ch;
  }

  function normalizeDigits(s) {
    return String(s).replace(/[\u06f0-\u06f9\u0660-\u0669]/g, asciiDigit);
  }

  function tokenize(source, baseLine) {
    baseLine = baseLine || 0;
    const tokens = [];
    let i = 0;
    let line = 1;
    let depth = 0;
    const n = source.length;

    if (source.charCodeAt(0) === 0xfeff) i += 1;

    function push(type, value, atLine) {
      tokens.push({ type: type, value: value, line: baseLine + atLine });
    }

    while (i < n) {
      const ch = source[i];

      if (ch === '\n') {
        if (depth === 0) push('nl', '\n', line);
        line += 1;
        i += 1;
        continue;
      }

      if (ch === '\r') {
        if (source[i + 1] === '\n') {
          if (depth === 0) push('nl', '\n', line);
          line += 1;
          i += 2;
        } else {
          i += 1;
        }
        continue;
      }

      if (ch === ' ' || ch === '\t' || ch === '\f' || ch === '\v') {
        i += 1;
        continue;
      }

      if (ch === '#') {
        while (i < n && source[i] !== '\n' && source[i] !== '\r') i += 1;
        continue;
      }

      if (ch === ';') {
        push('nl', '\n', line);
        i += 1;
        continue;
      }

      let rawString = false;
      let quoteIndex = i;

      if ((ch === 'r' || ch === 'R') &&
          (source[i + 1] === '"' || source[i + 1] === "'")) {
        rawString = true;
        quoteIndex = i + 1;
      }

      if (rawString || ch === '"' || ch === "'") {
        const quote = source[quoteIndex];
        const startLine = line;
        const triple = source.slice(quoteIndex, quoteIndex + 3) === quote + quote + quote;
        let j = quoteIndex + (triple ? 3 : 1);
        let raw = '';
        let closed = false;

        while (j < n) {
          const c = source[j];

          if (!rawString && c === '\\') {
            if (j + 1 < n) {
              raw += c + source[j + 1];
              if (source[j + 1] === '\n') line += 1;
              j += 2;
            } else {
              raw += c;
              j += 1;
            }
            continue;
          }

          if (triple) {
            if (source.startsWith(quote + quote + quote, j)) {
              closed = true;
              j += 3;
              break;
            }
            if (c === '\n') line += 1;
            raw += c;
            j += 1;
            continue;
          }

          if (c === quote) {
            closed = true;
            j += 1;
            break;
          }

          if (c === '\n') break;
          raw += c;
          j += 1;
        }

        if (!closed) {
          throw syntaxError(
            triple ? 'Unterminated multi-line string' : 'Unterminated string; the closing quote is missing',
            baseLine + startLine,
            triple ? 'Close it with ' + quote + quote + quote : 'Add a matching ' + quote + ' at the end'
          );
        }

        push('str', {
          raw: raw,
          quote: quote,
          triple: triple,
          rawString: rawString
        }, startLine);
        i = j;
        continue;
      }

      if (isDigit(ch)) {
        let j = i;
        let dot = false;
        let text = '';
        while (j < n) {
          const c = source[j];
          if (isDigit(c)) {
            text += asciiDigit(c);
            j += 1;
            continue;
          }
          if (c === '.' && !dot && isDigit(source[j + 1] || '')) {
            dot = true;
            text += '.';
            j += 1;
            continue;
          }
          break;
        }
        push('num', Number(text), line);
        i = j;
        continue;
      }

      if (ID_START.test(ch)) {
        let j = i + 1;
        while (j < n && ID_PART.test(source[j])) j += 1;
        const word = source.slice(i, j);
        push(KEYWORDS.has(word) ? 'kw' : 'ident', word, line);
        i = j;
        continue;
      }

      const three = source.slice(i, i + 3);
      if (THREE_CHAR.has(three)) {
        push('op', three, line);
        i += 3;
        continue;
      }

      const two = source.slice(i, i + 2);
      if (TWO_CHAR.has(two)) {
        push('op', two, line);
        i += 2;
        continue;
      }

      if (ONE_CHAR.has(ch)) {
        if (ch === '(' || ch === '[' || ch === '{') depth += 1;
        else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
        push('op', ch, line);
        i += 1;
        continue;
      }

      throw syntaxError(
        'Unexpected character "' + ch + '"',
        baseLine + line,
        'Check for a stray symbol or an unclosed string'
      );
    }

    push('eof', '', line);
    return tokens;
  }

  /* ============================================================
     PARSER
     ============================================================ */

  const BLOCK_STOP_HINT = 'Every block must be closed with "end"';

  class Parser {
    constructor(tokens, source) {
      this.tokens = tokens;
      this.source = source || '';
      this.pos = 0;
    }

    peek(offset) {
      const i = Math.min(this.pos + (offset || 0), this.tokens.length - 1);
      return this.tokens[i];
    }

    next() {
      const t = this.tokens[this.pos];
      if (this.pos < this.tokens.length - 1) this.pos += 1;
      return t;
    }

    is(type, value) {
      const t = this.peek();
      return t.type === type && (value === undefined || t.value === value);
    }

    isKw(word) {
      const t = this.peek();
      return t.type === 'kw' && t.value === word;
    }

    eat(type, value) {
      if (this.is(type, value)) return this.next();
      return null;
    }

    skipNl() {
      while (this.peek().type === 'nl') this.pos += 1;
    }

    error(message, token, hint) {
      throw syntaxError(message, (token || this.peek()).line, hint);
    }

    expect(type, value, message, hint) {
      const t = this.peek();
      if (t.type === type && (value === undefined || t.value === value)) return this.next();
      const what = value === undefined ? type : value;
      this.error(message || 'Expected "' + what + '" here', t, hint);
    }

    expectKw(word, message, hint) {
      if (this.isKw(word)) return this.next();
      this.error(message || 'Expected "' + word + '" here', this.peek(), hint);
    }

    expectNl(where) {
      if (this.peek().type === 'nl') {
        this.skipNl();
        return;
      }
      this.error('Expected a new line after ' + where, this.peek(), 'Finish the line, or separate statements with ";"');
    }

    /* ---------- program & blocks ---------- */

    parse() {
      const body = this.parseBlock([]);
      if (this.peek().type !== 'eof') this.error('Unexpected extra input', this.peek());
      return { type: 'Program', body: body, line: 1 };
    }

    parseBlock(stops) {
      const body = [];
      this.skipNl();
      for (;;) {
        const t = this.peek();
        if (t.type === 'eof') break;
        if (t.type === 'kw' && stops.indexOf(t.value) !== -1) break;
        body.push(this.parseStatement());
        this.endStatement(stops);
      }
      return body;
    }

    endStatement(stops) {
      const t = this.peek();
      if (t.type === 'nl') {
        this.skipNl();
        return;
      }
      if (t.type === 'eof') return;
      if (t.type === 'kw' && stops.indexOf(t.value) !== -1) return;
      this.error('Unexpected token "' + t.value + '" after this statement', t, 'Use a new line (or ";") between statements');
    }

    /* ---------- statements ---------- */

    parseStatement() {
      const t = this.peek();

      if (t.type === 'kw') {
        switch (t.value) {
          case 'let': return this.parseLet(false);
          case 'const': return this.parseLet(true);
          case 'say': return this.parseSay();
          case 'if': return this.parseIf();
          case 'while': return this.parseWhile();
          case 'for': return this.parseFor();
          case 'repeat': return this.parseRepeat();
          case 'fun': return this.parseFun(false);
          case 'class': return this.parseClass();
          case 'try': return this.parseTry();
          case 'throw': return this.parseThrow();
          case 'match': return this.parseMatch();
          case 'return': return this.parseReturn();
          case 'break':
            this.next();
            return { type: 'Break', line: t.line };
          case 'continue':
            this.next();
            return { type: 'Continue', line: t.line };
          case 'end':
            this.error('Unexpected "end"', t, BLOCK_STOP_HINT);
            break;
          case 'else':
          case 'elif':
            this.error('"' + t.value + '" without a matching if', t, 'Place it directly inside an if block');
            break;
          case 'case':
          case 'default':
            this.error('"' + t.value + '" only belongs inside a match block', t);
            break;
          case 'catch':
            this.error('"catch" without a matching try', t, 'Write: try ... catch err ... end');
            break;
          default:
            break;
        }
      }

      if (t.type === 'ident') {
        const migration = {
          print: ['say', 'Use say instead of print:  say "Hello"'],
          def: ['fun', 'Use fun instead of def:  fun greet(name) ... end'],
          True: ['true', 'Use lowercase true'],
          False: ['false', 'Use lowercase false'],
          None: ['null', 'Use null instead of None'],
          import: ['no imports', 'AzLang programs are single files; there is no import statement'],
          function: ['fun', 'Use fun instead of function']
        };
        if (migration[t.value]) {
          this.error(
            '"' + t.value + '" is not an AzLang keyword',
            t,
            migration[t.value][1]
          );
        }
      }

      return this.parseSimpleStatement();
    }

    parseLet(isConst) {
      const line = this.next().line;
      const name = this.expect('ident', undefined, 'Expected a variable name after ' + (isConst ? 'const' : 'let'), 'Example: let age = 20');
      this.expect('op', '=', 'Expected "=" and a value', 'Example: let age = 20');
      const value = this.parseExpression();
      return {
        type: 'Let',
        name: name.value,
        value: value,
        constant: !!isConst,
        line: line
      };
    }

    sayParenIsCallStyle() {
      if (!this.is('op', '(')) return false;
      let depth = 0;
      let p = this.pos;
      while (p < this.tokens.length) {
        const t = this.tokens[p];
        if (t.type === 'op' && t.value === '(') depth += 1;
        else if (t.type === 'op' && t.value === ')') {
          depth -= 1;
          if (depth === 0) break;
        } else if (t.type === 'eof') {
          return false;
        }
        p += 1;
      }
      const after = this.tokens[p + 1];
      if (!after) return false;
      if (after.type === 'nl' || after.type === 'eof') return true;
      if (after.type === 'kw' && ['end', 'else', 'elif', 'case', 'default'].indexOf(after.value) !== -1) return true;
      return false;
    }

    parseSay() {
      const line = this.next().line;
      const values = [];

      if (this.sayParenIsCallStyle()) {
        this.next();
        if (!this.is('op', ')')) {
          for (;;) {
            values.push(this.parseExpression());
            if (!this.eat('op', ',')) break;
            if (this.is('op', ')')) break;
          }
        }
        this.expect('op', ')', 'The closing ")" is missing');
        return { type: 'Say', values: values, line: line };
      }

      if (!this.is('nl') && !this.is('eof') && !this.isKw('end') &&
          !this.isKw('else') && !this.isKw('elif') && !this.isKw('case') &&
          !this.isKw('default')) {
        values.push(this.parseExpression());
        while (this.eat('op', ',')) {
          values.push(this.parseExpression());
        }
      }
      return { type: 'Say', values: values, line: line };
    }

    parseIf() {
      const line = this.next().line;
      const branches = [];
      const cond = this.parseExpression();
      this.expectNl('the if condition');
      branches.push({ cond: cond, body: this.parseBlock(['elif', 'else', 'end']) });

      let elseBody = null;
      for (;;) {
        if (this.isKw('elif')) {
          this.next();
          const c = this.parseExpression();
          this.expectNl('the elif condition');
          branches.push({ cond: c, body: this.parseBlock(['elif', 'else', 'end']) });
          continue;
        }
        if (this.isKw('else')) {
          this.next();
          if (this.isKw('if')) {
            this.error('"else if" is not valid', this.peek(), 'Use "elif" instead');
          }
          this.expectNl('else');
          elseBody = this.parseBlock(['end']);
        }
        break;
      }

      this.expectKw('end', 'Every if block needs a closing "end"', BLOCK_STOP_HINT);
      return { type: 'If', branches: branches, elseBody: elseBody, line: line };
    }

    parseWhile() {
      const line = this.next().line;
      const cond = this.parseExpression();
      this.expectNl('the while condition');
      const body = this.parseBlock(['end']);
      this.expectKw('end', 'Every while loop needs a closing "end"', BLOCK_STOP_HINT);
      return { type: 'While', cond: cond, body: body, line: line };
    }

    parseFor() {
      const line = this.next().line;
      const names = [];
      for (;;) {
        const name = this.expect('ident', undefined, 'Expected a variable name after "for"', 'Example: for item in items');
        names.push(name.value);
        if (!this.eat('op', ',')) break;
      }
      this.expectKw('in', 'Expected "in" after the loop variable', 'Example: for item in items');
      const iterable = this.parseExpression();
      this.expectNl('the for header');
      const body = this.parseBlock(['end']);
      this.expectKw('end', 'Every for loop needs a closing "end"', BLOCK_STOP_HINT);
      return { type: 'For', names: names, iterable: iterable, body: body, line: line };
    }

    parseRepeat() {
      const line = this.next().line;
      const count = this.parseExpression();
      this.expectNl('the repeat count');
      const body = this.parseBlock(['end']);
      this.expectKw('end', 'Every repeat block needs a closing "end"', BLOCK_STOP_HINT);
      return { type: 'Repeat', count: count, body: body, line: line };
    }

    parseFun(isMethod) {
      const line = this.next().line;
      const name = this.expect('ident', undefined, 'Expected a function name after "fun"', 'Example: fun greet(name)');
      this.expect('op', '(', 'Expected "(" after the function name', 'Example: fun greet(name)');

      const params = [];
      let seenDefault = false;

      if (!this.is('op', ')')) {
        for (;;) {
          const p = this.expect('ident', undefined, 'A parameter name must be an identifier');
          let def = null;
          if (this.eat('op', '=')) {
            seenDefault = true;
            def = this.parseExpression();
          } else if (seenDefault) {
            this.error('A required parameter cannot follow a default parameter', p);
          }
          params.push({ name: p.value, def: def });
          if (!this.eat('op', ',')) break;
          if (this.is('op', ')')) break;
        }
      }

      this.expect('op', ')', 'The function parameter list is not closed', 'Add ")" at the end');
      this.expectNl('the function signature');
      const body = this.parseBlock(['end']);
      this.expectKw('end', 'Every function needs a closing "end"', BLOCK_STOP_HINT);
      return { type: 'Fun', name: name.value, params: params, body: body, line: line, isMethod: !!isMethod };
    }

    parseClass() {
      const line = this.next().line;
      const name = this.expect('ident', undefined, 'Expected a class name after "class"', 'Example: class Point');
      let parent = null;
      if (this.isKw('extends')) {
        this.next();
        const p = this.expect('ident', undefined, 'Expected a parent class name after "extends"');
        parent = p.value;
      }
      this.expectNl('the class name');

      const methods = [];
      this.skipNl();
      while (!this.isKw('end') && this.peek().type !== 'eof') {
        if (!this.isKw('fun')) {
          this.error('Only method definitions (fun ...) are allowed inside a class', this.peek(), 'Move other statements outside the class');
        }
        methods.push(this.parseFun(true));
        this.skipNl();
      }
      this.expectKw('end', 'Every class needs a closing "end"', BLOCK_STOP_HINT);
      return { type: 'Class', name: name.value, parent: parent, methods: methods, line: line };
    }

    parseTry() {
      const line = this.next().line;
      this.expectNl('try');
      const body = this.parseBlock(['catch', 'end']);

      let catchName = 'err';
      let catchBody = null;

      if (this.isKw('catch')) {
        this.next();
        if (this.is('ident')) catchName = this.next().value;
        this.expectNl('catch');
        catchBody = this.parseBlock(['end']);
      }

      this.expectKw('end', 'Every try block needs a closing "end"', BLOCK_STOP_HINT);
      return { type: 'Try', body: body, catchName: catchName, catchBody: catchBody, line: line };
    }

    parseThrow() {
      const line = this.next().line;
      const value = this.parseExpression();
      return { type: 'Throw', value: value, line: line };
    }

    parseMatch() {
      const line = this.next().line;
      const subject = this.parseExpression();
      this.expectNl('the match value');

      const cases = [];
      let defaultBody = null;

      this.skipNl();
      while (this.isKw('case')) {
        const caseLine = this.next().line;
        const values = [];
        for (;;) {
          values.push(this.parseExpression());
          if (!this.eat('op', ',')) break;
        }
        this.expectNl('case');
        const body = this.parseBlock(['case', 'default', 'end']);
        cases.push({ values: values, body: body, line: caseLine });
        this.skipNl();
      }

      if (this.isKw('default')) {
        this.next();
        this.expectNl('default');
        defaultBody = this.parseBlock(['end']);
      }

      this.expectKw('end', 'Every match block needs a closing "end"', BLOCK_STOP_HINT);
      return { type: 'Match', subject: subject, cases: cases, defaultBody: defaultBody, line: line };
    }

    parseReturn() {
      const line = this.next().line;
      let value = null;
      if (!this.is('nl') && !this.is('eof') && !this.isKw('end') &&
          !this.isKw('else') && !this.isKw('elif') && !this.isKw('case') &&
          !this.isKw('default')) {
        value = this.parseExpression();
      }
      return { type: 'Return', value: value, line: line };
    }

    parseSimpleStatement() {
      const expr = this.parseExpression();
      const assignOps = ['=', '+=', '-=', '*=', '/=', '//=', '%=', '**='];
      const t = this.peek();

      if (t.type === 'op' && assignOps.indexOf(t.value) !== -1) {
        const eq = this.next();
        if (expr.type !== 'Var' && expr.type !== 'Index' && expr.type !== 'Member') {
          this.error('The left side of "' + eq.value + '" must be a variable, list item, or property', eq,
            'Example: x = 2  or  items[0] = 5  or  person.age = 21');
        }
        const value = this.parseExpression();
        return {
          type: 'Assign',
          target: expr,
          value: value,
          op: eq.value,
          line: eq.line
        };
      }

      return { type: 'ExprStmt', expr: expr, line: expr.line };
    }

    /* ---------- expressions ---------- */

    parseExpression() {
      return this.parseOr();
    }

    parseOr() {
      let left = this.parseAnd();
      while (this.isKw('or')) {
        const tok = this.next();
        left = { type: 'Binary', op: 'or', left: left, right: this.parseAnd(), line: tok.line };
      }
      return left;
    }

    parseAnd() {
      let left = this.parseNot();
      while (this.isKw('and')) {
        const tok = this.next();
        left = { type: 'Binary', op: 'and', left: left, right: this.parseNot(), line: tok.line };
      }
      return left;
    }

    parseNot() {
      if (this.isKw('not')) {
        const tok = this.next();
        return { type: 'Unary', op: 'not', expr: this.parseNot(), line: tok.line };
      }
      return this.parseComparison();
    }

    parseComparison() {
      let left = this.parseAdditive();
      for (;;) {
        const t = this.peek();

        if (t.type === 'op' && ['==', '!=', '<', '<=', '>', '>='].indexOf(t.value) !== -1) {
          this.next();
          left = { type: 'Binary', op: t.value, left: left, right: this.parseAdditive(), line: t.line };
          continue;
        }

        if (t.type === 'kw' && t.value === 'in') {
          this.next();
          left = { type: 'Binary', op: 'in', left: left, right: this.parseAdditive(), line: t.line };
          continue;
        }

        if (t.type === 'kw' && t.value === 'not' &&
            this.peek(1).type === 'kw' && this.peek(1).value === 'in') {
          this.next();
          this.next();
          left = {
            type: 'Unary',
            op: 'not',
            expr: { type: 'Binary', op: 'in', left: left, right: this.parseAdditive(), line: t.line },
            line: t.line
          };
          continue;
        }

        break;
      }
      return left;
    }

    parseAdditive() {
      let left = this.parseMultiplicative();
      for (;;) {
        const t = this.peek();
        if (t.type === 'op' && (t.value === '+' || t.value === '-')) {
          this.next();
          left = { type: 'Binary', op: t.value, left: left, right: this.parseMultiplicative(), line: t.line };
        } else {
          break;
        }
      }
      return left;
    }

    parseMultiplicative() {
      let left = this.parseUnary();
      for (;;) {
        const t = this.peek();
        if (t.type === 'op' && (t.value === '*' || t.value === '/' || t.value === '//' || t.value === '%')) {
          this.next();
          left = { type: 'Binary', op: t.value, left: left, right: this.parseUnary(), line: t.line };
        } else {
          break;
        }
      }
      return left;
    }

    parseUnary() {
      if (this.is('op', '-')) {
        const tok = this.next();
        return { type: 'Unary', op: '-', expr: this.parsePower(), line: tok.line };
      }
      if (this.is('op', '+')) {
        this.next();
        return this.parsePower();
      }
      return this.parsePower();
    }

    parsePower() {
      const base = this.parsePostfix();
      if (this.is('op', '**')) {
        const tok = this.next();
        return { type: 'Binary', op: '**', left: base, right: this.parseUnary(), line: tok.line };
      }
      return base;
    }

    parseArguments() {
      this.expect('op', '(');
      const args = [];
      if (!this.is('op', ')')) {
        for (;;) {
          args.push(this.parseExpression());
          if (!this.eat('op', ',')) break;
          if (this.is('op', ')')) break;
        }
      }
      this.expect('op', ')', 'The call is missing a closing ")"');
      return args;
    }

    parsePostfix() {
      let expr = this.parsePrimary();
      for (;;) {
        if (this.is('op', '(')) {
          const tok = this.next();
          const args = [];
          if (!this.is('op', ')')) {
            for (;;) {
              args.push(this.parseExpression());
              if (!this.eat('op', ',')) break;
              if (this.is('op', ')')) break;
            }
          }
          this.expect('op', ')', 'The call is missing a closing ")"');
          expr = { type: 'Call', callee: expr, args: args, line: tok.line };
          continue;
        }

        if (this.is('op', '[')) {
          const tok = this.next();
          const index = this.parseExpression();
          this.expect('op', ']', 'The index is missing a closing "]"');
          expr = { type: 'Index', object: expr, index: index, line: tok.line };
          continue;
        }

        if (this.is('op', '.')) {
          const tok = this.next();
          const name = this.expect('ident', undefined, 'Expected a property name after "."');
          expr = { type: 'Member', object: expr, name: name.value, line: tok.line };
          continue;
        }

        break;
      }
      return expr;
    }

    tryParenLambda() {
      const save = this.pos;
      let p = this.pos;

      if (!(this.tokens[p] && this.tokens[p].type === 'op' && this.tokens[p].value === '(')) return null;
      p += 1;

      const names = [];
      if (this.tokens[p] && this.tokens[p].type === 'ident') {
        names.push(this.tokens[p].value);
        p += 1;
        while (this.tokens[p] && this.tokens[p].type === 'op' && this.tokens[p].value === ',') {
          p += 1;
          if (!this.tokens[p] || this.tokens[p].type !== 'ident') {
            this.pos = save;
            return null;
          }
          names.push(this.tokens[p].value);
          p += 1;
        }
      }

      if (names.length === 0) return null;
      if (!(this.tokens[p] && this.tokens[p].type === 'op' && this.tokens[p].value === ')')) return null;
      if (!(this.tokens[p + 1] && this.tokens[p + 1].type === 'op' && this.tokens[p + 1].value === '=>')) return null;

      this.pos = p + 2;
      const body = this.parseExpression();
      return { type: 'Lambda', params: names, body: body, line: this.tokens[save].line };
    }

    parsePrimary() {
      const t = this.peek();

      if (t.type === 'num') {
        this.next();
        return { type: 'Num', value: t.value, line: t.line };
      }

      if (t.type === 'str') {
        this.next();
        return this.parseStringToken(t);
      }

      if (t.type === 'ident') {
        this.next();

        if (this.is('op', '=>')) {
          this.next();
          const body = this.parseExpression();
          return { type: 'Lambda', params: [t.value], body: body, line: t.line };
        }

        return { type: 'Var', name: t.value, line: t.line };
      }

      if (t.type === 'kw') {
        if (t.value === 'true' || t.value === 'false') {
          this.next();
          return { type: 'Bool', value: t.value === 'true', line: t.line };
        }
        if (t.value === 'null') {
          this.next();
          return { type: 'Null', line: t.line };
        }
        if (t.value === 'this') {
          this.next();
          return { type: 'This', line: t.line };
        }
        if (t.value === 'super') {
          this.next();
          return { type: 'Super', line: t.line };
        }
        if (t.value === 'new') {
          this.next();
          const target = this.parsePrimary();
          let args = [];
          if (this.is('op', '(')) args = this.parseArguments();
          return { type: 'New', target: target, args: args, line: t.line };
        }
        if (t.value === 'fun') {
          this.error('Anonymous functions use arrow syntax', t, 'Write: x => x * 2');
        }
      }

      if (t.type === 'op' && t.value === '(') {
        const lambda = this.tryParenLambda();
        if (lambda) return lambda;

        this.next();
        const expr = this.parseExpression();
        this.expect('op', ')', 'The expression is missing a closing ")"');
        return expr;
      }

      if (t.type === 'op' && t.value === '[') {
        this.next();
        const items = [];
        if (!this.is('op', ']')) {
          for (;;) {
            items.push(this.parseExpression());
            if (!this.eat('op', ',')) break;
            if (this.is('op', ']')) break;
          }
        }
        this.expect('op', ']', 'The list is missing a closing "]"');
        return { type: 'List', items: items, line: t.line };
      }

      if (t.type === 'op' && t.value === '{') {
        this.next();
        const entries = [];
        if (!this.is('op', '}')) {
          for (;;) {
            const k = this.peek();
            let key = null;

            if (k.type === 'ident') {
              key = k.value;
              this.next();
            } else if (k.type === 'str') {
              key = unescapeText(k.value.raw);
              this.next();
            } else if (k.type === 'num') {
              key = String(k.value);
              this.next();
            } else {
              this.error('A map key must be a name, string, or number', k,
                'Example: {name: "Ada", age: 20}');
            }

            this.expect('op', ':', 'Expected ":" after the map key', 'Example: {name: "Ada"}');
            entries.push({ key: key, value: this.parseExpression(), line: k.line });

            if (!this.eat('op', ',')) break;
            if (this.is('op', '}')) break;
          }
        }
        this.expect('op', '}', 'The map is missing a closing "}"');
        return { type: 'Map', entries: entries, line: t.line };
      }

      this.error('Expected a value (number, string, variable, ...) here', t);
    }

    parseStringToken(token) {
      const raw = token.value.raw;

      if (token.value.rawString) {
        return {
          type: 'Str',
          parts: raw ? [{ kind: 'text', value: raw }] : [],
          line: token.line
        };
      }

      const parts = [];
      let text = '';
      let i = 0;

      while (i < raw.length) {
        const ch = raw[i];

        if (ch === '\\') {
          if (i + 1 < raw.length) {
            text += ch + raw[i + 1];
            i += 2;
          } else {
            text += ch;
            i += 1;
          }
          continue;
        }

        if (ch === '{') {
          let depth = 1;
          let j = i + 1;
          let quote = null;

          while (j < raw.length) {
            const c = raw[j];

            if (c === '\\') {
              j += 2;
              continue;
            }

            if (quote) {
              if (c === quote) quote = null;
              j += 1;
              continue;
            }
            if (c === '"' || c === "'") {
              quote = c;
              j += 1;
              continue;
            }
            if (c === '{') depth += 1;
            else if (c === '}') {
              depth -= 1;
              if (depth === 0) break;
            }
            j += 1;
          }

          if (depth !== 0) {
            this.error('An opening "{" inside a string was never closed', token, 'Use \\{ for a literal brace');
          }

          if (text) {
            parts.push({ kind: 'text', value: unescapeText(text) });
            text = '';
          }

          const inner = raw.slice(i + 1, j);
          if (!inner.trim()) this.error('The {} placeholder is empty', token, 'Put an expression inside, like {name}');

          const subTokens = tokenize(inner, token.line - 1);
          const sub = new Parser(subTokens, inner);
          const expr = sub.parseExpression();
          sub.skipNl();
          if (sub.peek().type !== 'eof') sub.error('Unexpected extra input inside {}', sub.peek());
          parts.push({ kind: 'expr', expr: expr });
          i = j + 1;
          continue;
        }

        text += ch;
        i += 1;
      }

      if (text) parts.push({ kind: 'text', value: unescapeText(text) });
      return { type: 'Str', parts: parts, line: token.line };
    }
  }

  function unescapeText(raw) {
    let out = '';
    for (let i = 0; i < raw.length; i += 1) {
      const c = raw[i];
      if (c === '\\' && i + 1 < raw.length) {
        const nx = raw[i + 1];
        i += 1;
        switch (nx) {
          case 'n': out += '\n'; break;
          case 't': out += '\t'; break;
          case 'r': out += '\r'; break;
          case '0': out += '\0'; break;
          case '\\': out += '\\'; break;
          case '"': out += '"'; break;
          case "'": out += "'"; break;
          case '{': out += '{'; break;
          case '}': out += '}'; break;
          default: out += nx; break;
        }
      } else {
        out += c;
      }
    }
    return out;
  }

  /* ============================================================
     RUNTIME TYPES
     ============================================================ */

  class AzFunction {
    constructor(name, params, body, closure, line, exprBody) {
      this.name = name || '<lambda>';
      this.params = params || [];
      this.body = body || [];
      this.closure = closure;
      this.line = line || 0;
      this.exprBody = exprBody || null;
    }
  }

  class AzClass {
    constructor(name, parent) {
      this.name = name;
      this.parent = parent || null;
      this.methods = new Map();
    }
  }

  class AzInstance {
    constructor(klass) {
      this.klass = klass;
      this.fields = Object.create(null);
    }
  }

  class SuperRef {
    constructor(instance, klass) {
      this.instance = instance;
      this.klass = klass;
    }
  }

  class BreakSignal {
    constructor(line) { this.line = line; }
  }

  class ContinueSignal {
    constructor(line) { this.line = line; }
  }

  class ReturnSignal {
    constructor(value, line) {
      this.value = value;
      this.line = line;
    }
  }

  class ThrownSignal {
    constructor(value, line) {
      this.value = value;
      this.line = line;
    }
  }

  /* ============================================================
     VALUE HELPERS
     ============================================================ */

  function isMap(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v) &&
      !(v instanceof AzInstance) && !(v instanceof AzClass) && !(v instanceof SuperRef);
  }

  function truthy(v) {
    if (v === false || v === null || v === undefined) return false;
    if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
    if (typeof v === 'string') return v.length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (isMap(v)) return Object.keys(v).length > 0;
    return true;
  }

  function formatNumber(v) {
    if (Number.isInteger(v)) return String(v);
    if (!Number.isFinite(v)) return String(v);
    return String(Math.round(v * 1e12) / 1e12);
  }

  function repr(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number') return formatNumber(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'string') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(repr).join(', ') + ']';
    if (v instanceof AzInstance) {
      const fields = Object.keys(v.fields);
      if (!fields.length) return v.klass.name + ' {}';
      return v.klass.name + ' {' + fields.map(function (k) {
        return k + ': ' + repr(v.fields[k]);
      }).join(', ') + '}';
    }
    if (v instanceof AzClass) return '<class ' + v.name + '>';
    if (v instanceof AzFunction) return '<fun ' + v.name + '>';
    if (typeof v === 'function') return '<builtin ' + (v.azName || 'function') + '>';
    if (isMap(v)) {
      return '{' + Object.keys(v).map(function (k) {
        const label = /^[A-Za-z_\p{L}][A-Za-z0-9_\p{L}\p{N}]*$/u.test(k) ? k : JSON.stringify(k);
        return label + ': ' + repr(v[k]);
      }).join(', ') + '}';
    }
    return String(v);
  }

  function display(v) {
    if (typeof v === 'string') return v;
    return repr(v);
  }

  function typeName(v) {
    if (v === null) return 'null';
    if (typeof v === 'number') return 'number';
    if (typeof v === 'string') return 'string';
    if (typeof v === 'boolean') return 'boolean';
    if (Array.isArray(v)) return 'list';
    if (v instanceof AzFunction) return 'function';
    if (v instanceof AzClass) return 'class';
    if (v instanceof AzInstance) return 'instance';
    if (typeof v === 'function') return 'function';
    if (isMap(v)) return 'map';
    return 'unknown';
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    if (isMap(a) && isMap(b)) {
      const ka = Object.keys(a);
      const kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      for (let i = 0; i < ka.length; i += 1) {
        if (!Object.prototype.hasOwnProperty.call(b, ka[i])) return false;
        if (!deepEqual(a[ka[i]], b[ka[i]])) return false;
      }
      return true;
    }
    return false;
  }

  function containsValue(container, value, line) {
    if (isMap(container)) {
      return Object.prototype.hasOwnProperty.call(container, String(value));
    }
    if (Array.isArray(container)) {
      for (let i = 0; i < container.length; i += 1) {
        if (deepEqual(container[i], value)) return true;
      }
      return false;
    }
    if (typeof container === 'string') {
      return container.indexOf(typeof value === 'string' ? value : display(value)) !== -1;
    }
    throw new AzError('"in" works with lists, maps, and strings, not ' + typeName(container), line);
  }

  function editDistance(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let cur = new Array(n + 1);
    for (let j = 0; j <= n; j += 1) prev[j] = j;
    for (let i = 1; i <= m; i += 1) {
      cur[0] = i;
      for (let j = 1; j <= n; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      const tmp = prev;
      prev = cur;
      cur = tmp;
    }
    return prev[n];
  }

  /* ============================================================
     ENVIRONMENT
     ============================================================ */

  class Env {
    constructor(parent) {
      this.vars = new Map();
      this.consts = new Set();
      this.parent = parent || null;
    }

    define(name, value, isConst) {
      this.vars.set(name, value);
      if (isConst) this.consts.add(name);
      else this.consts.delete(name);
    }

    has(name) {
      let env = this;
      while (env) {
        if (env.vars.has(name)) return true;
        env = env.parent;
      }
      return false;
    }

    names() {
      const out = [];
      const seen = new Set();
      let env = this;
      while (env) {
        for (const k of env.vars.keys()) {
          if (!seen.has(k)) {
            seen.add(k);
            out.push(k);
          }
        }
        env = env.parent;
      }
      return out;
    }

    get(name, line) {
      let env = this;
      while (env) {
        if (env.vars.has(name)) return env.vars.get(name);
        env = env.parent;
      }

      let best = null;
      let bestD = Infinity;
      for (const candidate of this.names()) {
        const d = editDistance(name, candidate);
        if (d < bestD) {
          bestD = d;
          best = candidate;
        }
      }

      const err = new AzError('Variable "' + name + '" is not defined', line);
      if (name === 'print') {
        err.hint = 'Use say to print:  say "Hello"';
      } else if (name === 'this') {
        err.hint = 'this can only be used inside a method';
      } else if (name === 'super') {
        err.hint = 'super can only be used inside a method of a child class';
      } else if (best && name.length >= 3 && bestD <= 2 && bestD < name.length - 1) {
        err.hint = 'Did you mean "' + best + '"?';
      } else {
        err.hint = 'Define it first:  let ' + name + ' = ...';
      }
      throw err;
    }

    setExisting(name, value, line) {
      let env = this;
      while (env) {
        if (env.vars.has(name)) {
          if (env.consts.has(name)) {
            const err = new AzError('Cannot assign to constant "' + name + '"', line);
            err.hint = 'Constants are read-only. Use let for a value you want to change';
            throw err;
          }
          env.vars.set(name, value);
          return;
        }
        env = env.parent;
      }
      const err = new AzError('Variable "' + name + '" is not defined', line);
      err.hint = 'Define it first:  let ' + name + ' = ...';
      throw err;
    }
  }

  /* ============================================================
     INTERPRETER — STATEMENTS
     ============================================================ */

  class Interpreter {
    constructor(options) {
      options = options || {};
      this.out = options.out || function (s) { console.log(s); };
      this.ask = options.ask || function () { return null; };
      this.maxSteps = options.maxSteps || 5000000;
      this.steps = 0;
      this.depth = 0;
      this.maxDepth = 256;
    }

    tick(line) {
      this.steps += 1;
      if (this.steps > this.maxSteps) {
        const err = new AzError('Execution stopped: the program ran for too long', line);
        err.hint = 'Check for an infinite loop, or increase the step limit';
        throw err;
      }
    }

    run(program) {
      const env = new Env(null);
      installBuiltins(env);
      env.define('PI', Math.PI, true);
      env.define('E', Math.E, true);
      env.define('TAU', Math.PI * 2, true);

      try {
        this.execBlock(program.body, env);
      } catch (e) {
        if (e instanceof BreakSignal) throw new AzError('"break" can only be used inside a loop', e.line);
        if (e instanceof ContinueSignal) throw new AzError('"continue" can only be used inside a loop', e.line);
        if (e instanceof ReturnSignal) throw new AzError('"return" can only be used inside a function', e.line);
        if (e instanceof ThrownSignal) {
          const err = new AzError('Uncaught value: ' + display(e.value), e.line);
          if (isMap(e.value) && typeof e.value.message === 'string') {
            err.message = 'Uncaught error: ' + e.value.message;
            if (typeof e.value.hint === 'string') err.hint = e.value.hint;
          }
          throw err;
        }
        throw e;
      }
    }

    execBlock(body, env) {
      for (let i = 0; i < body.length; i += 1) this.exec(body[i], env);
    }

    exec(stmt, env) {
      this.tick(stmt.line);

      switch (stmt.type) {
        case 'Let': {
          env.define(stmt.name, this.eval(stmt.value, env), stmt.constant);
          return;
        }

        case 'Assign': {
          let value;
          if (stmt.op === '=') {
            value = this.eval(stmt.value, env);
          } else {
            const current = this.readTarget(stmt.target, env);
            const next = this.eval(stmt.value, env);
            value = this.applyBinary(stmt.op.slice(0, -1), current, next, stmt.line);
          }
          this.setTarget(stmt.target, value, env);
          return;
        }

        case 'Say': {
          const parts = stmt.values.map((v) => display(this.eval(v, env)));
          this.out(parts.join(' '));
          return;
        }

        case 'If': {
          for (let i = 0; i < stmt.branches.length; i += 1) {
            const branch = stmt.branches[i];
            if (truthy(this.eval(branch.cond, env))) {
              this.execBlock(branch.body, env);
              return;
            }
          }
          if (stmt.elseBody) this.execBlock(stmt.elseBody, env);
          return;
        }

        case 'While': {
          for (;;) {
            this.tick(stmt.line);
            if (!truthy(this.eval(stmt.cond, env))) break;
            try {
              this.execBlock(stmt.body, env);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) continue;
              throw e;
            }
          }
          return;
        }

        case 'For': {
          const iterable = this.eval(stmt.iterable, env);
          let items;

          if (stmt.names.length > 1 && isMap(iterable)) {
            items = Object.keys(iterable).map(function (k) { return [k, iterable[k]]; });
          } else {
            items = iterate(iterable, stmt.line);
          }

          for (let i = 0; i < items.length; i += 1) {
            this.tick(stmt.line);
            const item = items[i];

            if (stmt.names.length === 1) {
              env.define(stmt.names[0], item);
            } else {
              if (!Array.isArray(item)) {
                const err = new AzError(
                  'This loop expects ' + stmt.names.length + ' values per item, but got ' + typeName(item),
                  stmt.line
                );
                err.hint = 'Use enumerate(list) or zip(a, b) to produce pairs';
                throw err;
              }
              for (let k = 0; k < stmt.names.length; k += 1) {
                env.define(stmt.names[k], k < item.length ? item[k] : null);
              }
            }

            try {
              this.execBlock(stmt.body, env);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) continue;
              throw e;
            }
          }
          return;
        }

        case 'Repeat': {
          const count = this.eval(stmt.count, env);
          if (typeof count !== 'number' || !Number.isInteger(count)) {
            throw new AzError('repeat needs a whole number, not ' + typeName(count), stmt.line);
          }
          if (count < 0) throw new AzError('repeat cannot use a negative number', stmt.line);
          if (count > 10000000) throw new AzError('repeat count is too large', stmt.line);

          for (let i = 0; i < count; i += 1) {
            this.tick(stmt.line);
            try {
              this.execBlock(stmt.body, env);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) continue;
              throw e;
            }
          }
          return;
        }

        case 'Fun': {
          env.define(stmt.name, new AzFunction(stmt.name, stmt.params, stmt.body, env, stmt.line));
          return;
        }

        case 'Class': {
          let parentClass = null;
          if (stmt.parent) {
            parentClass = env.get(stmt.parent, stmt.line);
            if (!(parentClass instanceof AzClass)) {
              throw new AzError('"' + stmt.parent + '" is not a class', stmt.line);
            }
          }

          const klass = new AzClass(stmt.name, parentClass);
          for (let i = 0; i < stmt.methods.length; i += 1) {
            const m = stmt.methods[i];
            klass.methods.set(m.name, new AzFunction(m.name, m.params, m.body, env, m.line));
          }
          env.define(stmt.name, klass);
          return;
        }

        case 'Try': {
          try {
            this.execBlock(stmt.body, env);
          } catch (e) {
            if (e instanceof BreakSignal || e instanceof ContinueSignal || e instanceof ReturnSignal) throw e;
            if (!stmt.catchBody) throw e;

            let value;
            if (e instanceof AzError) {
              value = {
                message: e.message,
                line: e.line,
                kind: e.kind,
                hint: e.hint || null
              };
            } else if (e instanceof ThrownSignal) {
              value = e.value;
            } else {
              throw e;
            }

            env.define(stmt.catchName, value);
            this.execBlock(stmt.catchBody, env);
          }
          return;
        }

        case 'Throw': {
          throw new ThrownSignal(this.eval(stmt.value, env), stmt.line);
        }

        case 'Match': {
          const subject = this.eval(stmt.subject, env);
          let matched = false;

          for (let i = 0; i < stmt.cases.length && !matched; i += 1) {
            const c = stmt.cases[i];
            for (let k = 0; k < c.values.length; k += 1) {
              const pattern = c.values[k];
              if (pattern.type === 'Var' && pattern.name === '_') {
                matched = true;
              } else {
                matched = deepEqual(subject, this.eval(pattern, env));
              }
              if (matched) break;
            }
            if (matched) this.execBlock(c.body, env);
          }

          if (!matched && stmt.defaultBody) this.execBlock(stmt.defaultBody, env);
          return;
        }

        case 'Return':
          throw new ReturnSignal(stmt.value ? this.eval(stmt.value, env) : null, stmt.line);

        case 'Break':
          throw new BreakSignal(stmt.line);

        case 'Continue':
          throw new ContinueSignal(stmt.line);

        case 'ExprStmt':
          this.eval(stmt.expr, env);
          return;

        default:
          throw new AzError('Unknown statement type: ' + stmt.type, stmt.line);
      }
    }

    readTarget(target, env) {
      if (target.type === 'Var') return env.get(target.name, target.line);
      if (target.type === 'Index') {
        return this.getIndex(
          this.eval(target.object, env),
          this.eval(target.index, env),
          target.line
        );
      }
      if (target.type === 'Member') {
        return this.getMember(this.eval(target.object, env), target.name, target.line);
      }
      throw new AzError('Invalid assignment target', target.line);
    }

    setTarget(target, value, env) {
      if (target.type === 'Var') {
        env.setExisting(target.name, value, target.line);
        return;
      }

      if (target.type === 'Index') {
        const obj = this.eval(target.object, env);
        const idx = this.eval(target.index, env);

        if (Array.isArray(obj)) {
          obj[normalizeIndex(obj, idx, target.line)] = value;
          return;
        }
        if (isMap(obj)) {
          obj[String(idx)] = value;
          return;
        }
        throw new AzError('Cannot assign into ' + typeName(obj) + ' by index', target.line);
      }

      if (target.type === 'Member') {
        const obj = this.eval(target.object, env);
        this.setMember(obj, target.name, value, target.line);
        return;
      }

      throw new AzError('Invalid assignment target', target.line);
    }

    /* ---------- expressions ---------- */

    eval(node, env) {
      this.tick(node.line);

      switch (node.type) {
        case 'Num':
          return node.value;

        case 'Bool':
          return node.value;

        case 'Null':
          return null;

        case 'Str': {
          let out = '';
          for (let i = 0; i < node.parts.length; i += 1) {
            const part = node.parts[i];
            out += part.kind === 'text' ? part.value : display(this.eval(part.expr, env));
          }
          return out;
        }

        case 'Var':
          return env.get(node.name, node.line);

        case 'This':
          return env.get('this', node.line);

        case 'Super':
          return env.get('super', node.line);

        case 'List':
          return node.items.map((item) => this.eval(item, env));

        case 'Map': {
          const obj = Object.create(null);
          for (let i = 0; i < node.entries.length; i += 1) {
            const entry = node.entries[i];
            obj[entry.key] = this.eval(entry.value, env);
          }
          return obj;
        }

        case 'Lambda':
          return new AzFunction(
            '<lambda>',
            node.params.map(function (name) { return { name: name, def: null }; }),
            [],
            env,
            node.line,
            node.body
          );

        case 'Unary': {
          const v = this.eval(node.expr, env);
          if (node.op === 'not') return !truthy(v);
          if (typeof v !== 'number') {
            throw new AzError('Unary "-" needs a number, not ' + typeName(v), node.line);
          }
          return -v;
        }

        case 'Binary':
          return this.evalBinary(node, env);

        case 'Call':
          return this.evalCall(node, env);

        case 'Index': {
          const obj = this.eval(node.object, env);
          const idx = this.eval(node.index, env);
          return this.getIndex(obj, idx, node.line);
        }

        case 'Member': {
          const obj = this.eval(node.object, env);
          return this.getMember(obj, node.name, node.line);
        }

        case 'New': {
          const klass = this.eval(node.target, env);
          if (!(klass instanceof AzClass)) {
            throw new AzError('"new" needs a class, not ' + typeName(klass), node.line);
          }
          return this.construct(klass, node.args.map((a) => this.eval(a, env)), node);
        }

        default:
          throw new AzError('Unknown expression type: ' + node.type, node.line);
      }
    }

    evalBinary(node, env) {
      const op = node.op;

      if (op === 'and') {
        const left = this.eval(node.left, env);
        if (!truthy(left)) return false;
        return truthy(this.eval(node.right, env));
      }

      if (op === 'or') {
        const left = this.eval(node.left, env);
        if (truthy(left)) return true;
        return truthy(this.eval(node.right, env));
      }

      const a = this.eval(node.left, env);
      const b = this.eval(node.right, env);
      return this.applyBinary(op, a, b, node.line);
    }

    applyBinary(op, a, b, line) {
      switch (op) {
        case '+': {
          if (typeof a === 'number' && typeof b === 'number') return clean(a + b);
          if (typeof a === 'string' || typeof b === 'string') return display(a) + display(b);
          if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
          if (isMap(a) && isMap(b)) {
            const merged = Object.create(null);
            Object.keys(a).forEach(function (k) { merged[k] = a[k]; });
            Object.keys(b).forEach(function (k) { merged[k] = b[k]; });
            return merged;
          }
          throw new AzError('Cannot add ' + typeName(a) + ' and ' + typeName(b), line);
        }

        case '-': {
          if (typeof a !== 'number' || typeof b !== 'number') {
            throw new AzError('Subtraction needs two numbers, not ' + typeName(a) + ' and ' + typeName(b), line);
          }
          return clean(a - b);
        }

        case '*': {
          if (typeof a === 'number' && typeof b === 'number') return clean(a * b);
          if (typeof a === 'string' && typeof b === 'number') return a.repeat(Math.max(0, Math.floor(b)));
          if (typeof b === 'string' && typeof a === 'number') return b.repeat(Math.max(0, Math.floor(a)));
          if (Array.isArray(a) && typeof b === 'number') {
            const out = [];
            for (let i = 0; i < Math.max(0, Math.floor(b)); i += 1) out.push.apply(out, a);
            return out;
          }
          throw new AzError('Cannot multiply ' + typeName(a) + ' by ' + typeName(b), line);
        }

        case '/': {
          if (typeof a !== 'number' || typeof b !== 'number') {
            throw new AzError('Division needs two numbers', line);
          }
          if (b === 0) throw new AzError('Cannot divide by zero', line);
          return clean(a / b);
        }

        case '//': {
          if (typeof a !== 'number' || typeof b !== 'number') {
            throw new AzError('Floor division needs two numbers', line);
          }
          if (b === 0) throw new AzError('Cannot divide by zero', line);
          return Math.floor(a / b);
        }

        case '%': {
          if (typeof a !== 'number' || typeof b !== 'number') {
            throw new AzError('Modulo needs two numbers', line);
          }
          if (b === 0) throw new AzError('Cannot take a remainder of zero', line);
          return clean(a - Math.floor(a / b) * b);
        }

        case '**': {
          if (typeof a !== 'number' || typeof b !== 'number') {
            throw new AzError('Exponentiation needs two numbers', line);
          }
          const result = Math.pow(a, b);
          if (Number.isNaN(result)) throw new AzError('The result of "**" is not a number', line);
          if (!Number.isFinite(result)) throw new AzError('The result of "**" is too large', line);
          return clean(result);
        }

        case '==':
          return deepEqual(a, b);

        case '!=':
          return !deepEqual(a, b);

        case '<':
        case '<=':
        case '>':
        case '>=': {
          let cmp;
          if (typeof a === 'number' && typeof b === 'number') {
            cmp = a < b ? -1 : a > b ? 1 : 0;
          } else if (typeof a === 'string' && typeof b === 'string') {
            cmp = a < b ? -1 : a > b ? 1 : 0;
          } else {
            throw new AzError(
              'Cannot compare ' + typeName(a) + ' with ' + typeName(b),
              line,
              'runtime'
            );
          }
          if (op === '<') return cmp < 0;
          if (op === '<=') return cmp <= 0;
          if (op === '>') return cmp > 0;
          return cmp >= 0;
        }

        case 'in':
          return containsValue(b, a, line);

        default:
          throw new AzError('Unknown operator: ' + op, line);
      }
    }

    evalCall(node, env) {
      const callee = this.eval(node.callee, env);
      const args = node.args.map((a) => this.eval(a, env));

      if (callee instanceof SuperRef) {
        const found = this.findMethod(callee.klass, 'init');
        if (!found) {
          throw new AzError('The parent class has no "init" method', node.line);
        }
        return this.callFunction(found.fn, args, node, callee.instance, found.owner);
      }

      if (callee instanceof AzClass) {
        const err = new AzError('Cannot call class "' + callee.name + '" directly', node.line);
        err.hint = 'Create an instance with: new ' + callee.name + '(...)';
        throw err;
      }

      if (callee instanceof AzFunction || typeof callee === 'function') {
        return this.callFunction(callee, args, node);
      }

      throw new AzError(
        'This value is not callable (' + typeName(callee) + ')',
        node.line,
        'runtime'
      );
    }

    callFunction(fn, args, node, thisValue, ownerClass) {
      if (typeof fn === 'function') return fn(this, args, node);
      if (!(fn instanceof AzFunction)) {
        throw new AzError('This value is not callable (' + typeName(fn) + ')', node.line);
      }

      const params = fn.params;
      if (args.length > params.length) {
        throw new AzError(
          'Function "' + fn.name + '" takes at most ' + params.length +
          ' argument' + (params.length === 1 ? '' : 's') + ', but got ' + args.length,
          node.line
        );
      }

      const local = new Env(fn.closure);

      for (let i = 0; i < params.length; i += 1) {
        const p = params[i];
        if (i < args.length) {
          local.define(p.name, args[i]);
        } else if (p.def !== null && p.def !== undefined) {
          local.define(p.name, this.eval(p.def, local));
        } else {
          const err = new AzError(
            'Function "' + fn.name + '" is missing argument "' + p.name + '"',
            node.line
          );
          err.hint = 'Pass ' + params.length + ' argument' + (params.length === 1 ? '' : 's');
          throw err;
        }
      }

      if (thisValue !== undefined && thisValue !== null) {
        local.define('this', thisValue);
      }

      if (ownerClass && ownerClass.parent) {
        local.define('super', new SuperRef(thisValue, ownerClass.parent));
      }

      if (this.depth >= this.maxDepth) {
        throw new AzError('Too many nested function calls (possible runaway recursion)', node.line);
      }

      this.depth += 1;
      try {
        if (fn.exprBody) {
          return this.eval(fn.exprBody, local);
        }
        try {
          this.execBlock(fn.body, local);
        } catch (e) {
          if (e instanceof ReturnSignal) return e.value;
          throw e;
        }
        return null;
      } finally {
        this.depth -= 1;
      }
    }

    findMethod(klass, name) {
      let k = klass;
      while (k) {
        if (k.methods.has(name)) {
          return { fn: k.methods.get(name), owner: k };
        }
        k = k.parent;
      }
      return null;
    }

    makeBound(fn, instance, owner) {
      const bound = function (it, args, node) {
        return it.callFunction(fn, args, node, instance, owner);
      };
      bound.azName = fn.name;
      return bound;
    }

    construct(klass, args, node) {
      const instance = new AzInstance(klass);
      const init = this.findMethod(klass, 'init');

      if (init) {
        this.callFunction(init.fn, args, node, instance, init.owner);
      } else if (args.length > 0) {
        throw new AzError(
          'Class "' + klass.name + '" has no init method, but got ' + args.length + ' argument(s)',
          node.line
        );
      }

      return instance;
    }

    getMember(obj, name, line) {
      if (obj instanceof AzInstance) {
        if (Object.prototype.hasOwnProperty.call(obj.fields, name)) {
          return obj.fields[name];
        }
        const found = this.findMethod(obj.klass, name);
        if (found) return this.makeBound(found.fn, obj, found.owner);

        const err = new AzError(
          'Instance of "' + obj.klass.name + '" has no property "' + name + '"',
          line
        );
        const fields = Object.keys(obj.fields);
        const methods = [];
        let k = obj.klass;
        while (k) {
          for (const m of k.methods.keys()) {
            if (methods.indexOf(m) === -1) methods.push(m);
          }
          k = k.parent;
        }
        const all = fields.concat(methods);
        if (all.length) err.hint = 'Available: ' + all.join(', ');
        throw err;
      }

      if (obj instanceof SuperRef) {
        const found = this.findMethod(obj.klass, name);
        if (found) return this.makeBound(found.fn, obj.instance, found.owner);
        throw new AzError('The parent class has no method "' + name + '"', line);
      }

      if (isMap(obj)) {
        if (!Object.prototype.hasOwnProperty.call(obj, name)) {
          const err = new AzError('Key "' + name + '" is not in this map', line);
          const keys = Object.keys(obj);
          if (keys.length) err.hint = 'Keys: ' + keys.join(', ');
          throw err;
        }
        return obj[name];
      }

      if (obj instanceof AzClass) {
        const err = new AzError('Classes do not have static members', line);
        err.hint = 'Create an instance with new ' + obj.name + '(...)';
        throw err;
      }

      throw new AzError(typeName(obj) + ' has no properties', line);
    }

    setMember(obj, name, value, line) {
      if (obj instanceof AzInstance) {
        obj.fields[name] = value;
        return;
      }
      if (isMap(obj)) {
        obj[name] = value;
        return;
      }
      if (obj instanceof SuperRef) {
        throw new AzError('Cannot assign through super', line);
      }
      throw new AzError('Cannot set property "' + name + '" on ' + typeName(obj), line);
    }

    getIndex(obj, idx, line) {
      if (Array.isArray(obj)) {
        return obj[normalizeIndex(obj, idx, line)];
      }

      if (typeof obj === 'string') {
        const chars = Array.from(obj);
        return chars[normalizeIndex(chars, idx, line)];
      }

      if (isMap(obj)) {
        const key = String(idx);
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
          const err = new AzError('Key "' + key + '" is not in this map', line);
          const keys = Object.keys(obj);
          if (keys.length) err.hint = 'Keys: ' + keys.join(', ');
          throw err;
        }
        return obj[key];
      }

      throw new AzError(typeName(obj) + ' cannot be indexed', line);
    }
  }

  function clean(n) {
    if (Number.isInteger(n)) return n;
    return Math.round(n * 1e12) / 1e12;
  }

  function normalizeIndex(list, idx, line) {
    if (typeof idx !== 'number' || !Number.isInteger(idx)) {
      throw new AzError('An index must be a whole number, not ' + typeName(idx), line);
    }
    const i = idx < 0 ? list.length + idx : idx;
    if (i < 0 || i >= list.length) {
      throw new AzError(
        'Index ' + idx + ' is out of range (length is ' + list.length + ')',
        line
      );
    }
    return i;
  }

  function iterate(value, line) {
    if (Array.isArray(value)) return value.slice();
    if (typeof value === 'string') return Array.from(value);
    if (isMap(value)) return Object.keys(value);
    throw new AzError('' + typeName(value) + ' cannot be looped over', line);
  }

  /* ============================================================
     BUILT-IN FUNCTIONS
     ============================================================ */

  function builtin(name, fn) {
    fn.azName = name;
    return fn;
  }

  function need(args, n, name, line) {
    if (args.length !== n) {
      throw new AzError(
        '"' + name + '" takes ' + n + ' argument' + (n === 1 ? '' : 's') +
        ', but got ' + args.length,
        line
      );
    }
  }

  function needBetween(args, min, max, name, line) {
    if (args.length < min || args.length > max) {
      const expected = min === max ? String(min) : min + ' to ' + max;
      throw new AzError(
        '"' + name + '" takes ' + expected + ' argument' + (max === 1 ? '' : 's') +
        ', but got ' + args.length,
        line
      );
    }
  }

  function wantNum(v, name, line) {
    if (typeof v !== 'number') {
      throw new AzError('"' + name + '" needs a number, not ' + typeName(v), line);
    }
    return v;
  }

  function wantInt(v, name, line) {
    wantNum(v, name, line);
    if (!Number.isInteger(v)) {
      throw new AzError('"' + name + '" needs a whole number, not ' + v, line);
    }
    return v;
  }

  function wantStr(v, name, line) {
    if (typeof v !== 'string') {
      throw new AzError('"' + name + '" needs a string, not ' + typeName(v), line);
    }
    return v;
  }

  function wantList(v, name, line) {
    if (!Array.isArray(v)) {
      throw new AzError('"' + name + '" needs a list, not ' + typeName(v), line);
    }
    return v;
  }

  function wantMap(v, name, line) {
    if (!isMap(v)) {
      throw new AzError('"' + name + '" needs a map, not ' + typeName(v), line);
    }
    return v;
  }

  function wantFn(v, name, line) {
    if (!(v instanceof AzFunction) && typeof v !== 'function') {
      throw new AzError('"' + name + '" needs a function, not ' + typeName(v), line);
    }
    return v;
  }

  function sliceBounds(length, start, end) {
    let s = start === undefined ? 0 : start;
    let e = end === undefined ? length : end;
    if (s < 0) s += length;
    if (e < 0) e += length;
    s = Math.max(0, Math.min(length, s));
    e = Math.max(0, Math.min(length, e));
    return [s, e];
  }

  function toPlain(v, line) {
    if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
    if (Array.isArray(v)) return v.map(function (x) { return toPlain(x, line); });
    if (v instanceof AzInstance) {
      const out = {};
      Object.keys(v.fields).forEach(function (k) { out[k] = toPlain(v.fields[k], line); });
      return out;
    }
    if (isMap(v)) {
      const out = {};
      Object.keys(v).forEach(function (k) { out[k] = toPlain(v[k], line); });
      return out;
    }
    throw new AzError('Cannot convert ' + typeName(v) + ' to JSON', line);
  }

  function fromPlain(v) {
    if (Array.isArray(v)) return v.map(fromPlain);
    if (v !== null && typeof v === 'object') {
      const out = Object.create(null);
      Object.keys(v).forEach(function (k) { out[k] = fromPlain(v[k]); });
      return out;
    }
    return v;
  }

  function compareForSort(a, b, name, line) {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
    throw new AzError('"' + name + '" needs a list of only numbers or only strings', line);
  }

  function installBuiltins(env) {
    const def = function (name, fn) {
      env.define(name, builtin(name, fn), true);
    };

    /* ---------- core ---------- */

    def('len', function (it, args, node) {
      need(args, 1, 'len', node.line);
      const v = args[0];
      if (typeof v === 'string') return Array.from(v).length;
      if (Array.isArray(v)) return v.length;
      if (isMap(v)) return Object.keys(v).length;
      throw new AzError('len works with strings, lists, and maps, not ' + typeName(v), node.line);
    });

    def('type', function (it, args, node) {
      need(args, 1, 'type', node.line);
      return typeName(args[0]);
    });

    def('str', function (it, args, node) {
      need(args, 1, 'str', node.line);
      return display(args[0]);
    });

    def('num', function (it, args, node) {
      need(args, 1, 'num', node.line);
      const v = args[0];
      if (typeof v === 'number') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'string') {
        const trimmed = normalizeDigits(v).trim();
        if (trimmed === '' || !/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) {
          throw new AzError('"' + v + '" is not a number', node.line);
        }
        return Number(trimmed);
      }
      throw new AzError('num cannot convert ' + typeName(v) + ' to a number', node.line);
    });

    def('int', function (it, args, node) {
      need(args, 1, 'int', node.line);
      const v = args[0];
      if (typeof v === 'number') return Math.trunc(v);
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'string') {
        const trimmed = normalizeDigits(v).trim();
        const parsed = Number(trimmed);
        if (trimmed === '' || Number.isNaN(parsed)) {
          throw new AzError('"' + v + '" is not a number', node.line);
        }
        return Math.trunc(parsed);
      }
      throw new AzError('int cannot convert ' + typeName(v) + ' to a number', node.line);
    });

    def('bool', function (it, args, node) {
      need(args, 1, 'bool', node.line);
      return truthy(args[0]);
    });

    def('assert', function (it, args, node) {
      needBetween(args, 1, 2, 'assert', node.line);
      if (!truthy(args[0])) {
        const message = args.length === 2 ? display(args[1]) : 'Assertion failed';
        throw new AzError(message, node.line);
      }
      return true;
    });

    def('fail', function (it, args, node) {
      needBetween(args, 0, 1, 'fail', node.line);
      throw new AzError(args.length ? display(args[0]) : 'fail() was called', node.line);
    });

    def('clock', function (it, args, node) {
      need(args, 0, 'clock', node.line);
      return Date.now();
    });

    def('input', function (it, args, node) {
      needBetween(args, 0, 1, 'input', node.line);
      const question = args.length === 1 ? display(args[0]) : '';
      const answer = it.ask(question);
      return answer === null || answer === undefined ? '' : String(answer);
    });

    /* ---------- math ---------- */

    def('abs', function (it, args, node) {
      need(args, 1, 'abs', node.line);
      return Math.abs(wantNum(args[0], 'abs', node.line));
    });

    def('floor', function (it, args, node) {
      need(args, 1, 'floor', node.line);
      return Math.floor(wantNum(args[0], 'floor', node.line));
    });

    def('ceil', function (it, args, node) {
      need(args, 1, 'ceil', node.line);
      return Math.ceil(wantNum(args[0], 'ceil', node.line));
    });

    def('round', function (it, args, node) {
      needBetween(args, 1, 2, 'round', node.line);
      const n = wantNum(args[0], 'round', node.line);
      if (args.length === 1) return Math.round(n);
      const places = wantInt(args[1], 'round', node.line);
      if (places < 0 || places > 12) {
        throw new AzError('round places must be between 0 and 12', node.line);
      }
      const factor = Math.pow(10, places);
      return Math.round(n * factor) / factor;
    });

    def('sqrt', function (it, args, node) {
      need(args, 1, 'sqrt', node.line);
      const n = wantNum(args[0], 'sqrt', node.line);
      if (n < 0) throw new AzError('sqrt needs a number that is zero or larger', node.line);
      return clean(Math.sqrt(n));
    });

    def('pow', function (it, args, node) {
      need(args, 2, 'pow', node.line);
      const a = wantNum(args[0], 'pow', node.line);
      const b = wantNum(args[1], 'pow', node.line);
      const result = Math.pow(a, b);
      if (!Number.isFinite(result)) throw new AzError('The result of pow is too large', node.line);
      return clean(result);
    });

    def('log', function (it, args, node) {
      needBetween(args, 1, 2, 'log', node.line);
      const n = wantNum(args[0], 'log', node.line);
      if (n <= 0) throw new AzError('log needs a positive number', node.line);
      const base = args.length === 2 ? wantNum(args[1], 'log', node.line) : Math.E;
      if (base <= 0 || base === 1) throw new AzError('log base must be positive and not 1', node.line);
      return clean(Math.log(n) / Math.log(base));
    });

    def('min', function (it, args, node) {
      if (args.length === 0) throw new AzError('min needs at least one value', node.line);
      const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      if (values.length === 0) throw new AzError('min cannot work with an empty list', node.line);
      let best = values[0];
      for (let i = 1; i < values.length; i += 1) {
        if (compareForSort(values[i], best, 'min', node.line) < 0) best = values[i];
      }
      return best;
    });

    def('max', function (it, args, node) {
      if (args.length === 0) throw new AzError('max needs at least one value', node.line);
      const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      if (values.length === 0) throw new AzError('max cannot work with an empty list', node.line);
      let best = values[0];
      for (let i = 1; i < values.length; i += 1) {
        if (compareForSort(values[i], best, 'max', node.line) > 0) best = values[i];
      }
      return best;
    });

    def('sum', function (it, args, node) {
      need(args, 1, 'sum', node.line);
      const list = wantList(args[0], 'sum', node.line);
      let total = 0;
      for (let i = 0; i < list.length; i += 1) {
        if (typeof list[i] !== 'number') {
          throw new AzError('sum needs a list that contains only numbers', node.line);
        }
        total += list[i];
      }
      return clean(total);
    });

    def('avg', function (it, args, node) {
      need(args, 1, 'avg', node.line);
      const list = wantList(args[0], 'avg', node.line);
      if (list.length === 0) throw new AzError('avg cannot work with an empty list', node.line);
      let total = 0;
      for (let i = 0; i < list.length; i += 1) {
        if (typeof list[i] !== 'number') {
          throw new AzError('avg needs a list that contains only numbers', node.line);
        }
        total += list[i];
      }
      return clean(total / list.length);
    });

    def('clamp', function (it, args, node) {
      need(args, 3, 'clamp', node.line);
      const x = wantNum(args[0], 'clamp', node.line);
      const lo = wantNum(args[1], 'clamp', node.line);
      const hi = wantNum(args[2], 'clamp', node.line);
      if (lo > hi) throw new AzError('clamp: the minimum cannot be larger than the maximum', node.line);
      return Math.max(lo, Math.min(hi, x));
    });

    def('random', function (it, args, node) {
      need(args, 2, 'random', node.line);
      const a = wantInt(args[0], 'random', node.line);
      const b = wantInt(args[1], 'random', node.line);
      if (b < a) throw new AzError('random: the second number must be at least as large as the first', node.line);
      return a + Math.floor(Math.random() * (b - a + 1));
    });

    def('random_float', function (it, args, node) {
      need(args, 0, 'random_float', node.line);
      return Math.random();
    });

    def('choice', function (it, args, node) {
      need(args, 1, 'choice', node.line);
      const list = wantList(args[0], 'choice', node.line);
      if (list.length === 0) throw new AzError('choice cannot pick from an empty list', node.line);
      return list[Math.floor(Math.random() * list.length)];
    });

    /* ---------- strings ---------- */

    def('upper', function (it, args, node) {
      need(args, 1, 'upper', node.line);
      return wantStr(args[0], 'upper', node.line).toUpperCase();
    });

    def('lower', function (it, args, node) {
      need(args, 1, 'lower', node.line);
      return wantStr(args[0], 'lower', node.line).toLowerCase();
    });

    def('trim', function (it, args, node) {
      need(args, 1, 'trim', node.line);
      return wantStr(args[0], 'trim', node.line).trim();
    });

    def('starts', function (it, args, node) {
      need(args, 2, 'starts', node.line);
      return wantStr(args[0], 'starts', node.line).startsWith(wantStr(args[1], 'starts', node.line));
    });

    def('ends', function (it, args, node) {
      need(args, 2, 'ends', node.line);
      return wantStr(args[0], 'ends', node.line).endsWith(wantStr(args[1], 'ends', node.line));
    });

    def('find', function (it, args, node) {
      need(args, 2, 'find', node.line);
      const s = wantStr(args[0], 'find', node.line);
      const sub = wantStr(args[1], 'find', node.line);
      return s.indexOf(sub);
    });

    def('replace', function (it, args, node) {
      need(args, 3, 'replace', node.line);
      const s = wantStr(args[0], 'replace', node.line);
      const from = wantStr(args[1], 'replace', node.line);
      const to = wantStr(args[2], 'replace', node.line);
      if (from === '') throw new AzError('replace cannot search for an empty string', node.line);
      return s.split(from).join(to);
    });

    def('split', function (it, args, node) {
      needBetween(args, 1, 2, 'split', node.line);
      const s = wantStr(args[0], 'split', node.line);
      if (args.length === 1) {
        return s.trim() === '' ? [] : s.trim().split(/\s+/);
      }
      const sep = wantStr(args[1], 'split', node.line);
      if (sep === '') return Array.from(s);
      return s.split(sep);
    });

    def('join', function (it, args, node) {
      needBetween(args, 1, 2, 'join', node.line);
      const list = wantList(args[0], 'join', node.line);
      const sep = args.length === 2 ? wantStr(args[1], 'join', node.line) : '';
      return list.map(display).join(sep);
    });

    def('chars', function (it, args, node) {
      need(args, 1, 'chars', node.line);
      return Array.from(wantStr(args[0], 'chars', node.line));
    });

    def('char_code', function (it, args, node) {
      need(args, 1, 'char_code', node.line);
      const s = wantStr(args[0], 'char_code', node.line);
      if (Array.from(s).length !== 1) throw new AzError('char_code needs exactly one character', node.line);
      return s.codePointAt(0);
    });

    def('from_char', function (it, args, node) {
      need(args, 1, 'from_char', node.line);
      const code = wantInt(args[0], 'from_char', node.line);
      if (code < 0 || code > 0x10ffff) throw new AzError('from_char code is out of range', node.line);
      return String.fromCodePoint(code);
    });

    /* ---------- lists & maps ---------- */

    def('append', function (it, args, node) {
      need(args, 2, 'append', node.line);
      const list = wantList(args[0], 'append', node.line);
      list.push(args[1]);
      return list;
    });

    def('prepend', function (it, args, node) {
      need(args, 2, 'prepend', node.line);
      const list = wantList(args[0], 'prepend', node.line);
      list.unshift(args[1]);
      return list;
    });

    def('insert', function (it, args, node) {
      need(args, 3, 'insert', node.line);
      const list = wantList(args[0], 'insert', node.line);
      const index = wantInt(args[1], 'insert', node.line);
      const i = index < 0 ? Math.max(0, list.length + index) : Math.min(index, list.length);
      list.splice(i, 0, args[2]);
      return list;
    });

    def('remove', function (it, args, node) {
      need(args, 2, 'remove', node.line);
      const target = args[0];

      if (Array.isArray(target)) {
        const i = normalizeIndex(target, args[1], node.line);
        return target.splice(i, 1)[0];
      }

      if (isMap(target)) {
        const key = String(args[1]);
        if (!Object.prototype.hasOwnProperty.call(target, key)) {
          throw new AzError('Key "' + key + '" is not in this map', node.line);
        }
        const old = target[key];
        delete target[key];
        return old;
      }

      throw new AzError('remove works with a list (by index) or a map (by key)', node.line);
    });

    def('discard', function (it, args, node) {
      need(args, 2, 'discard', node.line);
      const list = wantList(args[0], 'discard', node.line);
      for (let i = 0; i < list.length; i += 1) {
        if (deepEqual(list[i], args[1])) {
          list.splice(i, 1);
          break;
        }
      }
      return list;
    });

    def('pop', function (it, args, node) {
      needBetween(args, 1, 2, 'pop', node.line);
      const list = wantList(args[0], 'pop', node.line);
      if (list.length === 0) throw new AzError('Cannot pop from an empty list', node.line);
      const idx = args.length === 2 ? wantInt(args[1], 'pop', node.line) : -1;
      return list.splice(normalizeIndex(list, idx, node.line), 1)[0];
    });

    def('sort', function (it, args, node) {
      needBetween(args, 1, 2, 'sort', node.line);
      const list = wantList(args[0], 'sort', node.line);
      const dir = args.length === 2 ? wantStr(args[1], 'sort', node.line) : 'asc';
      if (dir !== 'asc' && dir !== 'desc') {
        throw new AzError('sort direction must be "asc" or "desc"', node.line);
      }
      list.sort(function (a, b) { return compareForSort(a, b, 'sort', node.line); });
      if (dir === 'desc') list.reverse();
      return list;
    });

    def('sorted', function (it, args, node) {
      needBetween(args, 1, 2, 'sorted', node.line);
      const source = wantList(args[0], 'sorted', node.line);
      const copy = source.slice();
      const dir = args.length === 2 ? wantStr(args[1], 'sorted', node.line) : 'asc';
      if (dir !== 'asc' && dir !== 'desc') {
        throw new AzError('sorted direction must be "asc" or "desc"', node.line);
      }
      copy.sort(function (a, b) { return compareForSort(a, b, 'sorted', node.line); });
      if (dir === 'desc') copy.reverse();
      return copy;
    });

    def('reverse', function (it, args, node) {
      need(args, 1, 'reverse', node.line);
      const list = wantList(args[0], 'reverse', node.line);
      list.reverse();
      return list;
    });

    def('reversed', function (it, args, node) {
      need(args, 1, 'reversed', node.line);
      return wantList(args[0], 'reversed', node.line).slice().reverse();
    });

    def('slice', function (it, args, node) {
      needBetween(args, 1, 3, 'slice', node.line);
      const seq = args[0];
      const start = args.length >= 2 ? wantInt(args[1], 'slice', node.line) : undefined;
      const end = args.length >= 3 ? wantInt(args[2], 'slice', node.line) : undefined;

      if (Array.isArray(seq)) {
        const b = sliceBounds(seq.length, start, end);
        return seq.slice(b[0], b[1]);
      }
      if (typeof seq === 'string') {
        const chars = Array.from(seq);
        const b = sliceBounds(chars.length, start, end);
        return chars.slice(b[0], b[1]).join('');
      }
      throw new AzError('slice works with lists and strings', node.line);
    });

    def('concat', function (it, args, node) {
      need(args, 2, 'concat', node.line);
      const a = args[0];
      const b = args[1];
      if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      throw new AzError('concat needs two lists or two strings', node.line);
    });

    def('unique', function (it, args, node) {
      need(args, 1, 'unique', node.line);
      const list = wantList(args[0], 'unique', node.line);
      const out = [];
      for (let i = 0; i < list.length; i += 1) {
        let seen = false;
        for (let j = 0; j < out.length; j += 1) {
          if (deepEqual(out[j], list[i])) { seen = true; break; }
        }
        if (!seen) out.push(list[i]);
      }
      return out;
    });

    def('flatten', function (it, args, node) {
      need(args, 1, 'flatten', node.line);
      const list = wantList(args[0], 'flatten', node.line);
      const out = [];
      for (let i = 0; i < list.length; i += 1) {
        if (Array.isArray(list[i])) out.push.apply(out, list[i]);
        else out.push(list[i]);
      }
      return out;
    });

    def('index_of', function (it, args, node) {
      need(args, 2, 'index_of', node.line);
      const seq = args[0];
      if (Array.isArray(seq)) {
        for (let i = 0; i < seq.length; i += 1) {
          if (deepEqual(seq[i], args[1])) return i;
        }
        return -1;
      }
      if (typeof seq === 'string') {
        return seq.indexOf(wantStr(args[1], 'index_of', node.line));
      }
      throw new AzError('index_of works with lists and strings', node.line);
    });

    def('has', function (it, args, node) {
      need(args, 2, 'has', node.line);
      return containsValue(args[0], args[1], node.line);
    });

    def('list', function (it, args, node) {
      need(args, 1, 'list', node.line);
      const v = args[0];
      if (Array.isArray(v)) return v.slice();
      if (typeof v === 'string') return Array.from(v);
      if (isMap(v)) return Object.keys(v);
      throw new AzError('list can convert a list, string, or map', node.line);
    });

    def('keys', function (it, args, node) {
      need(args, 1, 'keys', node.line);
      return Object.keys(wantMap(args[0], 'keys', node.line));
    });

    def('values', function (it, args, node) {
      need(args, 1, 'values', node.line);
      const map = wantMap(args[0], 'values', node.line);
      return Object.keys(map).map(function (k) { return map[k]; });
    });

    def('items', function (it, args, node) {
      need(args, 1, 'items', node.line);
      const map = wantMap(args[0], 'items', node.line);
      return Object.keys(map).map(function (k) { return [k, map[k]]; });
    });

    def('get', function (it, args, node) {
      needBetween(args, 2, 3, 'get', node.line);
      const map = wantMap(args[0], 'get', node.line);
      const key = String(args[1]);
      if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
      return args.length === 3 ? args[2] : null;
    });

    def('set', function (it, args, node) {
      need(args, 3, 'set', node.line);
      const map = wantMap(args[0], 'set', node.line);
      map[String(args[1])] = args[2];
      return map;
    });

    def('update', function (it, args, node) {
      need(args, 2, 'update', node.line);
      const target = wantMap(args[0], 'update', node.line);
      const source = wantMap(args[1], 'update', node.line);
      Object.keys(source).forEach(function (k) { target[k] = source[k]; });
      return target;
    });

    def('range', function (it, args, node) {
      needBetween(args, 1, 3, 'range', node.line);
      let start = 0;
      let stop = 0;
      let step = 1;

      if (args.length === 1) {
        stop = wantInt(args[0], 'range', node.line);
      } else if (args.length === 2) {
        start = wantInt(args[0], 'range', node.line);
        stop = wantInt(args[1], 'range', node.line);
      } else {
        start = wantInt(args[0], 'range', node.line);
        stop = wantInt(args[1], 'range', node.line);
        step = wantInt(args[2], 'range', node.line);
      }
      if (step === 0) throw new AzError('range step cannot be zero', node.line);

      const out = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) {
          out.push(i);
          if (out.length > 1000000) throw new AzError('range is too large', node.line);
        }
      } else {
        for (let i = start; i > stop; i += step) {
          out.push(i);
          if (out.length > 1000000) throw new AzError('range is too large', node.line);
        }
      }
      return out;
    });

    def('enumerate', function (it, args, node) {
      need(args, 1, 'enumerate', node.line);
      const list = wantList(args[0], 'enumerate', node.line);
      return list.map(function (item, i) { return [i, item]; });
    });

    def('zip', function (it, args, node) {
      if (args.length < 2) throw new AzError('zip needs at least two lists', node.line);
      const lists = args.map(function (v) { return wantList(v, 'zip', node.line); });
      let len = Infinity;
      lists.forEach(function (l) { len = Math.min(len, l.length); });
      const out = [];
      for (let i = 0; i < len; i += 1) {
        out.push(lists.map(function (l) { return l[i]; }));
      }
      return out;
    });

    /* ---------- higher-order helpers ---------- */

    def('map', function (it, args, node) {
      need(args, 2, 'map', node.line);
      const list = wantList(args[0], 'map', node.line);
      const fn = wantFn(args[1], 'map', node.line);
      const out = [];
      for (let i = 0; i < list.length; i += 1) {
        out.push(it.callFunction(fn, [list[i]], node));
      }
      return out;
    });

    def('each', function (it, args, node) {
      need(args, 2, 'each', node.line);
      const list = wantList(args[0], 'each', node.line);
      const fn = wantFn(args[1], 'each', node.line);
      for (let i = 0; i < list.length; i += 1) {
        it.callFunction(fn, [list[i]], node);
      }
      return null;
    });

    def('filter', function (it, args, node) {
      need(args, 2, 'filter', node.line);
      const list = wantList(args[0], 'filter', node.line);
      const fn = wantFn(args[1], 'filter', node.line);
      const out = [];
      for (let i = 0; i < list.length; i += 1) {
        if (truthy(it.callFunction(fn, [list[i]], node))) out.push(list[i]);
      }
      return out;
    });

    def('reduce', function (it, args, node) {
      needBetween(args, 2, 3, 'reduce', node.line);
      const list = wantList(args[0], 'reduce', node.line);
      const fn = wantFn(args[1], 'reduce', node.line);

      let acc;
      let start;
      if (args.length === 3) {
        acc = args[2];
        start = 0;
      } else {
        if (list.length === 0) throw new AzError('reduce needs an empty-list value or a non-empty list', node.line);
        acc = list[0];
        start = 1;
      }

      for (let i = start; i < list.length; i += 1) {
        acc = it.callFunction(fn, [acc, list[i]], node);
      }
      return acc;
    });

    def('find_item', function (it, args, node) {
      need(args, 2, 'find_item', node.line);
      const list = wantList(args[0], 'find_item', node.line);
      const test = args[1];

      if (test instanceof AzFunction || typeof test === 'function') {
        for (let i = 0; i < list.length; i += 1) {
          if (truthy(it.callFunction(test, [list[i]], node))) return list[i];
        }
        return null;
      }

      for (let i = 0; i < list.length; i += 1) {
        if (deepEqual(list[i], test)) return list[i];
      }
      return null;
    });

    def('count', function (it, args, node) {
      need(args, 2, 'count', node.line);
      const list = wantList(args[0], 'count', node.line);
      const test = args[1];
      let total = 0;

      if (test instanceof AzFunction || typeof test === 'function') {
        for (let i = 0; i < list.length; i += 1) {
          if (truthy(it.callFunction(test, [list[i]], node))) total += 1;
        }
      } else {
        for (let i = 0; i < list.length; i += 1) {
          if (deepEqual(list[i], test)) total += 1;
        }
      }
      return total;
    });

    def('any', function (it, args, node) {
      needBetween(args, 1, 2, 'any', node.line);
      const list = wantList(args[0], 'any', node.line);
      const fn = args.length === 2 ? wantFn(args[1], 'any', node.line) : null;
      for (let i = 0; i < list.length; i += 1) {
        const v = fn ? it.callFunction(fn, [list[i]], node) : list[i];
        if (truthy(v)) return true;
      }
      return false;
    });

    def('all', function (it, args, node) {
      needBetween(args, 1, 2, 'all', node.line);
      const list = wantList(args[0], 'all', node.line);
      const fn = args.length === 2 ? wantFn(args[1], 'all', node.line) : null;
      for (let i = 0; i < list.length; i += 1) {
        const v = fn ? it.callFunction(fn, [list[i]], node) : list[i];
        if (!truthy(v)) return false;
      }
      return true;
    });

    /* ---------- JSON ---------- */

    const encode = function (it, args, node) {
      needBetween(args, 1, 2, 'json_encode', node.line);
      const pretty = args.length === 2 && truthy(args[1]);
      try {
        return JSON.stringify(toPlain(args[0], node.line), null, pretty ? 2 : 0);
      } catch (e) {
        if (e instanceof AzError) throw e;
        throw new AzError('Could not encode this value as JSON', node.line);
      }
    };

    const decode = function (it, args, node) {
      need(args, 1, 'json_decode', node.line);
      const text = wantStr(args[0], 'json_decode', node.line);
      let value;
      try {
        value = JSON.parse(text);
      } catch (e) {
        throw new AzError('Invalid JSON: ' + e.message, node.line);
      }
      return fromPlain(value);
    };

    def('json_encode', encode);
    def('to_json', encode);
    def('json_decode', decode);
    def('from_json', decode);
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  function parse(source) {
    return new Parser(tokenize(source), source).parse();
  }

  function makeGlobalEnv() {
    const env = new Env(null);
    installBuiltins(env);
    env.define('PI', Math.PI, true);
    env.define('E', Math.E, true);
    env.define('TAU', Math.PI * 2, true);
    return env;
  }

  function run(source, options) {
    options = options || {};
    const started = Date.now();
    const output = [];
    const emit = function (text) {
      const s = String(text);
      output.push(s);
      if (options.onOutput) options.onOutput(s);
    };

    const program = parse(source);
    const interp = new Interpreter({
      out: emit,
      ask: options.ask,
      maxSteps: options.maxSteps
    });

    interp.run(program);

    return {
      output: output,
      steps: interp.steps,
      ms: Date.now() - started
    };
  }

  const TOP_SIGNAL_MESSAGES = {
    break: '"break" can only be used inside a loop',
    continue: '"continue" can only be used inside a loop',
    return: '"return" can only be used inside a function'
  };

  function topLevelError(e) {
    if (e instanceof BreakSignal) return new AzError(TOP_SIGNAL_MESSAGES.break, e.line);
    if (e instanceof ContinueSignal) return new AzError(TOP_SIGNAL_MESSAGES.continue, e.line);
    if (e instanceof ReturnSignal) return new AzError(TOP_SIGNAL_MESSAGES.return, e.line);
    if (e instanceof ThrownSignal) {
      const err = new AzError('Uncaught value: ' + display(e.value), e.line);
      if (isMap(e.value) && typeof e.value.message === 'string') {
        err.message = 'Uncaught error: ' + e.value.message;
        if (typeof e.value.hint === 'string') err.hint = e.value.hint;
      }
      return err;
    }
    return e;
  }

  class Session {
    constructor(options) {
      options = options || {};
      this.interp = new Interpreter({
        out: options.onOutput || function (s) { console.log(s); },
        ask: options.ask,
        maxSteps: options.maxSteps
      });
      this.env = makeGlobalEnv();
    }

    execute(source) {
      const program = parse(source);
      const before = this.interp.steps;
      try {
        this.interp.execBlock(program.body, this.env);
      } catch (e) {
        throw topLevelError(e);
      }
      return {
        steps: this.interp.steps - before,
        totalSteps: this.interp.steps
      };
    }
  }

  const api = {
    version: VERSION,
    tokenize: tokenize,
    parse: parse,
    run: run,
    Session: Session,
    createSession: function (options) { return new Session(options); },
    Parser: Parser,
    Interpreter: Interpreter,
    AzError: AzError
  };

  root.AzLang = api;
  if (typeof module === 'object' && module.exports) module.exports = api;

  /* ============================================================
     COMMAND LINE
     ============================================================ */

  if (typeof process !== 'undefined' && typeof require === 'function' &&
      typeof module === 'object' && module.exports && require.main === module) {
    (function () {
      const fs = require('fs');
      const path = require('path');
      const readline = require('readline');

      const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
      const paint = function (code, s) {
        return useColor ? '\u001b[' + code + 'm' + s + '\u001b[0m' : s;
      };

      function makeReader() {
        let buffer = Buffer.alloc(0);
        let eof = false;
        const sleeper = new Int32Array(new SharedArrayBuffer(4));

        return function readLine() {
          for (;;) {
            const nl = buffer.indexOf(0x0a);
            if (nl >= 0) {
              const line = buffer.subarray(0, nl).toString('utf8').replace(/\r$/, '');
              buffer = buffer.subarray(nl + 1);
              return line;
            }
            if (eof) {
              if (buffer.length) {
                const rest = buffer.toString('utf8');
                buffer = Buffer.alloc(0);
                return rest;
              }
              return null;
            }
            const chunk = Buffer.alloc(4096);
            let n = 0;
            try {
              n = fs.readSync(0, chunk, 0, chunk.length, null);
            } catch (e) {
              if (e.code === 'EAGAIN') {
                Atomics.wait(sleeper, 0, 0, 10);
                continue;
              }
              eof = true;
              continue;
            }
            if (n === 0) {
              eof = true;
              continue;
            }
            buffer = Buffer.concat([buffer, chunk.subarray(0, n)]);
          }
        };
      }

      const readLine = makeReader();

      function askFromStdin(question) {
        if (question) process.stdout.write(question);
        const answer = readLine();
        return answer === null ? '' : answer;
      }

      function printError(err, source) {
        const lineNo = err.line || 0;
        process.stderr.write('\n');
        process.stderr.write(paint('31;1', 'error' + (lineNo ? ' on line ' + lineNo : '') + ': ' + err.message) + '\n');
        if (err.hint) process.stderr.write(paint('33', '  hint: ' + err.hint) + '\n');
        if (source && lineNo > 0) {
          const lines = source.split(/\r?\n/);
          const text = lines[lineNo - 1];
          if (text !== undefined) {
            process.stderr.write(paint('90', '  ' + lineNo + ' | ') + text.trim() + '\n');
          }
        }
        process.stderr.write('\n');
      }

      function readSource(file) {
        return fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      }

      function runSource(source) {
        try {
          const started = Date.now();
          const result = run(source, {
            ask: askFromStdin,
            onOutput: function (s) { process.stdout.write(s + '\n'); }
          });
          if (process.env.AZLANG_VERBOSE) {
            process.stderr.write(paint('90', '- ' + (Date.now() - started) + 'ms, ' + result.steps + ' steps') + '\n');
          }
          return 0;
        } catch (e) {
          if (e instanceof AzError) {
            printError(e, source);
            return 1;
          }
          throw e;
        }
      }

      function blockDepth(code) {
        let depth = 0;
        const lines = code.split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i].replace(/#.*$/, '').trim();
          if (!line) continue;
          if (/^(if|while|for|repeat|fun|class|try|match)\b/.test(line)) depth += 1;
          if (/^end\b/.test(line)) depth = Math.max(0, depth - 1);
        }
        return depth;
      }

      function repl() {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: paint('35;1', 'az> ')
        });

        const session = new Session({
          ask: askFromStdin,
          onOutput: function (s) { process.stdout.write(s + '\n'); }
        });

        let buffer = '';

        process.stdout.write(paint('36', 'AzLang ' + VERSION) + paint('90', ' - type .exit to quit') + '\n');
        rl.prompt();

        rl.on('line', function (line) {
          if (line.trim() === '.exit' || line.trim() === 'exit') {
            rl.close();
            return;
          }

          buffer += line + '\n';

          if (blockDepth(buffer) > 0) {
            rl.setPrompt(paint('90', '... '));
            rl.prompt();
            return;
          }

          if (buffer.trim()) {
            try {
              session.execute(buffer);
            } catch (e) {
              if (e instanceof AzError) printError(e, buffer);
              else process.stderr.write(String(e && e.stack ? e.stack : e) + '\n');
            }
          }

          buffer = '';
          rl.setPrompt(paint('35;1', 'az> '));
          rl.prompt();
        });

        rl.on('close', function () {
          process.stdout.write('\n');
          process.exit(0);
        });
      }

      function help() {
        process.stdout.write([
          '',
          paint('36;1', '  AzLang ' + VERSION) + paint('90', ' - a small language with serious features'),
          '',
          paint('1', '  Usage:'),
          '    node azlang.js <file.az>       run a program',
          '    node azlang.js                 start the interactive shell',
          '    node azlang.js -e "<code>"     run a snippet',
          '    node azlang.js --check <file>  parse without running',
          '',
          paint('1', '  Options:'),
          '    -h, --help       show this help',
          '    -v, --version    show the version',
          '',
          paint('90', '  Example:  node azlang.js examples/hello.az'),
          ''
        ].join('\n') + '\n');
      }

      const argv = process.argv.slice(2);

      if (argv.length === 0) {
        repl();
        return;
      }

      if (argv[0] === '-h' || argv[0] === '--help') {
        help();
        return;
      }

      if (argv[0] === '-v' || argv[0] === '--version') {
        process.stdout.write('AzLang ' + VERSION + '\n');
        return;
      }

      if (argv[0] === '-e') {
        process.exitCode = runSource(argv.slice(1).join(' '));
        return;
      }

      if (argv[0] === '--check') {
        if (!argv[1]) {
          process.stderr.write('error: --check needs a file\n');
          process.exitCode = 1;
          return;
        }
        let source;
        try {
          source = readSource(argv[1]);
        } catch (e) {
          process.stderr.write('error: file not found: ' + argv[1] + '\n');
          process.exitCode = 1;
          return;
        }
        try {
          const program = parse(source);
          process.stdout.write('OK: ' + argv[1] + ' (' + program.body.length + ' top-level statements)\n');
        } catch (e) {
          if (e instanceof AzError) {
            printError(e, source);
            process.exitCode = 1;
          } else {
            throw e;
          }
        }
        return;
      }

      const file = argv[0];
      let source;
      try {
        source = readSource(file);
      } catch (e) {
        process.stderr.write(paint('31', 'error: file not found: ' + file) + '\n');
        process.exitCode = 1;
        return;
      }

      process.exitCode = runSource(source);
    })();
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
