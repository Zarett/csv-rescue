# Excel to CSV — local release candidate

Status: implemented, validated, and approved for publication on 18 October 2026 through the existing main-branch Cloudflare Pages Git workflow. Package version remains 1.2.0. Actual deployment status is recorded by the Cloudflare Pages check on the publishing commit.

## Product behavior

One canonical page, `/xlsx-to-csv/`, supports XLSX and Excel 97–2003 compound-file XLS. There is no second `/xls-to-csv/` page. The homepage adds a third tool card; CSV-to-XLSX links to the reverse converter. Existing repair and CSV-to-XLSX algorithms and export modes are untouched.

The user chooses one workbook, selects a worksheet, sets values/delimiter/safety options, prepares a preview, reviews warnings and downloads CSV. Hidden sheets are labelled; the first visible sheet is initially selected. Changing any setting removes the previous preview/download. Original-file download remains byte-for-byte unchanged even after cancellation or errors. Every worksheet needs its own download.

- **Formatted text (default):** applies reader-supported number formats to stored values. Useful for displayed leading zeros, dates, currency and percentages. Not guaranteed to match Excel's locale-specific, conditional or unusual formatting.
- **Underlying values:** retains text and exports numbers and TRUE/FALSE; numeric dates are serial numbers. It cannot reconstruct text or precision already lost in the workbook.
- **Formula handling:** use saved results only, never execute or recalculate. Report formula/error counts. Block export of a selected sheet with any formula lacking a cached result. Cached results can be stale. Users must recalculate/save with Excel or LibreOffice when necessary.
- **Safety:** data-preserving CSV is default. Optional spreadsheet-safe mode prefixes formula-like text with an apostrophe, shows a changed-value count and previews changed values. Ordinary numeric negatives are retained; formula-like text such as text `-5` is intentionally changed when enabled.
- **Structure:** output is rectangular from A1 to the reported/actual used extent, including leading/interior blanks and cells outside understated dimensions. Hidden rows/columns are included. Merged positions are not filled with invented values. Empty sheets cannot be downloaded. No trimming, cleaning, duplicate removal or inferred values.
- **CSV limits:** one worksheet's values only; no cell types, styling, images, comments, hyperlink metadata or macros. Reopening CSV can infer numbers/dates/formulas again; import identifier columns as Text.

## Reader evaluation and security

Reuse the installed official-CDN **SheetJS CE 0.20.3**, Apache-2.0, with existing distribution notices. No npm dependencies, lockfile changes, paid service or browser downloads were added. The vendor's documented fixes for CVE-2023-30533 and CVE-2024-22363 precede this version. Both npm audits reported zero vulnerabilities; this is not a guarantee against unknown parser flaws, and CDN dependencies also require vendor-advisory review.

Primary references:

