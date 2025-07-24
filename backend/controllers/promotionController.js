import Promotion from '../models/Promotion.js';
import Product from '../models/Product.js';
// CREATE Promotion
export const createPromotion = async (req, res) => {
  try {
    const { name, isEnable } = req.body;
    const promotion = new Promotion({ 
      name, 
      isEnable: typeof isEnable === "boolean" ? isEnable : true // default true
    });
    await promotion.save();
    res.status(201).json({ success: true, data: promotion });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getEnabledPromotionsWithProducts = async (req, res) => {
  try {
    // Get all enabled promotions
    const promotions = await Promotion.find({ isEnable: true });

    // For each promotion, get products associated with it
    const promotionSections = await Promise.all(
      promotions.map(async (promotion) => {
        const products = await Product.find({ promotion: promotion._id });
        return {
          _id: promotion._id,
          name: promotion.name,
          products,
        };
      })
    );

    res.status(200).json({ success: true, data: promotionSections });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ All Promotions
export const getPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find();
    res.status(200).json({ success: true, data: promotions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ Single Promotion by ID
export const getPromotionById = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }
    res.status(200).json({ success: true, data: promotion });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE Promotion
export const updatePromotion = async (req, res) => {
  try {
    const { name, isEnable } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (isEnable !== undefined) updateFields.isEnable = isEnable;

    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }
    res.status(200).json({ success: true, data: promotion });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE Promotion
export const deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }
    res.status(200).json({ success: true, message: 'Promotion deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get products by promotion name
export const getProductsByPromotionName = async (req, res) => {
  try {
    const { promotionName } = req.params;
    // Find the promotion by name (case-insensitive)
    const promotion = await Promotion.findOne({ name: { $regex: new RegExp(`^${promotionName}$`, 'i') } });
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    // Find products with this promotion
    const products = await Product.find({ promotion: promotion._id }).populate('category');

    res.status(200).json({
      success: true,
      data: {
        promotion: promotion.name,
        products,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
