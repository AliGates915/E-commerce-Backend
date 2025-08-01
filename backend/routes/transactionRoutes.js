import express from 'express';
import { 
  createTransaction, 
  getTransactions, 
  createCheckoutSession, 
  stripeWebhook,
  getUserTransactionHistory 
} from '../controllers/transactionController.js';

const router = express.Router();

router.post('/create', createTransaction);
router.get('/', getTransactions);

// Get transaction history for a specific user
router.get('/transaction-history/:userId', getUserTransactionHistory);

// Stripe checkout session
router.post('/create-checkout-session', createCheckoutSession);

// Stripe webhook (raw body required in app.js)
router.post('/webhook', stripeWebhook);

export default router;
