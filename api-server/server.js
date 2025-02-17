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

// Función para crear directorios temporales
async function setupTempDirectories() {
    const contractsDir = path.join(process.cwd(), 'contracts');
    const scriptsDir = path.join(process.cwd(), 'scripts');
    const artifactsDir = path.join(process.cwd(), 'artifacts');
    
    await fs.mkdir(contractsDir, { recursive: true });
    await fs.mkdir(scriptsDir, { recursive: true });
    await fs.mkdir(artifactsDir, { recursive: true });
    await fs.mkdir(path.join(artifactsDir, 'contracts'), { recursive: true });
    
    return { contractsDir, scriptsDir, artifactsDir };
}

// Función para compilar contrato
async function compileContract(contractName, sourceCode) {
    console.log(`Starting compilation for contract: ${contractName}`);
    const { contractsDir } = await setupTempDirectories();
    const contractPath = path.join(contractsDir, `${contractName}.sol`);
    
    try {
        // Guardar el contrato
        await fs.writeFile(contractPath, sourceCode);
        console.log(`Contract saved to: ${contractPath}`);
        console.log('Contract source code:', sourceCode);

        return new Promise((resolve, reject) => {
            // Ejecutar la compilación con más verbosidad
            const command = 'npx hardhat compile --force --verbose';
            console.log('Executing command:', command);
            
            exec(command, { cwd: process.cwd() }, async (error, stdout, stderr) => {
                console.log('Compilation stdout:', stdout);
                if (stderr) console.error('Compilation stderr:', stderr);

                if (error) {
                    console.error('Compilation error:', error);
                    reject(new Error(`Compilation failed: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`));
                    return;
                }

                try {
                    // Listar archivos en el directorio de artefactos para debug
                    const artifactsDir = path.join(process.cwd(), 'artifacts/contracts');
                    console.log('Listing artifacts directory:', artifactsDir);
                    const files = await fs.readdir(artifactsDir, { recursive: true });
                    console.log('Files in artifacts directory:', files);

                    const artifactPath = path.join(
                        process.cwd(),
                        'artifacts/contracts',
                        `${contractName}.sol`,
                        `${contractName}.json`
                    );
                    console.log(`Looking for artifact at: ${artifactPath}`);
                    
                    const artifactExists = await fs.access(artifactPath)
                        .then(() => true)
                        .catch(() => false);
                    
                    if (!artifactExists) {
                        console.error('Artifact not found. Directory contents:', await fs.readdir(path.dirname(artifactPath)));
                        throw new Error(`Compilation succeeded but artifact not found. This might indicate a contract name mismatch. Expected: ${contractName}`);
                    }

                    const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
                    console.log('Artifact loaded successfully');
                    
                    resolve({
                        output: stdout,
                        artifact: {
                            abi: artifact.abi,
                            bytecode: artifact.bytecode
                        }
                    });
                } catch (err) {
                    console.error('Error processing compilation result:', err);
                    reject(new Error(`Compilation succeeded but failed to process result: ${err.message}`));
                }
            });
        });
    } catch (err) {
        console.error('Error in compilation process:', err);
        throw new Error(`Failed to compile contract: ${err.message}`);
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

// Definir todas las rutas antes del middleware de error
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
            return res.status(400).json({ 
                error: 'Contract name and source code are required',
                received: {
                    contractName: !!contractName,
                    sourceCode: !!sourceCode
                },
                tip: "Only 'contractName' and 'sourceCode' fields are required"
            });
        }

        // Verificar que el nombre del contrato coincida con el código
        const contractNameRegex = /contract\s+(\w+)\s*{/;
        const contractNameMatch = sourceCode.match(contractNameRegex);
        if (!contractNameMatch || contractNameMatch[1] !== contractName) {
            return res.status(400).json({
                error: 'Contract name mismatch',
                details: `The contract name in the source code (${contractNameMatch ? contractNameMatch[1] : 'not found'}) does not match the provided name (${contractName})`,
                tip: "Make sure the contract name in sourceCode matches exactly with contractName"
            });
        }

        // Verificar que el código incluye la versión de Solidity
        if (!sourceCode.includes('pragma solidity')) {
            return res.status(400).json({
                error: 'Missing Solidity version',
                details: 'The source code must include a pragma solidity statement',
                tip: "Include 'pragma solidity ^0.8.20;' at the beginning of your source code"
            });
        }

        const compilationResult = await compileContract(contractName, sourceCode);
        
        res.json({ 
            message: 'Compilation successful',
            ...compilationResult
        });
    } catch (error) {
        console.error('Compilation error:', error);
        res.status(500).json({ 
            error: 'Compilation error', 
            details: error.message,
            stack: error.stack
        });
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

// Montar el router en /api
app.use('/api', router);

// Middleware para rutas no encontradas - debe ir después de todas las rutas definidas
app.use((req, res, next) => {
    console.log(`404 - Ruta no encontrada: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.url,
        method: req.method
    });
});

// Middleware para manejo de errores
app.use((err, req, res, next) => {
    console.error('Error interno del servidor:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message
    });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor API ejecutándose en http://localhost:${port}`);
    console.log('Rutas disponibles:');
    console.log('- POST /api/compile');
    console.log('- POST /api/deploy');
}); 