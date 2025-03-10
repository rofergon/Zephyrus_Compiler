const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://f83cd6f64f06.ngrok.app', 'https://d35ce25fa7fd.ngrok.app', 'https://3ea5d3427422.ngrok.app', 'https://zephyrus-frontend.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'https://f83cd6f64f06.ngrok.app', 'https://d35ce25fa7fd.ngrok.app', 'https://3ea5d3427422.ngrok.app', 'https://zephyrus-frontend.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Preflight results can be cached for 24 hours
};

// Apply CORS configuration
app.use(cors(corsOptions));

// Parse JSON request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Ensure JSON content type for all responses
app.use((req, res, next) => {
  res.type('json');
  next();
});

// Logging middleware for debugging CORS
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Function to clean directory
async function cleanDirectory(directory) {
    try {
        const files = await fs.readdir(directory);
        for (const file of files) {
            await fs.unlink(path.join(directory, file));
        }
        console.log(`Cleaned directory: ${directory}`);
    } catch (error) {
        console.error(`Error cleaning directory ${directory}:`, error);
    }
}

// Function to create temporary directories
async function setupTempDirectories() {
    const contractsDir = path.join(process.cwd(), 'contracts');
    const scriptsDir = path.join(process.cwd(), 'scripts');
    const artifactsDir = path.join(process.cwd(), 'artifacts');
    const cacheDir = path.join(process.cwd(), 'cache');
    
    try {
        // Intentar limpiar directorios de manera más segura
        await Promise.all([
            fs.rm(contractsDir, { recursive: true, force: true }).catch(() => {}),
            fs.rm(path.join(artifactsDir, 'contracts'), { recursive: true, force: true }).catch(() => {}),
            fs.rm(cacheDir, { recursive: true, force: true }).catch(() => {})
        ]);

        // Wait a moment for Windows to release the files
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Crear directorios
        await Promise.all([
            fs.mkdir(contractsDir, { recursive: true }),
            fs.mkdir(scriptsDir, { recursive: true }),
            fs.mkdir(artifactsDir, { recursive: true }),
            fs.mkdir(path.join(artifactsDir, 'contracts'), { recursive: true }),
            fs.mkdir(cacheDir, { recursive: true })
        ]);
        
        return { contractsDir, scriptsDir, artifactsDir };
    } catch (error) {
        console.error('Error in setupTempDirectories:', error);
        throw error;
    }
}

// Function to compile contract
async function compileContract(contractName, sourceCode) {
    console.log(`Starting compilation for contract: ${contractName}`);
    const { contractsDir } = await setupTempDirectories();
    const contractPath = path.join(contractsDir, `${contractName}.sol`);
    
    try {
        // Escribir el contrato
        await fs.writeFile(contractPath, sourceCode);

        return new Promise((resolve, reject) => {
            const command = 'npx hardhat compile --force';
            
            exec(command, { cwd: process.cwd() }, async (error, stdout, stderr) => {
                if (error) {
                    console.log('Raw compilation error:', stderr);
                    
                    // Clean ANSI escape characters and format the error
                    const cleanError = stderr
                        .replace(/\u001b\[\d+m/g, '') // Remove ANSI color codes
                        .replace(/\r\n/g, '\n')       // Normalize line breaks
                        .split('\n')                  // Split into lines
                        .filter(line => 
                            line.trim() &&            // Remove empty lines
                            !line.includes('For more info') && // Remove additional info line
                            !line.includes('--stack-traces')   // Remove stack traces line
                        )
                        .join('\n');                 // Rejoin the lines

                    reject(cleanError);
                    return;
                }

                try {
                    const artifactPath = path.join(
                        process.cwd(),
                        'artifacts/contracts',
                        `${contractName}.sol`,
                        `${contractName}.json`
                    );
                    
                    const artifactExists = await fs.access(artifactPath)
                        .then(() => true)
                        .catch(() => false);
                    
                    if (!artifactExists) {
                        reject('Contract compilation failed: Could not generate artifact');
                        return;
                    }

                    const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
                    resolve({
                        success: true,
                        artifact: {
                            abi: artifact.abi,
                            bytecode: artifact.bytecode
                        }
                    });
                } catch (err) {
                    reject('Failed to process compilation: ' + err.message);
                }
            });
        });
    } catch (err) {
        // Limpiar en caso de error
        await cleanDirectory(contractsDir).catch(console.error);
        throw 'System error during compilation: ' + err.message;
    }
}

// Function to create deployment script
async function createDeployScript(contractName, constructorArgs = []) {
    const argsString = constructorArgs.map(arg => {
        if (typeof arg === 'string') {
            return `"${arg}"`;
        }
        return arg;
    }).join(', ');

    const deployScript = `
const hre = require("hardhat");

async function main() {
    const Contract = await hre.ethers.getContractFactory("${contractName}");
    const contract = await Contract.deploy(${argsString});
    await contract.waitForDeployment();
    
    console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});`;

    await fs.writeFile(path.join(process.cwd(), 'scripts', 'deploy.js'), deployScript);
}

// Function to deploy contract
async function deployContract(contractName, constructorArgs = []) {
    await createDeployScript(contractName, constructorArgs);

    return new Promise((resolve, reject) => {
        exec('npx hardhat run scripts/deploy.js --network sonic', 
            { cwd: process.cwd() },
            (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                const addressMatch = stdout.match(/Contract deployed to: (0x[a-fA-F0-9]{40})/);
                const contractAddress = addressMatch ? addressMatch[1] : null;
                
                resolve({
                    output: stdout,
                    contractAddress
                });
            }
        );
    });
}

// Import routers
const databaseRouter = require('./routes/database');
const contractInteractionRouter = require('./routes/contractInteraction');

// Define all routes before error middleware
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'API de Contratos Inteligentes' });
});

