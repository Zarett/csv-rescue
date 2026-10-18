# Excel-to-CSV final release validation

Date: 18 October 2026 (Europe/Madrid).

**Assessment: PASS for deployment approval to the existing Cloudflare Pages project, within the documented support/resource limits.** The owner approved commit, push and production deployment on 18 October 2026 after this validation. Use the existing Git workflow, with no hosting-setting change or package-version bump. Deployment success must be confirmed on the publishing commit and through live checks. This report supersedes the earlier implementation-checkpoint test counts and bundle measurements.

## Release scope

One new `/xlsx-to-csv/` tool accepts XLSX and Excel 97–2003 compound-file XLS. Users select one worksheet, choose formatted text or underlying values, set the delimiter, review export warnings/preview, and download CSV. The homepage has three tool cards; direct Excel-to-CSV links are now present in the homepage, repair, CSV-to-XLSX, guide and new-tool navigation. Mobile navigation wraps rather than overflowing. No separate XLS landing page or unrelated cleaning feature was added.

Original workbook downloads use the uploaded File, never the normalized parsing copy. Parsing, cached-result inspection and CSV generation remain local to a cancellable worker. Existing CSV repair/cleaning and CSV-to-XLSX algorithms are unchanged; the repair source change is a navigation link only. Existing security headers, Google verification file, robots, genuine 404 behavior, dependency manifest and lockfile remain unchanged.

## Findings resolved during validation

Two variants of missing formula results could evade a check based solely on the reader's returned cell objects:

1. XLSX string or typeless formulas without a saved value could become an empty string, an invented zero, or disappear during reading.
2. A BIFF XLS formula expecting a subsequent STRING result record could disappear if that record was absent.

The import path now records missing-cache evidence directly from source worksheet XML and BIFF records before relying on parsed values. XLSX relationships map source parts to the correct worksheet, including reordered parts. Missing-cell coordinates contribute to bounds/counts; their preview is blank with an explicit missing-result warning, and CSV download is blocked. No replacement result or formula is invented. A genuine, explicitly cached empty-string result remains downloadable. The user can still select a different valid worksheet or download the original unchanged.

Regressions cover both failure variants, the valid empty-string case, and mapping by relationship rather than physical file order. These are import-only fixes; the existing CSV-to-XLSX writer was not modified. The earlier supplementary-Unicode and double-string-decoding workarounds remain covered.

## Complete workflow results

| Concern | Result |
| --- | --- |
| Leading zeros | XLSX and XLS numeric 42 with format `00000` exports `00042` in formatted mode; existing text `00123` also survives |
| Underlying values | The same formatted number exports `42`; ordinary negatives stay numeric text; date values are Excel serials |
| Missing formula caches | XLSX numeric/string and XLS missing STRING caches block download; cached results and explicit empty-string caches work |
| Multiple sheets | Selection changes exported data and invalidates old previews; hidden sheets are labelled; empty-sheet download blocked |
| Delimiters | Comma, semicolon, tab and pipe downloads reparsed correctly for both formats, including delimiters inside quoted/multiline cells |
| Spreadsheet safety | Off by default; enabled mode visibly prefixes/counts risky text; numeric negatives remain unchanged; working data/original are not modified |
| Original download | Actual downloads match uploaded bytes in XLSX and XLS workflows |
| Cancellation/timeout | Cancellation terminates the worker; replacement/stale messages cannot restore old results; a component test verifies the 30-second deadline and preserved original download |
| Limits | Oversized input, sheet counts, dimensions, field counts, expanded ZIP sizes, invalid compressed sizes/checksums and unsupported containers are rejected; successful boundary workload exports all 200,000 fields |
| Privacy/CSP | Same-origin GETs only, no processing uploads, no formula execution/HTML cell rendering, empty browser storage, unchanged CSP |
| SEO/routing | Five static canonical pages, sitemap/robots and Google verification checks pass; absent pages/assets remain genuine 404s |
| Discoverability | Homepage card and direct navigation links work at 320 px and under Android device emulation, with accessible touch targets |

## Commands and actual results

Using the existing Node/npm bootstrap and installed Chromium; no browser binaries or npm dependencies downloaded:

```sh
npm test
npm run test:e2e
playwright test --config=playwright.android.config.ts
python tests/verify-excel-csv-downloads.py
python tests/verify-xlsx-downloads.py --openpyxl
npm audit
npm audit --omit=dev
git diff --check
```

