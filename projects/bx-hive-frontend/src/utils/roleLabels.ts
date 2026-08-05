import type { RoleLabels } from '../hooks/useTrustExperiments'

/**
 * Role names used when an experiment carries none. The contract accepts empty
 * strings, and the lookup that reads the labels back can still be in flight or
 * have failed, so every subject-facing screen resolves through here rather than
 * risking a blank role.
 */
export const DEFAULT_ROLE_LABELS: RoleLabels = {
  investorLabel: 'Investor',
  trusteeLabel: 'Trustee',
}

/** Substitutes the default for any label that is missing or blank. */
export function resolveRoleLabels(source: Partial<RoleLabels> | null | undefined): RoleLabels {
  return {
    investorLabel: source?.investorLabel?.trim() || DEFAULT_ROLE_LABELS.investorLabel,
    trusteeLabel: source?.trusteeLabel?.trim() || DEFAULT_ROLE_LABELS.trusteeLabel,
  }
}
