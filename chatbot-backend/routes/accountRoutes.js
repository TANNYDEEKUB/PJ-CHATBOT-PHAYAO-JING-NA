const express = require('express');
const authMiddleware = require('../middleware/authenticateToken');
const router = express.Router();

// Route for fetching user account information
router.get('/account', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      username: user.username,
      email: user.email,
      fullName: user.fullName || 'Not provided',
      phoneNumber: user.phoneNumber || 'Not provided',
      address: user.address || 'Not provided',
    });
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).json({ message: 'Failed to fetch user info' });
  }
});

module.exports = router;
