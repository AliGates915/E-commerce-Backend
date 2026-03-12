import OpenAI from "openai";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `
You are the official AI assistant for Infinity Bytes, an e-commerce store based in Lahore, Pakistan.

Greeting Behavior:
If the user greets you, respond politely and ask how you can help with our products or services.

If user says:
- "How are you?"
- "How is your day?"
- "What's up?"
- "kia hal h"
- "kia haal hai"

Respond:
"I'm doing well, thank you! 😊 respond politely and ask how you can help with our products or services."

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

Currency Understanding Rules:
- All product prices are stored in USD ($).
- Some users may mention PKR when asking for prices.
- If a user mentions PKR, politely explain that prices are listed in USD.
- Do NOT search products using PKR values.
- Instead guide the user using USD pricing.

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

const USD_TO_PKR = 280;

const convertPriceToUSD = (message, price) => {
  const text = message.toLowerCase();

  if (text.includes("pkr") || text.includes("rupees") || text.includes("rs")) {
    return price / USD_TO_PKR;
  }

  return price;
};

const tools = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "Search products by keyword and price",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "product keyword like salt lamp",
          },
          maxPrice: {
            type: "number",
            description: "maximum price filter",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getDiscountProducts",
      description: "Get discounted products",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getCategories",
      description: "List store categories",
      parameters: { type: "object", properties: {} },
    },
  },
];
export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    for (let i = 0; i < 5; i++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        tools,
      });

      const msg = response.choices[0].message;

      // If AI answers normally
      if (!msg.tool_calls) {
        return res.json({ reply: msg.content });
      }

      messages.push(msg);

      for (const toolCall of msg.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || "{}");

        let result = null;

        switch (toolCall.function.name) {
          case "searchProducts": {
            let maxPrice = args.maxPrice;

            if (maxPrice) {
              maxPrice = convertPriceToUSD(message, maxPrice);
            }

            const filter = {
              name: new RegExp(args.query || "", "i"),
            };

            if (maxPrice) {
              filter.price = { $lte: maxPrice };
            }

            result = await Product.find(filter)
              .select("name price discountPercentage")
              .limit(5);

            // If nothing found → suggest cheapest products
            if (result.length === 0) {
              const cheapestProducts = await Product.find({
                name: new RegExp(args.query || "", "i"),
              })
                .sort({ price: 1 })
                .select("name price discountPercentage")
                .limit(3);

              const cheapestProduct = cheapestProducts[0];

              result = {
                noProductsInBudget: true,
                userBudgetUSD: maxPrice,
                cheapestProducts,
              };
            }

            break;
          }

          case "getDiscountProducts": {
            let maxPrice = args.maxPrice;

            const filter = {
              discountPercentage: { $gt: 0 },
            };

            if (maxPrice) {
              maxPrice = convertPriceToUSD(message, maxPrice);
              filter.price = { $lte: maxPrice };
            }

            result = await Product.find(filter)
              .select("name price discountPercentage")
              .limit(5);

            break;
          }

          case "getCategories":
            result = await Category.find().select("name");
            break;

          default:
            result = { error: "Unknown tool" };
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    res.json({
      reply: "Sorry, I couldn't complete your request. Please try again.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "AI agent error" });
  }
};
