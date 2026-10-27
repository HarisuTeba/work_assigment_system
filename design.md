# Design — Sistem Perintah & Tugas

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre
editorial — office-memo register ("surat perintah" printed on warm paper)

## Audience · use · tone
- Audience: lecturer + classmates watching a projected demo; secondarily office staff.
- Use: give a clear order, confirm understanding, report, evaluate.
- Tone: utilitarian-editorial. A well-kept office ledger, not a SaaS dashboard.

## Macrostructure family (app)
- **Ledger pages** (dashboard, daftar perintah, evaluasi, reward, teguran, pengguna, divisi):
  hairline-ruled sections, no boxed cards. A section = serif `h2` over a hairline.
  Figures shown as one stat strip divided by vertical hairlines. Tables carry the data.
- **Memo pages** (detail perintah, penugasan, kerjakan): the order is rendered as a single
  *Surat Perintah* sheet — `--color-sheet` on paper, hairline border, heavy top rule,
  header fields (Nomor · Dari · Kepada · Perihal · Tenggat), then 5W1H as a definition list.
  Langkah are genuinely ordinal, so serif numerals are allowed there (and only there).
- **Login**: quiet letter-shaped page, left-biased, no hero art.

## Theme
Tokens live in `tokens.css` (light + dark, both designed).
- `--color-paper`  oklch(96.5% 0.012 85)  · dark oklch(17% 0.010 60)
- `--color-sheet`  oklch(98.5% 0.008 90)  · dark oklch(23% 0.012 62)
- `--color-ink`    oklch(20% 0.012 55)    · dark oklch(93% 0.010 85)
- `--color-rule`   oklch(84% 0.014 75)    · dark oklch(33% 0.012 60)
- `--color-accent` oklch(50% 0.16 32) brick / stamp red · dark oklch(70% 0.13 35)
- Status colours (good / warn / info / bad) always ship with a text label.

## Typography
- Display: Newsreader 600, roman only (no italic headings)
- Body: IBM Plex Sans 400 / 600
- Outlier: IBM Plex Mono 500 — wordmark + nomor surat only (2 slots)
- Scale 1.25 from 16 px; tabular figures on every number column.

## Spacing
4-point named scale in `tokens.css`. Pages use `var(--space-*)`, never raw values.

## Motion
- Easings `--ease-out` / `--ease-in` / `--ease-in-out`; colour transitions 150 ms only.
- No entrance animation, no scroll reveals. Reduced-motion: transitions off.

## Microinteractions stance
- Silent success when the result is visible on screen (step ticked, question answered,
  confirmation). Toast only when the effect lands elsewhere (perintah terkirim, reward,
  teguran) or on error.
- Focus ring: 2 px `--color-focus`, instant, never animated.
- Confirmation dialog only for the irreversible "Reset data demo".

## CTA voice
- Primary: ink-filled rectangle, 2 px radius, paper text, single line (`nowrap`).
- Secondary: hairline outline, ink text.
- Destructive / teguran: accent outline, accent text.
- Accent is never a large fill; it marks focus, the active index entry, links and stamps.

## Chrome
- Nav: N3 side-rail as a typeset index (text only, pending counts in tabular figures,
  active entry marked by an accent bar + weight). Top band carries the date line and user.
- Footer: none on app pages (function carries the page).

## Per-page allowances
- No enrichment, no illustrations, no emoji anywhere (icons are typography).
- Stamps (`Terlambat`, `Disetujui`, `Perlu Revisi`) may appear on memo pages only.

## What pages MUST share
Wordmark, accent and its placement, the 2+1 faces, button voice, the section-head
pattern (serif h2 + hairline, no eyebrows).

## Exports

### tokens.css
See `/tokens.css` (canonical).
