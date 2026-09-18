# Brag Plan: Petitati — the shopping journey

## What is this app?
Petitati's live storefront, followed end to end: find a product, buy it, follow the parcel, and confirm delivery at the door with a six-digit code.

## The angle
One cat-food pouch (Pramy Beauty Tuna and Chicken, ₺60.50) travels from the Categories menu to the doorstep in five numbered steps. Every frame is the real production site. The order itself was a throwaway row inserted and deleted by `node_modules/.qa/brag2-shots.mjs`, so no stock or real data was touched.

## Hook
"Everything your pet loves, / delivered to your door." (the store's own hero copy), word by word.

## User flow worth showing
1. Browse: home → Categories mega-menu → Cats
2. Pick: product page → Add to cart (toast + bag badge)
3. Check out: cart → one-page checkout → Place order
4. Follow the parcel: tracker Placed → Confirmed → Shipped, with the delivery code
5. At your door: courier enters the order number and code → "confirmed as delivered" → tracker complete

## Outro
"Five steps. One happy cat." → Petitati lockup → petitati.vercel.app

## Tone
- Preset: app-store; warm, clear walkthrough
- Format: landscape 1920x1080, 25s

## Visual identity
Eggshell #faf8f3, ink #1b2a33, teal #157fa1, paw orange #f7a83b; Manrope.

## Audio direction
- Music: happy-beats-business-moves-vol-11 (114.8 BPM, warm), full level, loudness-normalized to -14 LUFS after render, fade out over the last 1.5s
- Beat-locked: 3.70 Categories click, 6.34 product, 8.96 Add to cart, 12.65 Place order, 17.91 door step, 22.65 outro
- SFX: a mouse click on every simulated click, a pop on the cart badge, a card sound per tracker step, a soft impact when the order is placed, a bell when delivery is confirmed

## Storyboard
| # | Scene | Time |
|---|---|---|
| 1 | Hook | 0–2.6 |
| 2 | Browse | 2.6–6.34 |
| 3 | Pick | 6.34–10.2 |
| 4 | Check out | 10.2–12.9 |
| 5 | Follow the parcel | 12.9–17.91 |
| 6 | At your door | 17.91–22.5 |
| 7 | Outro | 22.5–25 |
