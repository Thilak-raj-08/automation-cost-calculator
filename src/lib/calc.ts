import {
  PLATFORMS,
  type BillingCycle,
  type Platform,
  type Tier,
} from '../config/pricing';

export interface Inputs {
  /** Monthly volume in normalized STEPS (= Zapier tasks = Make operations). */
  monthlySteps: number;
  /** Number of workflows that must be simultaneously active. */
  activeWorkflows: number;
  /** Average steps per workflow run — converts steps to whole runs for n8n. */
  avgStepsPerWorkflow: number;
  cycle: BillingCycle;
}

export interface Result {
  platform: Platform;
  /** null when no published tier can satisfy the inputs. */
  tier: Tier | null;
  /** USD/month, or null when the answer is "get a custom quote". */
  price: number | null;
  /** Demand expressed in this platform's own billing unit. */
  neededUnits: number;
  /** Spare capacity on the chosen tier, as a fraction of included units. */
  headroom: number | null;
  /** Set when the workflow count, not the volume, forced a higher tier. */
  workflowBound: boolean;
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
  const tier = platform.tiers.find((t) => fitsVolume(t) && fitsWorkflows(t)) ?? null;

  if (!tier) {
    return {
      platform,
      tier: null,
      price: null,
      neededUnits,
      headroom: null,
      workflowBound: false,
      notes: [platform.aboveTopTier],
    };
  }

  // Did the workflow cap push us past a tier that the volume alone would have
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
    headroom: tier.includedUnits > 0 ? tier.includedUnits / neededUnits - 1 : null,
    workflowBound,
    notes: tier.notes ?? [],
  };
}

export interface Comparison {
  results: Result[];
  /** Cheapest priced result, or null if every platform needs a custom quote. */
  winner: Result | null;
  /** Monthly saving vs the next-cheapest priced option. */
  savingVsNext: number | null;
  /** Highest price among priced results — the bar chart's scale maximum. */
  maxPrice: number;
}

export function compare(inputs: Inputs): Comparison {
  const results = PLATFORMS.map((p) => evaluate(p, inputs));

  const priced = results
    .filter((r): r is Result & { price: number } => r.price !== null)
    .sort((a, b) => a.price - b.price);

  return {
    results,
    winner: priced[0] ?? null,
    savingVsNext:
      priced.length > 1 ? priced[1].price - priced[0].price : null,
    maxPrice: priced.length ? priced[priced.length - 1].price : 0,
  };
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
