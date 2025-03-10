const { createClient } = require('@libsql/client');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class DatabaseService {
  static instance;
  client;

  constructor() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error('Missing Turso database credentials');
    }

    this.client = createClient({
      url,
      authToken,
    });
  }

  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  validateString(value, fieldName) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${fieldName} must be a non-empty string`);
    }
    return value.trim();
  }

  // Users
  async createUser(walletAddress) {
    try {
      const validatedAddress = this.validateString(walletAddress, 'walletAddress');
      await this.client.execute({
        sql: `
          INSERT INTO users (wallet_address)
          VALUES (?)
          ON CONFLICT (wallet_address) DO NOTHING
        `,
        args: [validatedAddress]
      });
    } catch (error) {
      console.error('[DatabaseService] Error creating user:', error);
      throw error;
    }
  }

  async getUser(walletAddress) {
    try {
      const validatedAddress = this.validateString(walletAddress, 'walletAddress');
      const result = await this.client.execute({
        sql: `SELECT * FROM users WHERE wallet_address = ?`,
        args: [validatedAddress]
      });
      return result.rows[0];
    } catch (error) {
      console.error('[DatabaseService] Error getting user:', error);
      throw error;
    }
  }

  // Conversations
  async createConversation(walletAddress, name) {
    try {
      const validatedAddress = this.validateString(walletAddress, 'walletAddress');
      const validatedName = this.validateString(name, 'name');

      await this.createUser(validatedAddress);

      const existingConversation = await this.client.execute({
        sql: `SELECT id FROM conversations WHERE user_wallet = ? AND name = ?`,
        args: [validatedAddress, validatedName]
      });

      if (existingConversation.rows.length > 0) {
        return { id: existingConversation.rows[0].id };
      }

      const id = uuidv4();

      await this.client.execute({
        sql: `
          INSERT INTO conversations (id, user_wallet, name)
          VALUES (?, ?, ?)
        `,
        args: [id, validatedAddress, validatedName]
      });
      
      return { id };
    } catch (error) {
      console.error('[DatabaseService] Error creating conversation:', error);
      throw error;
    }
  }

  async getConversations(walletAddress) {
    try {
      const validatedAddress = this.validateString(walletAddress, 'walletAddress');
      const result = await this.client.execute({
        sql: `
          SELECT * FROM conversations 
          WHERE user_wallet = ?
          ORDER BY created_at DESC
        `,
        args: [validatedAddress]
      });
      return result.rows;
    } catch (error) {
      console.error('[DatabaseService] Error getting conversations:', error);
      throw error;
    }
  }

  async updateConversationName(conversationId, newName) {
    try {
      const validatedId = this.validateString(conversationId, 'conversationId');
      const validatedName = this.validateString(newName, 'newName');
      
      // Check if the conversation exists
      const conversationExists = await this.client.execute({
        sql: `SELECT id FROM conversations WHERE id = ?`,
        args: [validatedId]
      });

      if (conversationExists.rows.length === 0) {
        throw new Error(`Conversation with id ${validatedId} does not exist`);
      }

      // Update the conversation name
      await this.client.execute({
        sql: `
          UPDATE conversations
          SET name = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [validatedName, validatedId]
      });

      return { success: true };
    } catch (error) {
      console.error('[DatabaseService] Error updating conversation name:', error);
      throw error;
    }
  }

  // Messages
  async saveMessage(conversationId, content, sender, metadata) {
    try {
      const validatedId = this.validateString(conversationId, 'conversationId');
      const validatedContent = this.validateString(content, 'content');
      const validatedSender = sender === 'user' || sender === 'ai' ? sender : 'ai';
      
      // Verificar si la conversación existe
      const conversationExists = await this.client.execute({
        sql: `SELECT id FROM conversations WHERE id = ?`,
        args: [validatedId]
      });

      if (conversationExists.rows.length === 0) {
        throw new Error(`Conversation with id ${validatedId} does not exist`);
      }

      const id = uuidv4();
      
      await this.client.execute({
        sql: `
          INSERT INTO messages (id, conversation_id, content, sender, metadata)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [id, validatedId, validatedContent, validatedSender, metadata ? JSON.stringify(metadata) : null]
      });

      await this.client.execute({
        sql: `
          UPDATE conversations
          SET last_accessed = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [validatedId]
      });
    } catch (error) {
      console.error('[DatabaseService] Error saving message:', error);
      throw error;
    }
  }

  async getMessages(conversationId) {
    try {
      const validatedId = this.validateString(conversationId, 'conversationId');
      const result = await this.client.execute({
        sql: `
          SELECT * FROM messages 
          WHERE conversation_id = ?
          ORDER BY created_at ASC
        `,
        args: [validatedId]
      });
      return result.rows;
    } catch (error) {
      console.error('[DatabaseService] Error getting messages:', error);
      throw error;
    }
  }

  // Code History
  async saveCodeHistory(conversationId, code, language = 'solidity', version, metadata) {
    try {
      const validatedId = this.validateString(conversationId, 'conversationId');
      const validatedCode = this.validateString(code, 'code');
      const validatedLanguage = this.validateString(language, 'language');
      const id = uuidv4();
      
      await this.client.execute({
        sql: `
          INSERT INTO code_history (
            id,
            conversation_id,
            code_content,
            language,
            version,
            metadata
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          validatedId,
          validatedCode,
          validatedLanguage,
          version || null,
          metadata ? JSON.stringify(metadata) : null
        ]
      });
    } catch (error) {
      console.error('[DatabaseService] Error saving code history:', error);
      throw error;
    }
  }

  async getCodeHistory(conversationId) {
    try {
      const validatedId = this.validateString(conversationId, 'conversationId');
      const result = await this.client.execute({
        sql: `
          SELECT * FROM code_history 
          WHERE conversation_id = ?
          ORDER BY created_at DESC
        `,
        args: [validatedId]
      });
      return result.rows;
    } catch (error) {
      console.error('[DatabaseService] Error getting code history:', error);
      throw error;
    }
  }

  // Contracts
  async saveDeployedContract(contractData) {
    try {
      let validatedAbi;
      try {
        if (typeof contractData.abi === 'string') {
          JSON.parse(contractData.abi);
          validatedAbi = contractData.abi;
        } else {
          validatedAbi = JSON.stringify(contractData.abi);
        }
      } catch (error) {
        console.error('[DatabaseService] Error validating ABI:', error);
        throw new Error('Invalid ABI format');
      }

      const walletAddress = this.validateString(contractData.walletAddress, 'walletAddress');
      let conversationId = this.validateString(contractData.conversationId, 'conversationId');
      const contractAddress = this.validateString(contractData.contractAddress, 'contractAddress');
      const name = this.validateString(contractData.name, 'name');
      const bytecode = this.validateString(contractData.bytecode, 'bytecode');
      const sourceCode = this.validateString(contractData.sourceCode, 'sourceCode');
      const id = uuidv4();

      await this.createUser(walletAddress);

      const conversationExists = await this.client.execute({
        sql: `SELECT id FROM conversations WHERE id = ?`,
        args: [conversationId]
      });

      if (conversationExists.rows.length === 0) {
        const newConversation = await this.createConversation(walletAddress, "Contract Deployment Chat");
        conversationId = newConversation.id;
      }

      await this.saveCodeHistory(
        conversationId,
        sourceCode,
        'solidity',
        contractData.compilerVersion,
        { contractAddress, deploymentType: 'contract' }
      );

      const query = `
        INSERT INTO deployed_contracts (
          id,
          user_wallet,
          conversation_id,
          contract_address,
          name,
          abi,
          bytecode,
          source_code,
          compiler_version,
          constructor_args,
          network_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.client.execute({
        sql: query,
        args: [
          id,
          walletAddress,
          conversationId,
          contractAddress,
          name,
          validatedAbi,
          bytecode,
          sourceCode,
          contractData.compilerVersion || null,
          contractData.constructorArgs ? JSON.stringify(contractData.constructorArgs) : null,
          contractData.networkId || 57054
        ]
      });
    } catch (error) {
      console.error('[DatabaseService] Error saving deployed contract:', error);
      throw error;
    }
  }

  async getDeployedContracts(walletAddress) {
    try {
      const validatedAddress = this.validateString(walletAddress, 'walletAddress');
      const result = await this.client.execute({
        sql: `
          SELECT * FROM deployed_contracts 
          WHERE user_wallet = ?
          ORDER BY deployed_at DESC
        `,
        args: [validatedAddress]
      });

      return result.rows.map(contract => ({
        ...contract,
        sourceCode: this.parseSourceCode(contract.source_code),
        abi: contract.abi ? JSON.parse(contract.abi) : null,
        constructorArgs: contract.constructor_args ? JSON.parse(contract.constructor_args) : null,
        networkId: contract.network_id ? contract.network_id.toString() : null
      }));
    } catch (error) {
      console.error('[DatabaseService] Error getting deployed contracts:', error);
      throw error;
    }
  }

  async getContractsByConversation(conversationId) {
    try {
      const validatedId = this.validateString(conversationId, 'conversationId');
      const result = await this.client.execute({
        sql: `
          SELECT * FROM deployed_contracts 
          WHERE conversation_id = ?
          ORDER BY deployed_at DESC
        `,
        args: [validatedId]
      });

      return result.rows.map(contract => ({
        ...contract,
        sourceCode: this.parseSourceCode(contract.source_code),
        abi: contract.abi ? JSON.parse(contract.abi) : null,
        constructorArgs: contract.constructor_args ? JSON.parse(contract.constructor_args) : null,
        networkId: contract.network_id ? contract.network_id.toString() : null
      }));
    } catch (error) {
      console.error('[DatabaseService] Error getting contracts by conversation:', error);
      throw error;
    }
  }

  async createContract(contractData) {
    try {
      // Validar campos requeridos
      const contract_id = this.validateString(contractData.contract_id, 'contract_id');
      const address = this.validateString(contractData.address, 'address');
      const name = this.validateString(contractData.name, 'name');
      const type = this.validateString(contractData.type, 'type');
      const owner_address = this.validateString(contractData.owner_address, 'owner_address');
      
      // Validar ABI
      let validatedAbi;
      try {
        if (typeof contractData.abi === 'string') {
          JSON.parse(contractData.abi);
          validatedAbi = contractData.abi;
        } else {
          validatedAbi = JSON.stringify(contractData.abi);
        }
      } catch (error) {
        console.error('[DatabaseService] Error validating ABI:', error);
        throw new Error('Invalid ABI format');
      }
      
      // Insertar en la tabla contracts
      const query = `
        INSERT INTO contracts (
          contract_id, 
          address, 
          chain_id, 
          name, 
          type, 
          abi, 
          deployed_at, 
          owner_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (address, chain_id) DO UPDATE SET
          name = excluded.name,
          type = excluded.type,
          abi = excluded.abi,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await this.client.execute({
        sql: query,
        args: [
          contract_id,
          address,
          contractData.chain_id,
          name,
          type,
          validatedAbi,
          contractData.deployed_at || new Date().toISOString(),
          owner_address
        ]
      });
      
      return { 
        success: true, 
        contract_id,
        message: 'Contract created/updated successfully' 
      };
    } catch (error) {
      console.error('[DatabaseService] Error creating contract:', error);
      throw error;
    }
  }

  parseSourceCode(sourceCode) {
    try {
      return JSON.parse(sourceCode);
    } catch (error) {
      return sourceCode;
    }
  }

  // Update contract conversation
  async updateContractConversation(contractId, conversationId) {
    try {
      const validatedContractId = this.validateString(contractId, 'contractId');
      const validatedConversationId = this.validateString(conversationId, 'conversationId');
      
      // Check if the contract exists
      const contractExists = await this.client.execute({
        sql: `SELECT id FROM deployed_contracts WHERE id = ?`,
        args: [validatedContractId]
      });

      if (contractExists.rows.length === 0) {
        throw new Error(`Contract with id ${validatedContractId} does not exist`);
      }

      // Check if the conversation exists
      const conversationExists = await this.client.execute({
        sql: `SELECT id FROM conversations WHERE id = ?`,
        args: [validatedConversationId]
      });

      if (conversationExists.rows.length === 0) {
        throw new Error(`Conversation with id ${validatedConversationId} does not exist`);
      }

      // Update the contract's conversation ID
      await this.client.execute({
        sql: `
          UPDATE deployed_contracts
          SET conversation_id = ?
          WHERE id = ?
        `,
        args: [validatedConversationId, validatedContractId]
      });

      return { success: true };
    } catch (error) {
      console.error('[DatabaseService] Error updating contract conversation:', error);
      throw error;
    }
  }

  // Agents
  async createAgent(contractId, agentData) {
    try {
      const validatedContractId = this.validateString(contractId, 'contractId');
      const validatedName = this.validateString(agentData.name, 'name');
      const validatedOwner = this.validateString(agentData.owner, 'owner');
      
      const id = uuidv4();
      
      const query = `
        INSERT INTO agents (
          agent_id,
          contract_id,
          name,
          description,
          status,
          gas_limit,
          max_priority_fee,
          owner,
          contract_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.client.execute({
        sql: query,
        args: [
          id,
          validatedContractId,
          validatedName,
          agentData.description || null,
          agentData.status || 'paused',
          agentData.gas_limit || null,
          agentData.max_priority_fee || null,
          validatedOwner,
          agentData.contract_state ? JSON.stringify(agentData.contract_state) : null
        ]
      });

      return { agent_id: id };
    } catch (error) {
      console.error('[DatabaseService] Error creating agent:', error);
      throw error;
    }
  }

  async getAgentsByContract(contractId) {
    try {
      const validatedId = this.validateString(contractId, 'contractId');
      const result = await this.client.execute({
        sql: `SELECT * FROM agents WHERE contract_id = ?`,
        args: [validatedId]
      });

      return result.rows.map(agent => ({
        ...agent,
        contract_state: agent.contract_state ? JSON.parse(agent.contract_state) : null
      }));
    } catch (error) {
      console.error('[DatabaseService] Error getting agents by contract:', error);
      throw error;
    }
  }

  /**
   * Get agent by its unique ID
   */
  async getAgentById(agentId) {
    try {
      const validatedId = this.validateString(agentId, 'agentId');
      const result = await this.client.execute({
        sql: `SELECT * FROM agents WHERE agent_id = ?`,
        args: [validatedId]
      });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const agent = result.rows[0];
      return {
        ...agent,
        contract_state: agent.contract_state ? JSON.parse(agent.contract_state) : null
      };
    } catch (error) {
      console.error('[DatabaseService] Error getting agent by id:', error);
      throw error;
    }
  }

  /**
   * Get agents by owner address
   */
  async getAgentsByOwner(ownerAddress) {
    try {
      const validatedOwner = this.validateString(ownerAddress, 'ownerAddress');
      const result = await this.client.execute({
        sql: `SELECT * FROM agents WHERE owner = ?`,
        args: [validatedOwner]
      });

      return result.rows.map(agent => ({
        ...agent,
        contract_state: agent.contract_state ? JSON.parse(agent.contract_state) : null
      }));
    } catch (error) {
      console.error('[DatabaseService] Error getting agents by owner:', error);
      throw error;
    }
  }

  async updateAgent(agentId, updateData) {
    try {
      const validatedId = this.validateString(agentId, 'agentId');
      
      const allowedFields = [
        'name',
        'description',
        'status',
        'gas_limit',
        'max_priority_fee',
        'contract_state'
      ];

      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(key === 'contract_state' ? JSON.stringify(value) : value);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(validatedId);

      const query = `
        UPDATE agents
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = ?
      `;

      await this.client.execute({
        sql: query,
        args: values
      });

      return { success: true };
    } catch (error) {
      console.error('[DatabaseService] Error updating agent:', error);
      throw error;
    }
  }

  // Agent Functions
  async createAgentFunction(agentId, functionData) {
    try {
      const validatedAgentId = this.validateString(agentId, 'agentId');
      const validatedName = this.validateString(functionData.function_name, 'function_name');
      const validatedSignature = this.validateString(functionData.function_signature, 'function_signature');
      const validatedType = this.validateString(functionData.function_type, 'function_type');

      const id = uuidv4();

      const query = `
        INSERT INTO agent_functions (
          function_id,
          agent_id,
          function_name,
          function_signature,
          function_type,
          is_enabled,
          validation_rules,
          abi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.client.execute({
        sql: query,
        args: [
          id,
          validatedAgentId,
          validatedName,
          validatedSignature,
          validatedType,
          functionData.is_enabled !== undefined ? functionData.is_enabled : true,
          functionData.validation_rules ? JSON.stringify(functionData.validation_rules) : null,
          functionData.abi ? JSON.stringify(functionData.abi) : null
        ]
      });

      // Si hay parámetros, los creamos
      if (functionData.parameters && Array.isArray(functionData.parameters)) {
        for (const param of functionData.parameters) {
          await this.createFunctionParameter(id, param);
        }
      }

      return { function_id: id };
    } catch (error) {
      console.error('[DatabaseService] Error creating agent function:', error);
      throw error;
    }
  }

  async createFunctionParameter(functionId, paramData) {
    try {
      const validatedFunctionId = this.validateString(functionId, 'functionId');
      const validatedName = this.validateString(paramData.param_name, 'param_name');
      const validatedType = this.validateString(paramData.param_type, 'param_type');

      const id = uuidv4();

      const query = `
        INSERT INTO agent_function_params (
          param_id,
          function_id,
          param_name,
          param_type,
          default_value,
          validation_rules
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      await this.client.execute({
        sql: query,
        args: [
          id,
          validatedFunctionId,
          validatedName,
          validatedType,
          paramData.default_value || null,
          paramData.validation_rules ? JSON.stringify(paramData.validation_rules) : null
        ]
      });

      return { param_id: id };
    } catch (error) {
      console.error('[DatabaseService] Error creating function parameter:', error);
      throw error;
    }
  }

  async getAgentFunctions(agentId) {
    try {
      const validatedId = this.validateString(agentId, 'agentId');
      
      // Get functions
      const functionsResult = await this.client.execute({
        sql: `SELECT * FROM agent_functions WHERE agent_id = ?`,
        args: [validatedId]
      });

      const functions = functionsResult.rows.map(async (func) => {
        // Get parameters for each function
        const paramsResult = await this.client.execute({
          sql: `SELECT * FROM agent_function_params WHERE function_id = ?`,
          args: [func.function_id]
        });

        return {
          ...func,
          validation_rules: func.validation_rules ? JSON.parse(func.validation_rules) : null,
          abi: func.abi ? JSON.parse(func.abi) : null,
          parameters: paramsResult.rows.map(param => ({
            ...param,
            validation_rules: param.validation_rules ? JSON.parse(param.validation_rules) : null
          }))
        };
      });

      return await Promise.all(functions);
    } catch (error) {
      console.error('[DatabaseService] Error getting agent functions:', error);
      throw error;
    }
  }

  async updateAgentFunction(functionId, updateData) {
    try {
      const validatedId = this.validateString(functionId, 'functionId');
      
      const allowedFields = [
        'function_name',
        'function_signature',
        'function_type',
        'is_enabled',
        'validation_rules',
        'abi'
      ];

      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(['validation_rules', 'abi'].includes(key) ? JSON.stringify(value) : value);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(validatedId);

      const query = `
        UPDATE agent_functions
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE function_id = ?
      `;

      await this.client.execute({
        sql: query,
        args: values
      });

      // Actualizar parámetros si se proporcionan
      if (updateData.parameters && Array.isArray(updateData.parameters)) {
        // Eliminar parámetros existentes
        await this.client.execute({
          sql: `DELETE FROM agent_function_params WHERE function_id = ?`,
          args: [validatedId]
        });

        // Crear nuevos parámetros
        for (const param of updateData.parameters) {
          await this.createFunctionParameter(validatedId, param);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[DatabaseService] Error updating agent function:', error);
      throw error;
    }
  }

  // Agent Schedules
  async createAgentSchedule(agentId, scheduleData) {
    try {
      const validatedAgentId = this.validateString(agentId, 'agentId');
      const validatedType = this.validateString(scheduleData.schedule_type, 'schedule_type');
      
      const id = uuidv4();

      const query = `
        INSERT INTO agent_schedules (
          schedule_id,
          agent_id,
          schedule_type,
          interval_seconds,
          cron_expression,
          next_execution,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await this.client.execute({
        sql: query,
        args: [
          id,
          validatedAgentId,
          validatedType,
          scheduleData.interval_seconds || null,
          scheduleData.cron_expression || null,
          scheduleData.next_execution || null,
          scheduleData.is_active !== undefined ? scheduleData.is_active : true
        ]
      });

      return { schedule_id: id };
    } catch (error) {
      console.error('[DatabaseService] Error creating agent schedule:', error);
      throw error;
    }
  }

  async getAgentSchedules(agentId) {
    try {
      const validatedId = this.validateString(agentId, 'agentId');
      const result = await this.client.execute({
        sql: `SELECT * FROM agent_schedules WHERE agent_id = ?`,
        args: [validatedId]
      });

      return result.rows;
    } catch (error) {
      console.error('[DatabaseService] Error getting agent schedules:', error);
      throw error;
    }
  }

  async updateAgentSchedule(scheduleId, updateData) {
    try {
      const validatedId = this.validateString(scheduleId, 'scheduleId');
      
      const allowedFields = [
        'schedule_type',
        'interval_seconds',
        'cron_expression',
        'next_execution',
        'is_active'
      ];

      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(validatedId);

      const query = `
        UPDATE agent_schedules
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE schedule_id = ?
      `;

      await this.client.execute({
        sql: query,
        args: values
      });

      return { success: true };
    } catch (error) {
      console.error('[DatabaseService] Error updating agent schedule:', error);
      throw error;
    }
  }

  // Agent Notifications
  async createAgentNotification(agentId, notificationData) {
    try {
      const validatedAgentId = this.validateString(agentId, 'agentId');
      const validatedType = this.validateString(notificationData.notification_type, 'notification_type');
      const validatedConfig = notificationData.configuration;
      
      if (!validatedConfig) {
        throw new Error('Configuration is required for notifications');
      }

      const id = uuidv4();

      const query = `
        INSERT INTO agent_notifications (
          notification_id,
          agent_id,
          notification_type,
          configuration,
          is_enabled
        ) VALUES (?, ?, ?, ?, ?)
      `;

      await this.client.execute({
        sql: query,
        args: [
          id,
          validatedAgentId,
          validatedType,
          JSON.stringify(validatedConfig),
          notificationData.is_enabled !== undefined ? notificationData.is_enabled : true
        ]
      });

      return { notification_id: id };
    } catch (error) {
      console.error('[DatabaseService] Error creating agent notification:', error);
      throw error;
    }
  }

  async getAgentNotifications(agentId) {
    try {
      const validatedId = this.validateString(agentId, 'agentId');
      const result = await this.client.execute({
        sql: `SELECT * FROM agent_notifications WHERE agent_id = ?`,
        args: [validatedId]
      });

      return result.rows.map(notification => ({
        ...notification,
        configuration: JSON.parse(notification.configuration)
      }));
    } catch (error) {
      console.error('[DatabaseService] Error getting agent notifications:', error);
      throw error;
    }
  }

  async updateAgentNotification(notificationId, updateData) {
    try {
      const validatedId = this.validateString(notificationId, 'notificationId');
      
      const allowedFields = [
        'notification_type',
        'configuration',
        'is_enabled'
      ];

      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(key === 'configuration' ? JSON.stringify(value) : value);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(validatedId);

      const query = `
        UPDATE agent_notifications
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE notification_id = ?
      `;

      await this.client.execute({
        sql: query,
        args: values
      });

      return { success: true };
    } catch (error) {
      console.error('[DatabaseService] Error updating agent notification:', error);
      throw error;
    }
  }

  // Agent Execution Logs
  async createAgentExecutionLog(agentId, logData) {
    try {
      const validatedAgentId = this.validateString(agentId, 'agentId');
      const validatedFunctionId = this.validateString(logData.function_id, 'function_id');
      const validatedStatus = this.validateString(logData.status, 'status');
      
      const id = uuidv4();

      const query = `
        INSERT INTO agent_execution_logs (
          log_id,
          agent_id,
          function_id,
          transaction_hash,
          status,
          error_message,
          gas_used,
          gas_price,
          execution_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.client.execute({
        sql: query,
        args: [
          id,
          validatedAgentId,
          validatedFunctionId,
          logData.transaction_hash || null,
          validatedStatus,
          logData.error_message || null,
          logData.gas_used || null,
          logData.gas_price || null,
          logData.execution_time || new Date()
        ]
      });

      return { log_id: id };
    } catch (error) {
      console.error('[DatabaseService] Error creating agent execution log:', error);
      throw error;
    }
  }

  async getAgentExecutionLogs(agentId) {
    try {
      const validatedId = this.validateString(agentId, 'agentId');
      const result = await this.client.execute({
        sql: `
          SELECT * FROM agent_execution_logs 
          WHERE agent_id = ?
          ORDER BY execution_time DESC
        `,
        args: [validatedId]
      });

      return result.rows;
    } catch (error) {
      console.error('[DatabaseService] Error getting agent execution logs:', error);
      throw error;
    }
  }
}

module.exports = DatabaseService; 