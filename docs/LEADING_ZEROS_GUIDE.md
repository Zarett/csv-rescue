# Leading zeros guide — local implementation report

Status: approved for publication through the existing main-branch Cloudflare Pages Git workflow. Application version remains 1.2.0. Deployment status is reported by the Cloudflare Pages check on the publishing commit.

## Page and content

New canonical route: `/guides/preserve-leading-zeros/`.

The guide is a Vite multi-page HTML entry using the existing site stylesheet and a small, guide-only stylesheet. Full content, navigation, comparison table and copyable synthetic CSV are in initial HTML. No JavaScript is included on the guide. No React migration, processing changes or dependencies were needed.

Outline:

1. Immediate answer: preserve identifiers as text before interpretation.
2. Why CSV lacks cell types and Excel can remove leading zeros; quoted CSV fields do not force text interpretation.
3. Selected-column text imports with Power Query and the legacy Text Import Wizard; version/platform caveats and Automatic Data Conversions settings.
4. Existing converter's exact choose-file, delimiter, convert, preview and download workflow.
5. Copyable synthetic postal codes, product identifiers, account references, long identifiers and date-like values.
6. Verification using source comparison, formula bar, ISTEXT, LEN and reopening XLSX.
7. Display formats versus underlying text; malformed CSV review; lost-zero, numeric-precision and date-interpretation limits.

Implementation claims were checked against `src/conversion/Converter.tsx`, `csv.ts` and `workbook.ts`: all fields are string cells in one `CSV data` worksheet; UTF-8 input and bounded conversion; no cleanup or type inference; malformed quote errors stop conversion; original download unchanged. The article does not promise restoration of missing characters, universal quote repair or preservation of arbitrary workbook formatting.

Primary Excel references linked directly in the article:

- [Leading zeros and large numbers](https://support.microsoft.com/en-us/excel/keeping-leading-zeros-and-large-numbers)
- [Text Import Wizard](https://support.microsoft.com/en-us/excel/text-import-wizard)
- [Data import and automatic conversion options](https://support.microsoft.com/en-us/excel/data-import-and-analysis-options-in-excel)
- [Format numbers as text](https://support.microsoft.com/en-us/excel/format-numbers-as-text)

## SEO and discovery

- Title: `How to Keep Leading Zeros in Excel & CSV | CSV Rescue`
- H1: `How to Keep Leading Zeros When Opening CSV in Excel`
- Description: `Excel removing leading zeros from CSV files? Learn how to preserve IDs, postal codes and text values using Excel import options or CSV-to-XLSX conversion.`
- Canonical: `https://csv-rescue-app.pages.dev/guides/preserve-leading-zeros/`
- Open Graph article metadata and Twitter large-image metadata use the existing local social image. No remote assets or scripts.
- Homepage and converter contain descriptive, ordinary HTML links to the guide. Guide links to both released tools, the homepage, relevant sections and primary references.
- Sitemap adds only the guide, for four canonical pages total. Robots, redirects, top-level 404, verification file and security headers are unchanged.
- No Article schema added: an established article byline/authorship policy does not exist. No author, publication date or review credential was invented. Existing CSP remains unchanged.

## Verification actually executed

- Unit/component suite: **159 passed** across 9 files.
- Full production browser suite: **66 passed**, desktop and mobile Chromium projects, using existing installed browsers. This includes 8 new guide cases across the two projects.
- Visual inspection found an overly compressed comparison table at 320 px. Added a minimum table width with horizontal scrolling and a regression assertion for table height/overflow.
- After that guide-only CSS fix: production build and **24 affected guide/site/verification browser checks passed**.
- TypeScript checks passed within production builds; Vite build and both tool prerenders succeeded.
- `npm audit` and `npm audit --omit=dev`: **0 vulnerabilities reported**. No dependencies or browser binaries installed.
- Independent ZIP/XML and installed openpyxl verification: **2 sample and 2 integrity downloads passed**, including exact text, coordinates, checksums and absence of formulas.
- Guide's exact copyable CSV independently checked in generated XLSX through browser downloads in both projects.
- Direct HTTP 200; unique metadata, one H1 and complete static/no-JS content; real links and working fragments; four-page sitemap; canonical redirects and genuine missing-route/asset 404s.
- Layout checks at 320, 390, 768 and 1440 px; keyboard skip link, focusable scroll regions and CTA height at least 44 px. Screenshots generated locally. These checks do not constitute a full assistive-technology audit.
- Existing repair reversibility, quote approvals, export modes, original bytes, conversion preservation, CSP, no processing requests and browser-storage checks passed in the full suite.
- `git diff --check` passed (Git reports the existing Windows line-ending normalization notice).

## Measured bundle impact

Compared with the prior production build, using the same `VITE_GITHUB_URL` value for both builds:

| Asset | Raw bytes | Gzip bytes | Change |
| --- | ---: | ---: | --- |
| Guide HTML | 15,016 | 5,407 | New |
| Guide-only CSS | 2,129 | 784 | New; loaded only on guide |
| Shared static site CSS | 4,459 | 1,476 | Identical bytes; output name changes from `home-*` to `site-*` because two pages share it |
| Existing JS, converter CSS and tool CSS | — | — | Byte-for-byte unchanged |

Guide adds **zero JavaScript**, no spreadsheet worker request and no third-party request. Its HTML and two stylesheets total about 7.67 KB gzipped, excluding the existing favicon. Homepage and converter gain a small static contextual link; their processing bundles do not grow. Gzip sizes are local measurements, not observed Cloudflare transfer sizes or Core Web Vitals.

## Boundaries and release readiness

No processing, export semantics, security settings, package/lockfile, public verification bytes or runtime network behavior changed. The existing Cloudflare Pages project and production URL are retained. Cloudflare's existing build command (`npm run build`) and output directory (`dist`) need no changes.

Approved for publication, with no known implementation blockers. After deployment, check the new route, sitemap, direct asset loading, normalization and real 404s on Cloudflare itself. Local routing tests model Pages; they cannot confirm a deployment that has not happened. Search indexing, rankings and traffic are not guaranteed. Excel UI varies by platform/version; native desktop Excel was not automated. Values already lost require source data or a verified external specification.
