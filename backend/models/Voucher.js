
const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    expenseTitle: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than zero"],
    },

    voucherDate: {
      type: Date,
      default: Date.now,
    },

    expenseDate: {
      type: Date,
      required: true,
    },

    employeeSignature: {
      type: String,
      default: "",
    },

    directorSignature: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected"],
      default: "Draft",
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    approvalDate: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Voucher", voucherSchema);
