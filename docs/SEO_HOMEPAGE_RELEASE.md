# CSV Rescue v1.2.0 — homepage and SEO release report

18 October 2026. **PASS — release v1.2.0 approved by the owner.** The owner approved commit, push and deployment after local verification. Results below were obtained before publication; live platform verification follows the approved push.

## Summary and routes

| Route | New behavior |
| --- | --- |
| `/` | Static CSV Rescue landing page and directory; no application JavaScript |
| `/csv-repair/` | The existing CSV repair/cleaning app, with its initial view prerendered |
| `/csv-to-xlsx/` | Existing CSV-to-XLSX tool, now with initial controls prerendered |
| Unknown pages/files/assets | Actual HTTP 404 with the static error document |

No XLSX-to-CSV or legacy XLS conversion page was created. Future routes are excluded from navigation and sitemap and return 404 in production-model tests.

The homepage uses the established green palette, system typography, rounded white cards and restrained borders. Two equal-width tool cards have the requested Repair CSV and Convert to Excel actions. They stack at mobile widths. Privacy/capability text explains reviewed repair, reversible cleaning, text-preserving XLSX generation, separate 10 MB / 2 MB limits, local processing and ordinary hosting requests. No account, analytics, third-party script or processing service was added.

Reviewed visual artifacts: [desktop](screenshots/homepage-desktop.png), [mobile](screenshots/homepage-mobile.png). These are synthetic product screenshots with no user files.

## SEO and rendering

| Page | Title | Canonical | Primary heading |
| --- | --- | --- | --- |
| Home | CSV Rescue — Free CSV Repair & Conversion Tools | `https://csv-rescue-app.pages.dev/` | Your files. Fixed and converted. |
| Repair | CSV Repair & Cleaner — Free, Private \| CSV Rescue | `https://csv-rescue-app.pages.dev/csv-repair/` | CSV Repair & Cleaner |
| Converter | CSV to Excel Converter — Preserve Text \| CSV Rescue | `https://csv-rescue-app.pages.dev/csv-to-xlsx/` | CSV to Excel converter |

All three pages have unique descriptions, one H1, matching Open Graph URLs, Open Graph/social-card metadata and local 1200×630 sharing art. The sitemap contains exactly those canonical URLs; robots.txt retains crawl permission and the sitemap declaration. Error HTML uses `noindex`; normal pages do not. No hidden SEO copy, future-tool claims or bot-specific rendering was introduced.

Vite is explicitly configured as a multi-page app. `scripts/prerender-pages.mjs` renders the existing initial repair and converter components at build time using installed React/Vite. Their entrypoints hydrate matching HTML in production and mount normally during development. Converter controls no longer need to be inserted into an empty block after script download. Browser tests verify clean hydration, not a claim of measured zero CLS on every device. Tailwind scanning is limited to application sources and the three HTML entries, so documentation/test text cannot introduce unrelated CSS utilities into subsequent builds.

Only the repair viewport initializer received a server-safe `window` guard; browser behavior and the state model are unchanged. CSV parsing/analysis/cleaning/repair/export files, conversion parsing/writing/worker files, lockfile and CSP were checked with Git diff and are unchanged. The converter component's only functional-location edit is its repair link destination.

## Routing and migration

`public/404.html` is copied to the output root, disabling Cloudflare's default SPA fallback. No catch-all rewrite or duplicate repair page exists. The local production server now models physical HTML routes, permanent index/trailing-slash normalization with query preservation, and genuine 404 responses for missing pages and assets. `npm run preview` uses that server at `http://127.0.0.1:4173` and binds only to localhost. It is a QA tool, not a deployed backend.

**The old root URL remains valid as the directory. It cannot permanently redirect to repair.** Its canonical remains `/`; repair gets its own canonical. Existing links to `/` still work but now require choosing a tool. No guarantee is made that historic repair rankings transfer automatically.

Mitigations implemented locally: prominent repair card/header/footer links, native cross-tool navigation, updated converter error/guide links, README route/migration guidance and deployment instructions. Generic portfolio/product links should keep `/`; editable links specifically promising CSV repair should point to `/csv-repair/` after release. External websites, portfolio projects and Cloudflare settings were not edited. The README's source repository link uses `ycguler/csv-rescue`; old owner links redirect and historical reports remain historical.

After release approval, verify live Cloudflare 200/404 responses and redirects before announcing the migration, and update editable external repair references. Source/build tests cannot substitute for a live platform check.

## Executed verification

