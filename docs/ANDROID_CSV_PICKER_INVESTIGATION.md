# Android CSV selection investigation

## Recommendation

Local software verification: **PASS**. The owner approved committing and pushing these validated fixes to `main` for the existing Cloudflare Pages deployment. Physical Android document-provider acceptance remains pending and will be performed separately by the owner. Cloudflare remains canonical; Netlify is outside this release. No hosting configuration, canonical, sitemap, robots, or Search Console changes are included. Deployment outcome must be verified separately after publication.

## Confirmed findings and minimal fixes

1. `choose(undefined)` previously terminated the worker and cleared the file, result, and error. An empty file-list change could therefore destroy the existing selection. The handler now returns before modifying state when there is no candidate. Browsers that emit only `cancel` already leave state unchanged; this protects empty-selection events too.
2. The converter input advertised only `.csv,.tsv,.txt` through `accept`. Native providers can use MIME metadata to filter the chooser before application validation runs. This filter was removed as a compatibility precaution; the physical-device exclusion mechanism is **not confirmed**. The application still validates the final extension (case-insensitive CSV/TSV/TXT), nonempty size, 2 MB input limit, strict UTF-8, CSV quoting, dimensions, control characters, cell lengths, timeout, and 20 MB output limit. MIME metadata is not trusted. Unsupported files remain rejected.

No parsing, quote-repair, cleanup, export-mode, workbook-generation, or original-download logic changed. Existing input-value reset still permits selecting the same file again. New selections clear prior results/errors and terminate prior workers; stale worker results are ignored. Empty selections preserve active work, errors, or completed results.

## Hypotheses and limits

- No filename-specific application restriction was found. All seven requested filenames, plus `report.csv.csv`, worked with `text/csv`, `text/plain`, `application/octet-stream`, and empty MIME metadata: 32 combinations per browser project.
- Spaces, parentheses, Turkish Unicode, uppercase extensions, repeated extensions, and the requested longer name do not require renaming after the file reaches JavaScript.
- Renaming may affect provider metadata, indexing, or location, but this was not reproduced or established as the cause.
- Automated file assignment bypasses Android's native document chooser. Emulation does not verify provider filtering, permissions, browser download indexing, or actual physical-device memory behavior.
- The new browser regression reuploads the exact file downloaded earlier in the session from disk; it does not simulate Android's Downloads provider.
- Ambiguous malformed quote boundaries remain heuristic. In exploratory testing a synthetic malformed row followed immediately by an uneven row did not support the assumed repair boundary. Review original/proposed physical lines manually; a successful parse alone does not prove intended record boundaries. Existing warnings and converter rejection of unresolved parse errors were retained.

## Repair and conversion compatibility

The locally available original `csv_rescue_stress_test.csv` was tested without adding it to Git. This version contains **21 data records**, not the older 15-record dataset discussed previously.

Desktop and Pixel 7 emulation both:

1. Rejected its original malformed quoting in CSV-to-XLSX.
2. Opened CSV repair and displayed quote/structural warnings.
3. Required review of two physical-line changes before quote approval.
4. Reversed approval and observed warnings return, then reapplied approval.
5. Explicitly named extra fields and padded missing fields; warnings cleared.
6. Exported 21 data records plus the header, all eight fields wide, without duplicate removal, trimming, or semantic corrections.
7. Preserved extra values, the duplicate record, negative/text/invalid values, and legitimate multiline text.
8. Reimported the exact cleaned CSV, converted it to XLSX, and verified every resulting value and coordinate independently.
9. Downloaded originals byte-for-byte unchanged at both stages.

A separate synthetic regression verifies leading zeros (`00123`, `00042`, `00008`, `00007`), valid CRLF multiline values, quote-approval reversal, explicit structural alignment, and exact CSV-to-XLSX reimport. Other regressions cover whitespace, long identifiers, Unicode, formulas as text, invalid UTF-8, and all safety limits.