router.post('/compile', async (req, res) => {
    console.log('Received compilation request');
    try {
        const { contractName, sourceCode } = req.body;
        console.log('Received data:', { 
            contractName, 
            sourceCodeLength: sourceCode?.length,
            sourceCodePreview: sourceCode?.substring(0, 200) + '...',
            receivedFields: Object.keys(req.body)
        });

        // Verify that the contract name matches the code
        const contractNameRegex = /contract\s+(\w+)(?:\s+is\s+[^{]+)?\s*{/;
        const contractNameMatch = sourceCode.match(contractNameRegex);
        if (!contractNameMatch || contractNameMatch[1] !== contractName) {
            return res.status(400).json('Contract name mismatch: The provided name does not match the contract name in the source code');
        }

        // Verify that the code includes the Solidity version
        if (!sourceCode.includes('pragma solidity')) {
            return res.status(400).json('Missing Solidity version: The source code must include a pragma solidity statement');
        }

        const result = await compileContract(contractName, sourceCode);
        res.json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});

router.post('/deploy', async (req, res) => {
    console.log('Recibida petición de despliegue');
    try {
        const { contractName, sourceCode, constructorArgs = [] } = req.body;
        console.log('Datos recibidos:', { 
            contractName, 
            sourceCodeLength: sourceCode?.length,
            constructorArgs 
        });

        if (!contractName || !sourceCode) {
            return res.status(400).json({ 
                error: 'Contract name and source code are required' 
            });
        }

        // First we compile the contract
        console.log('Compiling contract...');
        const compilationResult = await compileContract(contractName, sourceCode);

        // Luego desplegamos
        console.log('Desplegando contrato...');
        const deploymentResult = await deployContract(contractName, constructorArgs);

        res.json({
            message: 'Despliegue exitoso',
            compilation: compilationResult,
            deployment: deploymentResult
        });
    } catch (error) {
        console.error('Error en el endpoint de despliegue:', error);
        res.status(500).json({ 
            error: 'Error en el servidor', 
            details: error.message 
        });
    }
});

// Mount routers
app.use('/api', router);
app.use('/api/db', databaseRouter);
app.use('/api/contracts', contractInteractionRouter);

// Middleware for not found routes - must go after all defined routes
app.use((req, res, next) => {
    console.log(`404 - Ruta no encontrada: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.url,
        method: req.method
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error interno del servidor:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message
    });
});

// Vercel specific - Export the Express app
module.exports = app;

// Only listen if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`API Server running at http://localhost:${port}`);
        console.log('Available Routes:');
        console.log('- POST /api/compile');
        console.log('- POST /api/deploy');
        console.log('- POST /api/db/users');
        console.log('- GET /api/db/users/:walletAddress');
        console.log('- POST /api/db/conversations');
        console.log('- GET /api/db/conversations/:walletAddress');
        console.log('- POST /api/db/messages');
        console.log('- GET /api/db/messages/:conversationId');
        console.log('- POST /api/db/code-history');
        console.log('- GET /api/db/code-history/:conversationId');
        console.log('- POST /api/db/contracts');
        console.log('- GET /api/db/contracts/:walletAddress');
        console.log('- GET /api/db/contracts/conversation/:conversationId');
        console.log('- PATCH /api/db/contracts/:contractId/conversation');
        console.log('\nAgent Routes:');
        console.log('- POST /api/db/agents');
        console.log('- GET /api/db/agents/:contractId');
        console.log('- GET /api/db/agents/getById/:agentId');
        console.log('- GET /api/db/agents/owner/:ownerAddress');
        console.log('- PATCH /api/db/agents/:agentId');
        console.log('\nAgent Functions Routes:');
        console.log('- POST /api/db/agents/:agentId/functions');
        console.log('- GET /api/db/agents/:agentId/functions');
        console.log('- PATCH /api/db/agents/functions/:functionId');
        console.log('\nAgent Schedule Routes:');
        console.log('- POST /api/db/agents/:agentId/schedules');
        console.log('- GET /api/db/agents/:agentId/schedules');
        console.log('- PATCH /api/db/agents/schedules/:scheduleId');
        console.log('\nAgent Notification Routes:');
        console.log('- POST /api/db/agents/:agentId/notifications');
        console.log('- GET /api/db/agents/:agentId/notifications');
        console.log('- PATCH /api/db/agents/notifications/:notificationId');
        console.log('\nExecution Log Routes:');
        console.log('- POST /api/db/agents/:agentId/logs');
        console.log('- GET /api/db/agents/:agentId/logs');
    });
} 