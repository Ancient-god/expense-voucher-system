const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Voucher = require("../models/Voucher");
const { protect, allowRoles } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { vouchersDb, usersDb } = require("../config/store");

const router = express.Router();
const isMongoActive = () => mongoose.connection.readyState === 1;

const generateVoucherNumber = () => {
  const year = new Date().getFullYear();
  const uniquePart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `VCH-${year}-${uniquePart}`;
};

// 1. Employee: Create voucher
router.post("/", protect, allowRoles("employee"), async (req, res) => {
  try {
    const { department, expenseTitle, category, description, amount, expenseDate, voucherDate } = req.body;

    if (!department?.trim() || !expenseTitle?.trim() || !category || !expenseDate || !amount) {
      return res.status(400).json({ message: "Please provide all required voucher details" });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than zero" });
    }

    const vData = {
      voucherNumber: generateVoucherNumber(),
      employee: req.user.id,
      department: department.trim(),
      expenseTitle: expenseTitle.trim(),
      title: expenseTitle.trim(),
      category,
      description: description || "",
      amount: numericAmount,
      expenseDate: new Date(expenseDate),
      voucherDate: voucherDate ? new Date(voucherDate) : new Date(),
      status: "Draft",
      employeeSignature: "",
      directorSignature: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isMongoActive()) {
      const voucher = await Voucher.create(vData);
      return res.status(201).json({ message: "Draft voucher created successfully", voucher });
    } else {
      vData._id = crypto.randomUUID();
      const voucher = await vouchersDb.insert(vData);
      return res.status(201).json({ message: "Draft voucher created successfully", voucher });
    }
  } catch (error) {
    res.status(500).json({ message: "Unable to create voucher" });
  }
});

// 2. Employee: View my vouchers
router.get("/my", protect, allowRoles("employee"), async (req, res) => {
  try {
    if (isMongoActive()) {
      const vouchers = await Voucher.find({ employee: req.user.id }).sort({ createdAt: -1 });
      return res.json(vouchers);
    } else {
      const vouchers = await vouchersDb.find({ employee: req.user.id }).sort({ createdAt: -1 });
      return res.json(vouchers);
    }
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch your vouchers" });
  }
});

// 3. Director: View all submitted vouchers
router.get("/director/all", protect, allowRoles("director"), async (req, res) => {
  try {
    const { status, department, category, employeeName, voucherNumber } = req.query;

    if (isMongoActive()) {
      const filter = {};
      if (status) filter.status = status;
      if (department) filter.department = { $regex: department, $options: "i" };
      if (category) filter.category = category;
      if (voucherNumber) filter.voucherNumber = { $regex: voucherNumber, $options: "i" };

      const vouchers = await Voucher.find(filter)
        .populate("employee", "name email department")
        .populate("approvedBy", "name email")
        .sort({ createdAt: -1 });

      return res.json(vouchers);
    } else {
      let vouchers = await vouchersDb.find({});
      if (status) vouchers = vouchers.filter((v) => v.status === status);
      if (department) vouchers = vouchers.filter((v) => v.department?.toLowerCase().includes(department.toLowerCase()));
      if (category) vouchers = vouchers.filter((v) => v.category === category);
      if (voucherNumber) vouchers = vouchers.filter((v) => v.voucherNumber?.toLowerCase().includes(voucherNumber.toLowerCase()));

      // Populate employee details
      const userList = await usersDb.find({});
      const userMap = {};
      userList.forEach((u) => {
        userMap[u._id] = { name: u.name, email: u.email, department: u.department };
      });

      const populated = vouchers.map((v) => ({
        ...v,
        employee: userMap[v.employee] || { name: "Employee" },
      }));

      populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json(populated);
    }
  } catch (error) {
    res.status(500).json({ message: "Unable to retrieve vouchers" });
  }
});

// 4. Accounts: View all vouchers
router.get("/accounts/all", protect, allowRoles("accounts"), async (req, res) => {
  try {
    const { status, department, category, voucherNumber } = req.query;

    if (isMongoActive()) {
      const filter = {};
      if (status) filter.status = status;
      if (department) filter.department = { $regex: department, $options: "i" };
      if (category) filter.category = category;
      if (voucherNumber) filter.voucherNumber = { $regex: voucherNumber, $options: "i" };

      const vouchers = await Voucher.find(filter)
        .populate("employee", "name email department")
        .populate("approvedBy", "name email")
        .sort({ createdAt: -1 });

      return res.json(vouchers);
    } else {
      let vouchers = await vouchersDb.find({});
      if (status) vouchers = vouchers.filter((v) => v.status === status);
      if (department) vouchers = vouchers.filter((v) => v.department?.toLowerCase().includes(department.toLowerCase()));
      if (category) vouchers = vouchers.filter((v) => v.category === category);
      if (voucherNumber) vouchers = vouchers.filter((v) => v.voucherNumber?.toLowerCase().includes(voucherNumber.toLowerCase()));

      const userList = await usersDb.find({});
      const userMap = {};
      userList.forEach((u) => {
        userMap[u._id] = { name: u.name, email: u.email, department: u.department };
      });

      const populated = vouchers.map((v) => ({
        ...v,
        employee: userMap[v.employee] || { name: "Employee" },
      }));

      populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json(populated);
    }
  } catch (error) {
    res.status(500).json({ message: "Unable to retrieve vouchers" });
  }
});

