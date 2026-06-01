const crypto = require("crypto");
const { ROLE_SET } = require("./config");

const usersById = new Map();
const userIdsByEmail = new Map();

const PASSWORD_GROUPS = [
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "abcdefghijkmnopqrstuvwxyz",
  "23456789",
  "!@#$%^&*()-_=+[]{}",
];

class ValidationError extends Error {
  constructor(message, errors = {}) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.errors = errors;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUserInput({ name, email, role }) {
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = normalizeEmail(email);
  const cleanRole = typeof role === "string" ? role.trim() : "";
  const errors = {};

  if (cleanName.length < 2 || cleanName.length > 120) {
    errors.name = "Name must be between 2 and 120 characters.";
  }

  if (!isValidEmail(cleanEmail)) {
    errors.email = "A valid email address is required.";
  }

  if (!ROLE_SET.has(cleanRole)) {
    errors.role = "Role must be one of: Admin, Investor, Operations, Portfolio Manager.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed.", errors);
  }

  return {
    name: cleanName,
    email: cleanEmail,
    role: cleanRole,
  };
}

function createUser({ name, email, role, passwordHash, createdBy = "system", status = "invited", mustChangePassword = true }) {
  const validated = validateUserInput({ name, email, role });

  if (!passwordHash || typeof passwordHash !== "string") {
    throw new ValidationError("Validation failed.", {
      passwordHash: "A bcrypt password hash is required.",
    });
  }

  // Checks if the same email exists in the system
  if (userIdsByEmail.has(validated.email)) {
    throw new ConflictError("A user with this email already exists.");
  }

  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    ...validated,
    passwordHash,
    createdBy,
    createdAt: now,
    updatedAt: now,
    status,
    mustChangePassword,
  };

  usersById.set(user.id, user);
  userIdsByEmail.set(user.email, user.id);

  return user;
}

function updateUser(id, { name, email, role, passwordHash, status, mustChangePassword }, updatedBy) {
  const user = usersById.get(id);

  if (!user) {
    throw new ValidationError("User not found.");
  }

  const validated = validateUserInput({
    name: name !== undefined ? name : user.name,
    email: email !== undefined ? email : user.email,
    role: role !== undefined ? role : user.role,
  });

  if (passwordHash !== undefined && typeof passwordHash !== "string") {
    throw new ValidationError("Validation failed.", {
      passwordHash: "A bcrypt password hash is required.",
    });
  }

  if (validated.email !== user.email && userIdsByEmail.has(validated.email)) {
    throw new ConflictError("A user with this email already exists.");
  }

  if (validated.email !== user.email) {
    userIdsByEmail.delete(user.email);
    userIdsByEmail.set(validated.email, user.id);
  }

  const now = new Date().toISOString();
  const updatedUser = {
    ...user,
    ...validated,
    passwordHash: passwordHash !== undefined ? passwordHash : user.passwordHash,
    status: status !== undefined ? status : user.status,
    mustChangePassword: mustChangePassword !== undefined ? mustChangePassword : user.mustChangePassword,
    createdAt: user.createdAt, // Force-lock creation timestamp
    updatedAt: now,            // Re-stamp updated timestamp
  };

  usersById.set(user.id, updatedUser);

  // Return the updated user object so the controller can read its old vs new states
  return { updatedUser, oldUser: user }; 
}

function getUserByEmail(email) {
  const userId = userIdsByEmail.get(normalizeEmail(email));
  return userId ? usersById.get(userId) : null;
}

function getUserById(id) {
  return usersById.get(id) || null;
}

function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function listUsers() {
  return Array.from(usersById.values()).map(serializeUser);
}

function randomChar(chars) {
  return chars[crypto.randomInt(0, chars.length)];
}

function shuffle(chars) {
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars;
}

function generateTemporaryPassword(length = 20) {
  if (!Number.isInteger(length) || length < 12) {
    throw new Error("Temporary passwords must be at least 12 characters.");
  }

  const allChars = PASSWORD_GROUPS.join("");
  const chars = PASSWORD_GROUPS.map(randomChar);

  while (chars.length < length) {
    chars.push(randomChar(allChars));
  }

  return shuffle(chars).join("");
}

module.exports = {
  ValidationError,
  ConflictError,
  createUser,
  updateUser,
  generateTemporaryPassword,
  getUserByEmail,
  getUserById,
  listUsers,
  normalizeEmail,
  serializeUser,
  validateUserInput,
};
