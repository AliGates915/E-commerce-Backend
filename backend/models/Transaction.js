import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: String, // Changed from ObjectId to String
    required: true,
  },
  products: [
    {
      name: { type: String, required: true }
    }
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  transactionId: {
    type: String,
    unique: true,
    required: true,
  }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
