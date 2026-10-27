"""Check that every translatable text in index.html has a Spanish version in assets/js/i18n.js.

Run from the repository root:  python tools/check_i18n.py
Reports keys missing from the dictionary, unused dictionary entries, nested keys and markup
that differs between English and Spanish (for example a missing <strong> or link).
Exits with status 1 when something needs fixing.
"""
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
        'use', 'path', 'circle', 'rect'}
TAG = re.compile(r'<\s*([a-zA-Z0-9]+)')
EXTRA_KEYS = {'meta.title', 'meta.description'}  # used by main.js, not by markup


class KeyParser(HTMLParser):
    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.starts = [0] + [i + 1 for i, ch in enumerate(src) if ch == '\n']
        self.stack, self.text, self.attr, self.nested = [], {}, set(), []

    def pos(self):
        line, col = self.getpos()
        return self.starts[line - 1] + col

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for pair in filter(None, (a.get('data-i18n-attr') or '').split(';')):
            self.attr.add(pair.split(':')[1].strip())
        if tag in VOID:
            return
        key = a.get('data-i18n')
        if key and any(k for _, k, _ in self.stack):
            self.nested.append(key)
        self.stack.append((tag, key, self.pos()))

    def handle_startendtag(self, tag, attrs):
        a = dict(attrs)
        for pair in filter(None, (a.get('data-i18n-attr') or '').split(';')):
            self.attr.add(pair.split(':')[1].strip())

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            t, key, start = self.stack.pop()
            if t == tag:
                if key:
                    self.text.setdefault(key, self.src[self.src.index('>', start) + 1:self.pos()])
                break


def spanish_entries(js):
    block = js[js.index('es: {', js.index('ui:') + 10):]
    return dict(re.findall(r"^\s*'([\w.-]+)':\s*'((?:[^'\\]|\\.)*)'", block, flags=re.M))


def main():
    page = KeyParser((ROOT / 'index.html').read_text(encoding='utf-8'))
    page.feed(page.src)
    es = spanish_entries((ROOT / 'assets' / 'js' / 'i18n.js').read_text(encoding='utf-8'))

    used = set(page.text) | page.attr | EXTRA_KEYS
    missing = sorted(used - set(es))
    unused = sorted(set(es) - used)
    markup = [key for key, english in page.text.items()
              if key in es and Counter(TAG.findall(english)) != Counter(TAG.findall(es[key]))]

    for title, items in (('Missing Spanish text', missing), ('Unused Spanish entries', unused),
                         ('Nested data-i18n keys', page.nested), ('Markup differs between EN and ES', markup)):
        if items:
            print(f'{title} ({len(items)}):')
            for item in items:
                print('  -', item)
    print(f'{len(page.text)} text keys, {len(page.attr)} attribute keys, {len(es)} Spanish entries.')
    return 1 if (missing or page.nested or markup) else 0


if __name__ == '__main__':
    sys.exit(main())
