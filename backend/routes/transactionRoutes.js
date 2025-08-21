import express from 'express';
import { 
  createTransaction, 
  getTransactions, 
  createCheckoutSession, 
  stripeWebhook,
  getUserTransactionHistory,
  safepayCheckoutSession,
  safepayWebhook
} from '../controllers/transactionController.js';

const router = express.Router();

router.post('/create', createTransaction);
router.get('/', getTransactions);

// Get transaction history
router.get('/transaction-history/:userId', getUserTransactionHistory);

// Stripe routes
router.post('/create-checkout-session', createCheckoutSession);
// router.post('/webhook', stripeWebhook);

// ✅ Safepay routes
router.post('/safepay-checkout-session', safepayCheckoutSession);
// router.post('/safepay-webhook', safepayWebhook);

export default router;
