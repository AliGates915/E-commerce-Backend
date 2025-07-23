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

dotenv.config();

const app = express();

// CORS setup
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'https://e-commerce-frontend-sandy-delta.vercel.app' // <-- REMOVE the trailing slash!
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Stripe webhook needs raw body
app.use('/api/transactions/webhook', express.raw({ type: 'application/json' }));

// All other routes use JSON
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
