#!/usr/bin/env python3
"""
deploy.py — upload dist/ to all-inkl over FTPS (FTP with TLS).

    python3 scripts/build.py
    python3 scripts/deploy.py --dry-run   # list what would be uploaded
    python3 scripts/deploy.py             # upload

Credentials come from environment variables, or from a file named
.deploy.env in the project root (git-ignored, never uploaded):

    ALLINKL_FTP_HOST=w0123456.kasserver.com
    ALLINKL_FTP_USER=f0123456          # an FTP sub-account limited to the site folder
    ALLINKL_FTP_PASS=...
    ALLINKL_FTP_DIR=/                  # the sub-account's folder is its root

Create the FTP sub-account in KAS → FTP, with its home directory set to
the folder the domain points at. Then a mistake here can only ever touch
that folder.

Uploads every file in dist/ and overwrites what is there. It does not
delete remote files; remove renamed or deleted files by hand in KAS or
an FTP client. Uses only the Python standard library.
"""
import argparse
import ftplib
import os
import ssl
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'


def load_env():
    f = ROOT / '.deploy.env'
    if f.exists():
        for line in f.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())
    need = ['ALLINKL_FTP_HOST', 'ALLINKL_FTP_USER', 'ALLINKL_FTP_PASS']
    missing = [k for k in need if not os.environ.get(k)]
    if missing:
        sys.exit('missing ' + ', '.join(missing) + ' (set them, or put them in .deploy.env)')
    return (os.environ['ALLINKL_FTP_HOST'], os.environ['ALLINKL_FTP_USER'],
            os.environ['ALLINKL_FTP_PASS'], os.environ.get('ALLINKL_FTP_DIR', '/'))


def ensure_dir(ftp, path, made):
    parts = [p for p in path.split('/') if p]
    cur = ''
    for p in parts:
        cur += '/' + p
        if cur in made:
            continue
        try:
            ftp.mkd(cur)
        except ftplib.error_perm:
            pass  # already there
        made.add(cur)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dry-run', action='store_true', help='list the files without uploading')
    args = ap.parse_args()

    if not (DIST / 'index.html').exists():
        sys.exit('dist/ is empty — run python3 scripts/build.py first')
    files = sorted(f for f in DIST.rglob('*') if f.is_file())
    if args.dry_run:
        for f in files:
            print(f.relative_to(DIST).as_posix())
        print(f'{len(files)} files would be uploaded')
        return

    host, user, pw, base = load_env()
    base = '/' + base.strip('/')
    ctx = ssl.create_default_context()
    ftp = ftplib.FTP_TLS(host, context=ctx, timeout=60)
    ftp.login(user, pw)
    ftp.prot_p()  # encrypt the data channel too, not just the login
    made = set()
    for i, f in enumerate(files, 1):
        rel = f.relative_to(DIST).as_posix()
        remote = (base.rstrip('/') + '/' + rel)
        ensure_dir(ftp, remote.rsplit('/', 1)[0], made)
        with f.open('rb') as fh:
            ftp.storbinary('STOR ' + remote, fh)
        print(f'[{i}/{len(files)}] {rel}')
    ftp.quit()
    print('done')


if __name__ == '__main__':
    main()
