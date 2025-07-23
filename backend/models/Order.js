import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  products: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, required: true },
  transactionId: { type: String, required: true },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
