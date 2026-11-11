# UI/UX Audit — TargetChat Frontend

> **Source of truth for the UI/UX quality task.**
> Scope: `targetchat/frontend` (`pages/` + `components/` + `styles/` + `tailwind.config.js`).
> Updated continuously — never retro-filled at the end.

## Legend

| Marker | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | Code changed + machine-verified (build / generated CSS / contrast maths) but **not** pixel-verified in a browser |
| `[x]` | Fixed **and** visually verified in both themes at the stated breakpoints |
| `[!]` | Blocked / requires manual review |
| `[-]` | Intentionally not changed (reason given) |

### ⚠️ Honesty constraint on this run

No browser automation (Chrome DevTools MCP / Playwright) was available in this session, so **no item is marked `[x]`**.

Every completed item is marked `[~]` and was verified by three machine-checkable means instead:

1. `next build` exits **0** (the code compiles and every route builds).
2. The Tailwind compiler output was inspected to confirm the utilities actually **emit CSS** (this is how the biggest root cause was found).
3. WCAG contrast ratios were computed arithmetically from the token values.

`[x]` requires a human (or a browser-capable agent) to confirm Light/Dark × 375/768/1440.

---

## Progress

| Severity | Total | Fixed (`[~]`) | Open (`[ ]`) | Verified (`[x]`) |
|----------|-------|--------------|-------------|------------------|
| Critical | 18 | 18 | 0 | 0 |
| High | 15 | 14 | 1 | 0 |
| Medium | 21 | 16 | 5 | 0 |
| Low | 9 | 4 | 5 | 0 |
| **All** | **63** | **52** | **11** | **0** |

Overall: **82% implemented, 0% visually verified**

> The `[x]` column is zero **by design** — see the honesty constraint below. `[~]` means the code change is complete and machine-verified (compile + generated-CSS inspection + contrast arithmetic + app-wide defect scans). It does **not** mean a human has looked at the rendered result in both themes at 375 / 768 / 1440.
>
> **Remaining hard defect classes: 0.** The 11 open items are polish and adoption work (see *Remaining work*), not outstanding contrast or visibility defects. Every scan for a *defect* class returns zero:
>
> | Scan (whole app, `pages/` + `components/`) | Before | Now |
> |---|---|---|
> | Same-colour fill + text (invisible element) | 15 elements | **0** |
> | Duplicate conflicting `bg-*` on one element | 25 | **0** |
> | Phantom semantic-scale classes that never compiled | 21 | **0** |
> | Raw-palette classes | 300 | **18** (all brand) |
> | `text-black` / `bg-white` on themed surfaces | 30 | **18** (all deliberate) |

---

# PHASE 1 — APPLICATION INVENTORY

## 1.1 Framework & build

| Item | Value |
|------|-------|
| Framework | Next.js **13.5.6**, Pages Router |
| React | 18.2.0 |
| Styling | **Tailwind CSS 3.4.7** (single architecture — no CSS Modules / SCSS / styled-components) |
| Plugin | `@tailwindcss/typography` 0.5.19 |
| Icons | `lucide-react` |
| Config | `frontend/tailwind.config.js` |
| Global CSS | `frontend/styles/globals.css` (only stylesheet; imported in `pages/_app.js`) |
| Dark mode | `darkMode: 'class'` on `<html>` via `contexts/ThemeContext.js` |
| Files in scope | **95** (`pages/**/*.js` + `components/**/*.js`) |
| Routes | **48** |

## 1.2 Theme system

- `contexts/ThemeContext.js` — `light` / `dark`, persisted in `localStorage` (`tc_theme` + `theme`).
- Storage is read **after mount** for SSR-safe hydration (deliberate; commit `d1e4ff5`).
- **Was:** a third theme `professional` was listed but had **no CSS rules** and **no UI entry point** (the "Professional" option on `/chat` is an AI *persona*, not a theme). It silently behaved as Dark. **Removed.**

## 1.3 ⚠️ Concurrent migration — baseline correction

While this audit was starting, a **separate migration process rewrote ~79 files** (mtimes 16:31–16:33) converting the app to semantic tokens. The very first greps in this session measured the **pre-migration** tree and were therefore wrong.

**Corrected, current baseline (measured after the migration):**

| Metric | Pre-migration (stale) | **Actual now** |
|--------|----------------------|----------------|
| `text-gray-*` / `bg-gray-*` utilities | 584 | **0** |
| `bg-white` | 129 | **34** |
| `text-white` | 162 | **153** |
| `shadow-xs` + `shadow-2xs` (**dead utilities**) | 100 | **123** |
| `text-*-ink` usages | — | **71** |
| Alpha modifiers on token colours (**silently dropped**) | — | **486** |
| Raw palette classes (`pink-*`, `purple-*`, …) | — | **339** |
| Semantic adoption | — | `bg-surface` 837 · `text-muted` 724 · `border-border` 623 · `text-foreground` 594 |

**Consequence:** the app is already ~85% migrated to semantic tokens. The remaining damage is concentrated in the **token layer itself**, not in the pages — which is why the foundation fixes below had the largest impact.

---

