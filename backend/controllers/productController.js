import Product from '../models/Product.js';
import { cloudinary } from '../config/cloudinary.js';

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
      images: images.length > 0 ? images : product.images,
    };

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
    res.status(200).json({ success: true, data: updatedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Delete Cloudinary images
    for (const img of product.images) {
      await cloudinary.uploader.destroy(img.public_id);
    }

    await product.remove();
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
