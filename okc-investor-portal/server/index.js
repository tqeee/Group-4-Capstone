const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const {
  ALLOWED_ORIGINS,
  BCRYPT_SALT_ROUNDS,
  IS_PRODUCTION,
  JWT_AUDIENCE,
  JWT_SECRET,
  JWT_TTL,
  MFA_AUDIENCE,
  MFA_SECRET,
  MFA_TTL,
  MOCK_MFA_PIN,
  NODE_ENV,
  PERMISSIONS,
  PORT,
  ROLES,
  SEED_ADMIN,
  SEED_INVESTOR,
  SEED_OPERATIONS,
  SEED_FUND_PORTFOLIO,
  TOKEN_ISSUER,
} = require("./config");
const { AUDIT_ACTIVITY, getAuditEntries, recordAudit } = require("./auditLog");

const { authenticateToken, jsonError, requirePermission } = require("./middleware/rbac");
const {
  ConflictError,
  ValidationError,
  createUser,
  updateUser,
  generateTemporaryPassword,
  getUserByEmail,
  getUserById,
  normalizeEmail,
  serializeUser,
  validateUserInput,
} = require("./userStore");

const app = express();
const dummyPasswordHash = bcrypt.hashSync("not-the-submitted-password", BCRYPT_SALT_ROUNDS);

app.disable("x-powered-by");

app.use((req, res, next) => {
  req.requestId = req.get("x-request-id") || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// 2. Locate your CORS block in index.js and replace it with this:
app.use((req, res, next) => {
  const origin = req.get("origin");
  
  // Accept connections coming from your Next.js frontend application
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-request-id");
  
  // Handle automatic pre-flight check requests from browsers safely
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: "32kb" }));

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return jsonError(res, 400, "Malformed JSON request body.");
  }

  return next(error);
});

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function validateLoginPayload(body) {
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const errors = {};

  if (!email) {
    errors.email = "Email is required.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed.", errors);
  }

  return { email, password };
}

function validateMfaPayload(body) {
  const rawToken = body?.mfaToken ?? body?.token;
  const mfaToken = typeof rawToken === "string" ? rawToken.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  const errors = {};

  if (!mfaToken) {
    errors.mfaToken = "MFA session token is required.";
  }

  if (!/^\d{6}$/.test(pin)) {
    errors.pin = "PIN must be exactly six digits.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed.", errors);
  }

  return { mfaToken, pin };
}

function signMfaToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      purpose: "mfa",
      role: user.role,
    },
    MFA_SECRET,
    {
      algorithm: "HS256",
      audience: MFA_AUDIENCE,
      expiresIn: MFA_TTL,
      issuer: TOKEN_ISSUER,
      jwtid: crypto.randomUUID(),
    },
  );
}

function signApplicationToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    {
      algorithm: "HS256",
      audience: JWT_AUDIENCE,
      expiresIn: JWT_TTL,
      issuer: TOKEN_ISSUER,
      jwtid: crypto.randomUUID(),
    },
  );
}

function roleHomePath(role) {
  return {
    [ROLES.ADMIN]: "/admin",
    [ROLES.INVESTOR]: "/investor",
    [ROLES.OPERATIONS]: "/operations",
    [ROLES.FUND_PORTFOLIO_MANAGER]: "/fund-portfolio",
  }[role] || "/";
}

