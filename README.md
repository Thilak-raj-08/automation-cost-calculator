# Automation Cost Calculator

Free single-page tool comparing monthly cost on **Zapier**, **Make.com** and
**n8n** (cloud + self-hosted) from real usage. Astro + Tailwind, static, no
backend.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
```

## Deploy to Cloudflare Pages

Static output, no adapter needed.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 18+ (`NODE_VERSION` env var) |

## Updating prices

Everything lives in [`src/config/pricing.ts`](src/config/pricing.ts). Nothing
else needs to change.

1. Check each platform's `pricingUrl`.
2. Edit the `tiers` arrays. Keep them ordered **cheapest → most expensive** —
   the engine picks the first tier that satisfies both volume and workflow
   count, so an out-of-order array silently returns the wrong plan.
3. Update `EUR_TO_USD` (n8n publishes in euros).
4. Bump `LAST_VERIFIED`. It renders in the footer.

### The unit problem

The three vendors don't bill in the same unit:

| Platform | Unit | Counts |
| --- | --- | --- |
| Zapier | task | one action **step** |
| Make | operation | one **module** run |
| n8n | execution | one **whole workflow** run |

The app normalizes on **steps per month** (= Zapier tasks = Make operations) and
each platform converts via `unitsFromSteps`. n8n divides by average steps per
workflow, because a 6-node workflow firing once is 1 execution but ~6 tasks.

Skipping this makes n8n look 5–10× more expensive than it is. If you add a
platform, get its `unitsFromSteps` right before anything else.

## Caveats baked into the UI

- Prices are a hardcoded snapshot; the footer shows when it was last verified.
- Excludes taxes, per-seat charges, premium-app surcharges and add-ons.
- Self-hosted n8n is priced as a VPS estimate, not a vendor price, and excludes
  your maintenance time.
