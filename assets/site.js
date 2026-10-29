(function () {
  'use strict';

  /* ============================================================
     Syntax highlighting
     ============================================================ */

  const KEYWORDS = new Set([
    'let', 'const', 'say', 'if', 'elif', 'else', 'end',
    'while', 'for', 'in', 'repeat', 'break', 'continue',
    'fun', 'return', 'true', 'false', 'null', 'and', 'or', 'not',
    'class', 'extends', 'new', 'this', 'super',
    'try', 'catch', 'throw', 'match', 'case', 'default'
  ]);

  const BUILTINS = new Set([
    'len', 'type', 'str', 'num', 'int', 'bool', 'assert', 'fail', 'clock', 'input',
    'abs', 'floor', 'ceil', 'round', 'sqrt', 'pow', 'log', 'min', 'max', 'sum',
    'avg', 'clamp', 'random', 'random_float', 'choice',
    'upper', 'lower', 'trim', 'starts', 'ends', 'find', 'replace', 'split', 'join',
    'chars', 'char_code', 'from_char',
    'append', 'prepend', 'insert', 'remove', 'discard', 'pop', 'sort', 'sorted',
    'reverse', 'reversed', 'slice', 'concat', 'unique', 'flatten', 'index_of',
    'has', 'list', 'keys', 'values', 'items', 'get', 'set', 'update', 'range',
    'enumerate', 'zip', 'map', 'each', 'filter', 'reduce', 'find_item', 'count',
    'any', 'all', 'json_encode', 'json_decode', 'to_json', 'from_json',
    'PI', 'E', 'TAU'
  ]);

  const ID_START = /[A-Za-z_\p{L}]/u;
  const ID_PART = /[A-Za-z0-9_\p{L}\p{N}\p{Mn}\p{Mc}]/u;

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function span(cls, text) {
    return '<span class="' + cls + '">' + escapeHtml(text) + '</span>';
  }

  function isDigit(ch) {
    const c = ch.charCodeAt(0);
    return (ch >= '0' && ch <= '9') ||
      (c >= 0x06f0 && c <= 0x06f9) ||
      (c >= 0x0660 && c <= 0x0669);
  }

  function stringEnd(src, i) {
    const raw = (src[i] === 'r' || src[i] === 'R') &&
      (src[i + 1] === '"' || src[i + 1] === "'");
    const qIndex = raw ? i + 1 : i;
    const quote = src[qIndex];
    const triple = src.slice(qIndex, qIndex + 3) === quote + quote + quote;
    let j = qIndex + (triple ? 3 : 1);

    while (j < src.length) {
      const ch = src[j];
      if (!raw && ch === '\\') { j += 2; continue; }
      if (triple) {
        if (src.slice(j, j + 3) === quote + quote + quote) return j + 3;
        j += 1;
        continue;
      }
      if (ch === quote) return j + 1;
      if (ch === '\n') return j;
      j += 1;
    }
    return j;
  }

  function highlight(src) {
    let out = '';
    let i = 0;
    let prevWord = '';
    let prevChar = '';
    const n = src.length;

    while (i < n) {
      const ch = src[i];

      if (ch === '#') {
        let j = i;
        while (j < n && src[j] !== '\n') j += 1;
        out += span('t-com', src.slice(i, j));
        i = j;
        prevChar = '';
        continue;
      }

      if ((ch === 'r' || ch === 'R') && (src[i + 1] === '"' || src[i + 1] === "'")) {
        const end = stringEnd(src, i);
        out += span('t-str', src.slice(i, end));
        i = end;
        prevWord = '';
        prevChar = '';
        continue;
      }

      if (ch === '"' || ch === "'") {
        const end = stringEnd(src, i);
        out += span('t-str', src.slice(i, end));
        i = end;
        prevWord = '';
        prevChar = '';
        continue;
      }

      if (isDigit(ch)) {
        let j = i;
        let dot = false;
        while (j < n) {
          const c = src[j];
          if (isDigit(c)) { j += 1; continue; }
          if (c === '.' && !dot && isDigit(src[j + 1] || '')) {
            dot = true;
            j += 1;
            continue;
          }
          break;
        }
        out += span('t-num', src.slice(i, j));
        i = j;
        prevWord = '';
        prevChar = '';
        continue;
      }

      if (ID_START.test(ch)) {
        let j = i + 1;
        while (j < n && ID_PART.test(src[j])) j += 1;
        const word = src.slice(i, j);
        let k = j;
        while (k < n && (src[k] === ' ' || src[k] === '\t')) k += 1;

        if (prevWord === 'class' || prevWord === 'extends' || prevWord === 'new') {
          out += span('t-cls', word);
        } else if (KEYWORDS.has(word)) {
          out += span('t-kw', word);
        } else if (BUILTINS.has(word)) {
          out += span('t-builtin', word);
        } else if (src[k] === '(') {
          out += span('t-fn', word);
        } else if (prevChar === '.') {
          out += span('t-prop', word);
        } else {
          out += escapeHtml(word);
        }

        prevWord = word;
        prevChar = word[word.length - 1] || '';
        i = j;
        continue;
      }

      const three = src.slice(i, i + 3);
      if (three === '**=' || three === '//=') {
        out += span('t-op', three);
        i += 3;
        prevChar = three[2];
        continue;
      }

      const two = src.slice(i, i + 2);
      if (['**', '==', '!=', '<=', '>=', '//', '+=', '-=', '*=', '/=', '%=', '=>'].indexOf(two) !== -1) {
        out += span('t-op', two);
        i += 2;
        prevChar = two[1];
        continue;
      }

      if ('+-*/%=<>'.indexOf(ch) !== -1) {
        out += span('t-op', ch);
        i += 1;
        prevWord = '';
        prevChar = ch;
        continue;
      }

      out += escapeHtml(ch);
      i += 1;
      prevChar = ch;
      if (ch !== ' ' && ch !== '\t' && ch !== '\n') prevWord = '';
    }

    return out;
  }

  Array.prototype.forEach.call(document.querySelectorAll('code.az-sample'), function (el) {
    el.innerHTML = highlight(el.textContent);
  });

  /* ============================================================
     Sticky header
     ============================================================ */

  const header = document.getElementById('header');
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ============================================================
     Reveal on scroll
     ============================================================ */

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('on');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('on'); });
  }

  /* ============================================================
     Code tabs
     ============================================================ */

  const samples = {};
  const dataEl = document.getElementById('showcaseData');
  if (dataEl) {
    try {
      JSON.parse(dataEl.textContent).forEach(function (sample) {
        samples[sample.id] = sample;
      });
    } catch (error) {
      console.error('Could not read the showcase data.', error);
    }
  }

  const codeEl = document.querySelector('#showcaseCode code');
  const titleEl = document.getElementById('showcaseTitle');
  const descEl = document.getElementById('showcaseDesc');
  const listEl = document.getElementById('showcaseList');
  const tabBtns = Array.prototype.slice.call(document.querySelectorAll('.tab-btn[data-tab]'));

  function selectTab(name) {
    const sample = samples[name];
    if (!sample) return;
    codeEl.textContent = sample.code;
    codeEl.innerHTML = highlight(sample.code);
    titleEl.textContent = sample.title;
    descEl.textContent = sample.desc;
    listEl.innerHTML = sample.bullets.map(function (b) {
      return '<li><span class="tick"><svg aria-hidden="true"><use href="#i-check"/></svg></span><span>' + b + '</span></li>';
    }).join('');
    tabBtns.forEach(function (btn) {
      const active = btn.getAttribute('data-tab') === name;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { selectTab(btn.getAttribute('data-tab')); });
  });

  selectTab('functional');

  /* ============================================================
     Copy command
     ============================================================ */

  const copyBtn = document.getElementById('copyCmd');
  const copyLabel = document.getElementById('copyLabel');
  copyBtn.addEventListener('click', function () {
    const text = 'node azlang.js examples/hello.az';
    function done() {
      copyLabel.textContent = 'Copied!';
      setTimeout(function () { copyLabel.textContent = 'Copy command'; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallback(); });
    } else {
      fallback();
    }
    function fallback() {
      const input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
      input.remove();
    }
  });
})();
