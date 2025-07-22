import Transaction from '../models/Transaction.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

export const createTransaction = async (req, res) => {
  try {
    const {
      userId,
      products,
      totalAmount,
      paymentStatus,
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

// Create Stripe Checkout Session
export const createCheckoutSession = async (req, res) => {
  try {
    const { userId, products, items } = req.body;
    // products: [{ productId, name, price, quantity }]
    const cartProducts = products || items; // use whichever is present

    if (!cartProducts) {
      return res.status(400).json({ success: false, message: 'No products/items provided' });
    }

    const line_items = cartProducts.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Stripe expects cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `http://localhost:8080/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:8080/cancel`,
      metadata: {
        userId,
        products: JSON.stringify(cartProducts), // or products/items
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Stripe Webhook Handler
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const STRIPE_WEBHOOK_SECRET = 'whsec_WozK5EOPPrVlQOJ82fTf675S6pQfa5Z8';
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // ✅ Use req.body after express.raw
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    let products = [];
    if (session.metadata?.products) {
      try {
        products = JSON.parse(session.metadata.products);
      } catch (e) {
        products = [];
      }
    }
    if (!userId || !products.length) {
      console.error('Missing userId or products in Stripe session metadata');
      return res.status(400).json({ success: false, message: 'Missing userId or products in metadata' });
    }
    const totalAmount = session.amount_total / 100;
    const transactionId = session.id;
    const paymentStatus = session.payment_status;

    try {
      const transaction = new Transaction({
        userId,
        products,
        totalAmount,
        paymentStatus,
        transactionId,
      });
      await transaction.save();
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  res.status(200).json({ received: true });
};


