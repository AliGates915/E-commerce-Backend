import OpenAI from "openai";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Conversation from "../models/Conversation.js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

const USD_TO_PKR = 280;

/* ---------------- PRICE CONVERSION ---------------- */

const convertPriceToUSD = (message, price) => {
  const text = message.toLowerCase();
  if (text.includes("pkr") || text.includes("rupees") || text.includes("rs")) {
    return price / USD_TO_PKR;
  }
  return price;
};

/* ---------------- FORMAT PRODUCTS ---------------- */

function formatProductList(products) {
  if (!products || products.length === 0) {
    return "No products found in that range.";
  }
  return products
    .map(
      (p, i) =>
        `${i + 1}. ${p.name}\n   Price: $${p.price}${
          p.discountPercentage ? `\n   Discount: ${p.discountPercentage}%` : ""
        }`
    )
    .join("\n\n");
}

/* ---------------- SYSTEM PROMPT ---------------- */

const systemPrompt = `
You are the official AI Agent for an E-commerce store.

Rules:
- NEVER invent products
- Always use tools when searching products
- Format lists using numbers
- Keep answers short and friendly

If a user mentions a budget range like "500 to 700",
extract:

minPrice = 500
maxPrice = 700

When searching for products, use the CORE keyword only.
For example:
- "laptop stickers" → search "stickers"
- "gaming mouse" → search "mouse"
- "phone case for iphone" → search "case"
`;

/* ---------------- AI TOOLS ---------------- */

const tools = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description:
        "Search products by keyword or category and optional price range. Use the most specific single keyword from the user query.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Core product keyword (e.g. 'stickers', 'mouse', 'keyboard')",
          },
          minPrice: {
            type: "number",
            description: "Minimum product price",
          },
          maxPrice: {
            type: "number",
            description: "Maximum product price",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCategories",
      description: "Get all store categories",
      parameters: { type: "object", properties: {} },
    },
  },
];

/* ---------------- SMART PRODUCT SEARCH ---------------- */

async function smartSearchProducts(query, minPrice, maxPrice) {
  // Helper to build price filter
  const priceFilter = (base = {}) => {
    if (minPrice || maxPrice) {
      base.price = {};
      if (minPrice) base.price.$gte = minPrice;
      if (maxPrice) base.price.$lte = maxPrice;
    }
    return base;
  };

  // 1️⃣ Try exact query on product name
  if (query) {
    let products = await Product.find(
      priceFilter({ name: { $regex: query, $options: "i" } })
    )
      .select("name price discountPercentage category")
      .limit(5);

    if (products.length > 0) return products;

    // 2️⃣ Try each individual word from the query (e.g. "laptop stickers" → ["laptop","stickers"])
    const words = query.split(/\s+/).filter((w) => w.length > 2);
    for (const word of words) {
      products = await Product.find(
        priceFilter({ name: { $regex: word, $options: "i" } })
      )
        .select("name price discountPercentage category")
        .limit(5);

      if (products.length > 0) return products;
    }

    // 3️⃣ Try category match with full query
    const category = await Category.findOne({
      name: { $regex: query, $options: "i" },
    });

    if (category) {
      products = await Product.find(priceFilter({ category: category._id }))
        .select("name price discountPercentage")
        .limit(5);

      if (products.length > 0) return products;
    }

    // 4️⃣ Try category match with individual words
    for (const word of words) {
      const cat = await Category.findOne({
        name: { $regex: word, $options: "i" },
      });

      if (cat) {
        products = await Product.find(priceFilter({ category: cat._id }))
          .select("name price discountPercentage")
          .limit(5);

        if (products.length > 0) return products;
      }
    }
  } else if (minPrice || maxPrice) {
    // No query, just price filter
    const products = await Product.find(priceFilter())
      .select("name price discountPercentage category")
      .limit(5);
    return products;
  }

  return [];
}

/* ---------------- CHAT CONTROLLER ---------------- */

export const chatWithAI = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    const session = sessionId || uuidv4();

    let conversation = await Conversation.findOne({ sessionId: session });

    if (!conversation) {
      conversation = new Conversation({
        sessionId: session,
        messages: [{ role: "system", content: systemPrompt }],
      });
    }

    /* Save user message */
    conversation.messages.push({ role: "user", content: message });

    const recentMessages = conversation.messages.slice(-10);

    /* Budget extraction helper */
    function extractBudget(msg) {
      const match = msg.match(/(\d+)\s*(?:to|-)\s*(\d+)/);
      if (!match) return null;
      return { minPrice: Number(match[1]), maxPrice: Number(match[2]) };
    }

    /* Clear stored budget if user is asking about something completely new */
    const stickerIntent = message.toLowerCase().includes("sticker");
    if (stickerIntent) {
      conversation.budget = null;
    }

    /* Auto-extract budget from message and store it */
    const budgetFromMessage = extractBudget(message);
    if (budgetFromMessage) {
      conversation.budget = budgetFromMessage;
    }

    for (let i = 0; i < 5; i++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: recentMessages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      });

      const msg = response.choices[0].message;

      /* AI direct response — no tool calls */
      if (!msg.tool_calls) {
        conversation.messages.push({ role: "assistant", content: msg.content });
        await conversation.save();
        return res.json({ reply: msg.content, sessionId: session });
      }

      recentMessages.push(msg);

      for (const toolCall of msg.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        let result;

        switch (toolCall.function.name) {
          /* -------- SEARCH PRODUCTS -------- */
          case "searchProducts": {
            let { query, minPrice, maxPrice } = args;

            // Fall back to stored budget if AI didn't pass price range
            if (!minPrice && !maxPrice && conversation.budget) {
              minPrice = conversation.budget.minPrice;
              maxPrice = conversation.budget.maxPrice;
            }

            // Convert PKR → USD if needed
            if (minPrice) minPrice = convertPriceToUSD(message, minPrice);
            if (maxPrice) maxPrice = convertPriceToUSD(message, maxPrice);

            const products = await smartSearchProducts(query, minPrice, maxPrice);
            result = formatProductList(products);
            break;
          }

          /* -------- GET CATEGORIES -------- */
          case "getCategories": {
            const categories = await Category.find().select("name");
            result = categories.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
            break;
          }

          default:
            result = { error: "Unknown tool" };
        }

        recentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    res.json({
      reply: "Sorry, I couldn't complete your request.",
      sessionId: session,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "AI agent error" });
  }
};
