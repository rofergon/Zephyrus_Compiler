const request = require('supertest');

// Mock DatabaseService antes de importar la app
const mockDb = {
  createUser: jest.fn(),
  getUser: jest.fn(),
  createConversation: jest.fn(),
  getConversations: jest.fn(),
  saveMessage: jest.fn(),
  getMessages: jest.fn(),
  saveCodeHistory: jest.fn(),
  getCodeHistory: jest.fn(),
  saveDeployedContract: jest.fn(),
  getDeployedContracts: jest.fn(),
  getContractsByConversation: jest.fn(),
};

jest.mock('../services/databaseService', () => ({
  getInstance: jest.fn(() => mockDb)
}));

// Importar después de configurar los mocks
const app = require('../server');

describe('Database API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Users Endpoints', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';

    test('POST /api/db/users should create a user', async () => {
      mockDb.createUser.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/db/users')
        .send({ walletAddress: testWallet });

      expect(mockDb.createUser).toHaveBeenCalledWith(testWallet);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('GET /api/db/users/:walletAddress should get a user', async () => {
      const mockUser = {
        wallet_address: testWallet,
        created_at: new Date().toISOString()
      };
      mockDb.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/api/db/users/${testWallet}`);

      expect(mockDb.getUser).toHaveBeenCalledWith(testWallet);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
    });

    test('POST /api/db/users should handle errors', async () => {
      const error = new Error('Database error');
      mockDb.createUser.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/db/users')
        .send({ walletAddress: testWallet });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: error.message });
    });

    test('should handle invalid input properly', async () => {
      const response = await request(app)
        .post('/api/db/users')
        .send({ invalidField: 'test' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'walletAddress is required' });
    });
  });

  describe('Conversations Endpoints', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';
    const testConversationId = 'test-conversation-id';

    test('POST /api/db/conversations should create a conversation', async () => {
      const conversationData = {
        walletAddress: testWallet,
        name: 'Test Conversation'
      };
      mockDb.createConversation.mockResolvedValue({ id: testConversationId });

      const response = await request(app)
        .post('/api/db/conversations')
        .send(conversationData);

      expect(mockDb.createConversation).toHaveBeenCalledWith(
        conversationData.walletAddress,
        conversationData.name
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: testConversationId });
    });

    test('GET /api/db/conversations/:walletAddress should get conversations', async () => {
      const mockConversations = [{
        id: testConversationId,
        name: 'Test Conversation',
        user_wallet: testWallet,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      }];
      mockDb.getConversations.mockResolvedValue(mockConversations);

      const response = await request(app)
        .get(`/api/db/conversations/${testWallet}`);

      expect(mockDb.getConversations).toHaveBeenCalledWith(testWallet);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockConversations);
    });
  });

  describe('Messages Endpoints', () => {
    const testConversationId = 'test-conversation-id';

    test('POST /api/db/messages should save a message', async () => {
      const messageData = {
        conversationId: testConversationId,
        content: 'Test message',
        sender: 'user',
        metadata: { test: 'data' }
      };
      mockDb.saveMessage.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/db/messages')
        .send(messageData);

      expect(mockDb.saveMessage).toHaveBeenCalledWith(
        messageData.conversationId,
        messageData.content,
        messageData.sender,
        messageData.metadata
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('GET /api/db/messages/:conversationId should get messages', async () => {
      const mockMessages = [{
        id: 'test-message-id',
        conversation_id: testConversationId,
        content: 'Test message',
        sender: 'user',
        metadata: { test: 'data' },
        created_at: new Date().toISOString()
      }];
      mockDb.getMessages.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get(`/api/db/messages/${testConversationId}`);

      expect(mockDb.getMessages).toHaveBeenCalledWith(testConversationId);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMessages);
    });
  });

  describe('Contracts Endpoints', () => {
    const testWallet = '0x1234567890123456789012345678901234567890';
    const testConversationId = 'test-conversation-id';
    const testContractAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

    test('POST /api/db/contracts should save a contract', async () => {
      const contractData = {
        walletAddress: testWallet,
        conversationId: testConversationId,
        contractAddress: testContractAddress,
        name: 'TestContract',
        abi: [{ type: 'function', name: 'test' }],
        bytecode: '0x...',
        sourceCode: 'pragma solidity ^0.8.0;...',
        compilerVersion: '0.8.0',
        constructorArgs: [],
        networkId: 57054
      };
      mockDb.saveDeployedContract.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/db/contracts')
        .send(contractData);

      expect(mockDb.saveDeployedContract).toHaveBeenCalledWith(contractData);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('GET /api/db/contracts/:walletAddress should get contracts by wallet', async () => {
      const mockContracts = [{
        id: 'test-contract-id',
        user_wallet: testWallet,
        conversation_id: testConversationId,
        contract_address: testContractAddress,
        name: 'TestContract',
        abi: [{ type: 'function', name: 'test' }],
        bytecode: '0x...',
        source_code: 'pragma solidity ^0.8.0;...',
        compiler_version: '0.8.0',
        constructor_args: [],
        network_id: 57054,
        deployed_at: new Date().toISOString()
      }];
      mockDb.getDeployedContracts.mockResolvedValue(mockContracts);

      const response = await request(app)
        .get(`/api/db/contracts/${testWallet}`);

      expect(mockDb.getDeployedContracts).toHaveBeenCalledWith(testWallet);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContracts);
    });

    test('GET /api/db/contracts/conversation/:conversationId should get contracts by conversation', async () => {
      const mockContracts = [{
        id: 'test-contract-id',
        user_wallet: testWallet,
        conversation_id: testConversationId,
        contract_address: testContractAddress,
        name: 'TestContract',
        abi: [{ type: 'function', name: 'test' }],
        bytecode: '0x...',
        source_code: 'pragma solidity ^0.8.0;...',
        compiler_version: '0.8.0',
        constructor_args: [],
        network_id: 57054,
        deployed_at: new Date().toISOString()
      }];
      mockDb.getContractsByConversation.mockResolvedValue(mockContracts);

      const response = await request(app)
        .get(`/api/db/contracts/conversation/${testConversationId}`);

      expect(mockDb.getContractsByConversation).toHaveBeenCalledWith(testConversationId);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContracts);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors properly', async () => {
      const testError = new Error('Database error');
      mockDb.getUser.mockRejectedValue(testError);

      const response = await request(app)
        .get('/api/db/users/0x1234567890123456789012345678901234567890');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: testError.message });
    });
  });
}); 