# PHASE 2 — ROOT CAUSES

## RC-00 (biggest) — Alpha modifiers on token colours produced **no CSS at all**

`tailwind.config.js` defined colours as `var(--primary)` (a **hex**). Tailwind 3 can only build `bg-primary/10` from a *channel-based* value, so it emitted nothing.

**Verified empirically.** Compiling `components/ui/index.js` (which uses `ring-primary/20`) produced **zero** occurrences of `ring-primary` in the output.

**Blast radius — 486 silently-dead usages:**

| Utility | Count | Effect of the bug |
|---------|-------|-------------------|
| `ring-primary/20` | 139 | **every focus ring was missing** |
| `border-primary/20` | 29 | badge/soft borders absent |
| `bg-primary/10` | 21 | soft tints absent |
| `border-success/20` / `border-danger/20` / `border-info/20` | 52 | status borders absent |
| `bg-primary/20`, `bg-danger/10`, `bg-success/30`, `bg-warning/30` | 63 | soft fills absent |
| `bg-surface-elevated/50`, `bg-surface-hover/50`, `bg-surface/90`, `bg-background/80` | 29 | **modal scrims & glass overlays absent** |

This is the mechanical explanation for most of the reported symptoms: flat/undifferentiated surfaces, "controls that look disabled", invisible focus states, and components that "do not feel part of the same design system".

**Fix:** channel triplets (`--*-rgb: 91 91 214`) + `rgb(var(--x-rgb) / <alpha-value>)` declarations.
**Verified:** `.focus\:ring-primary\/20:focus { --tw-ring-color: rgb(var(--primary-rgb) / 0.2); }` now emitted.

## RC-A — The migration appended semantic utilities **without removing their targets**
Surfaced only by the `next build` immediately after batch 06. The concurrent sweep (RC.1.3) produced strings such as:

```
bg-surface-elevated/50 bg-surface-elevated
bg-surface-elevated bg-surface
bg-border bg-surface
text-black text-foreground
```

**Why this mattered more than it looks:** Tailwind's output order — not source order — decides which of two same-property utilities wins. So these were not just untidy, they were **genuinely unpredictable**: the identical-looking badge rendered differently depending on unrelated classes elsewhere in the file. This is the mechanical explanation for the reported "some cards look like a different template" / "components visually disappearing" symptoms that no contrast fix would have addressed.
**Two shapes of the same bug, both fixed:** 25 duplicate `bg-*` declarations, and `text-black text-foreground` ×2 (literal black on a themed surface — invisible in Dark).
**Verification:** app-wide scan for two background utilities on one element → **0**.

## RC-B — `--accent-*` had no `ink` step
`primary`, `success`, `warning`, `danger` and `info` each had `ink` (readable text on the `soft` fill); `accent` did not. Any accent-on-soft badge therefore had no AA-safe text colour and reached for the solid fill — reproducing RC-02 one family over.
**Fix:** added `--accent-ink` (`#3F3FB0` light / `#A5A5F0` dark) + `--accent-ink-rgb` + `accent.ink` in the Tailwind map.
**Verified:** arithmetic — **7.17:1** on `--accent-soft` light, **6.63:1** on `--accent-soft` dark, **8.24:1** on white, **8.07:1** on the darkest surface; compiler confirms `.text-accent-ink` emits.

## RC-C — 21 phantom `text-primary-700`, and one malformed `bg-primary/10/70`
`primary` is a flat token plus an object map, so `-700` is not a scale step: `text-primary-700` **never compiled**. The class silently did nothing, the colour inherited, and the same element consequently read indigo in Dark (where a paired `dark:text-info` did fire) and near-black in Light. This is a textbook "Light and Dark themes disagree" cause.
The same silent-drop mechanism hit `bg-primary/10/70` in `files.js` — a double opacity that compiled to nothing, so **selected file tiles silently lost their selection tint**.
**Fix:** `text-primary-700` → `text-primary` (21 sites), redundant `dark:text-info`/`dark:text-accent` overrides dropped; malformed opacity → `bg-primary/15`.
**Verification:** scan for semantic-scale classes that cannot compile → **0**.

## RC-01 — 123 dead elevation utilities

`shadow-xs` (118×) and `shadow-2xs` (5×) are **not in Tailwind 3.4's** `defaultTheme.boxShadow` (keys: `sm, DEFAULT, md, lg, xl, 2xl, inner, none`). Every card/modal/button asking for a subtle elevation rendered with **no shadow**, next to `shadow-lg` neighbours rendering full weight.
**Fix:** a named, monotonic scale driven by CSS variables; shadows are tinted per theme.

## RC-02 — `text-*-ink` was an alias of the solid fill → **same colour on same colour**

`tailwind.config.js` mapped `success.ink → var(--success)` — the *same* variable `bg-success` uses. No `--*-ink` existed in `globals.css`.
**Effect:** any `text-success-ink` + `bg-success` pair rendered **literally invisible**. Found at **15 sites**.
**Fix:** real `--*-ink` tokens (verified 5.75–6.40:1 on `--*-soft`) plus `--*-foreground` for solid fills, and every offending site moved to `bg-*-soft text-*-ink`.

