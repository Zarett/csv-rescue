# CSV to XLSX — evaluation and local release report

18 October 2026. **PASS for the approved Phase 0 and Phase 1 scope. Release v1.1.0 approved by the owner.** The owner approved commit, push and deployment after both review findings were fixed. Verification results below were obtained before publication. XLSX/XLS imports and worksheet selection were not started.

Review follow-up: both reported data-preservation defects are fixed. Escape protection now consumes only the leading underscore, preserving shared-boundary sequences such as `_x0041_x0042_` and `_x005F_x0041_`. UTF-8 decoding retains the signature and delegates its single removal to Papa Parse; additional leading U+FEFF characters remain field content. Independent Python ZIP/XML verification covers actual browser exports containing both cases and their original-byte downloads.

## Phase 0 gate

An isolated, ignored evaluation harness built the official SheetJS CE 0.20.3 ESM writer with Vite. A same-origin module worker generated an XLSX under the existing production CSP, including `connect-src 'none'`, without violations. Existing Chromium was reused; no browsers were installed.

The generated workbook was independently read with the already-installed openpyxl: 10 exact text cells, including leading zeros, long identifiers, date-like strings, negative values, whitespace, formula-like content, Unicode, multiline text and explicit empty text. Shared strings were required for empty-string interoperability. The isolated writer worker measured 331,329 bytes / 108,447 gzip bytes before adding CSV parsing, validation and error handling.

The approved implementation is **CSV input and XLSX output only**. It never invokes the workbook reader, so archive decompression, worksheet import and legacy encoding acceptance gates do not apply here. They remain mandatory before any later import phase. Conversion cannot read XLSX/XLS files.

### Dependency provenance, security and license

