const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Función para limpiar directorio
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

// Función para crear directorios temporales
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

        // Esperar un momento para que Windows libere los archivos
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
        console.error('Error en setupTempDirectories:', error);
        throw error;
    }
}

// Función para compilar contrato
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
                    
                    // Limpiar caracteres de escape ANSI y formatear el error
                    const cleanError = stderr
                        .replace(/\u001b\[\d+m/g, '') // Eliminar códigos de color ANSI
                        .replace(/\r\n/g, '\n')       // Normalizar saltos de línea
                        .split('\n')                  // Dividir en líneas
                        .filter(line => 
                            line.trim() &&            // Eliminar líneas vacías
                            !line.includes('For more info') && // Eliminar línea de info adicional
                            !line.includes('--stack-traces')   // Eliminar línea de stack traces
                        )
                        .join('\n');                 // Volver a unir las líneas

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

// Función para crear script de despliegue
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

// Función para desplegar contrato
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

        // Validar campos requeridos
        if (!contractName || !sourceCode) {
            return res.status(400).json('Missing required fields: contractName and sourceCode are required');
        }

        // Verificar que el nombre del contrato coincida con el código
        const contractNameRegex = /contract\s+(\w+)(?:\s+is\s+[^{]+)?\s*{/;
        const contractNameMatch = sourceCode.match(contractNameRegex);
        if (!contractNameMatch || contractNameMatch[1] !== contractName) {
            return res.status(400).json('Contract name mismatch: The provided name does not match the contract name in the source code');
        }

        // Verificar que el código incluye la versión de Solidity
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
                error: 'Se requiere el nombre del contrato y el código fuente' 
            });
        }

        // Primero compilamos el contrato
        console.log('Compilando contrato...');
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
        console.log(`Servidor API ejecutándose en http://localhost:${port}`);
        console.log('Rutas disponibles:');
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
    });
} 