- [SheetJS reading options and formats](https://docs.sheetjs.com/docs/api/parse-options/)
- [Vendor security notes](https://docs.sheetjs.com/docs/miscellany/security/)
- [CVE-2023-30533 advisory](https://cdn.sheetjs.com/advisories/CVE-2023-30533)
- [CVE-2024-22363 advisory](https://cdn.sheetjs.com/advisories/CVE-2024-22363)

Read only in a dedicated same-origin module worker, created after a file is selected. HTML output is disabled; preview is ordinary React text. No formulas/macros are evaluated and no external links are followed. Existing `connect-src 'none'` and other security/privacy headers are unchanged. Production-CSP browser tests verify worker operation, inert HTML-like cells, local GET-only requests, empty browser storage and no page errors.

Input checks distinguish XLSX ZIP from XLS CFB instead of accepting renamed CSV/HTML through a permissive parser fallback. XLSX preflight bounds entries and total expanded size, validates paths, local/central metadata, actual streaming decompression length and CRC checksums before parsing. Unsupported encryption, split ZIP, ZIP64, duplicate entries and inconsistent archives fail without partial export. Streaming decompression requires a current browser with `DecompressionStream('deflate-raw')`. XLS uses the reader's CFB parser after file-size/signature validation.

Resource limits: 5 MB input; 50 sheets; selected sheet at most 100,000 rows, 256 columns and 200,000 rectangular fields; 32 MB expanded XLSX content and 2,048 entries; 20 MB CSV output; 30-second processing deadline. Cancel/timeout terminates the worker and requires choosing the workbook again. These mitigate resource exhaustion; browsers offer no enforceable per-worker heap limit, especially for hostile legacy containers. Do not describe these measures as a complete malicious-document sandbox.

## Data-integrity bugs found and fixed

Independent fixtures exposed two SheetJS 0.20.3 behaviors:

1. Numeric XML references above U+FFFF were truncated (for example, openpyxl emoji output).
2. Cells stored as OOXML `t="str"` were XML/OOXML-decoded twice, corrupting literal reference/escape text.

The import-only container preparation decodes valid supplementary numeric references to equivalent UTF-8 and routes `str` caches through the reader's single-decode inline-string path. A temporary archive is rebuilt using the already-installed container utility, only when necessary. Uploaded bytes and original downloads are not rewritten. Formula metadata is retained. Regression tests cover decimal/hex references, escaped literal references, protected OOXML escape sequences, Unicode and actual browser-worker output. The existing CSV-to-XLSX writer is unchanged.

## Verification actually run

- **183 unit/component tests passed** (11 files), including 19 import/serialization tests and 5 new component tests.
- **78 production browser tests passed** across desktop/mobile Chromium projects; existing repair/conversion/privacy suites remain green.
- After saving actual CSV artifacts and the final icon/list styling refinements, the production build and **28 affected Excel/site/verification browser tests passed again**.
- **4 actual browser CSV downloads independently passed Python `csv` validation**, checking exact XLSX/XLS values and positions in both projects.
- TypeScript and Vite production builds with three tool prerenders passed.
- Full/development and production-only npm audits: **zero vulnerabilities reported**.
- Independent inputs: an openpyxl-created XLSX with text/number/date-format/Unicode values and multiple sheets; a hand-built BIFF8 + CFB fixture (no SheetJS writer) including Unicode and genuine cached-formula records. Additional SheetJS-generated fixtures exercise hidden/empty sheets, merges, errors, malformed archives and bounds.
- Browser tests cover mode/delimiter changes, safety counts, missing-cache blocking, stale-result invalidation, cancellation/replacement, original bytes, no-JS content, canonical metadata, five-page sitemap, 404s, lazy loading, narrow-screen layout and keyboard navigation.
- Visual QA: initial desktop tool, mobile worksheet/settings/preview/download and three-card desktop homepage. Existing browsers reused; no binaries installed.

An early sitemap assertion failed only because it assumed URL order. It now compares the exact sorted URL lists; duplicates/extras still fail. An initially expensive test writer fixture was replaced with a compact over-wide worksheet that exercises the same rejection boundary.

## SEO and deployment

Title: `Excel to CSV Converter — XLSX & XLS, Private | CSV Rescue`.

Canonical: `https://csv-rescue-app.pages.dev/xlsx-to-csv/`.

The H1, description, Open Graph, social image, useful instructions, limits and native navigation are in initial HTML. The initial tool is prerendered and hydrated. Sitemap has five canonical pages, including the new tool and existing guide; `/xls-to-csv/` remains a real 404. No extra guide or placeholder page was created. Google verification bytes, robots, 404 implementation and redirect rules are unchanged.

Existing Cloudflare Pages build command `npm run build`, output `dist`, and Node configuration remain valid. No hosting settings, accounts or infrastructure were created. Actual production routing/CSP still needs post-deploy verification after explicit release approval.

## Bundle measurements

Final build measurements are local gzip sizes, not observed network transfer or Core Web Vitals:

| Asset | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| New reader worker | 392,349 | 133,541 |
| New interactive entry | 8,103 | 3,208 |
| New tool-specific CSS | 369 | 237 |
| Shared tool CSS | 20,338 | 5,480 |
| Shared static-site CSS | 4,542 | 1,495 |

The existing spreadsheet writer worker (353,114 bytes) and shared React/Papa runtime (242,377 bytes) are byte-for-byte unchanged. Shared tool CSS grows by 348 bytes versus the baseline and static-site CSS by 83 bytes. Some entry/chunk hashes change with the additional entry and shared CSS; this is not evidence of processing changes. The reader is never loaded on the homepage, repair or CSV-to-XLSX page, and is deferred on its own page until workbook selection. Homepage remains zero-JavaScript.

## Remaining limitations

- No encrypted/password-protected workbooks, XLSM/XLSB/ODS or older raw BIFF. Supported legacy scope is Excel 97–2003 XLS, not every historical file named XLS.
- CSV cannot preserve workbook cell types or arbitrary display formats. Formatted output uses reader conventions; preview important values.
- No formula recalculation or lost-digit restoration. Error cells and stale caches require user review.
- No real-device, native Excel or exhaustive cross-browser/assistive-technology certification; mobile tests emulate viewport/device settings.
- ZIP preflight and worker limits cannot guarantee survival against every hostile input or a hard memory ceiling.
- Owner approved the release on 18 October 2026; use the existing Git deployment workflow and verify production before declaring success.

## Final release validation

See [final validation report](EXCEL_TO_CSV_FINAL_VALIDATION.md) for the superseding counts, additional formula-cache guards, Android emulation and final bundle measurements. The initial measurements and test counts above describe the implementation checkpoint before final validation.