- **188 unit/component tests passed** across 11 files.
- **84 production desktop/mobile browser tests passed**. The E2E command also ran TypeScript, Vite production build and all three tool prerenders successfully.
- **25 additional Android Chrome emulation tests passed**, using the installed Chromium and Pixel 7 device profile. These cover the new converter, homepage/site routes/navigation, and existing CSV-to-XLSX workflows; repair workflow regression also passed in the full desktop/mobile run and the Android direct-route smoke check.
- **6 actual CSV downloads independently validated with Python csv**: XLSX and XLS across desktop, mobile and Android projects.
- **3 sample and 3 integrity XLSX downloads independently validated** using ZIP/XML and installed openpyxl for samples: values, coordinates, checksums, explicit text and absence of formulas.
- Full and production-only dependency audits: **0 vulnerabilities reported**.
- `git diff --check` passed; nothing staged.

Independent verification scripts still require desktop/mobile results and also validate optional Android artifacts. Android results use `test-results/android`, so they do not replace the full-suite artifacts.

## Android performance and memory evidence

The boundary workload contained 1,000 rows × 200 columns, 200,000 text fields, and a 1,396,524-byte compressed XLSX. All fields exported and the last value was verified. Local elapsed upload/read/prepare/download processing measurements:

- Desktop: approximately 1.69 seconds.
- Mobile viewport project: approximately 1.66 seconds.
- Android Chrome emulation: approximately 1.70 seconds.

The main interface accepted focus while the worker processed the sheet. Limits remain: 5 MB input, 50 sheets, selected-sheet 100,000 rows / 256 columns / 200,000 rectangular fields, expanded XLSX 32 MB / 2,048 entries, CSV 20 MB, 30-second processing timeout.

These measurements use the host computer's CPU and memory. **No physical Android device or low-memory OS-kill test was performed.** Workers have no enforceable per-worker heap cap. Valid-looking but hostile XLS containers and very dense workbooks can still exhaust a small device despite file/decompression/time limits. The UI and implementation report disclose this; do not advertise unlimited files or guaranteed safety against every malicious workbook.

## Limitations and interface review

The interface states that only one sheet is exported; formatting/formulas/images/comments/link metadata are not CSV features; hidden rows/columns are included; merges are not filled; formula caches may be stale; missing caches require recalculation/save in Excel or LibreOffice. Modes explain formatted text versus serial dates/underlying numbers, and optional safety explicitly describes value changes. CSV reopening can infer types again. Lost digits cannot be recovered.

Encrypted/password-protected workbooks, XLSM/XLSB/ODS, older raw BIFF and ZIP64 are unsupported. Locale/conditional/unusual number formatting need preview review. Existing tests cover selected contrast, keyboard entry/focus, horizontal table scrolling and touch targets; this is not exhaustive screen-reader or cross-browser certification.

## Final bundle measurements

| Asset | Bytes | Gzip bytes |
| --- | ---: | ---: |
| Excel reader worker | 395,594 | 134,720 |
| New interactive entry | 8,103 | 3,206 |
| New tool-specific CSS | 369 | 237 |
| Existing CSV-to-XLSX writer worker | 353,114 | 116,532 |

The writer worker is unchanged. The reader is fetched only on workbook selection on the new page, never on the homepage/repair/CSV-to-XLSX page. Homepage remains zero-JavaScript. Shared styling and navigation-entry hashes change as expected; no dependency or backend was introduced.

## Deployment recommendation and release notes

No known release-blocking failure remains. **Approved by the owner for deployment on 18 October 2026**, with the device/format limitations above. Use the existing `ycguler/csv-rescue` main branch and Cloudflare Pages `csv-rescue-app`: `npm run build`, output `dist`, existing Node configuration. No new project, bindings, service or security-setting change is required.

Release notes are prepared under **Unreleased — Excel to CSV** in CHANGELOG.md. After approval, review/stage only intended source/docs/tests (including the deliberately synthetic XLSX fixture), commit/push through the established Git integration, wait for the Pages success check, then smoke-test the live new route, actual downloads, mobile navigation, canonical/sitemap, CSP, original verification file and 404s. Do not claim the new converter is live until those production checks succeed.
