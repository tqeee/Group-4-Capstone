const jwt = require("jsonwebtoken");
const {
  JWT_AUDIENCE,
  JWT_SECRET,
  ROLE_PERMISSIONS,
  TOKEN_ISSUER,
} = require("../config");
const { AUDIT_ACTIVITY, recordAudit } = require("../auditLog");
const { getUserById } = require("../userStore");

function jsonError(res, status, message, extra = {}) {
  return res.status(status).json({
    message,
    ...extra,
  });
}

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token || /\s/.test(token)) {
    return null;
  }

  return token;
}

function authenticateToken(req, res, next) {
  const token = extractBearerToken(req.get("authorization"));

  if (!token) {
    recordAudit({
      activityType: AUDIT_ACTIVITY.AUTH_HEADER_MISSING,
      outcome: "failure",
      requestId: req.requestId,
      metadata: {
        method: req.method,
        path: req.path,
      },
    });

    return jsonError(res, 401, "Authorization bearer token is required.");
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      audience: JWT_AUDIENCE,
      issuer: TOKEN_ISSUER,
    });
    const user = getUserById(payload.sub);

    if (!user || user.status === "disabled") {
      throw new Error("Token subject is not an active user.");
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    };

    return next();
  } catch (error) {
    recordAudit({
      activityType: AUDIT_ACTIVITY.AUTH_TOKEN_INVALID,
      outcome: "failure",
      requestId: req.requestId,
      metadata: {
        method: req.method,
        path: req.path,
        reason: error.name,
      },
    });

    return jsonError(res, 401, "Invalid or expired authorization token.");
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return jsonError(res, 401, "Authentication is required.");
    }

    if (!req.user.permissions.includes(permission)) {
      recordAudit({
        userId: req.user.id,
        activityType: AUDIT_ACTIVITY.RBAC_DENIED,
        outcome: "failure",
        requestId: req.requestId,
        metadata: {
          method: req.method,
          path: req.path,
          requiredPermission: permission,
          role: req.user.role,
        },
      });

      return jsonError(res, 403, "Forbidden: insufficient role permissions.");
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  extractBearerToken,
  jsonError,
  requirePermission,
};
