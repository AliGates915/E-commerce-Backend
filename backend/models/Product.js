import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  color: [{ type: String }],
  size: [{ type: String }],
  category: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    }
  ],
  promotion: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion',
    }
  ],
  stock: { type: Number, required: true },
  images: [
    {
      url: String,
      public_id: String,
    },
  ],
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;





