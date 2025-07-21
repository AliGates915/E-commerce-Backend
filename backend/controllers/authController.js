import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
    
        const userExists = await User.findOne({ email });
        if (userExists)
          return res.status(400).json({ message: "User already exists" });
    
        const hashedPassword = await bcrypt.hash(password, 10);
    
        // Always set role to "user" regardless of what is sent in the request
        const newUser = new User({
          name,
          username,
          email,
          password: hashedPassword,
          role: 'user',
          isVerified: false,
          isAdmin: false,
          status: 'pending' // or 'active' if you want to auto-activate
        });
    
        await newUser.save();
        res.status(201).json({ message: "User registered successfully 🚀" });
      } catch (err) {
        res.status(500).json({ message: "Registration error", error: err.message });
      }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found ❌" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials 🔒" });

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Login error", error: err.message });
  }
};

// Update user status
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update status", error: err.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete user", error: err.message });
  }
};

// Get all users (admin only in production)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Exclude password
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users", error: err.message });
  }
};