## RC-03 — Dark-mode primary failed WCAG AA

`--primary-foreground` was hard-coded `#FFFFFF` in *both* themes, but dark `--primary` is the luminous `#818CF8`.
**Measured:** **2.98:1** (needs 4.5:1). Every `bg-primary text-white` button/badge/active tab failed in Dark.
**Fix:** dark `--primary-foreground: #10141B` → **6.19:1**.

## RC-04 — Light `text-muted` failed WCAG AA *(corrected)*

`--text-muted: #738092` on `#FFFFFF` = **4.01:1** (needs 4.5:1). Used **724 times** app-wide.
**Fix:** `#63707F` → **5.05:1** on white, **4.55:1** on elevated, **4.76:1** on base.

## RC-05 — Solid status badges used white text below AA *(new)*

Light `--danger` `#C65353` → white = **4.42:1**; `--warning` `#AA721C` → white = **4.09:1**. Both failed.
**Fix:** darkened to `#B84A4A` (**5.10:1**) and `#8F5E12` (**5.56:1**).

## RC-06 — `bg-white` + raw palette bleed
34 `bg-white` (hard white panels inside the dark layout) and 339 raw-palette classes bypass tokens.
**Partially fixed** — see below; the remainder is listed in the register.

## RC-07 — Phantom third theme
`professional` listed in `THEMES`, no CSS, unreachable via UI.
**Fixed:** removed.

## RC-08 — Focus indicator below 3:1
`focus:ring-primary/20` at 20 % alpha fails WCAG 1.4.11. Combined with RC-00 the ring was absent entirely.
**Fix:** RC-00 makes rings render; the touched surfaces now use `/40`, and `--ring` was added (light **6.62:1**, dark **8.68:1**).

## RC-09 — `ring-offset` with no offset colour
`focus:ring-offset-2` with no `ring-offset-*` colour produced a **white halo in Dark Mode**.
**Fix:** `ring-offset-background` added (and `ringOffsetColor` defined in the config).

## RC-10 — Undefined radius/elevation conventions
845 arbitrary `rounded-*` choices; no elevation scale at all. `rounded-card` (10px) and `rounded-xl` (12px) were used interchangeably for the same surfaces.
**Fix:** `card` aligned to `xl` (12px), `modal` 14px, controls standardised to `rounded-lg`.

---

# ISSUE REGISTER — GLOBAL FOUNDATION

| ID | Sev | Issue | Status |
|----|-----|-------|--------|
| GLOBAL-001 | Critical | 486 alpha utilities emitting no CSS (focus rings, scrims, tints, borders) | `[~]` |
| GLOBAL-002 | Critical | 123 dead `shadow-xs`/`shadow-2xs` utilities | `[~]` |
| GLOBAL-003 | Critical | `text-*-ink` == `bg-*` → invisible content (15 sites) | `[~]` |
| GLOBAL-004 | Critical | Dark primary 2.98:1 (white on `#818CF8`) | `[~]` |
| GLOBAL-005 | Critical | Light `text-muted` 4.01:1 (724 usages) | `[~]` |
| GLOBAL-006 | Critical | Solid `danger`/`warning` + white text below AA | `[~]` |
| GLOBAL-007 | High | 34 raw `bg-white` surfaces in Dark | `[~]` 18 remain — each verified deliberate (glass / switch knob / email-iframe backdrop) |
| GLOBAL-008 | High | 339 raw-palette classes | `[~]` 18 remain — all brand identity |
| GLOBAL-013 | **Critical** | 25 duplicate conflicting `bg-*` on one element → output-order-dependent rendering (RC-A) | `[~]` |
| GLOBAL-014 | **Critical** | `text-black text-foreground` ×2 → black text on themed surface (RC-A) | `[~]` |
| GLOBAL-015 | **Critical** | `bg-white/90` action chips carrying `text-foreground`/`text-primary`/`text-danger` → invisible in Dark (`files.js` ×3) | `[~]` |
| GLOBAL-016 | **Critical** | `text-success` on `bg-success` → 1:1, icon invisible in Light (`billing` StatCard) | `[~]` |
| GLOBAL-017 | **Critical** | `bg-primary/10/70` double opacity → never compiled, selection state lost (`files.js`) | `[~]` |
| GLOBAL-018 | High | `--accent-*` had no `ink` step (RC-B) | `[~]` |
| GLOBAL-019 | Medium | 21 phantom `text-primary-700` → theme-dependent colour (RC-C) | `[~]` |
| GLOBAL-020 | Medium | `bg-pink-600` used as the primary "New Coupon" action (`billing`) | `[~]` |
| GLOBAL-021 | Medium | 4 solid danger buttons `bg-red-600`/`hover:bg-red-700` | `[~]` |
| GLOBAL-022 | Low | 3 spinners `border-blue-600` | `[~]` |
| GLOBAL-023 | Low | `CyberRobot` panel: `bg-surface-elevated` + `bg-accent` on one element (RC-A shape) | `[~]` |
| GLOBAL-009 | High | No `--*-foreground`; `!important` white backstop locked failures in place | `[~]` |
| GLOBAL-010 | High | No theme-aware neutral ramp | `[~]` (ramp added; now mostly unused since 0 `gray-*` remain) |
| GLOBAL-011 | Medium | `professional` phantom theme | `[~]` removed |
| GLOBAL-012 | Medium | Focus rings at 20 % alpha (<3:1) | `[~]` |
| GLOBAL-013 | Medium | `ring-offset-2` → white halo in Dark | `[~]` |
| GLOBAL-014 | Medium | Radius/elevation conventions undefined | `[~]` partial |
| GLOBAL-015 | Medium | `.code-surface` needed for always-dark blocks | `[~]` added (not yet adopted at the 6 terminal sites) |
| GLOBAL-016 | Low | `:disabled` had no `cursor: not-allowed`; `::placeholder` unthemed | `[~]` |
| GLOBAL-017 | Low | Type-scale tokens not systematised | `[ ]` |

