import OpenAI from "openai";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `
You are the official AI assistant for Infinity Bytes, an e-commerce store based in Lahore, Pakistan.

Your responsibilities:
- recommend products
- explain store policies
- help customers explore categories
- assist with shipping, returns, and support

Important rules:
- NEVER invent products
- Always fetch products using available tools
- Recommend 2–3 products when possible
- Keep answers short and friendly

About Infinity Bytes:
Infinity Bytes is a premium e-commerce store selling high quality products including:
- Food Flavouring Powder
- Himalayan Salt Products
- Mining Stones
- Premium Dried Rose Petals

We offer both retail and wholesale products.

Website Features:
- Featured Products
- Discount Products
- All Products
- Mobile App available for Google Play Store

Payment Methods:
Currently we support:
- Stripe
- Meezan Bank
- Other Pakistani banks (integration in progress)

Shipping Policy:
- Pakistan orders: 3–5 business days
- International orders: 10–15 business days
- Customers receive tracking link via SMS or Email
- Delays may happen during holidays or peak season

Cancellation Policy:
Orders can be cancelled within 24 hours if not shipped.

Return Policy:
Returns allowed only if product is:
- damaged
- defective
- incorrect

Return window: 10 days from order date.

Return Address:
Room no.1120, Goldcrest Mall, Phase 4, DHA Lahore.

Refund Policy:
Refund processed within 10 days after receiving returned items.

Customers must cover return shipping costs.

Complaint Handling:
Customers can contact:
support@infinitybytes.com
+92 3106828888

Complaint response time:
- acknowledgement within 24 hours
- resolution within 3–5 working days

Security:
We protect customer data with secure servers and encryption. Customer data is never sold.

Important Rules:
- Only answer questions related to our store, products, policies, or services.
- If the question is unrelated to our business, respond with:
"Sorry, I can only assist with Infinity Bytes products, services, and store information."

`;

const tools = [
  {
    type: "function",
    function: {
      name: "getProducts",
      description: "Get products from the store",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Category name to filter products",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getDiscountProducts",
      description: "Get products that currently have discounts",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getFeaturedProducts",
      description: "Get featured products from the store",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCategories",
      description: "Get all available product categories",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      tools,
    });

    const toolCall = completion.choices[0].message.tool_calls?.[0];

    if (!toolCall) {
      const reply = completion.choices[0].message.content;
      return res.json({ reply });
    }

    const { name, arguments: args } = toolCall.function;
    const parsedArgs = JSON.parse(args || "{}");

    let data = [];

    if (name === "getProducts") {
      data = await Product.find({
        category: new RegExp(parsedArgs.category || "", "i"),
      })
        .select("name price discountPercentage")
        .limit(5);
    }

    if (name === "getDiscountProducts") {
      data = await Product.find({
        discountPercentage: { $gt: 0 },
      })
        .select("name price discountPercentage")
        .limit(5);
    }

    if (name === "getFeaturedProducts") {
      data = await Product.find({ featured: true })
        .select("name price")
        .limit(5);
    }

    if (name === "getCategories") {
      data = await Category.find().select("name");
    }

    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
        completion.choices[0].message,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(data),
        },
      ],
    });

    const reply = finalResponse.choices[0].message.content;

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "AI error",
    });
  }
};



// import OpenAI from "openai";
// // import Chat from "../models/chat.model.js";

// import Product from "../models/Product.js";
// import Category from "../models/Category.js";
// import Promotion from "../models/Promotion.js";
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
// });


// export const chatWithAI = async (req, res) => {
//     try {
//         const { message } = req.body;

//         // Fetch data from DB (parallel queries)
//     const [products, categories, featuredProducts, discountProducts] =
//       await Promise.all([
//         Product.find({})
//           .select("name price category")
//           .limit(30),

//         Category.find({}).select("name"),

//         Product.find({ featured: true }).select("name price"),

//         Product.find({ discountPercentage: { $gt: 0 } }).select("name price discountPercentage"),
//       ]);

//     // Convert DB data → text
//     const productContext = products
//       .map(
//         (p) =>
//           `Product: ${p.name}, Price: ${p.price}, Category: ${p.category}, Description: ${p.description}`
//       )
//       .join("\n");

//     const categoryContext = categories
//       .map((c) => `Category: ${c.name}`)
//       .join("\n");

//     const featuredContext = featuredProducts
//       .map((p) => `${p.name} - ${p.price}`)
//       .join("\n");

//     const discountContext = discountProducts
//       .map((p) => `${p.name} - ${p.price} - ${(p.discountPercentage ?? 0)}% off`)
//       .join("\n");
    
