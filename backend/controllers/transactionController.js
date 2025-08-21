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

// const safepay = new Safepay("sec_07f70953-7684-41a1-b930-9d1497436084", {
//   authType: "secret",
//   host: process.env.NODE_ENV === "production"
//     ? "https://api.getsafepay.com"
//     : "https://sandbox.api.getsafepay.com",
// });

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
      return res
        .status(400)
        .json({
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
    const { items, success_url, cancel_url } = req.body;

    if (!items?.length) {
      return res
        .status(400)
        .json({ success: false, message: "No items provided" });
    }

    // calculate total in paisa (PKR × 100)
    const totalAmount =
      items.reduce((sum, p) => sum + p.price * p.quantity, 0);

    // create payment token
    const { token } = await safepay.payments.create({
      currency: "PKR",
      amount: totalAmount,
    });

    // create checkout url
    const checkoutUrl = safepay.checkout.create({
      token,
      orderId: `order_${Date.now()}`, // unique orderId
      cancelUrl: cancel_url,
      redirectUrl: success_url,
      source: "custom",
      webhooks: true,
    });

    console.log("Checkout ", checkoutUrl);

    return res.status(200).json({ success: true, url: checkoutUrl });
  } catch (err) {
    console.error("Safepay error:", err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Safepay webhook trigger
export const safepayWebhook = async (req, res) => {
  try {
    const signature = req.headers["sfp-signature"];
    const payload = req.body.toString("utf8"); // raw body

    // ✅ Verify Safepay webhook signature
    const expected = crypto
      .createHmac("sha256", '2e569f82877c3507cbaa35dd516757d8e7276168fe81fb390acd83c065c9bada')
      .update(payload)
      .digest("hex");

    if (signature !== expected) {
      console.error("Invalid Safepay webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;
    console.log("Event", event);
    
    if (event.type === "payment.paid") {
      const { order_id, amount, metadata } = event.data;
      const userId = metadata?.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: "Missing userId in metadata" });
      }

      // ✅ Fetch cart + product details
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      if (!cart || !cart.items.length) {
        return res
          .status(400)
          .json({ success: false, message: "Cart empty or not found" });
      }

      console.log("Cart ", cart);
      

      // ✅ Now use `productId` instead of `product`
      const productsWithDetails = cart.items.map((item) => ({
        name: item.productId.name,
        quantity: item.quantity,
        price: item.productId.price,
      }));

      const totalAmount = amount / 100;
      const transactionId = order_id;
      const paymentStatus = "completed";

      // ✅ Save transaction
      await new Transaction({
        userId,
        products: productsWithDetails,
        totalAmount,
        paymentStatus,
        transactionId,
      }).save();

      // ✅ Clear cart
      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

      // ✅ Reduce stock
      for (const prod of productsWithDetails) {
        await Product.findOneAndUpdate(
          { name: prod.name },
          { $inc: { stock: -prod.quantity } }
        );
      }

      // ✅ Save order
      await new Order({
        userId,
        products: productsWithDetails,
        totalAmount,
        paymentStatus,
        transactionId,
      }).save();

//       // ✅ Send confirmation email
//       const user = await User.findById(userId);
//       if (user?.email) {
//         const transporter = nodemailer.createTransport({
//           service: "gmail",
//           auth: {
//             user: "hacktech877@gmail.com",
//             pass: "ggsg dipv skrz xjct", // ⚠️ better: use env var
//           },
//         });

//         const userName = user?.name || user?.username || "Valued Customer";
//         const userEmail = user.email;

//         const htmlContent = `
// <!DOCTYPE html>
// <html>
// <head><meta charset="UTF-8"><title>Order Confirmation</title></head>
// <body>
//   <div style="max-width:600px;margin:auto;padding:20px;font-family:sans-serif;">
//     <h2 style="background:#667eea;color:#fff;padding:15px;text-align:center;">🎉 Order Confirmation</h2>
//     <p>Hello <strong>${userName}</strong>,</p>
//     <p>Thank you for your purchase! Here are your order details:</p>

//     <table width="100%" border="1" cellspacing="0" cellpadding="10" style="border-collapse: collapse;">
//       <thead style="background: #eee;">
//         <tr>
//           <th align="left">Product</th>
//           <th align="center">Qty</th>
//           <th align="right">Price</th>
//           <th align="right">Subtotal</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${productsWithDetails
//           .map(
//             (p) => `
//           <tr>
//             <td>${p.name}</td>
//             <td align="center">${p.quantity}</td>
//             <td align="right">PKR ${p.price.toFixed(2)}</td>
//             <td align="right">PKR ${(p.price * p.quantity).toFixed(2)}</td>
//           </tr>
//         `
//           )
//           .join("")}
//       </tbody>
//       <tfoot>
//         <tr>
//           <td colspan="3" align="right"><strong>Total:</strong></td>
//           <td align="right"><strong>PKR ${totalAmount.toFixed(2)}</strong></td>
//         </tr>
//       </tfoot>
//     </table>

//     <p>If you have any questions, feel free to contact us.</p>
//     <p>— Wahid Foods SMC Team</p>
//   </div>
// </body>
// </html>`;

//         await transporter.sendMail({
//           from: "hacktech877@gmail.com",
//           to: userEmail,
//           subject: "Order Confirmation - Wahid Foods",
//           html: htmlContent,
//         });
//       }

      return res.status(200).json({ received: true });
    }

    if (event.type === "payment.failed") {
      console.warn("Payment failed:", event.data);
      return res.status(200).json({ received: true });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Safepay webhook error:", err);
    return res.status(500).json({ success: false, message: err.message });
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
