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
router.post("/verify-payment", async (req, res) => {
  try {
    const { token } = req.body;

    // Safepay Verify API ko secret key ke sath hit karo
    const response = await axios.get(`https://api.getsafepay.com/order/${token}`, {
      headers: {
        Authorization: `Bearer 66d4c1404a5bf63955c32483deb10644b004b1b02a9b87ec44eb5ed8326f2fcb`, // 🔑 Secret key
      },
    });

    res.json(response.data); // return full payment details
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Payment verification failed" });
  }
});


// router.post('/safepay-webhook', safepayWebhook);

export default router;