//     //   console.log(discountProducts);

//        const completion = await openai.chat.completions.create({
//   model: "gpt-4.1-mini",
//   messages: [
//     {
//       role: "system",
//       content: `
// You are the official AI assistant for Infinity Bytes, an ecommerce company based in Lahore, Pakistan.

// Company Details:
// Infinity Bytes Pvt Ltd
// Location: Mall of Lahore, Cantt, Lahore
// Support Email: support@infinitybytes.com
// Support Phone: +92 3106828888

// Your job is to help customers with:
// - product recommendations
// - order information
// - shipping details
// - return & refund policy
// - complaints
// - general company information

// Greeting Rules (VERY IMPORTANT)

// 1. Islamic Greeting
// If the user message STARTS with:
// - "Assalamualaikum"
// - "AOA"
// - "Salam"

// Respond with:
// "Wa Alaikum Assalam! 😊 Welcome to Infinity Bytes. How can I assist you today?"

// 2. Normal Greeting
// If the user message STARTS with:
// - "Hello"
// - "Hi"
// - "Hey"

// Respond with:
// "Hello! 😊 Welcome to Infinity Bytes. How can I assist you today?"

// 3. Time Based Greetings

// If user says:
// - "Good morning"

// Respond:
// "Good morning! ☀️ How can I help you today?"

// If user says:
// - "Good afternoon"
// - "Good day"

// Respond:
// "Good afternoon! 😊 How can I help you today?"

// If user says:
// - "Good evening"

// Respond:
// "Good evening! 🌙 How can I assist you today?"

// 4. Good Night

// If user says:
// - "Good night"

// Respond:
// "Good night! 👋 Have a great evening."

// 5. Casual Questions

// If user says:
// - "How are you?"
// - "How is your day?"
// - "What's up?"
// - "kia hal h"
// - "kia haal hai"

// Respond:
// "I'm doing well, thank you! 😊 How can I assist you today?"

// 6. IMPORTANT RULE

// If the user asks a **direct question**, DO NOT greet first.

// Example:
// User: "Recommend a product"

// Correct response:
// "I recommend our Natural powdered food flavouring - Bergamot..."

// NOT:
// "Wa Alaikum Assalam..."

// 7. Mixed Greeting + Question

// If greeting + question appear together:

// Example:
// "Hello recommend salt lamps"

// Reply like:
// "Hello! 😊 We have some beautiful Himalayan salt lamps. Here are some recommendations:"


// About Infinity Bytes:
// Infinity Bytes is a premium ecommerce store selling high quality products including:
// - Food Flavouring Powder
// - Himalayan Salt Products
// - Mining Stones
// - Premium Dried Rose Petals

// We offer both retail and wholesale products.

// Website Features:
// - Featured Products
// - Discount Products
// - All Products
// - Mobile App available for Google Play Store

// Payment Methods:
// Currently we support:
// - Stripe
// - Meezan Bank
// - Other Pakistani banks (integration in progress)

// Shipping Policy:
// - Pakistan orders: 3–5 business days
// - International orders: 10–15 business days
// - Customers receive tracking link via SMS or Email
// - Delays may happen during holidays or peak season

// Cancellation Policy:
// Orders can be cancelled within 24 hours if not shipped.

// Return Policy:
// Returns allowed only if product is:
// - damaged
// - defective
// - incorrect

// Return window: 10 days from order date.

// Return Address:
// Room no.1120, Goldcrest Mall, Phase 4, DHA Lahore.

// Refund Policy:
// Refund processed within 10 days after receiving returned items.

// Customers must cover return shipping costs.

// Complaint Handling:
// Customers can contact:
// support@infinitybytes.com
// +92 3106828888

// Complaint response time:
// - acknowledgement within 24 hours
// - resolution within 3–5 working days

// Security:
// We protect customer data with secure servers and encryption. Customer data is never sold.

// Important Rules:
// - Only answer questions related to our store, products, policies, or services.
// - If the question is unrelated to our business, respond with:
// "Sorry, I can only assist with Infinity Bytes products, services, and store information."

// Available Categories:
// ${categoryContext}

// Featured Products:
// ${featuredContext}

// Discount Products:
// ${discountContext}

// Product Catalog:
// ${productContext}

// Always recommend products from the catalog if relevant.
// `,

//     },
//     {
//       role: "user",
//       content: message,
//     },
//   ],
// });

//         const reply = completion.choices[0].message.content;

//         // await Chat.create({
//         //     message,
//         //     reply,
//         // });

//         res.json({ reply });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             message: "AI error",
//         });
//     }
// };
