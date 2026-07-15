import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js";
import { createUser } from "./user.controller.js";

const router = express.Router();

router.post("/create", authMiddleware, createUser);

export default router;