// 5. Employee Signature Upload
router.post("/:id/employee-signature", protect, allowRoles("employee"), upload.single("signature"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a signature image" });

    const sigUrl = `/uploads/${req.file.filename}`;
    if (isMongoActive()) {
      const voucher = await Voucher.findOne({ _id: req.params.id, employee: req.user.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      voucher.employeeSignature = sigUrl;
      await voucher.save();
    } else {
      const voucher = await vouchersDb.findOne({ _id: req.params.id, employee: req.user.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      await vouchersDb.update({ _id: req.params.id }, { $set: { employeeSignature: sigUrl } });
    }

    res.json({ message: "Employee signature uploaded successfully", signature: sigUrl });
  } catch (error) {
    res.status(400).json({ message: "Unable to upload employee signature" });
  }
});

// 6. Director Signature Upload
router.post("/:id/director-signature", protect, allowRoles("director"), upload.single("signature"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a signature image" });

    const sigUrl = `/uploads/${req.file.filename}`;
    if (isMongoActive()) {
      const voucher = await Voucher.findById(req.params.id);
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      voucher.directorSignature = sigUrl;
      await voucher.save();
    } else {
      const voucher = await vouchersDb.findOne({ _id: req.params.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      await vouchersDb.update({ _id: req.params.id }, { $set: { directorSignature: sigUrl } });
    }

    res.json({ message: "Director signature uploaded successfully", signature: sigUrl });
  } catch (error) {
    res.status(400).json({ message: "Unable to upload director signature" });
  }
});

// 7. Submit draft voucher
router.patch("/:id/submit", protect, allowRoles("employee"), async (req, res) => {
  try {
    if (isMongoActive()) {
      const voucher = await Voucher.findOne({ _id: req.params.id, employee: req.user.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      voucher.status = "Submitted";
      await voucher.save();
      return res.json({ message: "Voucher submitted for approval", voucher });
    } else {
      const voucher = await vouchersDb.findOne({ _id: req.params.id, employee: req.user.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      await vouchersDb.update({ _id: req.params.id }, { $set: { status: "Submitted" } });
      return res.json({ message: "Voucher submitted for approval", voucher });
    }
  } catch (error) {
    res.status(400).json({ message: "Unable to submit voucher" });
  }
});

// 8. Director: Approve
router.patch("/:id/approve", protect, allowRoles("director"), async (req, res) => {
  try {
    const update = {
      status: "Approved",
      approvalDate: new Date(),
      approvedBy: req.user.id,
      rejectionReason: "",
    };

    if (isMongoActive()) {
      const voucher = await Voucher.findById(req.params.id);
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      Object.assign(voucher, update);
      await voucher.save();
      return res.json({ message: "Voucher approved successfully", voucher });
    } else {
      const voucher = await vouchersDb.findOne({ _id: req.params.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      await vouchersDb.update({ _id: req.params.id }, { $set: update });
      return res.json({ message: "Voucher approved successfully", voucher });
    }
  } catch (error) {
    res.status(500).json({ message: "Unable to approve voucher" });
  }
});

// 9. Director: Reject
router.patch("/:id/reject", protect, allowRoles("director"), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason?.trim()) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const update = {
      status: "Rejected",
      rejectionReason: rejectionReason.trim(),
    };

    if (isMongoActive()) {
      const voucher = await Voucher.findById(req.params.id);
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      Object.assign(voucher, update);
      await voucher.save();
      return res.json({ message: "Voucher rejected successfully", voucher });
    } else {
      const voucher = await vouchersDb.findOne({ _id: req.params.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      await vouchersDb.update({ _id: req.params.id }, { $set: update });
      return res.json({ message: "Voucher rejected successfully", voucher });
    }
  } catch (error) {
    res.status(500).json({ message: "Unable to reject voucher" });
  }
});

// 10. Employee: Update draft
router.put("/:id", protect, allowRoles("employee"), async (req, res) => {
  try {
    const allowed = ["department", "expenseTitle", "title", "category", "description", "amount", "expenseDate"];
    const updates = {};
    for (const f of allowed) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    if (updates.expenseTitle) updates.title = updates.expenseTitle;

    if (isMongoActive()) {
      const voucher = await Voucher.findOne({ _id: req.params.id, employee: req.user.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      Object.assign(voucher, updates);
      await voucher.save();
      return res.json({ message: "Draft voucher updated successfully", voucher });
    } else {
      const voucher = await vouchersDb.findOne({ _id: req.params.id, employee: req.user.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      await vouchersDb.update({ _id: req.params.id }, { $set: updates });
      return res.json({ message: "Draft voucher updated successfully", voucher });
    }
  } catch (error) {
    res.status(400).json({ message: "Unable to update voucher" });
  }
});

// 11. Employee: Delete draft
router.delete("/:id", protect, allowRoles("employee"), async (req, res) => {
  try {
    if (isMongoActive()) {
      const voucher = await Voucher.findOne({ _id: req.params.id, employee: req.user.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      await voucher.deleteOne();
      return res.json({ message: "Draft voucher deleted successfully" });
    } else {
      const voucher = await vouchersDb.findOne({ _id: req.params.id, employee: req.user.id });
      if (!voucher) return res.status(404).json({ message: "Voucher not found" });
      await vouchersDb.remove({ _id: req.params.id });
      return res.json({ message: "Draft voucher deleted successfully" });
    }
  } catch (error) {
    res.status(400).json({ message: "Unable to delete voucher" });
  }
});

module.exports = router;
