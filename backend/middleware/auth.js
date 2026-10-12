const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { usersDb } = require("../config/store");

const isMongoActive = () => mongoose.connection.readyState === 1;

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_voucher_jwt_key_prathvi_raj_shingle_2026");

    let user;
    if (isMongoActive()) {
      user = await User.findById(decoded.id);
    } else {
      user = await usersDb.findOne({ _id: decoded.id });
    }

    if (!user) {
      return res.status(401).json({
        message: "User session expired or user not found",
      });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

module.exports = { protect, allowRoles };
