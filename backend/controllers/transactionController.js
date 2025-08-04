import Transaction from '../models/Transaction.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js'; // import your new Order model
import {User} from '../models/User.js'; // import your new User model
import nodemailer from 'nodemailer'; // import nodemailer
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
      .populate('userId', 'name email');
    res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create Stripe Checkout Session
export const createCheckoutSession = async (req, res) => {
  try {
    // Add success_url and cancel_url to destructure from req.body
    const { userId, products, items, success_url, cancel_url } = req.body;
    let cartProducts = products || items;
    if (typeof cartProducts === 'string') {
      try {
        cartProducts = JSON.parse(cartProducts);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid products format' });
      }
    }

    if (!cartProducts) {
      return res.status(400).json({ success: false, message: 'No products/items provided' });
    }

    const productNames = cartProducts
      .map(item => item.name)
      .filter(Boolean)
      .join(',');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: cartProducts.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      // Use custom URLs if provided, otherwise fallback to default
      success_url: success_url || `https://www.wahidfoodssmc.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `https://www.wahidfoodssmc.com/cancel`,
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
  console.log('Stripe webhook endpoint called');
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
    
    // Fetch product details from database to get prices
    const productsWithDetails = [];
    for (const productName of productNames) {
      try {
        const product = await Product.findOne({ name: productName });
        if (product) {
          productsWithDetails.push({
            name: product.name,
            quantity: 1, // TEMP: Assume quantity 1 for each product
            price: product.price
          });
        }
      } catch (err) {
        console.error('Error fetching product details:', productName, err);
      }
    }

    if (!userId || !productsWithDetails.length) {
      console.error('Missing userId or productNames in Stripe session metadata', session.metadata);
      return res.status(400).json({ success: false, message: 'Missing userId or productNames in metadata' });
    }

    const totalAmount = session.amount_total / 100;
    const transactionId = session.id;
    const paymentStatus = session.payment_status === 'paid' ? 'completed' : session.payment_status;

    try {
      const transaction = new Transaction({
        userId,
        products: productsWithDetails,
        totalAmount,
        paymentStatus,
        transactionId,
      });
      await transaction.save();
      console.log('Transaction saved successfully!');

      // 1. Clear the user's cart
      try {
        await Cart.findOneAndUpdate(
          { userId },
          { $set: { items: [] } }
        );
        console.log('Cart cleared for user:', userId);
      } catch (err) {
        console.error('Error clearing cart:', err);
      }

      // 2. Update the stock of the products
      for (const prod of productsWithDetails) {
        try {
          await Product.findOneAndUpdate(
            { name: prod.name },
            { $inc: { stock: -prod.quantity } }
          );
        } catch (err) {
          console.error('Error updating stock for product:', prod.name, err);
        }
      }
      console.log('Product stock updated.');

      // 3. Create a new order
      try {
        const order = new Order({
          userId,
          products: productsWithDetails,
          totalAmount,
          paymentStatus,
          transactionId,
        });
        await order.save();
        console.log('Order created successfully!');
      } catch (err) {
        console.error('Error creating order:', err);
      }
      
      // send email to user
      const user = await User.findById(userId);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'hacktech877@gmail.com',
          pass: 'ggsg dipv skrz xjct'
        }
      });

      // Create HTML email content
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            margin: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .order-summary {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .order-summary h3 {
            color: #2c3e50;
            margin-top: 0;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .product-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .product-item:last-child {
            border-bottom: none;
        }
        .product-name {
            font-weight: 500;
            color: #495057;
        }
        .product-details {
            text-align: right;
            color: #6c757d;
        }
        .total-section {
            background-color: #667eea;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
        }
        .transaction-id {
            background-color: #e9ecef;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .transaction-id strong {
            color: #667eea;
        }
        .footer {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
        }
        .company-name {
            font-weight: 600;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🎉 Order Confirmation</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Dear <strong>${user.name || user.username}</strong>,
            </div>
            
            <p>Thank you for your purchase! Your order has been successfully placed and is being processed.</p>
            
            <div class="order-summary">
                <h3>📦 Order Summary</h3>
                ${productsWithDetails.map(product => `
                    <div class="product-item">
                        <span class="product-name">${product.name}</span>
                        <span class="product-details">
                            Qty: ${product.quantity} | Price: $${product.price.toFixed(2)}
                        </span>
                    </div>
                `).join('')}
                
                <div class="total-section">
                    <strong>Total Amount: $${totalAmount.toFixed(2)}</strong>
                </div>
            </div>
            
            <div class="transaction-id">
                <strong>Transaction ID:</strong> ${transactionId}
            </div>
            
            <p>We will notify you once your order is ready for pickup or delivery. If you have any questions, please don't hesitate to contact us.</p>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing</p>
            <p class="company-name">Wahid Foods SMC Team</p>
            <p>🍽️ Delicious food, delivered with care</p>
        </div>
    </div>
</body>
</html>
`;

      const mailOptions = {
        from: 'hacktech877@gmail.com',
        to: user.email,
        subject: 'Order Confirmation - Wahid Foods',
        html: htmlContent,
        text: `Dear ${user.name || user.username},\n\nThank you for your purchase! Your order has been successfully placed.\n\nOrder Details:\n${productsWithDetails.map(product => `- ${product.name}: Qty ${product.quantity} | Price: $${product.price.toFixed(2)}`).join('\n')}\n\nTotal Amount: $${totalAmount.toFixed(2)}\nTransaction ID: ${transactionId}\n\nThank you for choosing Wahid Foods SMC Team!`
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Error sending email:', err);
        } else {
          console.log('Email sent:', info.response);
        }
      });
      
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

// Get transaction history for a specific user with completed payment status
export const getUserTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const transactions = await Transaction.find({
      userId: userId,
      paymentStatus: 'completed'
    }).sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({ 
      success: true, 
      data: transactions,
      count: transactions.length
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};


