import Transaction from "../models/Transaction.js";
import Stripe from "stripe";
import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js"; // import your new Order model
import { User } from "../models/User.js"; // import your new User model
import nodemailer from "nodemailer"; // import nodemailer
dotenv.config();

import safepay from "../config/safepay.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export const createTransaction = async (req, res) => {
  try {
    const { userId, products, totalAmount, paymentStatus, transactionId } =
      req.body;

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
    const transactions = await Transaction.find().populate(
      "userId",
      "name email"
    );
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
    if (typeof cartProducts === "string") {
      try {
        cartProducts = JSON.parse(cartProducts);
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid products format" });
      }
    }

    if (!cartProducts) {
      return res
        .status(400)
        .json({ success: false, message: "No products/items provided" });
    }

    const productNames = cartProducts
      .map((item) => item.name)
      .filter(Boolean)
      .join(",");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: cartProducts.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.name },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      // Use custom URLs if provided, otherwise fallback to default
      success_url:
        success_url ||
        `https://www.wahidfoodssmc.com/success?session_id={CHECKOUT_SESSION_ID}`,
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

// UPDATED: Stripe Webhook Handler
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const STRIPE_WEBHOOK_SECRET = "whsec_WozK5EOPPrVlQOJ82fTf675S6pQfa5Z8";
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId in metadata" });
    }

    // ✅ Get the full line items to get accurate quantity and price
    let lineItems;
    try {
      const lineItemsRes = await stripe.checkout.sessions.listLineItems(
        session.id,
        {
          limit: 100,
        }
      );
      lineItems = lineItemsRes.data;
    } catch (err) {
      console.error("Error fetching line items:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch line items" });
    }

    // ✅ Build products array with correct quantity
    const productsWithDetails = [];

    for (const item of lineItems) {
      const productName = item.description;
      const quantity = item.quantity || 1;
      const unitAmount = item.price.unit_amount / 100;

      const product = await Product.findOne({ name: productName });
      if (product) {
        productsWithDetails.push({
          name: product.name,
          quantity,
          price: unitAmount,
        });
      }
    }

    if (!productsWithDetails.length) {
      return res.status(400).json({
        success: false,
        message: "No valid products found in line items",
      });
    }

    const totalAmount = session.amount_total / 100;
    const transactionId = session.id;
    const paymentStatus =
      session.payment_status === "paid" ? "completed" : session.payment_status;

    try {
      await new Transaction({
        userId,
        products: productsWithDetails,
        totalAmount,
        paymentStatus,
        transactionId,
      }).save();
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

      for (const prod of productsWithDetails) {
        await Product.findOneAndUpdate(
          { name: prod.name },
          { $inc: { stock: -prod.quantity } }
        );
      }

      await new Order({
        userId,
        products: productsWithDetails,
        totalAmount,
        paymentStatus,
        transactionId,
      }).save();

      const user = await User.findById(userId);
      if (!user) return res.status(200).json({ received: true });

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "hacktech877@gmail.com",
          pass: "ggsg dipv skrz xjct",
        },
      });

      const userName = user?.name || user?.username || "Valued Customer";
      const userEmail = user?.email;

      if (userEmail) {
        const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Order Confirmation</title></head>
<body>
  <div style="max-width:600px;margin:auto;padding:20px;font-family:sans-serif;">
    <h2 style="background:#667eea;color:#fff;padding:15px;text-align:center;">🎉 Order Confirmation</h2>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Thank you for your purchase! Here are your order details:</p>

    <table width="100%" border="1" cellspacing="0" cellpadding="10" style="border-collapse: collapse;">
      <thead style="background: #eee;">
        <tr>
          <th align="left">Product</th>
          <th align="center">Qty</th>
          <th align="right">Price</th>
          <th align="right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${productsWithDetails
          .map(
            (p) => `
          <tr>
            <td>${p.name}</td>
            <td align="center">${p.quantity}</td>
            <td align="right">$${p.price.toFixed(2)}</td>
            <td align="right">$${(p.price * p.quantity).toFixed(2)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" align="right"><strong>Total:</strong></td>
          <td align="right"><strong>$${totalAmount.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>

    <p>If you have any questions, feel free to contact us.</p>
    <p>— Wahid Foods SMC Team</p>
  </div>
</body>
</html>`;

        await transporter.sendMail({
          from: "hacktech877@gmail.com",
          to: userEmail,
          subject: "Order Confirmation - Wahid Foods",
          html: htmlContent,
        });
      }

      res.status(200).json({ received: true });
    } catch (err) {
      if (err.code === 11000) {
        console.warn("Duplicate transactionId:", transactionId);
        return res.status(200).json({ received: true, duplicate: true });
      }
      console.error("Transaction saving error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  } else {
    res.status(200).json({ received: true });
  }
};

