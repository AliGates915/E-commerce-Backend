import express from "express";

import { updateUserStatus } from "../controllers/authController.js";
import { register, login, getAllUsers, forgotPassword } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);

router.get("/users", getAllUsers);

router.patch("/users/:id/status", updateUserStatus);
export default router;
