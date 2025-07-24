import express from "express";
import {
  addToCart,
  getCart,
  clearCart,
  removeFromCart
} from "../controllers/cartController.js";

const router = express.Router();

router.post("/add", addToCart);
router.get("/:userId", getCart);
router.delete("/clear/:userId", clearCart);
router.post("/remove", removeFromCart);

export default router;
