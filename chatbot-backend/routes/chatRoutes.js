const express = require('express');
const { handleChatMessage, getChatHistory, deleteChatSession, updateSessionName } = require('../controllers/chatController');
const authMiddleware = require('../middleware/authenticateToken');

console.log({
    handleChatMessage,
    getChatHistory,
    deleteChatSession,
    updateSessionName,
    authMiddleware,
}); // Add this for debugging

const router = express.Router();

// POST to handle chat message
router.post('/', authMiddleware, handleChatMessage);

// GET to retrieve chat history
router.get('/history', authMiddleware, getChatHistory);

// DELETE to remove a chat session
router.delete('/history/:id', authMiddleware, deleteChatSession);

// POST to update session name
router.post('/history/name/:id', authMiddleware, updateSessionName);

module.exports = router;
