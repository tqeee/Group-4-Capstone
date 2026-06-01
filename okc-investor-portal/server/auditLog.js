const AUDIT_ACTIVITY = Object.freeze({
  SERVER_BOOTSTRAP_ADMIN: "server.bootstrap_admin.created",
  LOGIN_VALIDATION_FAILED: "auth.login.validation_failed",
  LOGIN_FAILED: "auth.login.failed",
  LOGIN_PASSWORD_ACCEPTED: "auth.login.password_accepted",
  MFA_VALIDATION_FAILED: "auth.mfa.validation_failed",
  MFA_TOKEN_INVALID: "auth.mfa.token_invalid",
  MFA_PIN_REJECTED: "auth.mfa.pin_rejected",
  MFA_VERIFIED: "auth.mfa.verified",
  AUTH_HEADER_MISSING: "auth.header.missing",
  AUTH_TOKEN_INVALID: "auth.token.invalid",
  RBAC_DENIED: "auth.rbac.denied",
  ONBOARD_INVESTOR_CREATED: "admin.onboard_investor.created",
  ONBOARD_INVESTOR_CONFLICT: "admin.onboard_investor.conflict",
  AUDIT_READ: "admin.audit.read",
  PASSWORD_RESET_REQUESTED: "auth.password_reset.requested",
  INVESTOR_DASHBOARD_READ: "investor.dashboard_summary.read",
  PORTFOLIO_METRICS_READ: "portfolio.metrics.read",
  OPERATIONS_TRANSACTIONS_READ: "operations.transactions.read",
  OPERATIONS_TRANSACTION_DECISION: "operations.transaction_decision.submitted",
  SERVER_ERROR: "server.error",
});

const auditEntries = [];
const REDACTED_KEYS = new Set([
  "authorization",
  "jwt",
  "mfaToken",
  "mfatoken",
  "password",
  "passwordHash",
  "pin",
  "secret",
  "temporaryPassword",
  "token",
]);

function sanitizeMetadata(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadata);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      if (REDACTED_KEYS.has(key) || REDACTED_KEYS.has(key.toLowerCase())) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeMetadata(entryValue)];
    }),
  );
}

function recordAudit({ userId = null, activityType, outcome = "success", metadata = {}, requestId = null }) {
  if (!activityType || typeof activityType !== "string") {
    throw new Error("audit activityType is required.");
  }

  const entry = Object.freeze({
    timestamp: new Date().toISOString(),
    userId,
    activityType,
    outcome,
    requestId,
    metadata: sanitizeMetadata(metadata),
  });

  auditEntries.push(entry);
  return entry;
}

function getAuditEntries({ limit = 250 } = {}) {
  return auditEntries.slice(-limit).reverse();
}

module.exports = {
  AUDIT_ACTIVITY,
  recordAudit,
  getAuditEntries,
};
