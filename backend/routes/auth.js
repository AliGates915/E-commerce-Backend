import express from "express";

import { updateUserStatus } from "../controllers/authController.js";
import { register, login, getAllUsers } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/users", getAllUsers);

router.patch("/users/:id/status", updateUserStatus);
export default router;
