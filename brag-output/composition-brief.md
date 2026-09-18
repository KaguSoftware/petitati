# Hyperframes Composition Brief: Petitati

## Objective
A 20s launch-style brag video for Petitati, a multi-language pet shop and multi-store platform.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape, 1920x1080
- Duration: 20s

## Source Material
- Project root: the petitati repo (Next.js 16, Supabase)
- Primary files read: HANDOFF.md, package.json, supabase/seeds/01_store.sql (theme), src/lib/theme/fonts.ts, public/brand
- Real screenshots of the production site (captured with Playwright): `assets/home-en.png`, `home-en-full.png`, `home-tr.png`, `phone-fa.png`, `admin-orders.png`, `admin-design.png`
- Copy that must appear verbatim: "Everything your pet loves", "English", "Türkçe", "فارسی"

## Creative Direction
- Tone preset: app-store; warm pet-shop product film
- Hook: paw pop + store headline word by word
- Outro: "One codebase. Every store." + lockup + URL
- Avoid: generic SaaS language, abstract filler, restyling the product

## Visual Identity
- Background #faf8f3, text #1b2a33, teal #157fa1, orange #f7a83b
- Manrope (local woff2) for Latin, Vazirmatn for Persian

## Storyboard
See `brag-plan.md`. 1 Hook 0–2.5 · 2 Live shop 2.5–6.5 · 3 Languages 6.5–10.5 · 4 Admin 10.5–15.5 · 5 Outro 15.5–20.

## Audio
- Music: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` at 0.35, fade over the last 1.5s
- Cues: preset `~/.claude/skills/brag/assets/music/cues/…vol-1….music-cues.json`; strong cue 16.02 for the outro; cards at 7.02/8.02/9.02
- Audio-reactive: none (documented choice)
- SFX: drop_001 (paw), card-slide-1 (browser rise, design slide), card-place-1 (language cards), mouseclick1 (click), impactBell_heavy_000 (outro)
