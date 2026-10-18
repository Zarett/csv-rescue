# Excel to CSV — release approved 18 October 2026

- Add one `/xlsx-to-csv/` tool supporting XLSX and Excel 97–2003 XLS, worksheet selection, preview and CSV delimiter options.
- Offer explicit formatted-text/underlying-value modes and opt-in spreadsheet-safe value changes. Use saved formula results and block missing caches.
- Preserve original bytes and keep processing in a cancellable same-origin worker with input, expansion, dimension, output and time limits.
- Work around reader Unicode-reference truncation and double string decoding in temporary OOXML input; no uploaded workbook is modified.
- Add static metadata, canonical URL, sitemap entry, homepage discovery, independent fixtures and full regression tests. No new dependencies, backend or tracking.
- Final validation: block missing XLSX string/typeless formula caches and missing legacy XLS STRING records; retain explicitly cached empty results. Add direct mobile navigation to the new converter.
- Release checks: 188 unit/component tests, 84 desktop/mobile browser tests and 25 Android Chrome emulation checks passed; TypeScript, production build and both dependency audits passed.
- Approved for publication through the existing main-branch Cloudflare Pages Git deployment.

# CSV Rescue 1.2.0 — multi-tool homepage and SEO foundation

Release approved 18 October 2026.

- Replace the root repair entry with a static, responsive tool directory. Migrate the same repair app to `/csv-repair/`; preserve conversion at `/csv-to-xlsx/`.
- Prerender initial tool interfaces at build time and hydrate their existing behavior; homepage needs no JavaScript.
- Add genuine static 404 handling and a production preview that models physical routes and normalization.
- Add unique metadata/canonicals, local social-sharing art and a three-page sitemap. Future converters remain unpublished.
- Update navigation, repair destinations, documentation and route/SEO/accessibility regression tests. No processing or export semantics changed; no dependencies or analytics added.
- Root cannot redirect to repair because it remains the homepage. Prominent repair links and updated editable references mitigate the migration. The owner approved commit, push and deployment.

# CSV Rescue 1.1.0 — CSV to Excel conversion

Release approved 18 October 2026.

- Review follow-up: preserve overlapping OOXML escape-like sequences and normalize the UTF-8 signature exactly once, retaining a following intentional U+FEFF. Regression checks cover both actual desktop/mobile XLSX downloads and unchanged originals.

- Add a standalone, static `/csv-to-xlsx/` landing page for CSV to Excel conversion, with route metadata, canonical URL, sitemap and internal tool navigation.
- Add local file selection, drag/drop, a synthetic sample, delimiter selection, text-only XLSX generation, preview, cancellation and exact original download.
- Preserve string values without type inference, cleanup or formula execution. Protect literal OOXML escape sequences; reject unsupported values instead of truncating.
- Lazy-load a same-origin worker using pinned SheetJS CE 0.20.3; retain existing CSP and add Apache-2.0 notices. CSV repair never loads the workbook worker.
- Add independent XLSX validation, production desktop/mobile regression tests, resource-limit checks and SEO/privacy checks.
- No XLSX/XLS imports are included. The owner approved commit, push and deployment. See [evaluation and results](docs/CSV_TO_XLSX_RELEASE.md).

# CSV Rescue 1.0.0 — release candidate

Prepared 17 October 2026. MIT licensing approved by the owner. GitHub source publication was subsequently authorized and completed at https://github.com/Zarett/csv-rescue. Cloudflare deployment remains on hold.

- Private, browser-only CSV upload, analysis, preview, cleaning, and download; no account or server processing.
- UTF-8/BOM, common delimiters, header/no-header modes, quoted delimiters, escaped quotes, and multiline values.
- Reversible trimming, empty-row/column removal, exact duplicate removal, and explicit structural alignment that preserves extra values.
- Human-reviewed quote repair with per-line inspection and approval; no guaranteed recovery of ambiguous malformed CSV.
- Stable original/proposed statistics, visible unresolved warnings, compact mobile disclosures, and direct workflow navigation.
- Explicit data-preserving export by default; optional spreadsheet-safe export explains intentional apostrophes, including negative numbers.
- Exact original-byte download; normal CSV serialization may normalize quoting and record separators.
- Strict TypeScript, unit/component regression coverage, production Chromium desktop/mobile tests, selected accessibility checks, and dependency notices.
- Static Cloudflare Pages configuration: `npm run build`, output `dist`, no runtime bindings or secrets.

Deferred: other encodings, Web Workers, semantic value correction, manual cell editing, additional import/export formats, and comprehensive browser/assistive-technology certification.
