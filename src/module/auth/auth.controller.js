import * as authService from "./auth.service.js";

/* ────────────────────────────────────────────────────────────────
   LOGIN
   POST /auth/login
   Body: { email?, username?, password }
──────────────────────────────────────────────────────────────── */
export const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    if (email !== undefined && typeof email !== "string") {
      throw Object.assign(new Error("Email must be a string"), { status: 400 });
    }

    if (username !== undefined && typeof username !== "string") {
      throw Object.assign(new Error("Username must be a string"), {
        status: 400,
      });
    }

    if (typeof password !== "string") {
      throw Object.assign(new Error("Password must be a string"), {
        status: 400,
      });
    }

    if (!password || (!email && !username)) {
      throw Object.assign(new Error("Email or username is required"), {
        status: 400,
      });
    }

    const result = await authService.login({ email, username, password });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/* ────────────────────────────────────────────────────────────────
   CREATE USER
   POST /auth/create
   Requires: authMiddleware (sets req.user), roleMiddleware("ADMIN")
──────────────────────────────────────────────────────────────── */
export const createUser = async (req, res, next) => {
  try {
    const creator = req.user; // { id, role } set by authMiddleware
    const newUser = await authService.createUser(creator, req.body);
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
};

/* ────────────────────────────────────────────────────────────────
   GET CURRENT USER
   GET /auth/me
   Requires: authMiddleware (sets req.user)
──────────────────────────────────────────────────────────────── */
export const getMe = async (req, res, next) => {
  try {
    const me = await authService.getMe(req.user.id);

    if (!me) throw Object.assign(new Error("User not found"), { status: 404 });

    res.status(200).json(me);
  } catch (err) {
    next(err);
  }
};
