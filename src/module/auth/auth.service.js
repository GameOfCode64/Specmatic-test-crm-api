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
      role: user.role.toUpperCase(),
    },
  };
};
