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
3. Bump `LAST_VERIFIED`. Single exported constant, rendered in the footer.

### Verified tiers vs uncaptured plans

Each platform carries two lists, and the split is a safety mechanism:

- **`tiers[]`** — confirmed volume→price mappings. The calculator prices
  **only** from these.
- **`unverifiedPlans[]`** — plans known to exist whose volume→price mapping
  hasn't been captured. Display-only; the engine never reads them.

When usage exceeds the largest `tiers[]` entry, the UI shows *"Above our
verified pricing range — check &lt;vendor&gt;"* and marks the comparison partial,
rather than extrapolating. A price can only ever appear if a verified tier
produced it.

To fill a gap: add entries to `tiers[]` (cheapest-first) and drop the matching
`unverifiedPlans[]` entry.

Currently uncaptured: Zapier's per-task volume ladder (only the Free tier is
priceable), Make credit tiers above 10k, and n8n above 40k executions.

### The unit problem

The three vendors don't bill in the same unit:

| Platform | Unit | Counts |
| --- | --- | --- |
| Zapier | task | one action **step** |
| Make | credit | one **module** execution |
| n8n | execution | one **whole workflow** run |

The app normalizes on **steps per month** (= Zapier tasks = Make credits) and
each platform converts via `unitsFromSteps`. n8n divides by average steps per
workflow, because a 6-node workflow firing once is 1 execution but ~6 tasks.

Skipping this makes n8n look 5–10× more expensive than it is. If you add a
platform, get its `unitsFromSteps` right before anything else.

### Workflow limits

`maxWorkflows` gates the free tiers only (Zapier Free 5 Zaps, Make Free 2
scenarios). **n8n has no workflow cap on any plan** — all n8n plans include
unlimited users and workflows, so only execution volume selects the tier.

## Caveats baked into the UI

- Prices are a hardcoded snapshot; the footer shows when it was last verified.
- Excludes taxes, per-seat charges, premium-app surcharges and add-ons.
- Self-hosted n8n is priced as a VPS estimate, not a vendor price, and excludes
  your maintenance time.
