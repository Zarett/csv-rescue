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
