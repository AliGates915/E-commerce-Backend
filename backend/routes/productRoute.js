import express from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary.js';
import {
  addProduct,
  searchProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllProducts,
  removeProductImage,
  getFeatureProducts,
  getDiscountProducts,
  getProductsWithEnabledCategories,
  getProductsByCategoryName
} from '../controllers/productController.js';

const router = express.Router();
const upload = multer({ storage });

// CRUD routes - Specific routes first
router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/features', getFeatureProducts);
router.get('/enabled', getProductsWithEnabledCategories);
router.get('/discounts', getDiscountProducts);

// Product CRUD operations
router.post('/add', upload.array('images'), addProduct);
router.get('/:id([0-9a-fA-F]{24})', getProductById);
router.put('/:id([0-9a-fA-F]{24})', upload.array('images'), updateProduct);
router.delete('/:id([0-9a-fA-F]{24})', deleteProduct);

// Image operations
router.delete('/:productId/images/:publicId', removeProductImage);

// Category-based routes - Keep this last to avoid conflicts
router.get('/:categoryName', getProductsByCategoryName);

export default router;