| Check | Result |
| --- | --- |
| Unit/component suite | **159 passed**, 9 files |
| Full production desktop/mobile Chromium suite | **56 passed**, including 14 new site/SEO checks |
| Optional repository-link disabled configuration | **6 targeted browser checks passed** after a separate production build |
| TypeScript | **PASS** |
| Production build including both prerenders | **PASS**, with and without optional GitHub link |
| Independent XLSX validation | **PASS**, two sample and two integrity downloads checked by independent Python ZIP/XML; samples additionally checked with existing openpyxl |
| Full dependency audit | **0 vulnerabilities** |
| Production-only dependency audit | **0 vulnerabilities** |
| Original CSV repair/conversion workflows | **PASS** at their new/existing tool routes |
| Export modes and exact original downloads | **PASS**, existing data-preservation coverage retained |
| Routing | **PASS locally**, supported physical routes 200; unsupported pages and missing assets 404; expected canonical redirects 308 |
| SEO/no-JavaScript | **PASS**, initial content/navigation, unique title/description/H1, canonicals/social cards and exact sitemap membership |
| Security/privacy | **PASS**, unchanged CSP/security headers, existing no-processing-request/storage checks, no homepage JS or third-party assets |
| Accessibility/layout | **PASS**, keyboard tool selection, skip links, explicit links, 44px+ card actions, selected text contrast ≥4.5, containment at 320/390/768/1440px |

One initial browser run had two failures in a new assertion that incorrectly required the repair page to link to itself. The assertion was corrected to require its homepage link; the complete suite was rerun and passed. No unresolved failures remain. No browser binaries or dependencies were installed.

Commands: `npm test`, `npm run typecheck`, `npm run test:e2e`, `python tests/verify-xlsx-downloads.py --openpyxl`, `npm audit`, `npm audit --omit=dev`. The independent Python check is optional QA, not a web/npm dependency. Reuse an installed compatible Playwright Chromium.

## Measured bundle comparison

Sizes below are decimal kB after gzip, measured from complete route asset sets. The baseline is the previously audited live v1.1.0 build. Current values use the optional GitHub URL configured, as in production. The table includes both shared and route-specific chunks; individual filenames alone are not a useful comparison.

| Page/asset | Before JS gzip | After JS gzip | Before CSS gzip | After CSS gzip |
| --- | ---: | ---: | ---: | ---: |
| Root | 87.497 kB (repair app) | **0 kB** (directory) | 5.421 kB | **1.476 kB** |
| Repair, now `/csv-repair/` | 87.497 kB | **87.549 kB** | 5.421 kB | **5.404 kB** |
| CSV to XLSX | 78.541 kB | **78.577 kB** | 6.124 kB | **6.107 kB** |
| Conversion worker, only on Convert | 116.532 kB | **116.532 kB** | — | — |

Current raw/gzip HTML after prerender: home 5,366/1,975 bytes; repair 8,731/2,651 bytes; converter 5,733/2,326 bytes. Prerender adds useful HTML rather than a new runtime dependency. Social art is a separate 36,228-byte local metadata asset; it is not loaded as part of the visible homepage. Existing spreadsheet worker filename/hash is unchanged. Production tests confirm repair never requests it, and homepage requests no JavaScript.

## Files and release boundary

- Added: static repair entry, homepage stylesheet, public 404, local social PNG, build-time prerender script, site/SEO browser suite, selected homepage screenshots and this report.
- Updated: root HTML, converter HTML/navigation, repair heading/navigation/SSR guard, client hydration entrypoints, Vite/build/preview configuration, sitemap, local QA routing, existing browser route expectations, README/changelog/deployment guide.
- No dependency, lockfile, CSP, CSV engine, workbook adapter or worker processing changes. No analytics or new external resources.

## Risks and readiness

**Approved for release; no known local blocker.** Release version is 1.2.0. Publish the verified source commit to main, then verify the existing automatic Pages deployment. Use the existing Pages build command `npm run build`, output `dist`. Build dependencies must remain available because rendering happens during the build. No backend or paid service is needed.

Outstanding validation after approval: actual Cloudflare response statuses, redirect behavior, social-image retrieval, static content and browser workflows on the deployed routes. Platform settings outside this repository could affect routing. Search Console submission, indexing, selected canonicals, social-platform caches, Core Web Vitals and ranking changes remain unverified. No account/settings changes were made.

Browser coverage is desktop Chromium and mobile viewport emulation; physical Android, Safari, Firefox and comprehensive screen-reader certification remain outside verified coverage. Structural prerendering removes the empty-form mount step but field CLS/INP/LCP were not measured. Root migration has the SEO limitation described above. Existing CSV limits and heuristic-repair limitations remain unchanged.
