import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isEnable: { type: Boolean, default: true },
}, { timestamps: true });

const Promotion = mongoose.model('Promotion', promotionSchema);
export default Promotion;
