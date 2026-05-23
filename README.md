# Hostile Web Cleaner

**Make broken websites usable again.**

A Chrome extension that repairs hostile, manipulative, and frustrating website behaviors — fake overlays, click hijacking, forced countdowns, popup traps, and redirect chains.

This is **not** another ad blocker. Traditional blockers filter ads and trackers. Hostile Web Cleaner focuses on **interaction abuse** and **usability restoration**.

## What It Does

- Intercepts suspicious popup and redirect behavior
- Removes blocking overlays and restores scrolling
- Bypasses artificial countdown timers
- Protects user intent on hostile websites

## Prerequisites

- Node.js 20+
- Google Chrome

## Quick Start

```bash
npm install
npm run dev
```

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist` folder
4. Visit any website — check the browser console for `[HostileWebCleaner]` debug logs

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Typecheck and build production bundle to `dist/` |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint on `src/` |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format source files with Prettier |
| `npm run format:check` | Check formatting without writing |

## Project Structure

```
src/
├── background/       # Service worker — navigation tracking, messaging
├── content/          # Content scripts (isolated + main world)
│   ├── injected/     # Main-world API patch stubs
│   ├── observers/    # MutationObserver stubs
│   ├── patches/      # Monkey-patch module stubs
│   └── repair/       # DOM repair stubs
├── core/             # Shared types, messaging, storage
├── rules/            # Site-specific rule engine
└── popup/            # Extension popup UI (React)
```

## Architecture

```
Service Worker  ←→  Popup UI
       ↕
Content Script (isolated)  →  DOM observers, repair
Content Script (main world)  →  API patching (window.open, etc.)
       ↕
Rule Engine  →  per-domain behavior fixes
```

See [docs/ROADMAP.md](docs/ROADMAP.md) for the phased development plan.

## Product Spec

Product vision and goals live in `PRODUCT.txt` locally (gitignored, not pushed to GitHub).

## License

MIT
