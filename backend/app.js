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

// Safepay webhook
app.post(
  "/api/safepay-webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body; // raw buffer
    next();
  },
  safepayWebhook
);

// Stripe webhook
app.post(
  "/api/safepay-webhook",
  express.raw({ type: "*/*" }),  // temp: accept all content-types
  (req, res, next) => {
    console.log("📩 Headers:", req.headers);
    console.log("📩 Raw Buffer:", req.body);
    req.rawBody = req.body;
    next();
  },
  safepayWebhook
);


// ✅ After webhooks, apply JSON parser for all other APIs
app.use(express.json());





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
