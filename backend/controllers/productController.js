import Product from '../models/Product.js';
import { cloudinary } from '../config/cloudinary.js';
import Promotion from '../models/Promotion.js'; // Make sure this is imported
import Category from '../models/Category.js';


// GET All Products (with optional limit and sort)
export const getAllProducts = async (req, res) => {
  try {
    let query = Product.find({})
      .populate('category', 'name')
      .populate('promotion', 'name');

    // Handle sorting
    if (req.query.sort) {
      // Default sort by createdAt
      const sortField = req.query.sortField || 'createdAt';
      const sortOrder = req.query.sort === 'desc' ? -1 : 1;
      query = query.sort({ [sortField]: sortOrder });
    }

    // Handle limit
    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit)) {
        query = query.limit(limit);
      }
    }

    const products = await query.exec();
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET all products with enabled categories
export const getProductsWithEnabledCategories = async (req, res) => {
  try {
    // Find enabled categories
    const enabledCategories = await Category.find({ isEnable: true });
    const enabledCategoryIds = enabledCategories.map(cat => cat._id);

    // Find products whose category is enabled
    const products = await Product.find({ category: { $in: enabledCategoryIds } })
      .populate('category');

    res.status(200).json({
      success: true,
      data: {
        products,
        categories: enabledCategories,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Add Product
export const addProduct = async (req, res) => {
  try {
    const images = req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
    }));

    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      color: req.body.color?.split(','),
      size: req.body.size?.split(','),
      category: req.body.category ? req.body.category.split(',') : [],
      promotion: req.body.promotion ? req.body.promotion.split(',') : [],
      stock: req.body.stock,
      discountPercentage: req.body.discountPercentage || 0,
      images,
    });

    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get All or Search Products
export const searchProducts = async (req, res) => {
  try {
    const { promotion, name, category } = req.query;
    const query = {};

    if (promotion) {
      const promotions = promotion.split(',');
      query.promotion = { $in: promotions };
    }

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    if (category) {
      const categories = category.split(',');
      query.category = { $in: categories };
    }

    const products = await Product.find(query);
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get Single Product
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update Product
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const images = req.files?.map(file => ({
      url: file.path,
      public_id: file.filename,
    })) || [];

    // Optional: delete old Cloudinary images
    if (images.length > 0 && product.images.length > 0) {
      for (const img of product.images) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }

    // Merge updates
    const updatedFields = {
      name: req.body.name ?? product.name,
      description: req.body.description ?? product.description,
      price: req.body.price ?? product.price,
      color: req.body.color?.split(',') ?? product.color,
      size: req.body.size?.split(',') ?? product.size,
      category: req.body.category ? req.body.category.split(',') : product.category,
      promotion: req.body.promotion ? req.body.promotion.split(',') : product.promotion,
      stock: req.body.stock ?? product.stock,
      discountPercentage: req.body.discountPercentage ?? product.discountPercentage,
      images: images.length > 0 ? images : product.images,
    };

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
    res.status(200).json({ success: true, data: updatedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Delete Product (Corrected)
export const deleteProduct = async (req, res) => {
  try {
    // Find the product first to get image public_ids for deletion
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        // Ensure you have a public_id to destroy
        if (img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
        }
      }
    }

    // Now, delete the product from the database
    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Remove a Single Product Image
export const removeProductImage = async (req, res) => {
  try {
    const { productId, publicId } = req.params;

    // 1. Remove image from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // 2. Pull the image from the product's images array in MongoDB
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $pull: { images: { public_id: publicId } } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, message: 'Image deleted successfully', data: updatedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET all products with a promotion named "features" (case-insensitive)
export const getFeatureProducts = async (req, res) => {
  try {
    // Find the promotion(s) with name "features" (case-insensitive)
    const featurePromos = await Promotion.find({
      name: { $regex: /^features$/i }
    });

    if (!featurePromos.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Get all products that have any of these promotion IDs
    const featurePromoIds = featurePromos.map(p => p._id);

    const products = await Product.find({ promotion: { $in: featurePromoIds } })
      .populate('category', 'name')
      .populate('promotion', 'name');

    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET all products with a promotion named "discount" (case-insensitive)
export const getDiscountProducts = async (req, res) => {
  try {
    // Find the promotion(s) with name "discount" (case-insensitive)
    const discountPromos = await Promotion.find({
      name: { $regex: /^discount$/i }
    });

    if (!discountPromos.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Get all products that have any of these promotion IDs
    const discountPromoIds = discountPromos.map(p => p._id);

    const products = await Product.find({ promotion: { $in: discountPromoIds } })
      .populate('category', 'name')
      .populate('promotion', 'name');

    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
