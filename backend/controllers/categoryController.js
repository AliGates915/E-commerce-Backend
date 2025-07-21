import Category from '../models/Category.js';

// CREATE Category
export const createCategory = async (req, res) => {
  try {
    const { name, isEnable } = req.body;
    const category = new Category({
      name,
      isEnable: typeof isEnable === 'boolean' ? isEnable : true,
    });
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ All Categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ Single Category by ID
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE Category
export const updateCategory = async (req, res) => {
  try {
    const { name, isEnable } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (isEnable !== undefined) updateFields.isEnable = isEnable;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE Category
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
