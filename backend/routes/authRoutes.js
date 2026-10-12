const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { usersDb } = require("../config/store");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_voucher_jwt_key_prathvi_raj_shingle_2026";
const isMongoActive = () => mongoose.connection.readyState === 1;

// Seed default administrator / director accounts if not exist
const seedDefaults = async () => {
  try {
    const directorEmail = "director@enterprise.com";
    const accountsEmail = "accounts@enterprise.com";
    const passHash = await bcrypt.hash("Admin@123", 10);

    if (isMongoActive()) {
      if (!(await User.findOne({ email: directorEmail }))) {
        await User.create({ name: "Executive Director", email: directorEmail, password: passHash, role: "director", department: "Executive" });
      }
      if (!(await User.findOne({ email: accountsEmail }))) {
        await User.create({ name: "Finance Accounts Lead", email: accountsEmail, password: passHash, role: "accounts", department: "Finance & Accounts" });
      }
    } else {
      if (!(await usersDb.findOne({ email: directorEmail }))) {
        await usersDb.insert({ _id: crypto.randomUUID(), name: "Executive Director", email: directorEmail, password: passHash, role: "director", department: "Executive" });
      }
      if (!(await usersDb.findOne({ email: accountsEmail }))) {
        await usersDb.insert({ _id: crypto.randomUUID(), name: "Finance Accounts Lead", email: accountsEmail, password: passHash, role: "accounts", department: "Finance & Accounts" });
      }
    }
  } catch (err) {
    console.error("Seed error:", err.message);
  }
};
seedDefaults();

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "employee", employeeId, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isMongoActive()) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(409).json({ message: "Email is already registered" });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email: cleanEmail, password: hashedPassword, role, employeeId, department });
      const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({
        message: "User registered successfully",
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department }
      });
    } else {
      const existingUser = await usersDb.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(409).json({ message: "Email is already registered" });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUserId = crypto.randomUUID();
      const user = await usersDb.insert({
        _id: newUserId,
        name,
        email: cleanEmail,
        password: hashedPassword,
        role,
        employeeId: employeeId || "",
        department: department || "",
        createdAt: new Date(),
      });
      const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({
        message: "User registered successfully",
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department }
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email?.toLowerCase().trim();

    let user;
    if (isMongoActive()) {
      user = await User.findOne({ email: cleanEmail }).select("+password");
    } else {
      user = await usersDb.findOne({ email: cleanEmail });
    }

    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

// Get currently logged-in user
router.get("/me", protect, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
    }
  });
});

module.exports = router;
