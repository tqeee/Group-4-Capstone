const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

const ROLES = Object.freeze({
  ADMIN: "Admin",
  INVESTOR: "Investor",
  OPERATIONS: "Operations",
  FUND_PORTFOLIO_MANAGER: "Fund Portfolio Manager",
});

const PERMISSIONS = Object.freeze({
  ONBOARD_INVESTOR: "admin:onboard-investor",
  READ_AUDIT: "admin:read-audit",
  VIEW_PERSONAL_DASHBOARD: "investor:view-personal-dashboard",
  MANAGE_TRANSACTIONS: "operations:manage-transactions",
  VIEW_TOTAL_FUND_METRICS: "fund-portfolio:view-total-fund-metrics",
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: Object.freeze([
    PERMISSIONS.ONBOARD_INVESTOR,
    PERMISSIONS.READ_AUDIT,
  ]),
  [ROLES.INVESTOR]: Object.freeze([
    PERMISSIONS.VIEW_PERSONAL_DASHBOARD,
  ]),
  [ROLES.OPERATIONS]: Object.freeze([
    PERMISSIONS.MANAGE_TRANSACTIONS,
  ]),
  [ROLES.FUND_PORTFOLIO_MANAGER]: Object.freeze([
    PERMISSIONS.VIEW_TOTAL_FUND_METRICS,
  ]),
});

const ROLE_SET = new Set(Object.values(ROLES));

function parsePort(value) {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("AUTH_SERVER_PORT/PORT must be a valid TCP port.");
  }

  return port;
}

function parseCsv(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
}

function parseInteger(value, fallback, { min, max, name }) {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}

function readSecret(name) {
  const value = process.env[name]?.trim();

  if (value) {
    if (Buffer.byteLength(value, "utf8") < 32) {
      if (IS_PRODUCTION) {
        throw new Error(`${name} must be at least 32 bytes in production.`);
      }

      console.warn(`[auth-server] ${name} is short; use a longer value outside local development.`);
    }

    return value;
  }

  if (IS_PRODUCTION) {
    throw new Error(`${name} is required in production.`);
  }

  const generated = crypto.randomBytes(48).toString("hex");
  console.warn(`[auth-server] ${name} is not set. Generated a process-local development secret.`);
  return generated;
}

const JWT_SECRET = readSecret("JWT_SECRET");
const MFA_SECRET = readSecret("MFA_SECRET");

if (JWT_SECRET === MFA_SECRET) {
  throw new Error("JWT_SECRET and MFA_SECRET must be different values.");
}

const MOCK_MFA_PIN = process.env.MOCK_MFA_PIN || "123456";

if (!/^\d{6}$/.test(MOCK_MFA_PIN)) {
  throw new Error("MOCK_MFA_PIN must be exactly six digits.");
}

const BCRYPT_SALT_ROUNDS = parseInteger(process.env.BCRYPT_SALT_ROUNDS, 12, {
  min: 10,
  max: 14,
  name: "BCRYPT_SALT_ROUNDS",
});

module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  PORT: parsePort(process.env.AUTH_SERVER_PORT || process.env.PORT || "5000"),
  ALLOWED_ORIGINS: parseCsv(process.env.ALLOWED_ORIGINS, [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]),
  JWT_SECRET,
  MFA_SECRET,
  JWT_TTL: "8h",
  MFA_TTL: "5m",
  TOKEN_ISSUER: "okc-investor-portal",
  JWT_AUDIENCE: "okc-investor-api",
  MFA_AUDIENCE: "okc-investor-mfa",
  MOCK_MFA_PIN,
  BCRYPT_SALT_ROUNDS,
  ROLES,
  ROLE_SET,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  SEED_ADMIN: {
    name: process.env.SEED_ADMIN_NAME || "OKC Admin",
    email: process.env.SEED_ADMIN_EMAIL || "",
    password: process.env.SEED_ADMIN_PASSWORD || "",
  },
  SEED_INVESTOR: {
    name: process.env.SEED_INVESTOR_NAME || "John Tan",
    email: process.env.SEED_INVESTOR_EMAIL || "",
    password: process.env.SEED_INVESTOR_PASSWORD || "",
  },
  SEED_OPERATIONS: {
    name: process.env.SEED_OPERATIONS_NAME || "Sarah Lee",
    email: process.env.SEED_OPERATIONS_EMAIL || "",
    password: process.env.SEED_OPERATIONS_PASSWORD || "",
  },
  SEED_FUND_PORTFOLIO: {
    name: process.env.SEED_FUND_PORTFOLIO_NAME || "David Lim",
    email: process.env.SEED_FUND_PORTFOLIO_EMAIL || "",
    password: process.env.SEED_FUND_PORTFOLIO_PASSWORD || "",
  },
};
