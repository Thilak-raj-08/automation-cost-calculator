/**
 * ============================================================================
 *  PRICING CONFIG — the only file you need to edit when vendors change prices.
 * ============================================================================
 *
 *  ---------------------------------------------------------------------
 *  THE UNIT PROBLEM — read this before changing anything
 *  ---------------------------------------------------------------------
 *  The platforms do NOT bill in the same unit:
 *
 *    Zapier  "task"       = one ACTION STEP executed
 *    Make    "credit"     = one MODULE execution        (≈ same as a step)
 *    n8n     "execution"  = one ENTIRE WORKFLOW RUN     (any number of nodes)
 *
 *  A 6-step workflow run once costs 6 Zapier tasks, ~6 Make credits, but only
 *  1 n8n execution. Feeding one raw number to all three makes n8n look
 *  ~5-10x more expensive than it is. Most published comparison calculators
 *  make exactly this mistake.
 *
 *  So we normalize on STEPS EXECUTED PER MONTH (= Zapier tasks = Make credits)
 *  and each platform declares how to convert. See `unitsFromSteps`.
 *
 *  ---------------------------------------------------------------------
 *  VERIFIED vs UNCAPTURED — why there are two lists per platform
 *  ---------------------------------------------------------------------
 *  `tiers[]`           Volume tiers with a CONFIRMED volume→price mapping.
 *                      The calculator prices ONLY from these.
 *  `unverifiedPlans[]` Plans known to exist whose volume→price mapping has
 *                      not been captured yet. Display-only context. The
 *                      engine never touches them.
 *
 *  This split is the safety mechanism: a price can only ever be shown if it
 *  came from a `tiers[]` entry. When usage exceeds the largest verified tier
 *  the UI says so and links the vendor, rather than extrapolating.
 *
 *  To add captured volume tiers later, just push entries into `tiers[]` —
 *  keep them ordered cheapest → most expensive — and drop the corresponding
 *  `unverifiedPlans[]` entry.
 */

/**
 * Date every `tiers[]` entry below was last confirmed against the vendors'
 * own pricing pages. Single source of truth — rendered in the UI.
 */
export const LAST_VERIFIED = '2026-08-01';

export type BillingUnit = 'task' | 'credit' | 'execution';
export type BillingCycle = 'monthly' | 'annual';

