import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

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

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User with this email does not exist" 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token expiration (1 hour from now)
    const resetPasswordExpires = Date.now() + 3600000; // 1 hour

    // Save token to database
    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password/${resetToken}`;

    // Email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Password Reset Request</h1>
            <p style="color: #666; font-size: 16px;">Hello ${user.name || user.username},</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              You requested a password reset for your account. Click the button below to reset your password:
            </p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
              If you didn't request this password reset, please ignore this email or contact our support team.
            </p>
            <p style="color: #666; font-size: 14px; margin: 0;">
              Best regards,<br>
              <strong>Your E-commerce Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'aligatez915@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'ali.github.915'
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || 'aligatez915@gmail.com',
      to: email,
      subject: 'Password Reset Request - Your E-commerce Store',
      html: emailContent
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      success: true, 
      message: "Password reset email sent successfully. Please check your email." 
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to send password reset email", 
      error: err.message 
    });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Token and new password are required" 
      });
    }

    // Hash the token to compare with stored token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired reset token" 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Password reset successfully. You can now login with your new password." 
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to reset password", 
      error: err.message 
    });
  }
};