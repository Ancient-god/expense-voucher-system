
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const voucherRoutes = require("./routes/voucherRoutes");
const authRoutes = require("./routes/authRoutes");
const connectDB = require("./config/db");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/vouchers", voucherRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Expense Voucher API is running");
});

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
