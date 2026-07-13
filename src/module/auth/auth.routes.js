import express from "express";

import { login, createUser, getMe } from "./auth.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js";

const router = express.Router();

/**
 * PUBLIC
 */
router.post("/login", login);

//

router.get("/me", authMiddleware, getMe);

/**
 * PROTECTED
 */
router.post("/create", authMiddleware, roleMiddleware("ADMIN"), createUser);

export default router;
