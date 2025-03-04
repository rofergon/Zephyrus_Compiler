const request = require('supertest');
const app = require('../server');
const DatabaseService = require('../services/databaseService');

// Mock de DatabaseService
jest.mock('../services/databaseService', () => {
  return {
    getInstance: jest.fn(() => ({
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
      getContractsByConversation: jest.fn()
    }))
  };
});

const db = DatabaseService.getInstance();

describe('Database API Endpoints', () => {
  beforeEach(() => {
    // Limpiar todos los mocks antes de cada prueba
    jest.clearAllMocks();
  });

  describe('Users Endpoints', () => {
    const testWalletAddress = '0x1234567890123456789012345678901234567890';

    test('POST /api/db/users should create a user', async () => {
      db.createUser.mockResolvedValue();

      const response = await request(app)
        .post('/api/db/users')
        .send({ walletAddress: testWalletAddress });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(db.createUser).toHaveBeenCalledWith(testWalletAddress);
    });

    test('GET /api/db/users/:walletAddress should get a user', async () => {
      const mockUser = {
        wallet_address: testWalletAddress,
        created_at: new Date().toISOString()
      };

      db.getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/api/db/users/${testWalletAddress}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
      expect(db.getUser).toHaveBeenCalledWith(testWalletAddress);
    });
  });

  describe('Conversations Endpoints', () => {
    const testWalletAddress = '0x1234567890123456789012345678901234567890';
    const testConversationName = 'Test Conversation';

    test('POST /api/db/conversations should create a conversation', async () => {
      const mockConversation = { id: 'test-uuid' };
      db.createConversation.mockResolvedValue(mockConversation);

      const response = await request(app)
        .post('/api/db/conversations')
        .send({ 
          walletAddress: testWalletAddress,
          name: testConversationName
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockConversation);
      expect(db.createConversation).toHaveBeenCalledWith(testWalletAddress, testConversationName);
    });

    test('GET /api/db/conversations/:walletAddress should get conversations', async () => {
      const mockConversations = [{
        id: 'test-uuid',
        name: testConversationName,
        user_wallet: testWalletAddress,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      }];

      db.getConversations.mockResolvedValue(mockConversations);

      const response = await request(app)
        .get(`/api/db/conversations/${testWalletAddress}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockConversations);
      expect(db.getConversations).toHaveBeenCalledWith(testWalletAddress);
    });
  });

  describe('Messages Endpoints', () => {
    const testConversationId = 'test-conversation-uuid';

    test('POST /api/db/messages should save a message', async () => {
      const messageData = {
        conversationId: testConversationId,
        content: 'Test message',
        sender: 'user',
        metadata: { test: 'data' }
      };

      db.saveMessage.mockResolvedValue();

      const response = await request(app)
        .post('/api/db/messages')
        .send(messageData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(db.saveMessage).toHaveBeenCalledWith(
        messageData.conversationId,
        messageData.content,
        messageData.sender,
        messageData.metadata
      );
    });

    test('GET /api/db/messages/:conversationId should get messages', async () => {
      const mockMessages = [{
        id: 'test-message-uuid',
        conversation_id: testConversationId,
        content: 'Test message',
        sender: 'user',
        metadata: { test: 'data' },
        created_at: new Date().toISOString()
      }];

      db.getMessages.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get(`/api/db/messages/${testConversationId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMessages);
      expect(db.getMessages).toHaveBeenCalledWith(testConversationId);
    });
  });

  describe('Contracts Endpoints', () => {
    const testWalletAddress = '0x1234567890123456789012345678901234567890';
    const testConversationId = 'test-conversation-uuid';

    test('POST /api/db/contracts should save a contract', async () => {
      const contractData = {
        walletAddress: testWalletAddress,
        conversationId: testConversationId,
        contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        name: 'TestContract',
        abi: [],
        bytecode: '0x...',
        sourceCode: 'pragma solidity ^0.8.0;...',
        compilerVersion: '0.8.0',
        constructorArgs: [],
        networkId: 57054
      };

      db.saveDeployedContract.mockResolvedValue();

      const response = await request(app)
        .post('/api/db/contracts')
        .send(contractData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(db.saveDeployedContract).toHaveBeenCalledWith(contractData);
    });

    test('GET /api/db/contracts/:walletAddress should get contracts by wallet', async () => {
      const mockContracts = [{
        id: 'test-contract-uuid',
        user_wallet: testWalletAddress,
        conversation_id: testConversationId,
        contract_address: '0xabcdef1234567890abcdef1234567890abcdef12',
        name: 'TestContract',
        abi: [],
        bytecode: '0x...',
        source_code: 'pragma solidity ^0.8.0;...',
        compiler_version: '0.8.0',
        constructor_args: [],
        network_id: 57054,
        deployed_at: new Date().toISOString()
      }];

      db.getDeployedContracts.mockResolvedValue(mockContracts);

      const response = await request(app)
        .get(`/api/db/contracts/${testWalletAddress}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContracts);
      expect(db.getDeployedContracts).toHaveBeenCalledWith(testWalletAddress);
    });

    test('GET /api/db/contracts/conversation/:conversationId should get contracts by conversation', async () => {
      const mockContracts = [{
        id: 'test-contract-uuid',
        user_wallet: testWalletAddress,
        conversation_id: testConversationId,
        contract_address: '0xabcdef1234567890abcdef1234567890abcdef12',
        name: 'TestContract',
        abi: [],
        bytecode: '0x...',
        source_code: 'pragma solidity ^0.8.0;...',
        compiler_version: '0.8.0',
        constructor_args: [],
        network_id: 57054,
        deployed_at: new Date().toISOString()
      }];

      db.getContractsByConversation.mockResolvedValue(mockContracts);

      const response = await request(app)
        .get(`/api/db/contracts/conversation/${testConversationId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockContracts);
      expect(db.getContractsByConversation).toHaveBeenCalledWith(testConversationId);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors properly', async () => {
      const testError = new Error('Database error');
      db.getUser.mockRejectedValue(testError);

      const response = await request(app)
        .get('/api/db/users/0x1234567890123456789012345678901234567890');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: testError.message });
    });

    test('should handle invalid input data', async () => {
      const response = await request(app)
        .post('/api/db/users')
        .send({ invalidField: 'test' });

      expect(response.status).toBe(500);
    });
  });
}); 