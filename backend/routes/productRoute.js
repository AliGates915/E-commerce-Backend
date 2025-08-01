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

// CRUD routes
router.get('/', getAllProducts);
router.post('/add', upload.array('images'), addProduct);
router.get('/enabled', getProductsWithEnabledCategories);

router.get('/:categoryName', getProductsByCategoryName);
// ... other routes
router.get('/features', getFeatureProducts);
router.get('/discounts', getDiscountProducts);
router.delete('/:productId/images/:publicId', removeProductImage);
router.get('/search', searchProducts);
router.get('/:id', getProductById);
router.put('/:id', upload.array('images'), updateProduct);
router.delete('/:id', deleteProduct);

export default router;

