import { Safepay } from "@sfpy/node-sdk";
import dotenv from "dotenv";

dotenv.config();

const safepay = new Safepay({
  environment: "sandbox",
  apiKey: "sec_07f70953-7684-41a1-b930-9d1497436084",   // secret key from dashboard
  v1Secret: "1df9a6ab343facff1746c5aaa53bc50036de3eb30f2e9ce9c8589d2f54fe55c8", 
  webhookSecret: "2e569f82877c3507cbaa35dd516757d8e7276168fe81fb390acd83c065c9bada"
});

export default safepay;
