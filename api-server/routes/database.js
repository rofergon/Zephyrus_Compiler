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

// Update contract conversation
router.patch('/contracts/:contractId/conversation', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { conversationId } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required in the request body' });
    }
    
    const result = await db.updateContractConversation(contractId, conversationId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agents
router.post('/agents', async (req, res) => {
  try {
    const agent = await db.createAgent(req.body);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const agents = await db.getAgentsByContract(contractId);
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await db.updateAgent(agentId, req.body);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent Functions
router.post('/agents/:agentId/functions', async (req, res) => {
  try {
    const { agentId } = req.params;
    const function_ = await db.createAgentFunction(agentId, req.body);
    res.json(function_);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:agentId/functions', async (req, res) => {
  try {
    const { agentId } = req.params;
    const functions = await db.getAgentFunctions(agentId);
    res.json(functions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/agents/functions/:functionId', async (req, res) => {
  try {
    const { functionId } = req.params;
    const function_ = await db.updateAgentFunction(functionId, req.body);
    res.json(function_);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent Schedules
router.post('/agents/:agentId/schedules', async (req, res) => {
  try {
    const { agentId } = req.params;
    const schedule = await db.createAgentSchedule(agentId, req.body);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:agentId/schedules', async (req, res) => {
  try {
    const { agentId } = req.params;
    const schedules = await db.getAgentSchedules(agentId);
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/agents/schedules/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await db.updateAgentSchedule(scheduleId, req.body);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent Notifications
router.post('/agents/:agentId/notifications', async (req, res) => {
  try {
    const { agentId } = req.params;
    const notification = await db.createAgentNotification(agentId, req.body);
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:agentId/notifications', async (req, res) => {
  try {
    const { agentId } = req.params;
    const notifications = await db.getAgentNotifications(agentId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/agents/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await db.updateAgentNotification(notificationId, req.body);
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent Execution Logs
router.post('/agents/:agentId/logs', async (req, res) => {
  try {
    const { agentId } = req.params;
    const log = await db.createAgentExecutionLog(agentId, req.body);
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agents/:agentId/logs', async (req, res) => {
  try {
    const { agentId } = req.params;
    const logs = await db.getAgentExecutionLogs(agentId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 