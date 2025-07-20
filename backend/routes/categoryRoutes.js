import express from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';

const router = express.Router();

router.post('/', createCategory);           // Create
router.get('/', getCategories);             // Read all
router.get('/:id', getCategoryById);        // Read one
router.put('/:id', updateCategory);         // Update
router.delete('/:id', deleteCategory);      // Delete

export default router;
