# Cloudflare Pages release procedure

Current update: the owner has deployed v1.0 to `https://csv-rescue-app.pages.dev/`. The owner approved the v1.1.0 CSV-to-XLSX release on 18 October 2026. Its build remains `npm run build`, output `dist`; Vite now emits both `index.html` and `csv-to-xlsx/index.html`. No server functions or new environment variables are required. Verify the new route, sitemap, canonical host, worker download/CSP and original-byte download after deployment. Main-branch pushes trigger the existing Git-integrated deployment; verify successful completion before announcing availability. The older initial-release instructions below are historical.

Status: MIT is active and source is published at https://github.com/Zarett/csv-rescue with the owner's approval. The initial release commit is `c2b1341`. No Cloudflare project or deployment has been created; Cloudflare deployment still requires separate approval.

The GitHub publication steps below are retained as a reference and are already completed. Continue with Pages dashboard settings only after deployment approval.

This is a static Vite application. Cloudflare Pages fits the current implementation with no server functions, credentials in source, or additional production dependency.

## Before publication

1. MIT licensing is approved: `LICENSE` and package/lockfile metadata must remain MIT. Confirm the owner-approved copyright attribution and retain all third-party notices.
2. Run `npm ci`, `npm test`, `npm run typecheck`, `npm run test:e2e`, `npm run build`, and `npm audit`. The E2E command builds and tests production assets with the declared Pages headers.
3. Inspect `git status --short` and `git ls-files --others --exclude-standard`. Do not include `.local-data`, `.tools`, `node_modules`, test artifacts, `.env` files, or `dist` in the source repository. `docs/screenshots` contains only intentionally selected synthetic product screenshots.
4. Confirm the target repository, account, and intended public audience with the owner before any push or deployment.

## Exact GitHub publication steps (run only after explicit approval)

1. Confirm the GitHub owner, repository name `csv-rescue`, public visibility, and the Cloudflare account. MIT is already approved. The GitHub destination is now `Zarett/csv-rescue`; the Cloudflare account/project remains unselected.
2. Verify the active `LICENSE`, owner-approved attribution, and MIT package/lockfile metadata. No further license activation is needed.
3. Run the verification commands above. Check `git status --short` and inspect the proposed source files. The `examples/` and `tests/fixtures/` CSV files are intentionally synthetic fixtures; `.local-data/` and `.codex-remote-attachments/` are private local data and must stay excluded.
4. Stage only the release source paths, then inspect the staged file list and diff:

```sh
git add -- .env.example .gitignore .node-version CHANGELOG.md DEPLOYMENT.md LICENSE README.md RELEASE.md docs examples index.html package.json package-lock.json playwright.config.ts public scripts src tests tsconfig.json vite.config.ts
git diff --cached --name-only
git diff --cached --check
git diff --cached
```

5. After confirming that no local data, credentials, caches, or personal paths are included, create the initial local commit: `git commit -m "Release CSV Rescue v1.0.0"`. The existing branch is `main`. Git may ask you to configure your own commit identity; do not invent one.
6. In GitHub, create the approved **public** empty repository. Do not initialize another README or license. Copy its actual HTTPS remote URL. Run `git remote add origin ACTUAL_REPOSITORY_URL` (replace the placeholder) and `git push -u origin main`. Never upload the entire local directory or `.git` as a ZIP; the provided source candidate excludes local artifacts.
7. Optionally create a GitHub `v1.0.0` release using `CHANGELOG.md` after the hosted smoke test succeeds. This is another public-facing action and needs the owner's authorization.

`private: true` in `package.json` prevents accidental npm package publication; it does not prevent a public GitHub repository or static deployment. A GitHub Actions workflow is not required: Cloudflare's Git integration builds approved pushes automatically.

## Pages dashboard settings (after approval)

| Setting | Value |
| --- | --- |
| Project name | `csv-rescue` if available; otherwise choose an owner-approved alternative |
| GitHub repository | `Zarett/csv-rescue` |
| Production branch | `main` |
| Framework | React / Vite |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output | `dist` |
| Node version | 24.19.0 (`.node-version`; tested locally) |
| Runtime bindings | None |
| Optional build variable | `VITE_GITHUB_URL=https://github.com/Zarett/csv-rescue` |

The application does not need API keys, paid services, authentication, storage, Workers, or Pages Functions. Configure no analytics or third-party scripts. The optional GitHub URL is public build configuration, never a secret.

For automatic GitHub deployment, use the Cloudflare dashboard: **Workers & Pages → Create application → Pages → Connect to Git**. Authorize only the intended GitHub repository, select it, and apply the settings above. Use the Free plan, retain the `pages.dev` domain, and add no billing upgrade, custom domain, analytics, Workers, Functions, or storage. Select **Save and Deploy** only after approval; this makes the site public. Git-integrated projects then rebuild on pushes to `main`; other branches may create public preview deployments, so review branch controls and future pushes accordingly.

The intended HTTPS URL is `https://csv-rescue.pages.dev`, subject to project-name availability. It has not been reserved or verified as available. Do not purchase a domain. After deployment, use Cloudflare's actual returned URL.

Pages also supports direct static uploads, but this candidate's recommended workflow is Git integration. For a direct upload, upload the **contents** of the freshly built `dist` directory, including `_headers`, `favicon.svg`, and `THIRD_PARTY_NOTICES.txt`.

## Direct navigation and assets

The project uses Vite's root asset paths and ships no top-level `404.html`, so Pages' documented SPA fallback serves the app on direct extensionless paths. Production browser tests cover `/review/deep-link/`, JavaScript/CSS/favicon loading, dependency-notice delivery, and returning home. The local QA server models the declared Pages behavior; actual Cloudflare HTTPS/headers still require a hosted smoke test. No router or backend was added.

## Verify the hosted release

- Confirm HTTPS and the intended audience.
- Confirm the response includes the CSP from `public/_headers`, `X-Content-Type-Options`, and the declared privacy/permissions headers. A local Vite preview does not apply Pages headers; the E2E QA server does.
- Upload the synthetic examples. Test cleanup, reversibility, normal/safe export, exact original download, and reset on desktop and mobile.
- Inspect browser Network and storage panels while processing a file: no file-processing requests or persisted file data should appear.
- If an earlier version exists, retain its deployment identifier to allow rollback through the Pages dashboard.

Official references: [GitHub integration steps](https://developers.cloudflare.com/pages/get-started/git-integration/), [SPA serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/), [build-image version configuration](https://developers.cloudflare.com/pages/configuration/build-image/), [Free-plan limits](https://developers.cloudflare.com/pages/platform/limits/), [React on Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/), [Vite build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), and [custom headers](https://developers.cloudflare.com/pages/configuration/headers/).
