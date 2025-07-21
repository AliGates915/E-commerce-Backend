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
router.patch('/:id', updateCategory);       // Update (Changed from PUT)
router.delete('/:id', deleteCategory);      // Delete

export default router;
