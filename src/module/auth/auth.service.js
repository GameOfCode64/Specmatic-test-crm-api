import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import { signToken } from "../../utils/jwt.js";
import { ROLES, LOGIN_SECURITY } from "./auth.constants.js";

/* ────────────────────────────────────────────────────────────────
   LOGIN
   Accepts email OR username + password.
──────────────────────────────────────────────────────────────── */
export const login = async ({ email, username, password }) => {
  // Find user by email OR username — whichever was provide

  let user = null;

  if (email) {
    user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  } else if (username) {
    user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
  }

  // Generic error — never reveal whether email/username exists
  if (!user)
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });

  if (!user.isActive)
    throw Object.assign(new Error("Account disabled. Contact your admin."), {
      status: 403,
    });

  // Account lock check
  if (user.lockUntil && new Date() < user.lockUntil) {
    const remaining = Math.ceil((user.lockUntil - new Date()) / 60000);
    throw Object.assign(new Error(`Account locked. Try again in 10 minutes.`), {
      status: 429,
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const failedCount = user.failedLoginCount + 1;
    const data = { failedLoginCount: failedCount };

    if (failedCount >= LOGIN_SECURITY.MAX_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(
        lockUntil.getMinutes() + LOGIN_SECURITY.LOCK_TIME_MINUTES,
      );
      data.lockUntil = lockUntil;
    }

    await prisma.user.update({ where: { id: user.id }, data });
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  // Reset counters on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockUntil: null },
  });

  const token = signToken({ id: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username ?? null,
      email: user.email,
      role: user.role,
    },
  };
};

/* ────────────────────────────────────────────────────────────────
   CREATE USER
   Called by admin/manager from /auth/create endpoint.
──────────────────────────────────────────────────────────────── */
export const createUser = async (creator, payload) => {
  const { name, email, username, password, role } = payload;

  // Role enforcement
  if (creator.role === ROLES.MANAGER && role !== ROLES.EMPLOYEE)
    throw Object.assign(new Error("Manager can only create employees"), {
      status: 403,
    });

  if (creator.role === ROLES.ADMIN && !Object.values(ROLES).includes(role))
    throw Object.assign(new Error("Invalid role"), { status: 400 });

  // Email uniqueness
  const emailClash = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (emailClash)
    throw Object.assign(new Error("Email already in use"), { status: 409 });

  // Username uniqueness (if provided)
  if (username?.trim()) {
    const usernameClash = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (usernameClash)
      throw Object.assign(new Error("Username already taken"), { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: username?.trim() || null,
      password: hashed,
      role,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
};

/* ────────────────────────────────────────────────────────────────
   GET CURRENT USER
   Returns the authenticated user's own profile.
──────────────────────────────────────────────────────────────── */
export const getMe = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
};
