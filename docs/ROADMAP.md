# Development Roadmap

Phased plan for building Hostile Web Cleaner, mapped from the local `PRODUCT.txt` spec (gitignored).

## Phase 0 — Scaffold (current)

**Goal:** Project structure, build tooling, and extension shell.

- [x] MV3 manifest with required permissions
- [x] Background service worker with messaging
- [x] Content scripts (isolated + main world)
- [x] Rule engine types and empty defaults
- [x] Popup UI with enable/disable toggle
- [x] ESLint, Prettier, TypeScript strict mode

**Key files:** `manifest.config.ts`, `src/background/`, `src/content/`, `src/core/`, `src/rules/`, `src/popup/`

---

## Phase 1 — Click Hijacking Prevention

**Goal:** Users click once and only intended navigation happens.

**Problem:** Multiple unwanted tabs open from a single click.

**Modules:**
- `src/content/patches/window-open.ts` — intercept `window.open`
- `src/background/index.ts` — detect and auto-close spam tabs

**Expected result:** Normal click behavior without popup spam.

---

## Phase 2 — Fake Overlay Removal

**Goal:** Restore access to page content blocked by fullscreen overlays.

**Problem:** "Disable Adblocker" overlays, fake virus alerts, forced subscription prompts.

**Modules:**
- `src/content/repair/overlay-remover.ts` — detect and remove blocking elements
- `src/content/repair/scroll-restore.ts` — re-enable scrolling and pointer events

**Expected result:** Users regain access to page content instantly.

---

## Phase 3 — Countdown Bypass

**Goal:** Skip artificial waiting timers.

**Problem:** Fake countdowns delay access to content.

**Modules:**
- `src/content/patches/set-timeout.ts` — patch timer functions
- `src/content/repair/button-enabler.ts` — auto-enable continue buttons

**Expected result:** Immediate access to content.

---

## Phase 4 — Redirect Chain Protection

**Goal:** Keep users on intended destinations.

**Problem:** Forced affiliate redirects, ad loops, scam pages.

**Modules:**
- `src/background/redirect-tracker.ts` — monitor navigation chains
- `src/background/redirect-classifier.ts` — classify suspicious redirects

**Expected result:** Users stay on intended destinations; harmful tabs auto-close.

---

## Phase 5 — Site-Specific Rule Engine

**Goal:** Maintainable, community-scalable per-domain fixes.

**Problem:** One-size-fits-all heuristics break on edge cases.

**Modules:**
- `src/rules/defaults.json` — curated default rules
- `src/rules/engine.ts` — hostname matching and rule resolution
- Popup UI — per-site rule overrides (future)

**Example rule:**
```json
{
  "domain": "example.com",
  "rules": ["blockPopup", "removeOverlay", "skipCountdown", "restoreScroll"],
  "enabled": true
}
```

---

## Phase 6 — Anti-Adblock Neutralization

**Goal:** Preserve site functionality without disabling protection.

**Problem:** Sites detect blockers and break usability.

**Modules:**
- `src/content/injected/main-world.ts` — spoof ad visibility signals
- `src/content/patches/adblock-detection.ts` — bypass simplistic detection

**Expected result:** Sites work normally without user intervention.

---

## Future Possibilities

- AI-based annoyance detection
- Community rule marketplace
- Website trust scoring
- Phishing and scam page classification
- Vitest unit tests for rule engine and patches
