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

## Next steps

- Polish league branding and typography.
- Add news, notifications, and favorites once we’re ready for the next iteration.
- Introduce automated tests and deployment once we connect hosting.