**Files (foundation):** `styles/globals.css`, `tailwind.config.js`, `contexts/ThemeContext.js`.

---

# PAGE — /admin/channels (System Channels)

Focused pass requested. 66 KB / 1028 lines, structurally sound (real landmarks, `aria-label`s) but with systemic colour defects.

### Critical — invisible content

| ID | Issue | Status |
|----|-------|--------|
| CH-001 | `bg-warning` + `text-warning` (identical) on the provider-credentials notice → text invisible in Light | `[~]` → `bg-warning-soft text-warning-ink` |
| CH-002 | Same defect on the "Partial refresh failed" alert | `[~]` |
| CH-003 | Same defect on the alert-list warning variant | `[~]` |
| CH-004 | Same defect on the localhost webhook warning | `[~]` |
| CH-005 | Same defect on the logs-load error block | `[~]` |
| CH-006 | Security panel was `bg-primary` (solid indigo) with `text-info` sub-labels → **1.33:1 in Light and ~1.3:1 in Dark** (effectively invisible) | `[~]` → converted to a surface section |

### High

| ID | Issue | Status |
|----|-------|--------|
| CH-007 | 4 filter controls used `border-none` → no control boundary (fails 1.4.11) and read as disabled | `[~]` → `border border-border` + token surface |
| CH-008 | `text-background` used as a *foreground* on primary buttons (semantically wrong, fragile) | `[~]` → `text-primary-foreground` |
| CH-009 | Meta/status badges built on solid fills | `[~]` → soft + ink |
| CH-010 | 3 webhook action buttons used `hover:bg-white` (raw, theme-blind) | `[~]` → `hover:bg-surface-hover` |
| CH-011 | Retry-logs button `bg-warning hover:bg-warning` → **no hover feedback**, plus raw `amber/yellow` borders | `[~]` |
| CH-012 | Destructive button used raw `bg-red-600` / `focus:ring-red-500` | `[~]` → `bg-danger` + `focus:ring-ring` |

### Medium

| ID | Issue | Status |
|----|-------|--------|
| CH-013 | Duplicate classes (`text-muted text-muted`, `bg-surface-elevated/70 bg-surface`, `border-border/50 border-border`) | `[~]` cleaned (4 sites) |
| CH-014 | Section headings inconsistent (`text-xl`/`text-lg` bold, no weight differentiation) | `[~]` unified to `text-base font-semibold` |
| CH-015 | Page title `text-3xl font-bold` + 18 px icon (hierarchy/misalignment) | `[~]` → `text-2xl font-semibold` + 20 px icon |
| CH-016 | Header block duplicated 3× (loading / error / main) | `[~]` aligned (extraction still open) |
| CH-017 | Metric labels same weight as values (`text-sm font-bold`) | `[~]` → `text-xs font-semibold uppercase tracking-wider` |
| CH-018 | Metric values lacked `tabular-nums` | `[~]` |
| CH-019 | `shadow-lg` on toolbar buttons + hover-shadow on non-interactive metric cards | `[~]` → `shadow-xs` |
| CH-020 | Table header `text-muted` too faint for structural labels | `[~]` → `text-secondary` |
| CH-021 | Drawer/dialog `shadow-lg` | `[~]` → `shadow-modal` |
| CH-022 | Empty-state icon uncoloured | `[~]` → `text-muted` |

### Low / open

| ID | Issue | Status |
|----|-------|--------|
| CH-023 | KPI grid `sm:grid-cols-2` with 5 cards → orphan card at tablet | `[ ]` |
| CH-024 | `<tr>` given `role="button"` + `tabIndex` — this invalidates table semantics for AT | `[ ]` (needs a design decision, behaviour-adjacent) |
| CH-025 | Mobile table = horizontal scroll of 8 columns (`min-w-[720px]`) | `[~]` documented Strategy A; card-rows would be better |
| CH-026 | Header extraction into one component | `[ ]` |

**Files:** `pages/admin/channels.js`

---

# OTHER PAGES TOUCHED