app.get("/api/health", (req, res) => {
  return res.json({
    status: "ok",
    service: "okc-auth-service",
    environment: NODE_ENV,
  });
});

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  let credentials;

  try {
    credentials = validateLoginPayload(req.body);
  } catch (error) {
    recordAudit({
      activityType: AUDIT_ACTIVITY.LOGIN_VALIDATION_FAILED,
      outcome: "failure",
      requestId: req.requestId,
      metadata: { email: req.body?.email },
    });

    return jsonError(res, error.statusCode || 400, error.message, { errors: error.errors });
  }

  const user = getUserByEmail(credentials.email);
  const passwordHash = user?.passwordHash || dummyPasswordHash;
  const passwordMatches = await bcrypt.compare(credentials.password, passwordHash);

  if (!user || !passwordMatches || user.status === "disabled") {
    recordAudit({
      userId: user?.id || null,
      activityType: AUDIT_ACTIVITY.LOGIN_FAILED,
      outcome: "failure",
      requestId: req.requestId,
      metadata: { email: credentials.email },
    });

    return jsonError(res, 401, "Invalid email or password.");
  }

  const mfaToken = signMfaToken(user);

  recordAudit({
    userId: user.id,
    activityType: AUDIT_ACTIVITY.LOGIN_PASSWORD_ACCEPTED,
    requestId: req.requestId,
    metadata: {
      email: user.email,
      role: user.role,
    },
  });

  return res.json({
    message: "Password verified. MFA verification is required.",
    mfaToken,
    expiresInSeconds: 5 * 60,
    next: "/MFA",
  });
}));

app.post("/api/auth/verify-mfa", asyncHandler(async (req, res) => {
  let payload;

  try {
    payload = validateMfaPayload(req.body);
  } catch (error) {
    recordAudit({
      activityType: AUDIT_ACTIVITY.MFA_VALIDATION_FAILED,
      outcome: "failure",
      requestId: req.requestId,
    });

    return jsonError(res, error.statusCode || 400, error.message, { errors: error.errors });
  }

  let decoded;

  try {
    decoded = jwt.verify(payload.mfaToken, MFA_SECRET, {
      algorithms: ["HS256"],
      audience: MFA_AUDIENCE,
      issuer: TOKEN_ISSUER,
    });

    if (decoded.purpose !== "mfa") {
      throw new Error("Invalid MFA token purpose.");
    }
  } catch (error) {
    recordAudit({
      activityType: AUDIT_ACTIVITY.MFA_TOKEN_INVALID,
      outcome: "failure",
      requestId: req.requestId,
      metadata: { reason: error.name },
    });

    return jsonError(res, 401, "Invalid or expired MFA session token.");
  }

  const user = getUserById(decoded.sub);

  if (!user || user.status === "disabled") {
    recordAudit({
      userId: decoded.sub || null,
      activityType: AUDIT_ACTIVITY.MFA_TOKEN_INVALID,
      outcome: "failure",
      requestId: req.requestId,
      metadata: { reason: "inactive-user" },
    });

    return jsonError(res, 401, "Invalid or expired MFA session token.");
  }

  if (payload.pin !== MOCK_MFA_PIN) {
    recordAudit({
      userId: user.id,
      activityType: AUDIT_ACTIVITY.MFA_PIN_REJECTED,
      outcome: "failure",
      requestId: req.requestId,
    });

    return jsonError(res, 401, "Invalid verification code.");
  }

  const token = signApplicationToken(user);

  recordAudit({
    userId: user.id,
    activityType: AUDIT_ACTIVITY.MFA_VERIFIED,
    requestId: req.requestId,
    metadata: {
      email: user.email,
      role: user.role,
    },
  });

  return res.json({
    message: "MFA verified.",
    token,
    tokenType: "Bearer",
    expiresInSeconds: 8 * 60 * 60,
    user: serializeUser(user),
    next: roleHomePath(user.role),
  });
}));

app.put("/api/users/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedBy = req.user ? req.user.email : "system";

  try {
    // 1. Execute data mutation and retrieve the before/after states
    const { updatedUser, oldUser } = updateUser(id, req.body, updatedBy);

    // 2. Centralized Controller Audit Logging (Success Tracking)
    recordAudit({
      userId: updatedUser.id,
      activityType: AUDIT_ACTIVITY.USER_PROFILE_UPDATED, 
      outcome: "success",
      requestId: req.requestId,
      metadata: {
        changedBy: updatedBy,
        fieldsModified: {
          passwordChanged: req.body.passwordHash !== undefined,
          roleChanged: req.body.role !== undefined && req.body.role !== oldUser.role,
          statusChanged: req.body.status !== undefined && req.body.status !== oldUser.status
        }
      }
    });

    // 3. Dispatch uniform framework response
    return res.json({
      success: true,
      message: "User profile updated successfully.",
      user: serializeUser(updatedUser)
    });
    
  } catch (error) {
    // 4. Centralized Controller Audit Logging (Failure Tracking)
    recordAudit({
      userId: id || null,
      activityType: AUDIT_ACTIVITY.USER_PROFILE_UPDATED, 
      outcome: "failure",
      requestId: req.requestId,
      metadata: {
        changedBy: updatedBy,
        reason: error.message
      }
    });

    return jsonError(res, error.statusCode || 400, error.message, { errors: error.errors });
  }
}));

