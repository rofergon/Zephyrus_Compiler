# Zephyrus Compiler

A powerful toolchain for Ethereum smart contract development, compilation, and interaction.

## Overview

Zephyrus Compiler is a comprehensive platform designed to simplify the development, testing, and deployment of smart contracts on Ethereum and compatible blockchains. It provides a seamless experience for developers to write, compile, deploy, and interact with smart contracts through a user-friendly API.

## Features

- **Smart Contract Compilation**: Compile Solidity smart contracts with detailed error reporting
- **Contract Deployment**: Deploy compiled contracts to Ethereum-compatible networks
- **Contract Interaction**: Read from and write to deployed contracts
- **BigInt Serialization**: Proper handling of BigInt values in contract responses
- **Temporary Directory Management**: Clean organization of contract artifacts and deployment scripts

## System Requirements

- Node.js (v14 or higher)
- npm/yarn
- Hardhat

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Zephyrus_Compiler.git
cd Zephyrus_Compiler

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
NODE_ENV=development
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
RPC_URL=your_ethereum_rpc_url
PRIVATE_KEY=your_ethereum_account_private_key
```

## Usage

### Starting the Server

```bash
npm start
```

### API Endpoints

The API is organized into several groups of endpoints:

#### Smart Contract Compilation and Deployment
- `POST /compile`: Compile a Solidity smart contract
- `POST /deploy`: Compile and deploy a contract to the network

#### Contract Interaction
- `POST /read`: Read data from a deployed contract (view/pure functions)
- `POST /write`: Write data to a deployed contract (state-modifying functions)

#### User Management
- `POST /users`: Create a new user with a wallet address
- `GET /users/:walletAddress`: Retrieve user information by wallet address

#### Conversation Management
- `POST /conversations`: Create a new conversation for a user
- `GET /conversations/:walletAddress`: Get all conversations for a specific user
- `PATCH /conversations/:conversationId/name`: Update a conversation's name

#### Messages
- `POST /messages`: Save a new message to a conversation
- `GET /messages/:conversationId`: Get all messages in a conversation

#### Code History
- `POST /code-history`: Save code history for a conversation
- `GET /code-history/:conversationId`: Get code history for a conversation

#### Contract Management
- `POST /contracts`: Save a deployed contract
- `POST /contracts/create`: Create a contract in the database
- `GET /contracts/:walletAddress`: Get all contracts deployed by a wallet address
- `GET /contracts/conversation/:conversationId`: Get all contracts associated with a conversation
- `PATCH /contracts/:contractId/conversation`: Update a contract's associated conversation

#### Agent Management
- `POST /agents`: Create a new agent for a contract
- `GET /agents/getById/:agentId`: Get an agent by ID
- `GET /agents/:contractId`: Get all agents for a specific contract
- `GET /agents/owner/:ownerAddress`: Get all agents owned by a specific address
- `PATCH /agents/:agentId`: Update an agent's information

For detailed API documentation, including request and response formats, see the [API Documentation](api-documentation.md).

## Project Structure

```
Zephyrus_Compiler/
├── api-server/           # Backend API server
│   ├── routes/           # API route handlers
│   └── server.js         # Main server file
├── api-docs/             # API documentation
├── src/                  # Source code
├── sql/                  # SQL scripts and database-related files
├── node_modules/         # Node.js dependencies
├── init-db.sql           # Database initialization script
├── package.json          # Project configuration
└── README.md             # This file
```

## Development

### Temporary Directories

The system creates and manages several temporary directories:
- `contracts/`: Source code of smart contracts
- `scripts/`: Deployment scripts
- `artifacts/`: Compiled contract artifacts
- `cache/`: Hardhat cache

These directories are automatically cleaned and set up when needed.


## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a new Pull Request

