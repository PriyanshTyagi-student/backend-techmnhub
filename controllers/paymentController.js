const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const User = require("../models/User");
const generateQR = require("../utils/generateQR");
const sendTicketEmail = require("../utils/sendTicketEmail");

// Create Razorpay order
exports.createOrder = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const amount = user.amountPaid;
    if (!amount)
      return res.status(400).json({ msg: "Amount not set for this user" });

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: userId,
    });

    user.orderId = order.id;
    await user.save();

    res.json(order);
  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const user = await User.findOne({ orderId: razorpay_order_id });
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Signature verify
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ msg: "Invalid payment signature" });
    }

    if (user.paymentStatus === "paid") {
      return res.status(400).json({ msg: "Already paid" });
    }

    // Make sure registrationId exists before generating QR.
    if (!user.registrationId) {
      user.registrationId = `ZNX-${Date.now()}-${String(user._id).slice(-4).toUpperCase()}`;
    }

    // Mark paid & generate QR
    user.paymentStatus = "paid";
    user.paymentId = razorpay_payment_id;
    const qr = await generateQR(user.registrationId);
    user.qrCode = qr;
    await user.save();

    // Send ticket email via global sender
    let emailResult = null;
    try {
      emailResult = await sendTicketEmail(user);
      console.log(`✅ Ticket email sent: ${emailResult.email}`);
    } catch (emailErr) {
      console.error(`❌ Ticket email failed:`, emailErr.message);
    }

    res.json({
      msg: emailResult
        ? "Payment verified & ticket sent to email"
        : "Payment verified, but ticket email failed",
      registrationId: user.registrationId,
      qrCode: user.qrCode,
      emailSent: !!emailResult,
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};