app.post("/api/auth/forgot-password", asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return jsonError(res, 400, "Validation failed.", {
      errors: { email: "Email is required." },
    });
  }

  const user = getUserByEmail(email);

  if (user) {
    recordAudit({
      userId: user.id,
      activityType: AUDIT_ACTIVITY.PASSWORD_RESET_REQUESTED,
      requestId: req.requestId,
      metadata: { email },
    });
  }

  return res.json({
    message: "If an account exists for that email, a reset link has been queued.",
  });
}));

app.post(
  "/api/admin/onboard-investor",
  authenticateToken,
  requirePermission(PERMISSIONS.ONBOARD_INVESTOR),
  asyncHandler(async (req, res) => {
    let validated;

    try {
      validated = validateUserInput(req.body || {});
    } catch (error) {
      return jsonError(res, error.statusCode || 400, error.message, { errors: error.errors });
    }

    if (getUserByEmail(validated.email)) {
      recordAudit({
        userId: req.user.id,
        activityType: AUDIT_ACTIVITY.ONBOARD_INVESTOR_CONFLICT,
        outcome: "failure",
        requestId: req.requestId,
        metadata: { invitedEmail: validated.email },
      });

      return jsonError(res, 409, "A user with this email already exists.");
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

    let createdUser;

    try {
      createdUser = createUser({
        ...validated,
        passwordHash,
        createdBy: req.user.id,
        status: "invited",
        mustChangePassword: true,
      });
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        return jsonError(res, error.statusCode, error.message, { errors: error.errors });
      }

      throw error;
    }

    recordAudit({
      userId: req.user.id,
      activityType: AUDIT_ACTIVITY.ONBOARD_INVESTOR_CREATED,
      requestId: req.requestId,
      metadata: {
        invitedUserId: createdUser.id,
        invitedEmail: createdUser.email,
        invitedRole: createdUser.role,
      },
    });

    return res.status(201).json({
      message: "Onboarding invitation generated.",
      user: serializeUser(createdUser),
      temporaryCredentials: {
        email: createdUser.email,
        temporaryPassword,
      },
      delivery: "simulated-email",
    });
  }),
);

app.get(
  "/api/admin/audit",
  authenticateToken,
  requirePermission(PERMISSIONS.READ_AUDIT),
  (req, res) => {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 500)
      : 250;

    recordAudit({
      userId: req.user.id,
      activityType: AUDIT_ACTIVITY.AUDIT_READ,
      requestId: req.requestId,
      metadata: { limit },
    });

    return res.json({
      entries: getAuditEntries({ limit }),
    });
  },
);

app.get(
  "/api/investor/dashboard-summary",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_PERSONAL_DASHBOARD),
  (req, res) => {
    recordAudit({
      userId: req.user.id,
      activityType: AUDIT_ACTIVITY.INVESTOR_DASHBOARD_READ,
      requestId: req.requestId,
    });

    return res.json({
      userId: req.user.id,
      name: req.user.name,
      summary: {
        totalPortfolioValue: "SGD 34,061.15",
        dayPnl: "-SGD 1.20",
        mtdPnl: "-SGD 9,381.31",
        sinceInceptionReturn: "-31.88%",
        navAsOf: "2026-04-08T19:00:00+08:00",
      },
      note: "Raw fund-holding records are intentionally excluded for the Investor role.",
    });
  },
);

