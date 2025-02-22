const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');

// Users
router.post('/users', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }
    const db = DatabaseService.getInstance();
    await db.createUser(walletAddress);
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }
    const db = DatabaseService.getInstance();
    const user = await db.getUser(walletAddress);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Conversations
router.post('/conversations', async (req, res) => {
  try {
    const { walletAddress, name } = req.body;
    const db = DatabaseService.getInstance();
    const conversation = await db.createConversation(walletAddress, name);
    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/conversations/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const db = DatabaseService.getInstance();
    const conversations = await db.getConversations(walletAddress);
    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Messages
router.post('/messages', async (req, res) => {
  try {
    const { conversationId, content, sender, metadata } = req.body;
    const db = DatabaseService.getInstance();
    await db.saveMessage(conversationId, content, sender, metadata);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const db = DatabaseService.getInstance();
    const messages = await db.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Code History
router.post('/code-history', async (req, res) => {
  try {
    const { conversationId, code, language, version, metadata } = req.body;
    const db = DatabaseService.getInstance();
    await db.saveCodeHistory(conversationId, code, language, version, metadata);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving code history:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/code-history/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const db = DatabaseService.getInstance();
    const history = await db.getCodeHistory(conversationId);
    res.json(history);
  } catch (error) {
    console.error('Error getting code history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Contracts
router.post('/contracts', async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
    await db.saveDeployedContract(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving contract:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/contracts/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const db = DatabaseService.getInstance();
    const contracts = await db.getDeployedContracts(walletAddress);
    res.json(contracts);
  } catch (error) {
    console.error('Error getting contracts:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/contracts/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const db = DatabaseService.getInstance();
    const contracts = await db.getContractsByConversation(conversationId);
    res.json(contracts);
  } catch (error) {
    console.error('Error getting contracts by conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 