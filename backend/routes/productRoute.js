import express from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary.js';
import {
  addProduct,
  searchProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

const router = express.Router();
const upload = multer({ storage });

// CRUD routes
router.post('/add', upload.array('images'), addProduct);
router.get('/search', searchProducts);
router.get('/:id', getProductById);
router.put('/:id', upload.array('images'), updateProduct);
router.delete('/:id', deleteProduct);

export default router;
