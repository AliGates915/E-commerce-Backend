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

// Logging middleware
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//   if (Object.keys(req.body).length) {
//     console.log('Body:', req.body);
//   }
//   if (Object.keys(req.query).length) {
//     console.log('Query:', req.query);
//   }
//   next();
// });

connectDB();

app.use("/api/auth", authRoutes);
app.use('/api/products', productRoute);
app.use('/api/categories', categoryRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/transactions', transactionRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