/** A tier with a confirmed volume→price mapping. Safe to price from. */
export interface Tier {
  id: string;
  /** Plan family, for grouping in the UI. */
  plan: string;
  /** Shown in the results table, e.g. "Core — 10k credits". */
  name: string;
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

/** A plan we know exists but cannot price. Never used for calculation. */
export interface UnverifiedPlan {
  name: string;
  /** Entry price as published, e.g. "$19.99/mo annual", or "contact sales". */
  from: string;
  /** What specifically is missing. */
  note: string;
}

export interface Platform {
  id: 'zapier' | 'make' | 'n8n-cloud' | 'n8n-selfhosted';
  name: string;
  /** Short line under the platform name in results. */
  tagline: string;
  unit: BillingUnit;
  unitLabel: { singular: string; plural: string };
  pricingUrl: string;
  /** Host shown in the "check <vendor>" link text. */
  pricingHost: string;
  /**
   * Converts normalized monthly steps into this platform's billing units.
   * `avgStepsPerWorkflow` only matters for per-run billing (n8n).
   */
  unitsFromSteps: (monthlySteps: number, avgStepsPerWorkflow: number) => number;
  /** Ordered cheapest → most expensive. The engine picks the first that fits. */
  tiers: Tier[];
  /** Known plans without a captured volume→price mapping. Display only. */
  unverifiedPlans: UnverifiedPlan[];
  /** Always-shown caveats about this platform's model. */
  caveats?: string[];
}

/** 1 step = 1 task = 1 credit. Identity conversion. */
const perStep = (steps: number) => Math.ceil(steps);

/** n8n bills per whole workflow run, so divide steps by workflow depth. */
const perRun = (steps: number, avgSteps: number) =>
  Math.ceil(steps / Math.max(1, avgSteps));

export const PLATFORMS: Platform[] = [
  // ==========================================================================
  //  ZAPIER — billed per task (action step).
  //  Only the Free tier has a confirmed volume→price mapping. Professional
  //  and Team publish "starting from" entry prices with no captured volume
  //  ladder, so they sit in unverifiedPlans and cannot be priced.
  // ==========================================================================
  {
    id: 'zapier',
    name: 'Zapier',
    tagline: 'Largest app library, priced per action step',
    unit: 'task',
    unitLabel: { singular: 'task', plural: 'tasks' },
    pricingUrl: 'https://zapier.com/pricing',
    pricingHost: 'zapier.com/pricing',
    unitsFromSteps: perStep,
    caveats: [
      'A "task" is one action step. A 6-step Zap firing once burns 5 tasks (the trigger is free).',
      'Filtered-out runs do not consume tasks; every executed action does.',
    ],
    tiers: [
      {
        id: 'free',
        plan: 'Free',
        name: 'Free — 100 tasks',
        monthly: 0,
        annual: 0,
        includedUnits: 100,
        maxWorkflows: 5,
        notes: ['Two-step Zaps only — no multi-step, no filters, no paths.'],
      },
    ],
    unverifiedPlans: [
      {
        name: 'Professional',
        from: 'from $29.99/mo monthly · $19.99/mo annual',
        note: 'Entry price only — per-task-volume tiers not yet captured.',
      },
      {
        name: 'Team',
        from: 'from $103.50/mo monthly · $69/mo annual',
        note: 'Entry price only — per-task-volume tiers not yet captured.',
      },
      {
        name: 'Enterprise',
        from: 'contact sales',
        note: 'Custom quote.',
      },
    ],
  },

  // ==========================================================================
  //  MAKE.COM — billed per credit (module execution).
  //  All three paid tiers are confirmed AT 10k CREDITS. Make's credit slider
  //  goes higher (20k, 40k, 80k, 150k, 300k…) but those prices are not
  //  captured, so 10k is the ceiling of the verified range.
  // ==========================================================================
  {
    id: 'make',
    name: 'Make.com',
    tagline: 'Visual builder, priced per credit',
    unit: 'credit',
    unitLabel: { singular: 'credit', plural: 'credits' },
    pricingUrl: 'https://www.make.com/en/pricing',
    pricingHost: 'make.com/en/pricing',
    unitsFromSteps: perStep,
    caveats: [
      'A "credit" is one module run. Iterators and array handling can multiply credits unexpectedly.',
      'Core runs scenarios at 15-minute minimum intervals; Pro unlocks 1-minute.',
    ],
    tiers: [
      {
        id: 'free',
        plan: 'Free',
        name: 'Free — 1k credits',
        monthly: 0,
        annual: 0,
        includedUnits: 1_000,
        maxWorkflows: 2,
        notes: ['Max 2 active scenarios; 15-minute minimum interval.'],
      },
      {
        id: 'core-10k',
        plan: 'Core',
        name: 'Core — 10k credits',
        monthly: 10.59,
        annual: 9.0,
        includedUnits: 10_000,
        maxWorkflows: null,
      },
      {
        id: 'pro-10k',
        plan: 'Pro',
        name: 'Pro — 10k credits',
        monthly: 18.82,
        annual: 16.0,
        includedUnits: 10_000,
        maxWorkflows: null,
        notes: ['Pro adds 1-minute intervals, priority execution, custom variables.'],
      },
      {
        id: 'teams-10k',
        plan: 'Teams',
        name: 'Teams — 10k credits',
        monthly: 34.12,
        annual: 29.0,
        includedUnits: 10_000,
        maxWorkflows: null,
        notes: ['Teams adds shared scenario folders and role-based access.'],
      },
    ],
    unverifiedPlans: [
      {
        name: 'Higher credit volumes',
        from: '20k · 40k · 80k · 150k · 300k credits',
        note: 'Credit-slider prices above 10k not yet captured.',
      },
      {
        name: 'Enterprise',
        from: 'custom',
        note: 'Custom quote.',
      },
    ],
  },

  // ==========================================================================
  //  n8n CLOUD — billed per EXECUTION (whole workflow run).
  //  All plans include unlimited users and workflows; ONLY execution volume
  //  determines the plan. Prices published in USD.
  // ==========================================================================
  {
    id: 'n8n-cloud',
    name: 'n8n Cloud',
    tagline: 'Billed per whole workflow run, not per step',
    unit: 'execution',
    unitLabel: { singular: 'execution', plural: 'executions' },
    pricingUrl: 'https://n8n.io/pricing',
    pricingHost: 'n8n.io/pricing',
    unitsFromSteps: perRun,
    caveats: [
      'One execution = one full workflow run regardless of node count. This is why n8n gets cheaper as workflows get longer.',
      'All plans include unlimited users and workflows — only execution volume determines your plan.',
    ],
    tiers: [
      {
        id: 'starter',
        plan: 'Starter',
        name: 'Starter — 2.5k executions',
        monthly: 24,
        annual: 20,
        includedUnits: 2_500,
        maxWorkflows: null,
        notes: ['Hosted by n8n.'],
      },
      {
        id: 'pro-10k',
        plan: 'Pro',
        name: 'Pro — 10k executions',
        monthly: 60,
        annual: 50,
        includedUnits: 10_000,
        maxWorkflows: null,
        notes: ['Hosted by n8n.'],
      },
      {
        id: 'business-40k',
        plan: 'Business',
        name: 'Business — 40k executions',
        monthly: 960,
        annual: 800,
        includedUnits: 40_000,
        maxWorkflows: null,
        notes: ['Self-hosted — you run the instance, unlike Starter and Pro.'],
      },
    ],
    unverifiedPlans: [
      {
        name: 'Higher execution volumes',
        from: 'above 40k executions',
        note: 'Higher-volume options not yet captured.',
      },
      {
        name: 'Enterprise',
        from: 'contact sales',
        note: 'Custom quote.',
      },
    ],
  },

  // ==========================================================================
  //  n8n SELF-HOSTED — fair-code license, $0 software. You pay for a server.
  //  Included because for many small businesses it genuinely wins on price,
  //  and omitting it would make the comparison misleading.
  //  NOTE: these are VPS ESTIMATES, not vendor-published prices.
  // ==========================================================================
  {
    id: 'n8n-selfhosted',
    name: 'n8n (self-hosted)',
    tagline: 'Free software on your own server — you pay hosting + upkeep',
    unit: 'execution',
    unitLabel: { singular: 'execution', plural: 'executions' },
    pricingUrl: 'https://docs.n8n.io/hosting/',
    pricingHost: 'docs.n8n.io/hosting',
    unitsFromSteps: perRun,
    caveats: [
      'Software is free under the Sustainable Use License; the figures below are VPS estimates, not vendor prices.',
      'Excludes your time: updates, backups, monitoring, and debugging are yours.',
      'Unlimited workflows and executions — the ceiling is your server, not a plan.',
    ],
    tiers: [
      {
        id: 'vps-small',
        plan: 'Self-hosted',
        name: 'Small VPS (2 vCPU / 4GB)',
        monthly: 12,
        annual: 12,
        includedUnits: 50_000,
        maxWorkflows: null,
        notes: ['Server-capacity estimate, not a vendor price.'],
      },
      {
        id: 'vps-medium',
        plan: 'Self-hosted',
        name: 'Medium VPS (4 vCPU / 8GB)',
        monthly: 24,
        annual: 24,
        includedUnits: 200_000,
        maxWorkflows: null,
        notes: ['Server-capacity estimate, not a vendor price.'],
      },
      {
        id: 'vps-large',
        plan: 'Self-hosted',
        name: 'Large VPS (8 vCPU / 16GB)',
        monthly: 48,
        annual: 48,
        includedUnits: 1_000_000,
        maxWorkflows: null,
        notes: ['Server-capacity estimate, not a vendor price.'],
      },
    ],
    unverifiedPlans: [],
  },
];

/** Largest volume a platform can be priced for, in its own billing unit. */
export function maxVerifiedUnits(platform: Platform): number {
  return platform.tiers.reduce((max, t) => Math.max(max, t.includedUnits), 0);
}

/** Defaults for the three inputs. */
export const DEFAULTS = {
  monthlySteps: 5_000,
  activeWorkflows: 8,
  avgStepsPerWorkflow: 5,
};
