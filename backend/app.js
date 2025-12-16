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
    "https://sky-link-e-commerce.vercel.app",
    "https://e-commerce-infinity-byte-10.vercel.app",
    "",
    "https://core-tech-ecommerce-beta.vercel.app",
    'https://e-commerce-infinity-byte.vercel.app',
    'http://localhost:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Global middleware for headers
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    'geolocation=(self "https://wahidfoodssmc.com" "http://localhost:8080")'
  );
  next();
});

// // All other routes use JSON
// app.use(express.json());


// Stripe webhook needs raw body
app.use('/api/transactions/webhook', express.raw({ type: 'application/json' }));




// Safepay webhook first
// app.post(
//   "/transactions/safepay-webhook",
//   express.raw({ type: "*/*" }), // accept all content-types Safepay sends
//   (req, res, next) => {
//     req.rawBody = req.body.toString("utf8");
//     next();
//   },
//   safepayWebhook
// );




// All other APIs
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
