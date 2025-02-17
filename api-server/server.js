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
    
    await fs.mkdir(contractsDir, { recursive: true });
    await fs.mkdir(scriptsDir, { recursive: true });
    
    return { contractsDir, scriptsDir };
}

// Función para compilar contrato
async function compileContract(contractName, sourceCode) {
    const { contractsDir } = await setupTempDirectories();
    const contractPath = path.join(contractsDir, `${contractName}.sol`);
    await fs.writeFile(contractPath, sourceCode);

    return new Promise((resolve, reject) => {
        exec('npx hardhat compile', { cwd: process.cwd() }, async (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                const artifactPath = path.join(
                    process.cwd(),
                    'artifacts/contracts',
                    `${contractName}.sol`,
                    `${contractName}.json`
                );
                
                const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
                resolve({
                    output: stdout,
                    artifact: {
                        abi: artifact.abi,
                        bytecode: artifact.bytecode
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    });
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
    console.log('Recibida petición de compilación');
    try {
        const { contractName, sourceCode } = req.body;
        console.log('Datos recibidos:', { contractName, sourceCodeLength: sourceCode?.length });

        if (!contractName || !sourceCode) {
            return res.status(400).json({ 
                error: 'Se requiere el nombre del contrato y el código fuente' 
            });
        }

        const compilationResult = await compileContract(contractName, sourceCode);
        
        res.json({ 
            message: 'Compilación exitosa',
            ...compilationResult
        });
    } catch (error) {
        console.error('Error en compilación:', error);
        res.status(500).json({ 
            error: 'Error en la compilación', 
            details: error.message 
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