import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

const Promotion = mongoose.model('Promotion', promotionSchema);
export default Promotion;
