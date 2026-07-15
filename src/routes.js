import express from "express";

import authRoutes from "./module/auth/auth.routes.js";
import userRoutes from "./module/user/user.routes.js";
import profileRoutes from "./module/profile/profile.routes.js";

const router = express.Router();

/**
 *  Health
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
  });
});

/**
 * AUTH & CORE
 */
router.use("/auth", authRoutes);

router.use("/user", userRoutes);

router.use("/profile", profileRoutes);

export default router;
