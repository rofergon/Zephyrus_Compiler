const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');

const db = DatabaseService.getInstance();

// Users
router.post('/users', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    await db.createUser(walletAddress);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await db.getUser(walletAddress);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Conversations
router.post('/conversations', async (req, res) => {
  try {
    const { walletAddress, name } = req.body;
    const conversation = await db.createConversation(walletAddress, name);
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/conversations/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const conversations = await db.getConversations(walletAddress);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messages
router.post('/messages', async (req, res) => {
  try {
    const { conversationId, content, sender, metadata } = req.body;
    await db.saveMessage(conversationId, content, sender, metadata);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await db.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Code History
router.post('/code-history', async (req, res) => {
  try {
    const { conversationId, code, language, version, metadata } = req.body;
    await db.saveCodeHistory(conversationId, code, language, version, metadata);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/code-history/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const history = await db.getCodeHistory(conversationId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contracts
router.post('/contracts', async (req, res) => {
  try {
    await db.saveDeployedContract(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/contracts/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const contracts = await db.getDeployedContracts(walletAddress);
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/contracts/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const contracts = await db.getContractsByConversation(conversationId);
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 