import express from "express";

import { updateUserStatus, deleteUser } from "../controllers/authController.js";
import { register, login, getAllUsers, forgotPassword, resetPassword } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/users", getAllUsers);

router.patch("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

export default router;
