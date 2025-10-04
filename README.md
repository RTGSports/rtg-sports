# Raising the Game – Women’s Sports Scoreboard

A freshly rebuilt Next.js app that surfaces live scores for the WNBA, NWSL, and PWHL using free ESPN endpoints. The project is designed for the MVP outlined in our planning chat and keeps the stack lean so it runs anywhere—including GitHub Codespaces.

## Getting started

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Run the development server:
   ```bash
   pnpm dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) to view the app.

> **Note:** The scoreboard calls ESPN’s public APIs directly. No additional environment variables are required for the MVP.

## Available scripts

- `pnpm dev` – Start Next.js in development mode.
- `pnpm build` – Create an optimized production build.
- `pnpm start` – Run the production build locally.
- `pnpm lint` – Run ESLint with the Next.js ruleset.
- `pnpm test` – Execute the unit and component test suites via Node's built-in test runner.
- `pnpm test:watch` – Continuously re-run the test suites when source files change.

## Testing

The project uses Node's native test runner with a lightweight TypeScript loader (`scripts/ts-node-loader.mjs`). This keeps the stack lean while still allowing us to author tests in TypeScript/TSX with JSX syntax. The setup requires Node.js 20 or newer for custom loaders and the modern JSX runtime.

- Run a one-off test pass with:
  ```bash
  pnpm test
  ```
- Keep tests running in watch mode with:
  ```bash
  pnpm test:watch
  ```

The suites currently cover the utilities in `lib/`, the `GameCard` logic from the scoreboard view, and a smoke test that verifies cached scoreboard/news content renders when the network is unavailable.

## Continuous integration

Every push or pull request targeting `main` runs `.github/workflows/ci.yml`. The workflow installs dependencies with PNPM and enforces formatting by running `pnpm lint` followed by `pnpm test`.

## Progressive Web App

The app now ships with everything required to qualify as a Progressive Web App (PWA):

- A web manifest exposed at `/manifest.webmanifest` that defines the app name, theme colors, install targets, and icons.
- High-resolution PNG icons (including a maskable variant and an Apple touch icon) in `public/icons/`.
- A production-only service worker (`public/sw.js`) that pre-caches the shell, keeps assets up to date, and serves a friendly offline fallback page when the network is unavailable.
- Scoreboard and news responses are cached in local storage so returning visitors can see the most recent data instantly, even before the network responds.

## Offline behaviour

- Navigation requests fall back to `/offline`, which explains the offline state and lets visitors retry once they regain connectivity.
- The scoreboard and news panels hydrate from the last successful response in `localStorage`. When a fetch fails, the UI displays the cached content alongside an “Offline” badge so users know they are viewing saved data.
- Successful fetches notify the service worker (and use `cache: "default"`) so Workbox can update its runtime caches for the next offline session.

### Building and testing the PWA locally

Service workers only run in production mode. Follow these steps before committing or deploying changes:

1. Build the app:
   ```bash
   pnpm build
   ```
2. Start the production server:
   ```bash
   pnpm start
   ```
3. Open [http://localhost:3000](http://localhost:3000) and run the Lighthouse PWA audit in Chrome DevTools (or use the `Application → Manifest` panel) to verify the install prompt, manifest, and service worker registration.

### Hosting requirements

- PWAs must be served over HTTPS (or from `localhost`). Deploying to Vercel automatically satisfies this.
- Ensure the `public/` directory is included in deployments so the manifest, icons, offline page, and service worker are available.
- If you host somewhere other than Vercel, configure caching so that `sw.js` is served with `Cache-Control: no-cache` or a short max-age to allow updates.


## Deployment

Merges to `main` trigger `.github/workflows/deploy.yml`, which builds the Next.js app (`pnpm build`) and hands the output to Vercel for production deployment. Configure the following repository secrets so the action can authenticate securely:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

To replicate a deployment locally, run `pnpm build` and then deploy with the Vercel CLI using the same credentials.

## Next steps

- Polish league branding and typography.
- Add news, notifications, and favorites once we’re ready for the next iteration.
