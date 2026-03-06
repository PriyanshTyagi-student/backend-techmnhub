const express = require("express");
const router = express.Router();
const {
  generateOfflineTicket,
  sendOfflineTicketEmail,
} = require("../controllers/offlineTicketController");

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({ ok: true, msg: "Offline ticket API is running" });
});

// Generate offline ticket
router.post("/generate", generateOfflineTicket);

// Send ticket email
router.post("/send-email", sendOfflineTicketEmail);

// Handle GET on send-email with helpful message
router.get("/send-email", (req, res) => {
  res.status(405).json({ 
    msg: "Method not allowed. Use POST with { userId } in body",
    example: { method: "POST", body: { userId: "user_id_here" } }
  });
});

module.exports = router;
