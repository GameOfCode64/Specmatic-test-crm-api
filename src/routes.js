import express from "express";

import authRoutes from "./module/auth/auth.routes.js";

const router = express.Router();

/**
 *  Health
 */

/**
 * AUTH & CORE
 */
router.use("/auth", authRoutes);

export default router;