| ID | File | Sev | Issue | Status |
|----|------|-----|-------|--------|
| PG-001 | `pages/forgot-password.js` | Critical | Always-dark glass shell on `bg-accent` with `text-info-ink` labels = **1.33:1** (invisible both themes); `bg-white/10` panel invisible in Light; white-on-indigo design assumed | `[~]` rebuilt theme-aware |
| PG-002 | `pages/reset-password.js` | Critical | Same as PG-001 | `[~]` rebuilt theme-aware |
| PG-003 | `pages/inbox.js` | Critical | AI toggle `bg-warning text-warning` / `bg-success text-success` → invisible; `hover:bg-*` identical to base (no hover feedback) | `[~]` |
| PG-004 | `pages/inbox.js` | High | Active-count pill `bg-success text-success-ink` | `[~]` |
| PG-005 | `pages/admin/files.js` | Critical | 2 icon chips `bg-success`/`bg-warning` + same-colour text | `[~]` |
| PG-006 | `pages/admin/files.js` | Medium | `bg-danger/10 dark:bg-red-900/30` raw palette + category badges using raw `rose/purple/orange/amber` | `[~]` partial |
| PG-007 | `pages/admin/billing/index.js` | Critical | Plan "Active" badge `bg-success text-success` | `[~]` |
| PG-008 | `pages/admin/billing/plans.js` | Critical | Plan "ACTIVE" badge, same defect | `[~]` |
| PG-009 | `pages/admin/billing/plans.js` | Low | Duplicate class `bg-surface-elevated text-muted bg-surface` | `[~]` |
| PG-010 | `pages/admin/settings.js` | Critical | "Public" badge `bg-success text-success-ink` | `[~]` |
| PG-011 | `pages/admin/channels.js` | Critical | Status/Token badge maps (12 entries) | `[~]` |
| PG-012 | `pages/admin/activity.js` | Medium | `bg-success-soft text-success` + raw `green-*`/`blue-*` borders | `[ ]` |
| PG-013 | `pages/admin/debug.js` | Medium | `bg-success/30 text-success` (~2.8:1) | `[ ]` |
| PG-014 | `pages/admin/users/[id].js` | Medium | Raw `purple-*` role badge + `blue-900/30` dark override | `[ ]` |

**Verification for all of the above:** `next build` exit 0; generated-CSS inspection; contrast arithmetic.

---

# REMAINING WORK (not done)

- [ ] **Visual verification** Light/Dark × 375/768/1440 — blocked: no browser automation available in this session. **Every item below marked `[~]` is code-complete but not visually confirmed; nothing is allowed to reach `[x]` without it.**
- [ ] Adopt `components/ui/index.js` primitives across the app (still ~1/95 consumers) — the systemic fix for consistency drift
- [ ] `text-muted` on `--bg-hover` = 4.30:1 (transient hover state, Low)
- [ ] Unify radius across the remaining ~845 `rounded-*` sites (token exists, not yet swept)
- [ ] KPI grid orphan at tablet (CH-023); `<tr role="button">` (CH-024)
- [ ] Always-dark blocks (terminal / payload viewer / `verify-email`) → `.code-surface`
- [ ] `/admin/billing` card → table → pagination *visual* pass (structure fixed, not eyeballed)
- [ ] `login.js` / `register.js` still use the always-dark indigo glass shell (same defect as batch 05, not yet migrated)
- [ ] Remaining **18** raw-palette classes are deliberate brand colours (see "Intentionally not changed")
- [ ] Remaining **18** `bg-white` sites are deliberate (glass on always-dark shells, switch knobs, email-preview iframes)

---

# INTENTIONALLY NOT CHANGED

- [-] **All business logic** — routing, API calls, auth, billing, forms, filters, pagination, state, websockets. Class-string-only changes; handlers untouched.
- [-] **SSR hydration pattern** in `ThemeContext` (static default + post-mount read) — deliberate per commit `d1e4ff5`.
- [-] **`--lm-*` legacy aliases** — kept so unmigrated files stay coherent.
- [-] **Socket.io guest handshake** — out of scope, protected by `targetchat/AGENTS.md`.
- [-] **`bg-black/50` drawer scrim** — dark scrim is standard and theme-neutral.
- [-] **`main`/`AuthForm` etc. not touched** — outside the requested focus and already token-migrated by the concurrent sweep.
- [-] **18 brand-colour classes deliberately preserved** — Instagram `#DB2777` (`channels.js` ×4, `inbox.js` ×1), Facebook blue + the channel-type accent strip (`channels.js` ×2), and the `CyberRobot` cyan illustration (`components/CyberRobot.js` ×10). These are product identity, not design-system chrome; replacing them with `info`/`accent` would erase the brand while adding no contrast benefit. `text-pink-600` → `text-pink-500` was applied so the icon clears 3:1 on the dark surface.
- [-] **18 `bg-white` occurrences** — three deliberate categories, each verified individually rather than bulk-renamed:
  - `bg-white/10|20|30` glass overlays that sit on an always-dark gradient shell (`security.js`, `widgets/[id].js`, `embed/[slug].js`) — a semantic surface token would be wrong here, they are intentional translucency over a fixed dark backdrop.
  - `after:bg-white` switch knobs + `bg-white` toggle thumbs (`plans.js`, `widgets/[id].js`, `WorkflowModal`, `EditUserModal`) — the thumb of a switch is white in every design system, in both themes.
  - `EmailLogsTab.js` / `EmailTemplatesTab.js` — the white is the **backdrop behind an `<iframe srcDoc>` that renders email HTML**. Transactional email is authored against white; a dark backdrop would show the preview wrong.
