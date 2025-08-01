import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"] },
  isAdmin: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ["pending", "suspend", "active"], 
    default: "pending" 
  },
  // Password reset fields
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
