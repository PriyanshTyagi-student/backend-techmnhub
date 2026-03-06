const User = require("../models/User");
const generateQR = require("../utils/generateQR");
const buildQrEmailAttachment = require("../utils/qrEmailAttachment");
const sendEmail = require("../utils/sendEmail");

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

    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ User not found with id: ${userId}`);
      return res.status(404).json({ msg: "User not found" });
    }
    console.log(`✅ User found: ${user.fullName} (${user.email})`);

    // Create activities list
    const activitiesList = user.subCategory && user.subCategory.length > 0
      ? user.subCategory.map(a => `• ${a}`).join('<br>')
      : 'Not specified';

    // Create team members list
    let teamInfo = '';
    if (user.teamMembers && user.teamMembers.length > 0) {
      teamInfo = `
        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>👥 Team Members:</strong></p>
          ${user.teamMembers.map((member, idx) => `
            <p style="margin: 5px 0; padding-left: 15px;">
              ${idx === 0 ? '👑 ' : '• '}${member}
            </p>
          `).join('')}
        </div>
      `;
    }

    const qrAttachment = buildQrEmailAttachment(
      user.qrCode,
      `${user.registrationId}-qr.png`,
    );

    const qrBlock = qrAttachment
      ? `
          <div style="margin: 20px 0;">
            <img src="cid:${qrAttachment.contentId}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 10px; border: 2px solid #06b6d4;" />
            <p style="font-size: 12px; color: #999; margin-top: 10px;">Scan this at venue entrance</p>
          </div>
        `
      : `
          <p style="font-size: 12px; color: #b45309; margin-top: 10px;">QR could not be embedded in this email. Please use your registration ID at the desk.</p>
        `;

    // Email HTML with QR code
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; padding: 30px; background: #f9f9f9;">
        <h1 style="color: #06b6d4; text-align: center;">🎟️ Zonex 2026 – Registration Confirmed</h1>
        <p style="font-size: 18px;">Hello <strong>${user.fullName}</strong>,</p>
        <p>Welcome to Zonex 2026! Your offline registration has been confirmed.</p>
        
        <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p><strong>Registration ID:</strong></p>
          <p style="font-size: 28px; font-weight: bold; color: #06b6d4; letter-spacing: 2px;">${user.registrationId}</p>
          
          ${qrBlock}
        </div>

        <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Event:</strong> Zonex 2026 | 7 March 2026 | Muzaffarnagar</p>
          <p><strong>Category:</strong> ${user.category}</p>
          <p><strong>Activities Selected:</strong><br> ${activitiesList}</p>
          
          ${teamInfo}
          
          <p><strong>Pass:</strong> ${user.passName || "Pro Participation"}</p>
          <p><strong>Amount Paid:</strong> ₹${user.amountPaid}</p>
          <p><strong>Payment Mode:</strong> ${user.paymentMode || "Offline"}</p>
        </div>

        <hr style="border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 14px; color: #555;">
          Please save this email. Show the QR code or Registration ID at the registration desk on the day of the event.<br />
          For any queries, reply to this email.
        </p>
        <p style="font-size: 14px; color: #999;">– Team TechMNHub</p>
      </div>
    `;

    // Send email
    console.log(`💼 Preparing email payload...`);
    const attachmentList = qrAttachment ? [qrAttachment] : [];
    console.log(`📎 Will send with ${attachmentList.length} attachment(s)`);
    
    try {
      await sendEmail({
        to: user.email,
        subject: "✅ Zonex 2026 – Your Ticket (Offline Registration)",
        html: emailHtml,
        attachments: attachmentList,
      });
      console.log(`✅ Email successfully sent to ${user.email}`);

      res.json({
        msg: "Email sent successfully",
        email: user.email,
      });
    } catch (emailErr) {
      console.error(`❌ Email send failed: ${emailErr.message}`, emailErr);
      throw emailErr;
    }

  } catch (err) {
    console.error("❌ Offline ticket email endpoint error:", err.message || err);
    res.status(500).json({ 
      msg: err.message || "Failed to send email",
      error: err.message 
    });
  }
};

module.exports = exports;
