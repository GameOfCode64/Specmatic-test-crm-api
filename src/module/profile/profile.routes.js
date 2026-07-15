import express from "express";

import { getMe } from "./profile.controller.js";

import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js";

const router = express.Router();

router.get("/me", authMiddleware, getMe);

export default router;
