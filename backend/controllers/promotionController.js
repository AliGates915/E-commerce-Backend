import Promotion from '../models/Promotion.js';

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