app.get(
  "/api/portfolio/fund-metrics",
  authenticateToken,
  requirePermission(PERMISSIONS.VIEW_TOTAL_FUND_METRICS),
  (req, res) => {
    recordAudit({
      userId: req.user.id,
      activityType: AUDIT_ACTIVITY.PORTFOLIO_METRICS_READ,
      requestId: req.requestId,
    });

    return res.json({
      metrics: {
        totalAum: "SGD 4,280,000.00",
        activeFunds: 1,
        aggregateMtdPnl: "-21.89%",
        aggregateSinceInceptionReturn: "-31.88%",
      },
      note: "Macro fund metrics only; investor-level raw holdings are not included.",
    });
  },
);

app.get(
  "/api/operations/transactions",
  authenticateToken,
  requirePermission(PERMISSIONS.MANAGE_TRANSACTIONS),
  (req, res) => {
    recordAudit({
      userId: req.user.id,
      activityType: AUDIT_ACTIVITY.OPERATIONS_TRANSACTIONS_READ,
      requestId: req.requestId,
    });

    return res.json({
      transactions: [
        {
          id: "txn_1001",
          type: "deposit",
          amount: "SGD 50,000.00",
          status: "pending-review",
        },
        {
          id: "txn_1002",
          type: "withdrawal",
          amount: "SGD 12,000.00",
          status: "pending-review",
        },
      ],
    });
  },
);

app.post(
  "/api/operations/transactions/:transactionId/decision",
  authenticateToken,
  requirePermission(PERMISSIONS.MANAGE_TRANSACTIONS),
  (req, res) => {
    const decision = typeof req.body?.decision === "string" ? req.body.decision.trim().toLowerCase() : "";

    if (!["approve", "reject"].includes(decision)) {
      return jsonError(res, 400, "Validation failed.", {
        errors: { decision: "Decision must be either approve or reject." },
      });
    }

    recordAudit({
      userId: req.user.id,
      activityType: AUDIT_ACTIVITY.OPERATIONS_TRANSACTION_DECISION,
      requestId: req.requestId,
      metadata: {
        transactionId: req.params.transactionId,
        decision,
      },
    });

    return res.json({
      message: `Transaction ${decision} decision recorded.`,
      transactionId: req.params.transactionId,
      decision,
    });
  },
);

app.use((req, res) => {
  return jsonError(res, 404, "API route not found.");
});

app.use((error, req, res, next) => {
  recordAudit({
    activityType: AUDIT_ACTIVITY.SERVER_ERROR,
    outcome: "failure",
    requestId: req.requestId,
    metadata: {
      method: req.method,
      path: req.path,
      error: error.message,
    },
  });

  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  const status = error.statusCode || 500;
  const message = status >= 500 ? "Internal server error." : error.message;

  return jsonError(res, status, message, error.errors ? { errors: error.errors } : {});
});