Repair accepts files up to 10 MB, while conversion accepts up to 2 MB and narrower field/row limits. A valid repaired export can therefore still exceed conversion limits. Spreadsheet-safe repair export intentionally adds protective apostrophes; conversion preserves those exported values rather than undoing them. Unresolved malformed quoting is rejected; use the original file and manually reviewed repairs rather than relaxing validation.

## Executed verification

| Check | Result |
|---|---|
| Unit/component suite | 221 passed across 11 files |
| Production desktop/mobile browser suite | 88 passed |
| Pixel 7 Android Chrome emulation suite | 27 passed |
| TypeScript and production build | Passed |
| Dependency audit | Zero vulnerabilities |
| Independent picker/repair XLSX verification | Eight downloads passed openpyxl plus ZIP/XML checks |
| Existing sample/integrity XLSX verification | Three sample and three integrity downloads passed; samples also read with openpyxl |
| Existing Excel-to-CSV independent validation | Six actual XLSX/XLS-derived CSV downloads passed Python CSV checks |
| Original stress-file local browser workflow | Passed desktop and Android emulation |
| Git diff whitespace check | Passed |

The first new repair-workflow test used an ambiguous fixture boundary, then a temporary browser-download path without a supported filename extension. Both test setup mistakes were corrected. The final complete browser run passed. No application validation was weakened.

The existing production QA server already occupied port 4173. Ignored temporary Playwright configurations reused that identified server against the freshly built `dist`, preserving the checked-in deployment/test configuration. Existing installed browsers and Python/openpyxl were reused; no dependencies or browser binaries were installed.

Openpyxl 3.1.5 leaves the valid `_x000d_` carriage-return escape in shared strings undecoded. The verifier checks ZIP/XML independently with one OOXML decoding pass and accounts for that specific reader behavior when comparing openpyxl results. Workbook generation was not changed.

## Production observation

HTTP GETs to `https://csv-rescue-app.netlify.app/` and `/csv-to-xlsx/` returned Netlify HTTP 404, “Site not found,” from this environment. A real Chromium browser with Pixel 7 emulation saw the same response. Example request ID: `01M58J3WKBPVS94VSD5M9A8GGB`. Thus **no live Netlify conversion success is claimed**. Confirm the exact current Netlify production hostname/account/deployment separately; no Netlify settings were changed. This finding does not establish what the user saw on their phone or whether another live hostname works. Cloudflare reachability was not retested as part of this investigation.

## Physical Android acceptance checklist

On the intended local preview or an explicitly approved deployment, using current Chrome on the physical Android device:

- Record Android/Chrome versions and provider (Downloads, device Files, cloud provider).
- Select the seven requested names, including spaces/parentheses, Unicode and `.CSV`, without renaming.
- Compare newly downloaded repair output against locally created copies; test provider entries labelled as CSV, plain text, binary, or unknown where available.
- Select a first file, replace it, select the same file twice, and select after a parse error.
- Cancel the native picker before and after conversion; the existing selection/result must remain.
- Repair the original, inspect every proposed quote change, align explicitly, download, navigate to conversion, select that exact downloaded file, and compare its XLSX values.
- Confirm unsupported files, malformed quoting, invalid encoding, and oversized files still fail clearly.

## Changed release files

- `src/conversion/Converter.tsx`: empty-selection guard and provider-neutral picker.
- `tests/Converter.test.tsx`: 32 filename/MIME cases and state/worker regression.
- `tests/e2e/conversion.spec.ts`: filename/provider matrix and repair-download-reimport workflow.
- `tests/verify-picker-downloads.py`: independent read-only workbook verification.
- This investigation report.

Original CSVs, generated workbooks, HTTP evidence, screenshots, and temporary configs remain in ignored local QA locations. The only production behavior change is broader native picker visibility and preservation of state on an empty selection. The chooser can now display unsupported files, which the application rejects explicitly.
