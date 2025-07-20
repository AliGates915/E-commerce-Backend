import Transaction from '../models/Transaction.js';

export const createTransaction = async (req, res) => {
  try {
    const {
      userId,
      products,
      totalAmount,
      paymentMethod,
      transactionId,
    } = req.body;

    const transaction = new Transaction({
      userId,
      products,
      totalAmount,
      paymentMethod,
      transactionId,
    });

    await transaction.save();
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('userId', 'name email')
      .populate('products.productId', 'name price');

    res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

