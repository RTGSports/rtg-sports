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

The suites currently cover the utilities in `lib/` and the `GameCard` logic from the scoreboard view, ensuring rendering helpers stay correct as the UI evolves.

## Continuous integration

Every push or pull request targeting `main` runs `.github/workflows/ci.yml`. The workflow installs dependencies with PNPM and enforces formatting by running `pnpm lint` followed by `pnpm test`.

## Deployment

Merges to `main` trigger `.github/workflows/deploy.yml`, which builds the Next.js app (`pnpm build`) and hands the output to Vercel for production deployment. Configure the following repository secrets so the action can authenticate securely:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

To replicate a deployment locally, run `pnpm build` and then deploy with the Vercel CLI using the same credentials.

## Next steps

- Polish league branding and typography.
- Add news, notifications, and favorites once we’re ready for the next iteration.
