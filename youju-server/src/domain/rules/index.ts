/**
 * Domain rules barrel export.
 *
 * Business rules live here (not in prompts). Prompts reference rule names;
 * the concrete conditions are defined in code so they are testable,
 * versioned and reusable by domain services.
 */

export {
  classifyRiskLevel,
  getRiskRulesSummary,
  QUALITY_BAR,
  RISK_LEVEL_RULES,
  RISK_RULES_VERSION,
  RISK_TYPES,
  SELF_CHECK_RULES,
} from './riskRules.js'
