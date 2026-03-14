import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
{
  role: {
    type: String,
    enum: ["user", "assistant", "tool", "system"],
  },
  content: String,
});

const conversationSchema = new mongoose.Schema(
{
  sessionId: {
    type: String,
    required: true,
  },
  messages: [messageSchema],
},
{ timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);