async function seedInitialUsers() {
  // --- SEED ADMIN ---
  let adminEmail = SEED_ADMIN.email;
  let adminPassword = SEED_ADMIN.password;
  let generatedDevelopmentPassword = false;

  if (!adminEmail || !adminPassword) {
    if (IS_PRODUCTION) {
      console.warn("[auth-server] No seed admin configured. Ensure an Admin user exists in the backing store.");
    } else {
      adminEmail = adminEmail || "admin@okc.local";
      adminPassword = generateTemporaryPassword();
      generatedDevelopmentPassword = true;
    }
  }

  if (adminEmail && !getUserByEmail(adminEmail)) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);
    const adminUser = createUser({
      name: SEED_ADMIN.name || "OKC Admin",
      email: adminEmail,
      role: ROLES.ADMIN,
      passwordHash,
      createdBy: "system",
      status: "active",
      mustChangePassword: generatedDevelopmentPassword,
    });

    recordAudit({
      userId: adminUser.id,
      activityType: AUDIT_ACTIVITY.SERVER_BOOTSTRAP_ADMIN,
      metadata: {
        email: adminUser.email,
        generatedDevelopmentPassword,
      },
    });

    if (generatedDevelopmentPassword) {
      console.info(`[auth-server] Development Admin seeded: ${adminEmail}`);
      console.info(`[auth-server] Development Admin temporary password: ${adminPassword}`);
    } else {
      console.info(`[auth-server] Seed Admin ready: ${adminEmail}`);
    }
  }

  // --- SEED INVESTOR ---
  // Executes only when the SEED_OPERATIONS environment variables are set, the user has an email string typed out, and the email can't be found in the database array
  if (SEED_INVESTOR && SEED_INVESTOR.email && !getUserByEmail(SEED_INVESTOR.email)) {
    const passwordHash = await bcrypt.hash(SEED_INVESTOR.password || "Investor!123456", BCRYPT_SALT_ROUNDS);
    const investorUser = createUser({
      name: SEED_INVESTOR.name || "John Tan",
      email: SEED_INVESTOR.email,
      role: ROLES.INVESTOR,
      passwordHash,
      createdBy: "system",
      status: "active",
      mustChangePassword: false,
    });

    // Write audit footprint for investor onboarding compliance
    recordAudit({
      userId: investorUser.id,
      activityType: AUDIT_ACTIVITY.SERVER_BOOTSTRAP_ADMIN, 
      metadata: {
        email: investorUser.email,
        role: investorUser.role,
        seededVia: "environment_file"
      },
    });

    console.info(`[auth-server] Seeded Investor Role: ${SEED_INVESTOR.email}`);
  }

  // --- SEED OPERATIONS ---
  if (SEED_OPERATIONS && SEED_OPERATIONS.email && !getUserByEmail(SEED_OPERATIONS.email)) {
    const passwordHash = await bcrypt.hash(SEED_OPERATIONS.password || "Operations!123456", BCRYPT_SALT_ROUNDS);
    const opsUser = createUser({
      name: SEED_OPERATIONS.name || "Sarah Lee",
      email: SEED_OPERATIONS.email,
      role: ROLES.OPERATIONS,
      passwordHash,
      createdBy: "system",
      status: "active",
      mustChangePassword: false,
    });

    // Write audit footprint for operations onboarding compliance
    recordAudit({
      userId: opsUser.id,
      activityType: AUDIT_ACTIVITY.SERVER_BOOTSTRAP_ADMIN,
      metadata: {
        email: opsUser.email,
        role: opsUser.role,
        seededVia: "environment_file"
      },
    });

    console.info(`[auth-server] Seeded Operations Role: ${SEED_OPERATIONS.email}`);
  }

  // --- SEED FUND PORTFOLIO MANAGER ---
  if (SEED_FUND_PORTFOLIO && SEED_FUND_PORTFOLIO.email && !getUserByEmail(SEED_FUND_PORTFOLIO.email)) {
    const passwordHash = await bcrypt.hash(SEED_FUND_PORTFOLIO.password || "FundPortfolio!123456", BCRYPT_SALT_ROUNDS);
    const portfolioUser = createUser({
      name: SEED_FUND_PORTFOLIO.name || "David Lim",
      email: SEED_FUND_PORTFOLIO.email,
      role: ROLES.FUND_PORTFOLIO_MANAGER,
      passwordHash,
      createdBy: "system",
      status: "active",
      mustChangePassword: false,
    });

    // Write audit footprint for portfolio manager onboarding compliance
    recordAudit({
      userId: portfolioUser.id,
      activityType: AUDIT_ACTIVITY.SERVER_BOOTSTRAP_ADMIN,
      metadata: {
        email: portfolioUser.email,
        role: portfolioUser.role,
        seededVia: "environment_file"
      },
    });

    console.info(`[auth-server] Seeded Fund Portfolio Manager: ${SEED_FUND_PORTFOLIO.email}`);
  }
}

async function startServer() {
  await seedInitialUsers();

  app.listen(PORT, () => {
    console.info(`[auth-server] Listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  app,
  seedInitialUsers,
};
