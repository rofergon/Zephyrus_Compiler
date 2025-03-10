/**
 * Test script para crear un agente usando la API
 * 
 * Este script demuestra cómo utilizar la API para crear un agente completo 
 * incluyendo funciones, programación y notificaciones
 * 
 * Ejecución: node tests/create-agent.js
 */

// Usando fetch nativo de Node.js 18+
// No necesitamos importar node-fetch

// Configuración
const API_BASE_URL = 'http://localhost:3000/api/db';
const WALLET_ADDRESS = '0xaB6E247B25463F76E81aBAbBb6b0b86B40d45D38';
const CONTRACT_ID = '0x3ded337a401e234d40cf2a54d9291bf61692ca07';

// Datos del agente desde el frontend (adaptados para la API)
const agentConfig = {
  "agent": {
    "contractId": CONTRACT_ID,
    "name": "Smart Contract Agent",
    "description": "asdfwefsdfwef",
    "status": "paused",
    "gas_limit": "300000",
    "max_priority_fee": "1.5",
    "owner": WALLET_ADDRESS,
    "contract_state": {
      "paused": false,
      "symbol": "TST"
    }
  },
  "functions": [
    {
      "function_name": "approve",
      "function_signature": "approve(address,uint256)",
      "function_type": "write",
      "is_enabled": true,
      "validation_rules": {
        "spender": {},
        "value": {}
      },
      "abi": {
        "inputs": [
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    }
  ],
  "schedule": {
    "schedule_type": "cron",
    "cron_expression": "0 0 * * *",
    "is_active": true
  },
  "notifications": []
};

// Main function
async function createAgent() {
  try {
    console.log('Starting agent creation test');
    
    // 0. Create the contract in the contracts table (not in deployed_contracts)
    console.log('\nPreliminary step: Verifying/creating contract...');
    
    // Contract data
    const contractData = {
      contract_id: CONTRACT_ID,
      address: CONTRACT_ID,
      chain_id: 11155111, // Sepolia
      name: "TestToken",
      type: "ERC20",
      abi: JSON.stringify([{
        "inputs": [
          { "internalType": "address", "name": "spender", "type": "address" },
          { "internalType": "uint256", "name": "value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
      }]),
      deployed_at: new Date().toISOString(),
      owner_address: WALLET_ADDRESS
    };
    
    try {
      // Intentar crear el contrato
      console.log('Creating contract...');
      const createContractResponse = await fetch(`${API_BASE_URL}/contracts/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData)
      });
      
      console.log('Status of the response (contract):', createContractResponse.status);
      const responseText = await createContractResponse.text();
      console.log('Response (contract):', responseText);
      
      if (!createContractResponse.ok) {
        console.log('Error creating contract, but continuing in case it already exists');
      } else {
        console.log('Contract created successfully');
      }
    } catch (error) {
      console.error('Error verifying/creating contract:', error);
      // Continuamos aún si hay error
    }
    
    // 1. Create agent base
    console.log('\nStep 1: Creating agent base...');
    console.log('API URL:', `${API_BASE_URL}/agents`);
    console.log('Agent data:', JSON.stringify(agentConfig.agent, null, 2));

    try {
      const agentResponse = await fetch(`${API_BASE_URL}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentConfig.agent)
      });
      
      console.log('Status of the response:', agentResponse.status);
      const responseText = await agentResponse.text();
      console.log('Response:', responseText);
      
      if (!agentResponse.ok) {
        throw new Error(`Error creating agent: ${responseText}`);
      }
      
      const agentResult = JSON.parse(responseText);
      const agentId = agentResult.agent_id;
      console.log(`Agent created with ID: ${agentId}`);
      
      // 2. Create functions
      console.log('\nStep 2: Creating agent functions...');
      for (const functionData of agentConfig.functions) {
        const functionResponse = await fetch(`${API_BASE_URL}/agents/${agentId}/functions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(functionData)
        });
        
        if (!functionResponse.ok) {
          const errorText = await functionResponse.text();
          throw new Error(`Error creating function: ${errorText}`);
        }
        
        const functionResult = await functionResponse.json();
        console.log(`Function created with ID: ${functionResult.function_id}`);
      }
      
      // 3. Create schedule
      if (agentConfig.schedule) {
        console.log('\nStep 3: Configuring schedule...');
        const scheduleResponse = await fetch(`${API_BASE_URL}/agents/${agentId}/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentConfig.schedule)
        });
        
        if (!scheduleResponse.ok) {
          const errorText = await scheduleResponse.text();
          throw new Error(`Error creating schedule: ${errorText}`);
        }
        
        const scheduleResult = await scheduleResponse.json();
        console.log(`Schedule created with ID: ${scheduleResult.schedule_id}`);
      }
      
      // 4. Create notifications
      if (agentConfig.notifications && agentConfig.notifications.length > 0) {
        console.log('\nStep 4: Configuring notifications...');
        for (const notificationData of agentConfig.notifications) {
          const notificationResponse = await fetch(`${API_BASE_URL}/agents/${agentId}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notificationData)
          });
          
          if (!notificationResponse.ok) {
            const errorText = await notificationResponse.text();
            throw new Error(`Error creating notification: ${errorText}`);
          }
          
          const notificationResult = await notificationResponse.json();
          console.log(`Notification created with ID: ${notificationResult.notification_id}`);
        }
      } else {
        console.log('\nStep 4: No notifications to configure');
      }
      
      // 5. Verify complete creation
      console.log('\nStep 5: Verifying agent creation...');
      const verifyResponse = await fetch(`${API_BASE_URL}/agents/${CONTRACT_ID}`);
      
      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        throw new Error(`Error verifying agent: ${errorText}`);
      }
      
      const agents = await verifyResponse.json();
      console.log(`Verification completed, ${agents.length} agent(s) found for the contract`);
      
      // Verify functions
      const functionsResponse = await fetch(`${API_BASE_URL}/agents/${agentId}/functions`);
      if (functionsResponse.ok) {
        const functions = await functionsResponse.json();
        console.log(`Function verification completed, ${functions.length} function(s) found`);
      }
      
      // Verify schedule
      const schedulesResponse = await fetch(`${API_BASE_URL}/agents/${agentId}/schedules`);
      if (schedulesResponse.ok) {
        const schedules = await schedulesResponse.json();
        console.log(`Schedule verification completed, ${schedules.length} schedule(s) found`);
      }
      
      console.log('\nAgent creation test completed successfully');
      console.log(`Summary: Agent ID ${agentId} created for contract ${CONTRACT_ID}`);
      
      return {
        success: true,
        agentId,
        message: 'Agent created completely'
      };
    } catch (err) {
      console.error('Error in step 1:', err);
      throw err;
    }
  } catch (error) {
    console.error('\nError during test:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar el test si se llama directamente
if (require.main === module) {
  createAgent()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { createAgent }; 