- Exact package: `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, not the obsolete npm-registry `xlsx` release. No runtime CDN requests.
- Downloaded archive SHA-256: `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`.
- Lockfile SHA-512 integrity: `sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==`.
- No runtime package dependencies. No other application dependency was added or upgraded. An isolated clean `npm ci --ignore-scripts` succeeded with the final lockfile.
- Apache-2.0 permits this distribution; retain its copyright and full license in `public/THIRD_PARTY_NOTICES.txt`. The official package ships no separate NOTICE file. CSV Rescue's original code stays MIT.
- Reviewed the [vendor advisory index](https://cdn.sheetjs.com/advisories/), [CVE-2023-30533](https://cdn.sheetjs.com/advisories/CVE-2023-30533) and [CVE-2024-22363](https://cdn.sheetjs.com/advisories/CVE-2024-22363). Version 0.20.3 is beyond their affected ranges. The prototype-pollution advisory explicitly excludes export-only workflows. These checks and a zero-result npm audit are not a guarantee against undiscovered flaws; recheck advisories before release, especially for a dependency sourced outside npm.
- Official [installation documentation](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/) identifies the authoritative distribution and stale registry issue.

## Implementation

- Dedicated static `/csv-to-xlsx/` landing page targets “CSV to Excel converter.” Includes useful instructions, limitations, FAQs, unique title/description, production canonical URL and reciprocal internal navigation. Build emits its own HTML file; content is readable without JavaScript. Interaction requires JavaScript.
- Drag/drop, file selection, built-in synthetic sample, delimiter selection, explicit conversion/download, bounded preview, original download and cancellation.
- Separate converter parser, workbook adapter and worker. No imports from CSV cleaning or quote repair; existing repair logic/export modes are unchanged. The only repair UI addition is the converter link.
- No type inference: headers and every value are text cells in a single `CSV data` worksheet. No automatic cleanup, formulas, hyperlinks or macros are created.
- Worker is requested only when Convert is selected. Existing privacy/CSP headers remain unchanged; no upload, analytics, external runtime dependency or browser storage was added.
- Supported: UTF-8/BOM, comma/semicolon/tab/pipe, CR/LF/CRLF records, quoted delimiters, escaped quotes, multiline values, Unicode, whitespace, ragged rows, duplicates and empty fields.
- Limits: 2 MiB input, 100,000 rows including any header, 256 columns, 200,000 fields, 32,767 UTF-16 code units per cell (also checked after OOXML escape encoding), 20 MiB output, 30-second timeout. Unsupported controls/UTF-8 and malformed quote errors stop conversion. No partial result or truncation is downloaded.

### Integrity fixes found during evaluation

- Shared strings preserve explicit empty text across independent readers.
- Literal `_xNNNN_` text requires escaping to avoid OOXML character decoding. The adapter protects these sequences; independent XML tests check `_x0041_`, `_x005F_`, CR/CRLF, tabs and markup.
- A final record separator must not count as a row or field beyond the exact resource limit. Boundary tests now accept 100,000 two-field rows with a final newline.
- Delimiter control has an explicit accessible name. Stale worker messages/errors cannot replace a later file's state. Cancellation and timeout terminate workers.

## Executed verification

| Check | Result |
| --- | --- |
| `npm test` | **159 passed**, 9 unit/component files |
| `npm run typecheck` | **PASS** |
| `npm run test:e2e` | **42 passed**, desktop and mobile Chromium; builds production first |
| Production Vite build | **PASS**, static repair and converter HTML, local assets/worker |
| Full `npm audit` | **0 vulnerabilities** |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| Isolated clean install from final package/lockfile | **PASS**, no application lifecycle scripts executed |
| Independent ZIP/XML reader in Node tests | **PASS**, text types, field coordinates/values, no formulas |
| Python standard-library ZIP/XML/checksum validation + openpyxl | **PASS**, two sample and two integrity downloads; samples also verified with openpyxl |
| Additional independent Python XML validation | **PASS**, OOXML literal escapes, CR/CRLF, whitespace, tabs, empty text, markup |
| Accessibility checks | **PASS**, keyboard entry/sample activation, skip link, explicit labels, selected contrast, 44px download target |
| Layout | **PASS**, 320/768/1440px containment; screenshot reviewed on mobile |
| Production privacy/CSP | **PASS**, same-origin GET-only assets, no storage, successful worker/download under unchanged CSP |
| Original downloads | **PASS**, BOM and original bytes retained |
| Static SEO | **PASS**, route-specific HTML/metadata/canonical, no-JS guide, sitemap/robots, direct navigation and internal links |
| Repair regression | **PASS**, all existing tests including reversible cleaning, quote approvals, structural alignment and both CSV export modes |

Reproduce using existing Node/npm and Playwright Chromium: `npm test`, `npm run typecheck`, `npm run test:e2e`, `npm audit`, `npm audit --omit=dev`. Optionally run `python tests/verify-xlsx-downloads.py`; `--openpyxl` also uses that reader if already installed. Python is not an application/npm-test dependency.

The synthetic 1,867,999-byte fixture (1,000 rows × 200 columns, 200,000 unique text fields) converted in **861 ms desktop / 859 ms mobile viewport emulation** on this Windows host in the post-fix verification, measured from Convert to ready. Every generated field, including `GR1000`, was checked independently. This is not an Android hardware benchmark or worst-case memory guarantee. No real user data was used.

## Measured bundle impact

Uncompressed/gzip sizes use bytes; decimal kB summaries below. Gzip was measured with Node's `gzipSync`, independently of server transport.

| Asset group | Raw | Gzip | When loaded |
| --- | ---: | ---: | --- |
| Existing repair baseline JS | 273,125 B | ~86.95 kB | Before changes |
| Repair JS now (shared + repair chunks) | 272,799 B | 87,201 B | Repair route |
| Shared CSS now | 19,873 B | 5,421 B | Either route; baseline 19,718 B / ~5.40 kB gzip |
| Converter initial JS (shared + converter chunks) | 247,341 B | 78,541 B | Converter route |
| Converter-specific CSS | 2,023 B | 703 B | Converter route only |
| Complete CSV/XLSX worker | 353,114 B | **116,532 B** | Convert action only |

Repair JavaScript gzip increases by approximately **0.25 kB**, not by the spreadsheet worker size. Production browser tests confirm that uploading/using CSV repair does not request the worker or converter entry. Converter HTML is approximately 4.03 kB / 1.93 kB gzip. Bundler shared-chunk splitting changes filenames; do not compare a single chunk alone.

## Remaining limitations and release boundary

- No XLSX/XLS input, sheet selection, type inference, formula recalculation, workbook editing or styling preservation.
- A workbook cannot preserve CSV syntax or reliably distinguish absent versus empty fields visually. Numbers/dates intentionally stay text; conversion does not repair malformed quotations.
- The adapter handles OOXML escape semantics; some independent readers, including openpyxl for encoded carriage returns, may expose those encodings differently. Standards-aware independent XML validation covers CR/CRLF preservation; no claim of universal spreadsheet interoperability is made.
- Current automated browser coverage is Chromium desktop/mobile emulation. Firefox, Safari, physical Android and assistive-technology testing remain unverified. No extra binaries were downloaded.
- Workers are not a hard memory sandbox. Limits reduce exposure, but low-memory devices may still fail; errors leave originals intact.
- Static SEO is implemented, but ranking/indexing/traffic are not guaranteed. No Search Console account, analytics or external resources were created.
- Official tarball retrieval is needed for a fresh dependency install; pinning/integrity mitigate drift, not distribution availability. Future updates require advisory/license/regression review.
- Canonicals and sitemap currently target `https://csv-rescue-app.pages.dev`; change together if the public host changes. No future/unimplemented conversion URLs are listed.
- Live Cloudflare smoke tests are deferred until an approved release. Pushing the approved release to main triggers the existing Git-integrated deployment; confirm its outcome and live behavior separately.

Release action: publish the approved v1.1.0 source commit to main and verify the existing automatic Pages deployment. No XLSX/XLS import work is authorized by this release.
