import express from 'express';
import {
  createPromotion,
  getPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion
} from '../controllers/promotionController.js';

const router = express.Router();

// CREATE
router.post('/', createPromotion);

// READ
router.get('/', getPromotions);
router.get('/:id', getPromotionById);

// UPDATE (This is what you need to add/verify)
router.patch('/:id', updatePromotion);

// DELETE
router.delete('/:id', deletePromotion);

export default router;
