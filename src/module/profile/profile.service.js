import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import { signToken } from "../../utils/jwt.js";
/* ────────────────────────────────────────────────────────────────
   GET CURRENT USER
   Returns the authenticated user's own profile.
──────────────────────────────────────────────────────────────── */
export const getMeService = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
};
