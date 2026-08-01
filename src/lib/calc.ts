import {
  PLATFORMS,
  maxVerifiedUnits,
  type BillingCycle,
  type Platform,
  type Tier,
} from '../config/pricing';

export interface Inputs {
  /** Monthly volume in normalized STEPS (= Zapier tasks = Make credits). */
  monthlySteps: number;
  /** Number of workflows that must be simultaneously active. */
  activeWorkflows: number;
  /** Average steps per workflow run — converts steps to whole runs for n8n. */
  avgStepsPerWorkflow: number;
  cycle: BillingCycle;
}

/**
 * Why a platform could not be priced.
 *  'volume'    — usage exceeds the largest tier with a verified price.
 *  'workflows' — the workflow count rules out every verified tier.
 */
export type UnpricedReason = 'volume' | 'workflows';

export interface Result {
  platform: Platform;
  /** null when no verified tier can satisfy the inputs. */
  tier: Tier | null;
  /** USD/month. null means "we will not guess" — never a computed estimate. */
  price: number | null;
  /** Demand expressed in this platform's own billing unit. */
  neededUnits: number;
  /** Spare capacity on the chosen tier, as a fraction of included units. */
  headroom: number | null;
  /** Set when the workflow count, not the volume, forced a higher tier. */
  workflowBound: boolean;
  /** Populated only when `price` is null. */
  unpricedReason: UnpricedReason | null;
  notes: string[];
}

function priceOf(tier: Tier, cycle: BillingCycle): number {
  return cycle === 'annual' && tier.annual !== null ? tier.annual : tier.monthly;
}

function evaluate(platform: Platform, inputs: Inputs): Result {
  const neededUnits = platform.unitsFromSteps(
    inputs.monthlySteps,
    inputs.avgStepsPerWorkflow,
  );

  const fitsVolume = (t: Tier) => t.includedUnits >= neededUnits;
  const fitsWorkflows = (t: Tier) =>
    t.maxWorkflows === null || t.maxWorkflows >= inputs.activeWorkflows;

  // Tiers are ordered cheapest-first, so the first full fit is the answer.
  // Only `tiers[]` is consulted — `unverifiedPlans[]` can never produce a price.
  const tier = platform.tiers.find((t) => fitsVolume(t) && fitsWorkflows(t)) ?? null;

  if (!tier) {
    // Distinguish "we have no verified price this high" from "your workflow
    // count rules out the tiers we do have" — different follow-up actions.
    const overVolume = neededUnits > maxVerifiedUnits(platform);
    return {
      platform,
      tier: null,
      price: null,
      neededUnits,
      headroom: null,
      workflowBound: false,
      unpricedReason: overVolume ? 'volume' : 'workflows',
      notes: [],
    };
  }

  // Did the workflow cap push us past a tier the volume alone would have
  // allowed? If so the UI says "limited by workflow count", which is the more
  // actionable explanation.
  const volumeOnlyTier = platform.tiers.find(fitsVolume);
  const workflowBound =
    volumeOnlyTier !== undefined && volumeOnlyTier.id !== tier.id;

  return {
    platform,
    tier,
    price: priceOf(tier, inputs.cycle),
    neededUnits,
    headroom: neededUnits > 0 ? tier.includedUnits / neededUnits - 1 : null,
    workflowBound,
    unpricedReason: null,
    notes: tier.notes ?? [],
  };
}

export interface Comparison {
  results: Result[];
  /** Cheapest priced result, or null if nothing could be priced. */
  winner: Result | null;
  /** Monthly saving vs the next-cheapest priced option. */
  savingVsNext: number | null;
  /** Highest price among priced results — the bar chart's scale maximum. */
  maxPrice: number;
  /** True when at least one platform could not be priced. */
  isPartial: boolean;
  /** Platforms excluded from the verdict because they could not be priced. */
  unpriced: Result[];
}

export function compare(inputs: Inputs): Comparison {
  const results = PLATFORMS.map((p) => evaluate(p, inputs));

  const priced = results
    .filter((r): r is Result & { price: number } => r.price !== null)
    .sort((a, b) => a.price - b.price);

  const unpriced = results.filter((r) => r.price === null);

  return {
    results,
    winner: priced[0] ?? null,
    savingVsNext: priced.length > 1 ? priced[1].price - priced[0].price : null,
    maxPrice: priced.length ? priced[priced.length - 1].price : 0,
    isPartial: unpriced.length > 0,
    unpriced,
  };
}

/** The message shown in place of a price. Never a number. */
export function unpricedLabel(r: Result): string {
  return r.unpricedReason === 'workflows'
    ? `No verified plan covers ${r.platform.name === 'Make.com' ? 'that many scenarios' : 'that many workflows'} — check ${r.platform.pricingHost}`
    : `Above our verified pricing range — check ${r.platform.pricingHost}`;
}

export function formatUSD(n: number): string {
  return n === 0
    ? 'Free'
    : n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: n % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      });
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}
