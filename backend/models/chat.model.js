import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  userId: String,
  message: String,
  reply: String
},{
  timestamps:true
});

export default mongoose.model("Chat", chatSchema);