- [-] **Light raw-shade utilities that already had a working `dark:` counterpart were still converted** — this was a *coherence* decision, not a contrast fix (a mixed `bg-success-soft … border-emerald-100` badge rendered fine but belonged to two systems at once).

---

# CHANGE LOG

### Batch 01 — Foundation (token layer)
- **Files:** `styles/globals.css`, `tailwind.config.js`
- **Fixes:** alpha channel triplets (RC‑00); real `--*-ink` (RC‑02); `--*-foreground` (RC‑03/05); dark `--primary-foreground` → `#10141B`; `--ring`; elevation vars + `boxShadow` scale (RC‑01); theme-aware neutral ramp; card radius aligned to `xl`; `ringOffsetColor`; `.code-surface`; `::placeholder` + disabled-cursor conventions; replaced the `!important` white backstop with token-based foregrounds
- **Verified:** Tailwind compiler — `ring-primary/20`, `bg-primary/10`, `border-danger/20`, `shadow-xs`, `shadow-2xs`, `text-danger-ink` all now emit real CSS
- **Remaining:** visual check

### Batch 02 — `text-muted` contrast
- **Files:** `styles/globals.css`
- **Fixes:** light `--text-muted` `#738092` → `#63707F`
- **Verified:** arithmetic — 4.01:1 → **5.05:1** (white), 4.55:1 (elevated), 4.76:1 (base)
- **Remaining:** `--bg-hover` case 4.30:1 (Low, transient)

### Batch 03 — /admin/channels
- **Files:** `pages/admin/channels.js`
- **Fixes:** 6 invisible-content defects (CH‑001…006); `border-none` filters → real boundaries; `text-background` → `text-primary-foreground`; soft+ink badges; `hover:bg-white` → token; no-op hover on retry; raw red/amber/yellow → `danger`/`warning`; duplicate classes; heading + label + metric typography unified; `shadow-xs`/`shadow-modal`; `ring-offset-background`; `tabular-nums`; table header contrast; empty-state icon
- **Verified:** `next build` exit 0; app-wide "solid fill + same-colour text" scan returns 0
- **Remaining:** KPI orphan at tablet; `<tr role="button">`; header extraction

### Batch 04 — Cross-page invisible-content sweep
- **Files:** `pages/admin/{files,billing/index,billing/plans,settings,channels}.js`, `pages/inbox.js`
- **Fixes:** 9 further invisible/AA-failing elements found by an app-wide scan for solid-fill + same-colour-text
- **Verified:** scan returns **0** remaining; `next build` exit 0

### Batch 05 — Auth pages theme-coherence
- **Files:** `pages/forgot-password.js`, `pages/reset-password.js`
- **Fixes:** replaced the always-dark indigo glass shell (invisible panel + 1.33:1 labels in Light) with a theme-aware surface card; associated labels via `id`/`htmlFor`; decorative blobs marked `aria-hidden` + `pointer-events-none`; status boxes → `role="status"`/`role="alert"` with soft+ink tones; visible focus rings
- **Verified:** `next build` exit 0
- **Remaining:** visual check; `login.js`/`register.js` use the same shell and were **not** yet migrated

### Batch 06 — Theme system cleanup
- **Files:** `contexts/ThemeContext.js`
- **Fixes:** removed the unreachable, unstyled `professional` theme (RC‑07)
- **Verified:** `next build` exit 0

