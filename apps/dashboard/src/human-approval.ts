export interface HumanApprovalOptions {
  enabled: boolean;
  requiredToken?: string;
  providedToken?: string;
  approvedProposalId?: string;
  proposalId?: string;
  expiresAtIso?: string;
  nowEpochMs?: number;
}

export class HumanApprovalError extends Error {
  constructor(
    public readonly code:
      | "HUMAN_APPROVAL_REQUIRED"
      | "HUMAN_APPROVAL_TOKEN_NOT_CONFIGURED"
      | "HUMAN_APPROVAL_TOKEN_REQUIRED"
      | "HUMAN_APPROVAL_TOKEN_INVALID"
      | "HUMAN_APPROVAL_EXPIRES_AT_REQUIRED"
      | "HUMAN_APPROVAL_EXPIRED"
      | "HUMAN_APPROVAL_FOR_DIFFERENT_PROPOSAL",
    message: string
  ) {
    super(message);
    this.name = "HumanApprovalError";
  }
}

export function enforceHumanApproval(options?: HumanApprovalOptions): void {
  if (!options?.enabled) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_REQUIRED",
      "Human approval is required and cannot be disabled for executable actions."
    );
  }
  if (!options.requiredToken) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_TOKEN_NOT_CONFIGURED",
      "Human approval is enabled, but no server-side token is configured."
    );
  }
  if (!options.providedToken) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_TOKEN_REQUIRED",
      "Human approval token is required before order submission."
    );
  }
  if (options.providedToken !== options.requiredToken) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_TOKEN_INVALID",
      "Human approval token is invalid."
    );
  }
  if (!options.expiresAtIso) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_EXPIRES_AT_REQUIRED",
      "Human approval expiresAt timestamp is required."
    );
  }
  const expiresAtEpoch = Date.parse(options.expiresAtIso);
  if (!Number.isFinite(expiresAtEpoch)) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_EXPIRES_AT_REQUIRED",
      "Human approval expiresAt timestamp is invalid."
    );
  }
  const nowEpoch = options.nowEpochMs ?? Date.now();
  if (nowEpoch > expiresAtEpoch) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_EXPIRED",
      "Human approval has expired."
    );
  }
  if (options.proposalId && options.approvedProposalId && options.proposalId !== options.approvedProposalId) {
    throw new HumanApprovalError(
      "HUMAN_APPROVAL_FOR_DIFFERENT_PROPOSAL",
      "Human approval was granted for a different proposal."
    );
  }
}

export function parseBooleanEnv(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  const value = raw.trim().toLowerCase();
  if (value === "1" || value === "true" || value === "yes" || value === "on") {
    return true;
  }
  if (value === "0" || value === "false" || value === "no" || value === "off") {
    return false;
  }
  return fallback;
}
