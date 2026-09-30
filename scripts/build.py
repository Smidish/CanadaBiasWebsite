#!/usr/bin/env python3
"""
build.py — assemble the public site in dist/, ready to upload to all-inkl.

    python3 scripts/build.py              # build dist/
    python3 scripts/build.py --allow-todo # build even with TODO placeholders left
    python3 -m http.server 8777 -d dist   # try the built copy locally

What it does
  · copies only the public files (an allowlist — dev pages, docs, scripts,
    README, CONCEPT, .git and .claude never leave your machine)
  · appends ?v=<content hash> to every local CSS/JS reference in the HTML,
    so browsers can cache them for a year and still get changes at once
  · computes the hash of the one inline script (404.html) and writes it
    into the Content-Security-Policy in dist/.htaccess
  · stops if launch blockers are left: TODO(legal) placeholders or the
    placeholder GA measurement ID (override with --allow-todo)

No dependencies beyond the Python standard library.
"""
import argparse
import base64
import hashlib
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'

PAGES = ['index.html', 'path.html', 'tour.html', 'methods.html',
         'impressum.html', 'datenschutz.html', '404.html']
FILES = ['.htaccess', 'robots.txt', 'sitemap.xml', 'site.webmanifest',
         'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']
DIRS = ['css', 'fonts', 'img', 'js']
# inside DIRS, but development-only
EXCLUDE = ['js/template', 'js/content/sandbox.js', 'js/pages/sandbox.js']


def excluded(rel):
    rel = rel.as_posix()
    return any(rel == e or rel.startswith(e + '/') for e in EXCLUDE) or Path(rel).name.startswith('.')


def short_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--allow-todo', action='store_true', help='build even if TODO placeholders remain')
    args = ap.parse_args()

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    copied = 0
    for name in PAGES + FILES:
        src = ROOT / name
        if not src.exists():
            sys.exit(f'missing: {name}')
        shutil.copy2(src, DIST / name)
        copied += 1
    for d in DIRS:
        for src in sorted((ROOT / d).rglob('*')):
            rel = src.relative_to(ROOT)
            if src.is_dir() or excluded(rel):
                continue
            dst = DIST / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1

    # ---- cache-busting ------------------------------------------------
    ref = re.compile(r'''((?:src|href)=")((?:js|css)/[^"?#]+\.(?:js|css))(")''')
    for page in PAGES:
        p = DIST / page
        html = p.read_text(encoding='utf-8')

        def bust(m):
            target = DIST / m.group(2)
            if not target.exists():
                sys.exit(f'{page} references {m.group(2)}, which is not in dist/')
            return f'{m.group(1)}{m.group(2)}?v={short_hash(target)}{m.group(3)}'

        p.write_text(ref.sub(bust, html), encoding='utf-8')

    # ---- CSP hash for the inline script in 404.html -------------------
    html404 = (DIST / '404.html').read_text(encoding='utf-8')
    inline = re.findall(r'<script>(.*?)</script>', html404, re.S)
    if len(inline) != 1:
        sys.exit('404.html should contain exactly one inline <script>')
    digest = base64.b64encode(hashlib.sha256(inline[0].encode('utf-8')).digest()).decode()
    ht = DIST / '.htaccess'
    ht.write_text(ht.read_text(encoding='utf-8').replace('BUILD_404_HASH', f'sha256-{digest}'), encoding='utf-8')
    for page in PAGES:
        if page != '404.html' and '<script>' in (DIST / page).read_text(encoding='utf-8'):
            sys.exit(f'{page} has an inline <script>; move it into a file (the CSP blocks it)')

    # ---- launch blockers ----------------------------------------------
    problems = []
    for page in PAGES:
        text = (DIST / page).read_text(encoding='utf-8')
        n = text.count('TODO(legal)')
        if n:
            problems.append(f'{page}: {n} × TODO(legal)')
        if 'fonts.googleapis' in text or 'fonts.gstatic' in text:
            problems.append(f'{page}: still loads Google Fonts')
    env = (DIST / 'js/env.js').read_text(encoding='utf-8')
    if "gaMeasurementId: 'G-XXXXXXXXXX'" in env:
        problems.append("js/env.js: GA measurement ID is still the placeholder (analytics stays off)")
    if 'TODO(launch)' in ht.read_text(encoding='utf-8'):
        problems.append('.htaccess: HSTS not switched on yet (TODO(launch)) — do this after HTTPS works')

    size = sum(f.stat().st_size for f in DIST.rglob('*') if f.is_file())
    print(f'dist/ built: {copied} files, {size / 1024:.0f} KB')
    if problems:
        print('\nStill to do before launch:')
        for pr in problems:
            print('  · ' + pr)
        blocking = [pr for pr in problems if 'HSTS' not in pr]
        if blocking and not args.allow_todo:
            shutil.rmtree(DIST)   # never leave a half-ready dist/ lying around to upload
            print('\nStopped, dist/ removed: fix these or pass --allow-todo to build anyway.')
            sys.exit(1)


if __name__ == '__main__':
    main()