### Batch 07 — Raw-palette tokenisation + duplicate-class remediation
- **Trigger:** the `next build` after batch 06 exposed a **new** defect class that the concurrent migration (RC.1.3) had introduced while sweeping: it appended a semantic utility *without removing the one it replaced*.
- **Files (23):** `pages/admin/{visitors,users,users/[id],files,activity,system,security,tokens,debug,workflows,billing/index,billing/events,billing/plans}.js`, `pages/{channels,inbox,chat}.js`, `pages/widgets/[id].js`, `pages/docs/{index,getting-started/quick-start,automation/template-guide}.js`, `components/admin/{EmailTemplatesView,CyberRobot}.js`, `components/admin/email/{EmailTemplatesTab,EmailAnalyticsTab,EmailLogsTab}.js`, `styles/globals.css`, `tailwind.config.js`
- **Fixes:**
  - **New token `--accent-ink` / `--accent-ink-rgb`** (+ `accent.ink` in the Tailwind map). The accent family was the only one missing an `ink` step, so accent-on-soft had no AA-safe text colour.
  - **Raw palette → semantic families** across 23 files (red/rose→danger, green/emerald→success, orange/amber/yellow→warning, blue/sky/cyan→info, purple/violet/indigo→accent), driven by a one-off codemod rather than hand edits, then deleted. **300 → 18** remaining (the 18 are brand, above).
  - **25 duplicate `bg-*` declarations removed.** These were the real find: the migration had produced strings like `bg-surface-elevated/50 bg-surface-elevated`, `bg-surface-elevated bg-surface`, `bg-border bg-surface`. **Whichever wins is decided by Tailwind's output order, not source order — so these were genuinely unpredictable**, and they are the mechanical explanation for the "one card looks different from the next" symptom. Resolved in favour of the more-elevated step so sticky table headers keep their separation from the card body (`--bg-elevated` is a distinct step in both themes).
  - **`text-black text-foreground`** ×2 (`billing/events.js`, `billing/plans.js`) — literal black text on a themed surface, invisible in Dark. → `text-foreground`.
  - **21 phantom `text-primary-700`** → `text-primary` (`primary` is a flat token + object map, so `-700` never compiled — the class silently did nothing and the text inherited, which is why the same element read indigo in Dark and near-black in Light). Also dropped the now-redundant `dark:text-info` / `dark:text-accent` overrides.
  - `files.js`: 3 image-action buttons were `bg-white/90 hover:bg-white` with `text-foreground` / `text-primary-active` / `text-danger` — **light text on a white chip, invisible in Dark** → `bg-surface/95`. Also a malformed `bg-primary/10/70` (double opacity — never compiled, so selected tiles lost their tint) and a `bg-white/80 bg-surface/80` duplicate.
  - `billing/index.js` StatCard `emerald` variant was `text-success bg-success` — **the icon was drawn in the same colour as its own fill (1:1, invisible in Light)** → `bg-success/10`; `purple` variant was raw palette while its three siblings were semantic → `accent`; `highlight` card used hardcoded `text-white`/`bg-white/20` → `text-success-foreground` / `text-success-foreground/20`.
  - `billing/index.js` "New Coupon" was **`bg-pink-600`** — a pink primary action in a product whose primary is indigo → `bg-primary`.
  - 4 solid danger buttons (`files.js`, `security.js`, `users.js`, `channels.js`) `bg-red-600 hover:bg-red-700` → `bg-danger hover:bg-danger/90 text-danger-foreground`.
  - 3 spinners `border-blue-600` → `border-primary`.
- **Verified:**
  - `next build` **exit 0**, `✓ Compiled successfully`
  - Tailwind compiler — `bg-primary/10`, `ring-primary/20`, `bg-background/80`, `bg-surface/90`, `border-success/25`, `bg-danger/10`, `border-accent/25`, `shadow-xs`, `shadow-2xs`, `text-warning-ink`, `text-accent-ink` **all emit real CSS**
  - "solid fill + same-colour text" scan → **0**
  - duplicate-`bg` scan → **0**; phantom semantic-scale classes → **0**
  - `text-black` scan → **0**
- **Regression risk accepted & reviewed:** the codemod was applied only after a `--dry` diff review on every file. It corrupted exactly one token during the run — a duplicate bare JS identifier (`value`) inside a `className` template literal in `billing/index.js:577` — which the build caught immediately and which was repaired by hand. All remaining diffs were re-read and contain class-string changes only; **no handler, condition, API call or state transition was touched.**
- **Remaining:** visual confirmation of the accent-on-soft badges now that `--accent-ink` exists.

### Batch 08 — `AdminChart` rewrite (dashboard "Traffic Overview")
- **Files:** `components/admin/AdminChart.js` (rewritten), `pages/admin/index.js`
- **Reported symptom:** the area chart rendered as a **solid black blob**, squeezed into the middle third of the card with the axis labels spread across the full width underneath.
- **Root causes — three independent bugs, all in 41 lines:**
  1. **The fill resolved to nothing, so SVG fell back to black.** `<linearGradient id={`gradient-${color}`}>` with `color = 'var(--primary)'` produced the id `gradient-var(--primary)`. `url(#gradient-var(--primary))` is not a valid fragment reference, the `fill` failed, and SVG's initial value for `fill` is **black** — so the area painted solid black.
  2. **The colour never reached the paint at all.** `stopColor={color}` and `stroke={color}` pass `var(--primary)` through SVG **presentation attributes**, which do **not** resolve CSS custom properties. Even with a valid gradient id, the stops and the line would still have painted black. Fixed by moving every colour onto inline `style` (inline styles *do* resolve custom properties) and by switching the public prop from a raw CSS value (`color="var(--primary)"`) to a **token name** (`tone="primary"`), so ids and colours can both be built safely.
  3. **`viewBox="0 0 100 100"` in a ~820x210 container with the default `preserveAspectRatio="meet"` scales uniformly** — so the plot rendered as a 128x128 square, centred, with ~340px of dead space each side, while the flex `justify-between` labels stretched edge to edge and lined up with nothing.
