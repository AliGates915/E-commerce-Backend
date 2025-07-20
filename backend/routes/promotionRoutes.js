import express from 'express';
import {
  createPromotion,
  getPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion
} from '../controllers/promotionController.js';

const router = express.Router();

router.post('/', createPromotion);           // Create
router.get('/', getPromotions);              // Read all
router.get('/:id', getPromotionById);        // Read one
router.put('/:id', updatePromotion);         // Update
router.delete('/:id', deletePromotion);      // Delete

export default router;
