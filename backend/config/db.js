const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri && !mongoUri.includes("127.0.0.1") && !mongoUri.includes("localhost")) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log("Connected to MongoDB cluster");
      return;
    } catch (e) {
      console.log("Could not reach remote MongoDB, fallback to embedded persistent datastore");
    }
  }

  // Check local MongoDB
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/expense_voucher_db", { serverSelectionTimeoutMS: 1000 });
    console.log("Connected to local MongoDB");
    return;
  } catch (e) {
    console.log("Local MongoDB not detected. Utilizing embedded self-contained JSON/NeDB datastore.");
  }
};

module.exports = connectDB;
