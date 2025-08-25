import { Safepay } from "@sfpy/node-core";
import dotenv from "dotenv";

dotenv.config();

const safepay = new Safepay("66d4c1404a5bf63955c32483deb10644b004b1b02a9b87ec44eb5ed8326f2fcb", {
    authType: "secret", // either 'jwt' or 'secret' depending on what you provide
    host: "https://sandbox.api.getsafepay.com", // can be configured to our sandbox host for test transactions
    
  });


export default safepay;


// const safepay = new Safepay({
//   environment: "sandbox",
//   apiKey: "sec_07f70953-7684-41a1-b930-9d1497436084",   // secret key from dashboard
//   v1Secret: "1df9a6ab343facff1746c5aaa53bc50036de3eb30f2e9ce9c8589d2f54fe55c8", 
//   webhookSecret: "2e569f82877c3507cbaa35dd516757d8e7276168fe81fb390acd83c065c9bada"
// });