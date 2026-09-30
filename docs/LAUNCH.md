# Launch checklist — canada.media-bias-research.org on all-inkl

Everything in the code is done and tested. What's left needs your accounts, your legal texts
or a decision. `python3 scripts/build.py` lists whatever is still open and won't build a
production copy until the blockers are gone.

Find every placeholder with:

```bash
grep -rn "TODO(" --include=*.html --include=*.js --include=.htaccess .
```

## 1. Before the first upload

### Legal texts: `TODO(legal)`
- [ ] **Impressum** (`impressum.html`): § 5 DDG details, plus the person responsible under § 18 (2) MStV
      (the site publishes editorial content).
- [ ] **Datenschutzerklärung** (`datenschutz.html`): paste the generator output (e.g. e-recht24). The box
      "Facts about this site, for the generator" lists what the site actually does. Delete the box afterwards.
- [ ] **Operator name** in every footer: `[Operator name]` in `index.html`, `path.html`, `tour.html`,
      `methods.html`.
- [ ] Optional: an accessibility statement. Strictly required only for public bodies (BITV 2.0).

### all-inkl (KAS)
- [ ] Add the subdomain `canada.media-bias-research.org` and point it at its own folder.
- [ ] **SSL:** switch on the free Let's Encrypt certificate for that subdomain, and "SSL erzwingen" if offered.
      (`.htaccess` also redirects HTTP → HTTPS.)
- [ ] **FTP sub-account** whose home directory is that folder, and nothing above it. Put its details in
      `.deploy.env` (see `scripts/deploy.py`; the file is git-ignored).
- [ ] **AVV (Art. 28 GDPR)** with all-inkl: conclude it online in the member area. If you use all-inkl for
      email too, the same AVV covers it.
- [ ] **Server logs:** in the KAS log settings, choose IP anonymisation and/or a short retention period if
      offered, and put the retention period you chose into the privacy policy.

### Google Analytics 4: `TODO(analytics)`
- [ ] Create a GA4 property and a web data stream for `https://canada.media-bias-research.org`.
- [ ] Paste the measurement ID (`G-…`) into `js/env.js` → `SITE.config.gaMeasurementId`.
      Until you do, analytics stays off everywhere.
- [ ] Admin → Account settings: accept the **data processing terms** (this is Google's AVV).
- [ ] Admin → Data retention: **2 months**.
- [ ] Admin → Data collection: **Google signals off**. Granular location and device data **off**.
- [ ] Nothing needed for IP truncation: GA4 does not log or store IP addresses.

### Record of processing (Art. 30)
- [ ] Fill in `docs/verarbeitungsverzeichnis.md`. It's internal: never uploaded, not published.

## 2. Build and upload

```bash
python3 scripts/build.py              # makes dist/; stops if launch blockers remain
python3 -m http.server 8777 -d dist   # optional: click through the built copy
python3 scripts/deploy.py --dry-run   # what would be uploaded
python3 scripts/deploy.py             # upload over FTPS
```

Or drag the *contents* of `dist/` into FileZilla (FTP over explicit TLS). Include the hidden
`.htaccess`.

## 3. Right after the first upload

- [ ] `http://canada.media-bias-research.org` redirects to `https://…`, and `www.` redirects to the bare domain.
- [ ] `https://canada.media-bias-research.org/nope` shows the site's 404 page.
- [ ] `https://canada.media-bias-research.org/template.html` returns 404 (development files are not uploaded).
- [ ] Browser dev tools → Network, fresh private window: **no request to Google** before you accept in the
      banner; after "That's ok", requests to `googletagmanager.com` / `google-analytics.com` start.
      "I decline" → none.
- [ ] Footer → "Cookie settings" reopens the banner, and changing the choice takes effect.
- [ ] Check the security headers at <https://securityheaders.com>.
- [ ] Once HTTPS has worked for a day: in `.htaccess`, switch on HSTS (`TODO(launch)`). Start with
      `max-age=300`, then raise it to `31536000`, then rebuild and upload.
- [ ] Optional: add the site to Google Search Console and submit `sitemap.xml`.

## 4. Which copy is which

| Where | What it's for | Indexed | Analytics |
|---|---|---|---|
| `localhost` / `file://` | editing and testing | no | no (the banner shows; accepting only logs) |
| `smidish.github.io/CanadaBiasWebsite/` | staging: share a preview | no (`noindex`) | no |
| `canada.media-bias-research.org` | production | yes | yes, after consent |

`js/env.js` works out which copy it is from the hostname. Any host it doesn't recognise is
treated as staging, so a stray copy is never indexed or tracked.