- **Rebuilt as:** real pixel-space SVG measured with `ResizeObserver` (no distortion, ticks align to data by construction); y-axis with round tick labels and a gutter sized to the widest label; horizontal gridlines; unique gradient id via `useId()`; hover guide + marker + tooltip showing the value and day; summary row (period total + peak day) so the card communicates magnitude, not just shape; honest empty states for *no data* and *all-zero* rather than a flat line; `role="img"` + `aria-label` + a visually-hidden data table as the text alternative; axis labels thinned out when the card is narrow; locale-independent number formatting to avoid an SSR hydration mismatch.
- **Removed a dead control:** the timeframe `<select>` had **no `onChange`** — "Last 30 Days" did nothing. An admin control that advertises a state you cannot reach is worse than no control, so it became a static, honest indicator.
- **Also:** `rounded-xl` → `rounded-card`; `flex-wrap` on the header so it survives narrow widths.
- **One bug caught in my own new code before shipping:** I first wrote `rgb(var(--surface-rgb))` for the hover marker, but that token does **not** exist (the surface ramp is `--bg-surface-rgb`) — the marker would have rendered black again. Found by diffing every `var(--x-rgb)` I referenced against `globals.css`; all six tone families verified to define `-rgb` in **both** themes.
- **Verified:** `next build` **exit 0**; geometry simulated at 820px → plot spans **758px / 92.4%** of the card (was a 128px centred square); axis labels round at every magnitude tested (1→`0,1`; 7→`0,2,4,6,8`; 24→`0,5,10,15,20,25`; 47→`0,10,20,30,40,50`; 7777→`0,2000,4000,6000,8000`) with the peak using **68–100 %** of plot height; Tailwind compiler confirms `sr-only`, `tabular-nums`, `shadow-modal`, `bg-surface-elevated/40`, `border-dashed`, `whitespace-nowrap` all emit, and `bg-surface-elevated/40` resolves to `rgb(var(--bg-elevated-rgb) / 0.4)`.
- **REMAINING — data integrity, not styling:** `pages/admin/index.js:59` still feeds this chart **`Math.random()`**:
  ```js
  count: Math.floor(Math.random() * 50) + (data.messages?.today || 10)
  ```
  So "Traffic Overview" currently displays **invented numbers that change on every page load**. `/api/admin/stats` returns only totals (`messages.today`, `messages.total`) with no per-day series. This is a correctness problem in an admin dashboard and needs a real aggregate (a 7-day `GROUP BY DATE(created_at)` over `Message`) — deliberately **not** done here, because it is a backend change that could not be verified in this session.

### Batch 09 — App-shell footer + sidebar compression bug
- **Reported:** "/admin ends in white space — where is the footer?"
- **Finding 1 — there was no footer.** A grep for `<footer>` returned it only in `pages/index.js` and `pages/pricing.js`. **Neither app shell had one at all.** The trailing white space was the direct consequence of the shell structure: both layouts are `flex h-screen overflow-hidden` with `<main>` as the *only* scroll container, so whatever followed the content was just the scroll area's own background running to the end of the container with nothing beneath it.
- **Fix:** new `components/layouts/AppFooter.js`, rendered as a **sibling of `<main>`** inside the content column of `AdminLayout` **and** `DashboardLayout`, so it is permanent chrome and the scroll region is bounded by it. All **18** admin pages inherit it automatically. It carries the brand mark, "Admin console", the year, and two real destinations (System status, Documentation) instead of decorative links.
- **Finding 2 — the sidebars had no `shrink-0`.** Neither `AdminSidebar`'s nor `DashboardSidebar`'s `<aside>` set it, so as flex items they were **shrinkable**: any page whose content is wider than the viewport silently compressed the sidebar below its declared `w-64`/`w-20`, cropping the nav labels. This is the most likely explanation for the squeezed, clipped sidebar strip in the screenshot, and it is a real bug independent of that screenshot — the nav width should never depend on how wide a table happens to be.
- **Finding 3 — `text-text-muted` is a dead class.** The colour token is `muted`, so the class is `text-muted`; `text-text-muted` needs a colour literally named `text-muted`, which the Tailwind map does not define. **8 occurrences across 5 files** (`AdminSidebar`, `leads.js`, `widgets/index.js`) were therefore applying no colour at all and inheriting instead. Swept to `text-muted`.
- **Verified:** `next build` **exit 0**, 56/56 static pages; Tailwind compiler confirms `shrink-0`, `border-t`, `bg-surface`, `gap-x-4`, `gap-y-1`, `text-secondary`, `focus-visible:ring-2`, `focus-visible:ring-primary/40` all emit; `text-text-muted` count is **0**.
- **NOT explained — the fully blank content area in the screenshot.** I could not reproduce it from the source and I am **not** going to claim a fix for it. The render path cannot go blank when the API fails: `stats` starts as `null` and every read is optional-chained (`stats?.users?.total || 0`), so a dead backend still renders the header, the four KPI cards, the demographics block, Quick Actions and the chart card. The `loading` and `accessDenied` branches both render visible content too, and the `animate-fadeIn` keyframes resolve to `opacity: 1` (no `fill-mode: forwards`). If it is still blank after this batch, the browser console error is what will settle it — or it was simply a mid-compile frame from the dev server.

### Known build-environment note
Repeated `next build` runs can fail with `PageNotFoundError: Cannot find module for page` from a **stale `.next`**. Clearing `.next` resolves it — it is cache corruption, not a source error.