//Safepay Checkout

export const safepayCheckoutSession = async (req, res) => {
  try {
    const { items, success_url, cancel_url, userId } = req.body;

    if (!items?.length) {
      return res
        .status(400)
        .json({ success: false, message: "No items provided" });
    }

    const totalAmount =
      items.reduce((sum, p) => sum + p.price * p.quantity, 0) * 100; // PKR in paisa

    const { data: tbt } = await safepay.client.passport.create();
    console.log("tbt", tbt);

    const productsWithDetails = [];

    for (const item of items) {
      const { name, quantity, unitAmount } = item;

      // Find product by name (or use _id if you store IDs instead of names)
      const product = await Product.findOne({ name });

      if (product) {
        productsWithDetails.push({
          name: product.name,
          quantity,
          price: unitAmount,
        });
      } else {
        console.warn(`Product not found for item: ${name}`);
      }
    }
    const payload = JSON.stringify({ productsWithDetails });
    // Create Safepay payment session with metadata
    const {
      data: {
        tracker: { token },
      },
    } = await safepay.payments.session.setup({
      merchant_api_key: "sec_07f70953-7684-41a1-b930-9d1497436084",
      mode: "payment",
      currency: "USD",
      amount: totalAmount,
      entry_mode: "raw",
      metadata: {
        order_id: userId,
        source: payload,
      },
    });
    // Save userId on your backend if needed
    const orderId = `order_${Date.now()}`;
    console.log("Token", token);

    // Create checkout URL
    const checkoutURL = safepay.checkout.createCheckoutUrl({
      tracker: token,
      redirect_url: success_url,
      env: "production", // or "sandbox"
      cancelUrl: cancel_url,
      source: "hosted",
      tbt,
      order_id: orderId,
    });
    console.log("Checkout URL:", checkoutURL);

    return res.status(200).json({ success: true, url: checkoutURL });
  } catch (err) {
    console.error("Safepay error:", err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Safepay webhook trigger
export const safepayWebhook = async (req, res) => {
  try {
    if (!req.rawBody) {
      console.warn("⚠️ [Safepay] req.rawBody missing");
      return res.status(400).send("Missing raw body");
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(req.rawBody);
    } catch (jsonErr) {
      console.error("❌ [Safepay] JSON parse error:", jsonErr.message);
      return res.status(400).send("Invalid JSON");
    }

    console.log("✅ [Safepay] Parsed Payload:", payload);

    // Extract data
    const data = payload?.data || {};
    const userId = data?.metadata?.order_id;

    const amount = data?.amount / 100; // convert paisa to full currency
    const currency = data?.currency;
    const transactionId = payload?.token;
    const productsSource = data?.metadata?.source;

    let products = [];
    if (productsSource) {
      try {
        const parsed = JSON.parse(productsSource);
        products = parsed.productsWithDetails || [];
      } catch (err) {
        console.error("❌ Failed to parse metadata.source", err);
      }
    }
    const paymentStatus =
      data?.state === "TRACKER_ENDED" ? "completed" : data?.state;

    if (!userId) {
      console.warn("⚠️ [Safepay] No orderId in metadata, skipping save");
      return res.status(200).json({ received: true });
    }

    // Save transaction
    try {
      await new Transaction({
        products,
        totalAmount: amount,
        currency,
        transactionId,
        paymentStatus,
      }).save();

      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

      await new Order({
        userId,
        products,
        totalAmount: amount,
        transactionId,
        paymentStatus,
      }).save();

      console.log("💾 [Safepay] Transaction saved:", transactionId);
    } catch (err) {
      if (err.code === 11000) {
        console.warn("⚠️ [Safepay] Duplicate transactionId:", transactionId);
      } else {
        console.error("❌ [Safepay] Transaction save error:", err);
        return res.status(500).json({ success: false, message: err.message });
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ [Safepay] Webhook Handler Error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// Get transaction history for a specific user with completed payment status
export const getUserTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const transactions = await Transaction.find({
      userId: userId,
      paymentStatus: "completed",
    }).sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
