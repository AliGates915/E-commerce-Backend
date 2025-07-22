import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import serverless from "serverless-http";
import { connectDB } from "../config/db.js";
import authRoutes from "../routes/auth.js";
import productRoute from '../routes/productRoute.js';
import categoryRoutes from '../routes/categoryRoutes.js';
import promotionRoutes from '../routes/promotionRoutes.js';
import transactionRoutes from '../routes/transactionRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Set CORS to allow every origin
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Connect to MongoDB
connectDB();

// Define routes
app.use("/api/auth", authRoutes);
app.use('/api/products', productRoute);
app.use('/api/categories', categoryRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/transactions', transactionRoutes);

// Export for serverless deployment
export const handler = serverless(app);
