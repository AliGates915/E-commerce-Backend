import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import cartRoutes from "./routes/cartRoutes.js";
import productRoute from './routes/productRoute.js';
import categoryRoutes from './routes/categoryRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { safepayWebhook } from "./controllers/transactionController.js";
import crypto from "crypto";


dotenv.config();

const app = express();

// CORS setup
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'https://e-commerce-frontend-sandy-delta.vercel.app',
    'https://www.wahidfoodssmc.com',
    'https://wahidfoodssmc.com',
    'https://wahidfoods.com',
    'http://localhost:8081',
    'https://infinity-byte-frontend.vercel.app',
    'http://localhost:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Stripe webhook needs raw body
app.use('/api/transactions/webhook', express.raw({ type: 'application/json' }));


// All other routes use JSON
app.use(express.json());


// ✅ Apply express.json() to all routes except webhook
// Middleware to capture raw body
app.use((req, res, next) => {
  let data = [];
  req.on("data", chunk => data.push(chunk));
  req.on("end", () => {
    req.rawBody = Buffer.concat(data);
    next();
  });
});

app.use(express.json()); // still parse JSON normally

app.post("/safepay-webhook", (req, res) => {
  try {
    console.log("✅ Parsed JSON:", req.body);
    console.log("📩 Raw body (string):", req.rawBody.toString());

    const signature = req.headers["x-sfpy-signature"];
    const secret =
      "2e569f82877c3507cbaa35dd516757d8e7276168fe81fb390acd83c065c9bada";

    const expectedSig = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody)
      .digest("hex");

    if (signature !== expectedSig) {
      console.error("❌ Invalid signature");
      return res.status(400).send("Invalid signature");
    }

    console.log("💰 Payment event verified:", req.body);
    res.status(200).send("Webhook received ✅");
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});







// Connect DB
connectDB();

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use('/api/products', productRoute);
app.use('/api/categories', categoryRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/orders', orderRoutes);

app.get("/", (req, res) => {
  res.send("API is working!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
