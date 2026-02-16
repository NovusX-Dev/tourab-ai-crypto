export interface HumanApprovalOptions {
  enabled: boolean;
  requiredToken?: string;
  providedToken?: string;
}

export class HumanApprovalError extends Error {
  constructor(
    public readonly code:
      | "HUMAN_APPROVAL_TOKEN_NOT_CONFIGURED"
      | "HUMAN_APPROVAL_TOKEN_REQUIRED"
      | "HUMAN_APPROVAL_TOKEN_INVALID",
    message: string
  ) {
    super(message);
    this.name = "HumanApprovalError";
  }
}

export function enforceHumanApproval(options?: HumanApprovalOptions): void {
  if (!options?.enabled) {
    return;
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
