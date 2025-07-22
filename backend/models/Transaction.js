import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      name: { type: String, required: true }
      // You can add more fields here if needed in the future
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
