/**
 * ============================================================================
 *  PRICING CONFIG — the only file you need to edit when vendors change prices.
 * ============================================================================
 *
 *  ⚠️  VERIFY BEFORE PUBLISHING. Every number below is a hardcoded snapshot.
 *      These three vendors reprice often. Check each `pricingUrl` and bump
 *      `LAST_VERIFIED` when you do.
 *
 *  ---------------------------------------------------------------------
 *  THE UNIT PROBLEM — read this before changing anything
 *  ---------------------------------------------------------------------
 *  The platforms do NOT bill in the same unit:
 *
 *    Zapier  "task"       = one ACTION STEP executed
 *    Make    "operation"  = one MODULE executed          (≈ same as a step)
 *    n8n     "execution"  = one ENTIRE WORKFLOW RUN      (any number of nodes)
 *
 *  A 6-step workflow run once costs 6 Zapier tasks, ~6 Make ops, but only
 *  1 n8n execution. Feeding one raw number to all three makes n8n look
 *  ~5-10x more expensive than it is. Most published comparison calculators
 *  make exactly this mistake.
 *
 *  So we normalize on STEPS EXECUTED PER MONTH (= Zapier tasks = Make ops)
 *  and each platform declares how to convert. See `unitsFromSteps`.
 *  ---------------------------------------------------------------------
 */

/** Date the numbers below were last checked against the vendors' pricing pages. */
export const LAST_VERIFIED = '2026-05-01';

/**
 * n8n publishes in EUR. Used to convert its tiers to USD for comparison.
 * Update alongside the tiers — a stale rate quietly skews the verdict.
 */
export const EUR_TO_USD = 1.09;

export type BillingUnit = 'task' | 'operation' | 'execution';
export type BillingCycle = 'monthly' | 'annual';

export interface Tier {
  id: string;
  /** Shown in the results table, e.g. "Professional — 2k tasks". */
  name: string;
  /** Plan family, for grouping in the UI. */
  plan: string;
  /** USD/month when paying month-to-month. */
  monthly: number;
  /** USD/month equivalent when paying annually. null = no annual option. */
  annual: number | null;
  /** Included billing units per month, in THIS platform's unit. */
  includedUnits: number;
  /** Max simultaneously-active workflows. null = unlimited. */
  maxWorkflows: number | null;
  /** Caveats surfaced in the UI when this tier is the recommended one. */
  notes?: string[];
}

export interface Platform {
  id: 'zapier' | 'make' | 'n8n-cloud' | 'n8n-selfhosted';
  name: string;
  /** Short line under the platform name in results. */
  tagline: string;
  unit: BillingUnit;
  unitLabel: { singular: string; plural: string };
  pricingUrl: string;
  /**
   * Converts normalized monthly steps into this platform's billing units.
   * `avgStepsPerWorkflow` only matters for per-run billing (n8n).
   */
  unitsFromSteps: (monthlySteps: number, avgStepsPerWorkflow: number) => number;
  /** Ordered cheapest → most expensive. The engine picks the first that fits. */
  tiers: Tier[];
  /** Shown when demand exceeds the largest tier. */
  aboveTopTier: string;
  /** Always-shown caveats about this platform's model. */
  caveats?: string[];
}

/** 1 step = 1 task = 1 operation. Identity conversion. */
const perStep = (steps: number) => Math.ceil(steps);

/** n8n bills per whole workflow run, so divide steps by workflow depth. */
const perRun = (steps: number, avgSteps: number) =>
  Math.ceil(steps / Math.max(1, avgSteps));

