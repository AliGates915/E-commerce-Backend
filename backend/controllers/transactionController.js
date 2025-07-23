import Transaction from '../models/Transaction.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
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
      userId: mongoose.Types.ObjectId(userId),
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
    let cartProducts = products || items;
    if (typeof cartProducts === 'string') {
      try {
        cartProducts = JSON.parse(cartProducts);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid products format' });
      }
    }
    console.log("cartProducts",items);
    

    if (!cartProducts) {
      return res.status(400).json({ success: false, message: 'No products/items provided' });
    }

    const productNames = cartProducts
      .map(item => item.name)
      .filter(Boolean)
      .join(',');

    // LOG userId for debugging
    console.log('userId for Stripe session:', userId);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: cartProducts.map((item) => ({
        price_data: {
          currency: 'pkr', // <-- Set to PKR
          product_data: { name: item.name },
          unit_amount: item.price * 100, // <-- Multiply by 100 for paisa
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `http://localhost:8080/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:8080/cancel`,
      metadata: {
        userId,
        productNames,
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Stripe Webhook Handler
export const stripeWebhook = async (req, res) => {
  console.log("stripeWebhook");
  
  const sig = req.headers['stripe-signature'];
  const STRIPE_WEBHOOK_SECRET = 'whsec_WozK5EOPPrVlQOJ82fTf675S6pQfa5Z8';

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const productNames = session.metadata?.productNames
      ? session.metadata.productNames.split(',').filter(Boolean)
      : [];
    const products = productNames.map(name => ({ name }));

    if (!userId || !products.length) {
      console.error('Missing userId or productNames in Stripe session metadata', session.metadata);
      return res.status(400).json({ success: false, message: 'Missing userId or productNames in metadata' });
    }

    const totalAmount = session.amount_total / 100;
    const transactionId = session.id;
    const paymentStatus = session.payment_status === 'paid' ? 'completed' : session.payment_status;

    // Log what will be saved
    console.log('Saving transaction:', {
      userId,
      products,
      totalAmount,
      paymentStatus,
      transactionId,
    });

    try {
      const transaction = new Transaction({
        userId,
        products,
        totalAmount,
        paymentStatus,
        transactionId,
      });
      await transaction.save();
      console.log('Transaction saved successfully!');
    } catch (err) {
      if (err.code === 11000) {
        console.warn('Duplicate transactionId, already saved:', transactionId);
        return res.status(200).json({ received: true, duplicate: true });
      }
      console.error('Error saving transaction:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  res.status(200).json({ received: true });
};


