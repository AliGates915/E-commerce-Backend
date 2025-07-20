import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import productRoute from './routes/productRoute.js'
import categoryRoutes from './routes/categoryRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/products', productRoute);
app.use('/api/categories', categoryRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
