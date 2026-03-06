const User = require("../models/User");
const generateQR = require("../utils/generateQR");
const sendTicketEmail = require("../utils/sendTicketEmail");

// Generate unique registration ID
function generateRegistrationId() {
  const prefix = "ZNX2026";
  const random = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
  return `${prefix}-${random}`;
}

// Generate ticket for offline registration
exports.generateOfflineTicket = async (req, res) => {
  try {
    const {
      fullName,
      mobile,
      email,
      city,
      college,
      courseYear,
      category,
      subCategory,
      teamMembers,
      passName,
      amountPaid,
      paymentMode,
      portfolio,
      github,
      instagram,
    } = req.body;

    // Validation
    if (!fullName || !mobile || !email || !category || !passName) {
      return res.status(400).json({ msg: "Please fill all required fields" });
    }

    if (mobile.length !== 10) {
      return res.status(400).json({ msg: "Invalid mobile number" });
    }

    if (!subCategory || subCategory.length === 0) {
      return res.status(400).json({ msg: "Please select at least one activity" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        msg: "This email is already registered. Registration ID: " + existingUser.registrationId 
      });
    }

    // Generate unique registration ID
    let registrationId;
    let isUnique = false;
    
    while (!isUnique) {
      registrationId = generateRegistrationId();
      const existing = await User.findOne({ registrationId });
      if (!existing) isUnique = true;
    }

    // Generate QR Code
    const qrCode = await generateQR(registrationId);

    // Create user in database
    const newUser = new User({
      fullName,
      mobile,
      email,
      city,
      college,
      courseYear,
      category,
      subCategory,
      teamMembers: teamMembers || [],
      passName,
      amountPaid: amountPaid || 0,
      paymentMode,
      portfolio,
      github,
      instagram,
      registrationId,
      qrCode,
      paymentStatus: "paid", // Mark as paid for offline registrations
      paymentId: `OFFLINE_${Date.now()}`, // Unique offline payment ID
    });

    await newUser.save();

    console.log(`✅ Offline ticket generated: ${registrationId} for ${email}`);

    // Return ticket data
    res.json({
      msg: "Ticket generated successfully",
      registrationId,
      qrCode,
      user: newUser,
    });

  } catch (err) {
    console.error("❌ Offline ticket generation error:", err);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};

// Send ticket email (separate endpoint for offline tickets)
exports.sendOfflineTicketEmail = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(`📨 sendOfflineTicketEmail called with userId: ${userId}`);

    if (!userId) {
      console.log(`❌ No userId provided`);
      return res.status(400).json({ msg: "User ID required" });
    }

    const result = await sendTicketEmail(userId);

    res.json({
      msg: "Email sent successfully",
      ...result,
    });
  } catch (err) {
    console.error("❌ Offline ticket email endpoint error:", err.message || err);
    res.status(500).json({ 
      msg: err.message || "Failed to send email",
      error: err.message 
    });
  }
};

module.exports = exports;
