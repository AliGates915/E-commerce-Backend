import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
    try {
        const { name, username, email, password,role } = req.body;
    
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
          role
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
