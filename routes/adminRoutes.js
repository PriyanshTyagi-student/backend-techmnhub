const express = require('express');
const router = express.Router();
const {
  login,
  getAllUsers,
  getUser,
  deleteUser,
  checkInUser,
  getStats,
  sendTicketToUser,
  bulkSendTickets
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route
router.post('/login', login);

// Protected routes (require token)
router.get('/users', authMiddleware, getAllUsers);
router.get('/users/:id', authMiddleware, getUser);
router.delete('/users/:id', authMiddleware, deleteUser);
router.put('/users/:id/checkin', authMiddleware, checkInUser);
router.get('/stats', authMiddleware, getStats);

// Ticket sending routes
router.post('/send-ticket', authMiddleware, sendTicketToUser);
router.post('/bulk-send-tickets', authMiddleware, bulkSendTickets);

module.exports = router;