export const PLATFORMS: Platform[] = [
  // ==========================================================================
  //  ZAPIER — billed per task (action step). Volume-bucketed within each plan.
  // ==========================================================================
  {
    id: 'zapier',
    name: 'Zapier',
    tagline: 'Largest app library, priced per action step',
    unit: 'task',
    unitLabel: { singular: 'task', plural: 'tasks' },
    pricingUrl: 'https://zapier.com/pricing',
    unitsFromSteps: perStep,
    aboveTopTier: 'Above 100k tasks Zapier moves you to a custom Enterprise quote.',
    caveats: [
      'A "task" is one action step. A 6-step Zap firing once burns 5 tasks (the trigger is free).',
      'Filtered-out runs do not consume tasks; every executed action does.',
    ],
    tiers: [
      {
        id: 'free',
        plan: 'Free',
        name: 'Free',
        monthly: 0,
        annual: 0,
        includedUnits: 100,
        maxWorkflows: 5,
        notes: ['Two-step Zaps only — no multi-step, no filters, no paths.'],
      },
      { id: 'pro-750',  plan: 'Professional', name: 'Professional — 750 tasks',  monthly: 29.99, annual: 19.99, includedUnits: 750,    maxWorkflows: null },
      { id: 'pro-2k',   plan: 'Professional', name: 'Professional — 2k tasks',   monthly: 73.50, annual: 49.00, includedUnits: 2_000,  maxWorkflows: null },
      { id: 'pro-5k',   plan: 'Professional', name: 'Professional — 5k tasks',   monthly: 133.50, annual: 89.00, includedUnits: 5_000,  maxWorkflows: null },
      { id: 'pro-10k',  plan: 'Professional', name: 'Professional — 10k tasks',  monthly: 193.50, annual: 129.00, includedUnits: 10_000, maxWorkflows: null },
      { id: 'pro-20k',  plan: 'Professional', name: 'Professional — 20k tasks',  monthly: 283.50, annual: 189.00, includedUnits: 20_000, maxWorkflows: null },
      { id: 'pro-50k',  plan: 'Professional', name: 'Professional — 50k tasks',  monthly: 433.50, annual: 289.00, includedUnits: 50_000, maxWorkflows: null },
      { id: 'pro-100k', plan: 'Professional', name: 'Professional — 100k tasks', monthly: 598.50, annual: 399.00, includedUnits: 100_000, maxWorkflows: null },
    ],
  },

  // ==========================================================================
  //  MAKE.COM — billed per operation (module execution). Also volume-bucketed.
  // ==========================================================================
  {
    id: 'make',
    name: 'Make.com',
    tagline: 'Visual builder, cheapest per operation at low volume',
    unit: 'operation',
    unitLabel: { singular: 'operation', plural: 'operations' },
    pricingUrl: 'https://www.make.com/en/pricing',
    unitsFromSteps: perStep,
    aboveTopTier: 'Above 800k operations Make moves you to a custom Enterprise quote.',
    caveats: [
      'An "operation" is one module run. Iterators and array handling can multiply ops unexpectedly.',
      'Core plan runs scenarios at 15-minute minimum intervals; Pro unlocks 1-minute.',
    ],
    tiers: [
      {
        id: 'free',
        plan: 'Free',
        name: 'Free',
        monthly: 0,
        annual: 0,
        includedUnits: 1_000,
        maxWorkflows: 2,
        notes: ['Max 2 active scenarios; 15-minute minimum interval.'],
      },
      { id: 'core-10k',  plan: 'Core', name: 'Core — 10k ops',  monthly: 10.59, annual: 9.00,  includedUnits: 10_000,  maxWorkflows: null },
      { id: 'core-20k',  plan: 'Core', name: 'Core — 20k ops',  monthly: 18.82, annual: 16.00, includedUnits: 20_000,  maxWorkflows: null },
      { id: 'core-40k',  plan: 'Core', name: 'Core — 40k ops',  monthly: 34.12, annual: 29.00, includedUnits: 40_000,  maxWorkflows: null },
      { id: 'core-80k',  plan: 'Core', name: 'Core — 80k ops',  monthly: 64.71, annual: 55.00, includedUnits: 80_000,  maxWorkflows: null },
      { id: 'pro-150k',  plan: 'Pro',  name: 'Pro — 150k ops',  monthly: 116.47, annual: 99.00, includedUnits: 150_000, maxWorkflows: null, notes: ['Pro adds 1-minute intervals, priority execution, custom variables.'] },
      { id: 'pro-300k',  plan: 'Pro',  name: 'Pro — 300k ops',  monthly: 210.59, annual: 179.00, includedUnits: 300_000, maxWorkflows: null },
      { id: 'pro-800k',  plan: 'Pro',  name: 'Pro — 800k ops',  monthly: 494.12, annual: 420.00, includedUnits: 800_000, maxWorkflows: null },
    ],
  },

  // ==========================================================================
  //  n8n CLOUD — billed per EXECUTION (whole workflow run) + active-workflow cap.
  //  Prices published in EUR; converted at EUR_TO_USD.
  // ==========================================================================
  {
    id: 'n8n-cloud',
    name: 'n8n Cloud',
    tagline: 'Billed per whole workflow run, not per step',
    unit: 'execution',
    unitLabel: { singular: 'execution', plural: 'executions' },
    pricingUrl: 'https://n8n.io/pricing',
    unitsFromSteps: perRun,
    aboveTopTier: 'Above 50k executions n8n moves you to a custom Enterprise quote.',
    caveats: [
      'One execution = one full workflow run regardless of node count. This is why n8n gets cheaper as workflows get longer.',
      'Active-workflow caps are hard limits on the lower tiers — extra workflows must sit deactivated.',
      `EUR prices converted at ${EUR_TO_USD} USD/EUR.`,
    ],
    tiers: [
      { id: 'starter', plan: 'Starter', name: 'Starter — 2.5k executions', monthly: 24 * EUR_TO_USD, annual: 20 * EUR_TO_USD, includedUnits: 2_500, maxWorkflows: 5 },
      { id: 'pro-10k', plan: 'Pro',     name: 'Pro — 10k executions',      monthly: 60 * EUR_TO_USD, annual: 50 * EUR_TO_USD, includedUnits: 10_000, maxWorkflows: 15 },
      { id: 'pro-50k', plan: 'Pro',     name: 'Pro — 50k executions',      monthly: 120 * EUR_TO_USD, annual: 100 * EUR_TO_USD, includedUnits: 50_000, maxWorkflows: 50 },
    ],
  },

  // ==========================================================================
  //  n8n SELF-HOSTED — fair-code license, $0 software. You pay for a server.
  //  Included because for many small businesses it genuinely wins on price,
  //  and omitting it would make the comparison misleading. The tradeoff is
  //  real maintenance work, surfaced as a caveat rather than hidden.
  // ==========================================================================
  {
    id: 'n8n-selfhosted',
    name: 'n8n (self-hosted)',
    tagline: 'Free software on your own server — you pay hosting + upkeep',
    unit: 'execution',
    unitLabel: { singular: 'execution', plural: 'executions' },
    pricingUrl: 'https://docs.n8n.io/hosting/',
    unitsFromSteps: perRun,
    aboveTopTier: 'Scale further by resizing the server; there is no vendor cap.',
    caveats: [
      'Software is free under the Sustainable Use License; the cost below is a VPS estimate, not a vendor price.',
      'Excludes your time: updates, backups, monitoring, and debugging are yours.',
      'Unlimited workflows and executions — the ceiling is your server, not a plan.',
    ],
    tiers: [
      { id: 'vps-small',  plan: 'Self-hosted', name: 'Small VPS (2 vCPU / 4GB)',  monthly: 12, annual: 12, includedUnits: 50_000,  maxWorkflows: null, notes: ['Comfortable for light-to-moderate workloads.'] },
      { id: 'vps-medium', plan: 'Self-hosted', name: 'Medium VPS (4 vCPU / 8GB)', monthly: 24, annual: 24, includedUnits: 200_000, maxWorkflows: null },
      { id: 'vps-large',  plan: 'Self-hosted', name: 'Large VPS (8 vCPU / 16GB)', monthly: 48, annual: 48, includedUnits: 1_000_000, maxWorkflows: null },
    ],
  },
];

/** Defaults for the three inputs. */
export const DEFAULTS = {
  monthlySteps: 5_000,
  activeWorkflows: 8,
  avgStepsPerWorkflow: 5,
};
