/**
 * AnalystOS Entitlement System
 *
 * Centralised feature gating for Free / Pro / Analyst tiers.
 *
 * HOW IT WORKS (for the finance student):
 * ─────────────────────────────────────────
 * Instead of scattering `if (plan === "pro")` checks throughout the code,
 * every feature check goes through this module.  When pricing or packaging
 * changes, you update ONE file — not fifty.
 *
 * The entitlement system answers two questions:
 *  1. "Can this user access Feature X?"        → hasAccess()
 *  2. "What limits apply to Feature X?"         → getLimit()
 */

// ── Plan Hierarchy ──────────────────────────────────────────────────────────

export type Plan = "free" | "pro" | "analyst";

/** Numeric rank so we can do `>=` comparisons. */
const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  pro: 1,
  analyst: 2,
};

export function isPlanAtLeast(userPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

// ── Feature Registry ────────────────────────────────────────────────────────

/**
 * Every gated feature in the product is listed here with its minimum plan.
 * To gate a new feature, add a row — nothing else changes.
 */
export type Feature =
  | "basic_research"
  | "basic_charts"
  | "watchlists"
  | "basic_financials"
  | "ai_questions"
  | "advanced_ai"
  | "earnings_analysis"
  | "dcf_valuation"
  | "comps_analysis"
  | "portfolio_analytics"
  | "investment_thesis"
  | "research_reports"
  | "export_reports"
  | "alerts"
  | "institutional_flow";

interface FeatureConfig {
  /** Minimum plan required to access this feature. */
  minPlan: Plan;
  /** Human-readable label for upgrade prompts. */
  label: string;
  /** Optional numeric limit per plan (e.g. daily AI questions). */
  limits?: Partial<Record<Plan, number>>;
}

const FEATURE_REGISTRY: Record<Feature, FeatureConfig> = {
  basic_research: {
    minPlan: "free",
    label: "Basic Company Research",
  },
  basic_charts: {
    minPlan: "free",
    label: "Stock Charts",
  },
  watchlists: {
    minPlan: "free",
    label: "Watchlists",
  },
  basic_financials: {
    minPlan: "free",
    label: "Basic Financial Data",
  },
  ai_questions: {
    minPlan: "free",
    label: "AI Analyst Questions",
    limits: {
      free: 5,
      pro: 100,
      analyst: 500,
    },
  },
  advanced_ai: {
    minPlan: "pro",
    label: "Advanced AI Analysis",
  },
  earnings_analysis: {
    minPlan: "pro",
    label: "Deep Earnings Analysis",
  },
  dcf_valuation: {
    minPlan: "pro",
    label: "DCF Valuation Models",
  },
  comps_analysis: {
    minPlan: "pro",
    label: "Comparable Company Analysis",
  },
  portfolio_analytics: {
    minPlan: "pro",
    label: "Advanced Portfolio Analytics",
  },
  investment_thesis: {
    minPlan: "pro",
    label: "Investment Thesis Builder",
  },
  research_reports: {
    minPlan: "pro",
    label: "Research Reports",
  },
  export_reports: {
    minPlan: "pro",
    label: "Export Reports",
  },
  alerts: {
    minPlan: "pro",
    label: "Price & Event Alerts",
  },
  institutional_flow: {
    minPlan: "pro",
    label: "Institutional Flow Data",
  },
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Check whether a user's plan grants access to a feature.
 *
 * @example
 *   if (!hasAccess(user.plan, "dcf_valuation")) {
 *     return <UpgradePrompt feature="dcf_valuation" />;
 *   }
 */
export function hasAccess(userPlan: Plan, feature: Feature): boolean {
  const config = FEATURE_REGISTRY[feature];
  if (!config) return false;
  return isPlanAtLeast(userPlan, config.minPlan);
}

/**
 * Get the numeric limit for a feature on a given plan.
 * Returns `Infinity` if there is no configured limit (unlimited).
 */
export function getLimit(userPlan: Plan, feature: Feature): number {
  const config = FEATURE_REGISTRY[feature];
  if (!config?.limits) return Infinity;
  return config.limits[userPlan] ?? Infinity;
}

/**
 * Get the feature config for UI display (e.g. upgrade prompts).
 */
export function getFeatureConfig(feature: Feature): FeatureConfig {
  return FEATURE_REGISTRY[feature];
}

/**
 * Get all features available on a given plan (for marketing/pricing pages).
 */
export function getFeaturesForPlan(plan: Plan): Feature[] {
  return (Object.keys(FEATURE_REGISTRY) as Feature[]).filter((f) =>
    isPlanAtLeast(plan, FEATURE_REGISTRY[f].minPlan)
  );
}

/**
 * Get features that require an upgrade from the current plan.
 */
export function getLockedFeatures(currentPlan: Plan): { feature: Feature; label: string; requiredPlan: Plan }[] {
  return (Object.keys(FEATURE_REGISTRY) as Feature[])
    .filter((f) => !isPlanAtLeast(currentPlan, FEATURE_REGISTRY[f].minPlan))
    .map((f) => ({
      feature: f,
      label: FEATURE_REGISTRY[f].label,
      requiredPlan: FEATURE_REGISTRY[f].minPlan,
    }));
}
