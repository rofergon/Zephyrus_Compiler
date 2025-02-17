# Smart Contract Deployment API for Sonic Network

This API provides endpoints to compile and deploy smart contracts on the Sonic Network (testnet).

## Features

- Solidity contract compilation (v0.8.20)
- Automatic deployment to Sonic testnet
- Constructor arguments support
- Contract optimization enabled
- ABI and bytecode return

## Prerequisites

- Node.js v16 or higher
- npm or yarn
- A wallet with funds on Sonic testnet
- Wallet private key for deployment

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd api-server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file and add your private key:
```
PORT=3000
PRIVATE_KEY=your_private_key_here
```

## Usage

### Start the server

```bash
npm start
```

The server will start at `http://localhost:3000`

### Endpoints

#### 1. Compile Contract
```http
POST /api/compile
Content-Type: application/json

{
    "contractName": "MyContract",
    "sourceCode": "// Your Solidity code here"
}
```

#### 2. Deploy Contract
```http
POST /api/deploy
Content-Type: application/json

{
    "contractName": "MyContract",
    "sourceCode": "// Your Solidity code here",
    "constructorArgs": ["arg1", "arg2"]
}
```

### Examples

#### Compile a contract
```powershell
$body = @{
    contractName = "HelloSonic"
    sourceCode = @"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HelloSonic {
    string public message;
    
    constructor(string memory _message) {
        message = _message;
    }
    
    function setMessage(string memory _newMessage) public {
        message = _newMessage;
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
}
"@
}

$jsonBody = $body | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/compile" -Body $jsonBody -ContentType "application/json"
```

#### Deploy a contract
```powershell
$body = @{
    contractName = "HelloSonic"
    sourceCode = "// Your Solidity code here"
    constructorArgs = @("Hello Sonic Network!")
}

$jsonBody = $body | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/deploy" -Body $jsonBody -ContentType "application/json"
```

## Hardhat Configuration

The project uses Hardhat with the following configuration:
- Solidity version: 0.8.20
- Optimizer enabled (200 runs)
- Network: Sonic testnet (chainId: 57054)

## Project Structure

```
api-server/
├── contracts/         # Temporary directory for contracts
├── scripts/          # Deployment scripts
├── artifacts/        # Compiled contracts
├── server.js         # API Server
├── hardhat.config.js # Hardhat configuration
└── .env             # Environment variables
```

## Security

- Never share your private key
- Use only on testnet for testing
- Keep your dependencies updated
- Don't store sensitive information in the code

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Contact

For questions or support, please open an issue in the repository. 