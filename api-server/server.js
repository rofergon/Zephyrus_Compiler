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
        await fs.writeFile(contractPath, sourceCode);

        return new Promise((resolve, reject) => {
            const command = 'npx hardhat compile --force';
            
            exec(command, { cwd: process.cwd() }, async (error, stdout, stderr) => {
                if (error) {
                    console.log('Raw compilation error:', stderr);

                    // Detectar errores de importación de OpenZeppelin
                    const ozImportError = stderr.match(/Error HH404: File (@openzeppelin\/contracts\/.*?\.sol).*not found/);
                    if (ozImportError) {
                        reject({
                            type: 'ImportError',
                            errorType: 'DependencyNotFound',
                            message: `Missing OpenZeppelin import: ${ozImportError[1]}`,
                            details: {
                                missingFile: ozImportError[1],
                                possibleCause: 'OpenZeppelin contract import not found'
                            },
                            suggestion: [
                                "Make sure @openzeppelin/contracts is installed correctly:",
                                "1. Run 'npm install @openzeppelin/contracts'",
                                "2. Check that the import path is correct",
                                "3. Verify you're using a compatible version"
                            ].join('\n'),
                            errorCode: 'HH404',
                            helpUrl: 'https://hardhat.org/HH404'
                        });
                        return;
                    }

                    // Extraer y limpiar el error relevante
                    const errorLines = stderr.split('\n').map(line => line.trim()).filter(Boolean);
                    let errorMessage = '';
                    let lineNumber = null;
                    let columnNumber = null;
                    let errorCode = null;
                    let suggestion = '';
                    let notes = [];
                    let relevantSource = '';
                    let currentSection = 'main';
                    let errorType = '';
                    let helpUrl = '';

                    for (const line of errorLines) {
                        // Ignorar líneas de log de hardhat
                        if (line.startsWith('hardhat:')) continue;

                        // Capturar URL de ayuda si existe
                        if (line.includes('For more info go to')) {
                            helpUrl = line.match(/go to (https:\/\/\S+)/)?.[1] || '';
                            continue;
                        }

                        // Detectar tipo de error
                        const errorTypeMatch = line.match(/(TypeError|ParserError|Error|ImportError):/);
                        if (errorTypeMatch) {
                            errorType = errorTypeMatch[1];
                        }

                        // Detectar sección de notas
                        if (line.startsWith('Note:')) {
                            currentSection = 'note';
                            const noteMessage = line.replace('Note:', '').trim();
                            if (noteMessage) {
                                notes.push({
                                    message: noteMessage,
                                    location: null,
                                    source: ''
                                });
                            }
                            continue;
                        }

                        // Buscar el mensaje de error principal
                        if (errorTypeMatch) {
                            currentSection = 'main';
                            // Limpiar caracteres de escape y formateo
                            errorMessage = line
                                .replace(/\u001b\[\d+m/g, '')
                                .replace(/(?:Error|ParserError|TypeError): /g, '')
                                .replace(/\[.+?\]/g, '')
                                .trim();
                        }
                        
                        // Buscar la ubicación del error o nota
                        const locationMatch = line.match(/-->\s+(.+?):(\d+):(\d+):/);
                        if (locationMatch) {
                            const [_, file, line, column] = locationMatch;
                            if (currentSection === 'main') {
                                lineNumber = parseInt(line);
                                columnNumber = parseInt(column);
                            } else if (currentSection === 'note' && notes.length > 0) {
                                notes[notes.length - 1].location = {
                                    file: file.split('/').pop(),
                                    line: parseInt(line),
                                    column: parseInt(column)
                                };
                            }
                        }

                        // Capturar código fuente relevante
                        if (line.includes('|')) {
                            const sourceMatch = line.match(/\|\s*(\d+)?\s*\|(.*)/);
                            if (sourceMatch) {
                                const [_, lineNum, code] = sourceMatch;
                                const trimmedCode = code.trim();
                                if (trimmedCode) {
                                    if (currentSection === 'main') {
                                        relevantSource += trimmedCode + '\n';
                                    } else if (currentSection === 'note' && notes.length > 0) {
                                        notes[notes.length - 1].source = (notes[notes.length - 1].source || '') + trimmedCode + '\n';
                                    }
                                }
                            }
                        }

                        // Extraer código de error si existe
                        const errorCodeMatch = line.match(/Error ([A-Z]+\d+):/);
                        if (errorCodeMatch) {
                            errorCode = errorCodeMatch[1];
                        }
                    }

                    // Generar sugerencia basada en el tipo de error
                    if (errorMessage.includes('not found')) {
                        suggestion = [
                            'Check the following:',
                            '1. Verify that all imported files exist',
                            '2. Make sure all required dependencies are installed',
                            '3. Check import paths are correct',
                            '4. Run npm install if you haven\'t already'
                        ].join('\n');
                    } else if (errorMessage.includes('No arguments passed to the base constructor')) {
                        suggestion = `The contract inherits from another contract that requires constructor parameters. Add the required parameters to your constructor: ${notes.map(n => n.source.trim()).join(', ')}`;
                    } else if (errorMessage.includes('Expected')) {
                        suggestion = `Check the syntax near line ${lineNumber}. ${errorMessage}`;
                    } else if (errorMessage.includes('already declared')) {
                        suggestion = 'Remove or rename the duplicate declaration.';
                    }

                    const errorResponse = {
                        type: 'CompilationError',
                        errorType: errorType || 'Unknown',
                        message: errorMessage || stderr.split('\n')[0], // Usar la primera línea si no hay mensaje específico
                        location: lineNumber ? {
                            line: lineNumber,
                            column: columnNumber
                        } : null,
                        suggestion: suggestion || 'Check your contract syntax and make sure all dependencies are properly imported.',
                        errorCode,
                        notes: notes.length > 0 ? notes.map(note => ({
                            ...note,
                            source: note.source ? note.source.trim() : undefined
                        })) : undefined,
                        relevantSource: relevantSource.trim() || undefined,
                        helpUrl: helpUrl || undefined,
                        fullError: process.env.NODE_ENV === 'development' ? stderr : undefined
                    };

                    console.log('Structured error response:', JSON.stringify(errorResponse, null, 2));
                    reject(errorResponse);
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
                        reject({
                            type: 'ArtifactError',
                            message: 'Contract compilation failed',
                            details: `Could not generate artifact for "${contractName}"`,
                            suggestion: 'Verify that the contract name and syntax are correct'
                        });
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
                    reject({
                        type: 'ProcessingError',
                        message: 'Failed to process compilation',
                        details: err.message
                    });
                }
            });
        });
    } catch (err) {
        throw {
            type: 'SystemError',
            message: 'System error during compilation',
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        };
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
                type: 'ValidationError',
                message: 'Missing required fields',
                details: {
                    contractName: !contractName ? 'Contract name is required' : null,
                    sourceCode: !sourceCode ? 'Source code is required' : null
                },
                suggestion: "Provide both 'contractName' and 'sourceCode' fields"
            });
        }

        // Verificar que el nombre del contrato coincida con el código
        const contractNameRegex = /contract\s+(\w+)(?:\s+is\s+[^{]+)?\s*{/;
        const contractNameMatch = sourceCode.match(contractNameRegex);
        if (!contractNameMatch || contractNameMatch[1] !== contractName) {
            return res.status(400).json({
                type: 'ValidationError',
                message: 'Contract name mismatch',
                details: {
                    providedName: contractName,
                    foundName: contractNameMatch ? contractNameMatch[1] : 'not found'
                },
                location: contractNameMatch ? {
                    // Encontrar la línea donde está la declaración del contrato
                    line: sourceCode.substring(0, sourceCode.indexOf(contractNameMatch[0])).split('\n').length,
                    column: sourceCode.split('\n')[sourceCode.substring(0, sourceCode.indexOf(contractNameMatch[0])).split('\n').length - 1].indexOf('contract') + 1
                } : null,
                suggestion: "Make sure the contract name in the source code matches exactly with the provided name"
            });
        }

        // Verificar que el código incluye la versión de Solidity
        if (!sourceCode.includes('pragma solidity')) {
            return res.status(400).json({
                type: 'ValidationError',
                message: 'Missing Solidity version',
                details: 'The source code must include a pragma solidity statement',
                suggestion: "Add 'pragma solidity ^0.8.20;' at the beginning of your source code"
            });
        }

        const result = await compileContract(contractName, sourceCode);
        res.json({ 
            type: 'Success',
            message: 'Compilation successful',
            ...result
        });
    } catch (error) {
        // Si el error ya está estructurado, lo enviamos directamente
        if (error.type) {
            res.status(500).json(error);
        } else {
            // Si es un error no estructurado, lo formateamos
            res.status(500).json({ 
                type: 'UnknownError',
                message: 'An unexpected error occurred',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
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