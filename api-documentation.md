# Documentación de la API de Zephyrus Compiler

## Información General

- **URL Base**: `http://xxxxxxxxxxxxxx/api`
- **Formato**: Todas las peticiones y respuestas usan formato JSON
- **CORS**: La API permite peticiones desde `http://localhost:5173`

## Endpoints Disponibles

### Smart Contracts

#### Compilar un Contrato
- **Endpoint**: `POST /compile`
- **Descripción**: Compila un contrato inteligente escrito en Solidity
- **Parámetros**:
  - `contractName` (string): Nombre del contrato
  - `sourceCode` (string): Código fuente del contrato en Solidity
- **Respuesta**:
  ```json
  {
    "success": true,
    "artifact": {
      "abi": [...],
      "bytecode": "0x..."
    }
  }
  ```


#### Desplegar un Contrato
- **Endpoint**: `POST /deploy`
- **Descripción**: Compila y despliega un contrato en la red Sonic
- **Parámetros**:
  - `contractName` (string): Nombre del contrato
  - `sourceCode` (string): Código fuente del contrato en Solidity
  - `constructorArgs` (array, opcional): Argumentos para el constructor
- **Respuesta**:
  ```json
  {
    "message": "Despliegue exitoso",
    "compilation": { ... },
    "deployment": {
      "output": "...",
      "contractAddress": "0x..."
    }
  }
  ```

### Usuarios

#### Crear Usuario
- **Endpoint**: `POST /db/users`
- **Descripción**: Registra un nuevo usuario
- **Parámetros**:
  - `walletAddress` (string): Dirección de la wallet del usuario
- **Respuesta**: `{ "success": true }`

#### Obtener Usuario
- **Endpoint**: `GET /db/users/:walletAddress`
- **Descripción**: Obtiene información de un usuario
- **Parámetros de URL**:
  - `walletAddress`: Dirección de la wallet del usuario
- **Respuesta**: Datos del usuario

### Conversaciones

#### Crear Conversación
- **Endpoint**: `POST /db/conversations`
- **Descripción**: Crea una nueva conversación
- **Parámetros**:
  - `walletAddress` (string): Dirección de la wallet del usuario
  - `name` (string): Nombre de la conversación
- **Respuesta**: Datos de la conversación creada

#### Obtener Conversaciones
- **Endpoint**: `GET /db/conversations/:walletAddress`
- **Descripción**: Obtiene todas las conversaciones de un usuario
- **Parámetros de URL**:
  - `walletAddress`: Dirección de la wallet del usuario
- **Respuesta**: Array de conversaciones

### Mensajes

#### Guardar Mensaje
- **Endpoint**: `POST /db/messages`
- **Descripción**: Guarda un mensaje en una conversación
- **Parámetros**:
  - `conversationId` (string): ID de la conversación
  - `content` (string): Contenido del mensaje
  - `sender` (string): Remitente del mensaje
  - `metadata` (object, opcional): Metadatos adicionales
- **Respuesta**: `{ "success": true }`

#### Obtener Mensajes
- **Endpoint**: `GET /db/messages/:conversationId`
- **Descripción**: Obtiene todos los mensajes de una conversación
- **Parámetros de URL**:
  - `conversationId`: ID de la conversación
- **Respuesta**: Array de mensajes

### Historial de Código

#### Guardar Historial de Código
- **Endpoint**: `POST /db/code-history`
- **Descripción**: Guarda una versión de código
- **Parámetros**:
  - `conversationId` (string): ID de la conversación
  - `code` (string): Código fuente
  - `language` (string): Lenguaje de programación
  - `version` (number): Número de versión
  - `metadata` (object, opcional): Metadatos adicionales
- **Respuesta**: `{ "success": true }`

#### Obtener Historial de Código
- **Endpoint**: `GET /db/code-history/:conversationId`
- **Descripción**: Obtiene el historial de código de una conversación
- **Parámetros de URL**:
  - `conversationId`: ID de la conversación
- **Respuesta**: Array con el historial de código

### Contratos Desplegados

#### Guardar Contrato Desplegado
- **Endpoint**: `POST /db/contracts`
- **Descripción**: Registra un contrato desplegado
- **Parámetros**:
  - Objeto con información del contrato (dirección, ABI, etc.)
- **Respuesta**: `{ "success": true }`

#### Obtener Contratos por Usuario
- **Endpoint**: `GET /db/contracts/:walletAddress`
- **Descripción**: Obtiene todos los contratos de un usuario
- **Parámetros de URL**:
  - `walletAddress`: Dirección de la wallet del usuario
- **Respuesta**: Array de contratos

#### Obtener Contratos por Conversación
- **Endpoint**: `GET /db/contracts/conversation/:conversationId`
- **Descripción**: Obtiene los contratos asociados a una conversación
- **Parámetros de URL**:
  - `conversationId`: ID de la conversación
- **Respuesta**: Array de contratos

#### Actualizar Conversación de un Contrato
- **Endpoint**: `PATCH /db/contracts/:contractId/conversation`
- **Descripción**: Actualiza la conversación asociada a un contrato
- **Parámetros de URL**:
  - `contractId`: ID del contrato (UUID)
- **Parámetros en el cuerpo**:
  - `conversationId` (string, **obligatorio**): ID de la nueva conversación
- **Respuesta exitosa**:
  - Código: 200 OK
  - Cuerpo: Objeto con la información del contrato actualizado
- **Respuestas de error**:
  - 400 Bad Request: `{ "error": "conversationId is required in the request body" }`
  - 404 Not Found: `{ "error": "Contract not found" }`
  - 500 Internal Server Error: `{ "error": "Error message" }`
- **Ejemplo de solicitud**:
  ```javascript
  await fetch('http://localhost:3000/api/db/contracts/1e5b0efd-813d-4eca-9e8e-8985a23d7caf/conversation', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      conversationId: '99865c1b-8c05-47ef-aa63-cfca245f36a1'
    })
  });
  ```

## Ejemplos de Uso

### Flujo de Trabajo Típico

1. **Crear un usuario**:
```javascript
await fetch('http://localhost:3000/api/db/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress: '0x123...' })
});
```

2. **Crear una conversación**:
```javascript
const conversationResponse = await fetch('http://localhost:3000/api/db/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    walletAddress: '0x123...',
    name: 'Mi Proyecto de Smart Contract' 
  })
});
const conversation = await conversationResponse.json();
```

3. **Compilar un contrato**:
```javascript
const compileResponse = await fetch('http://localhost:3000/api/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contractName: 'MiContrato',
    sourceCode: 'pragma solidity ^0.8.0; contract MiContrato { ... }'
  })
});
const compilationResult = await compileResponse.json();
```

4. **Desplegar un contrato**:
```javascript
const deployResponse = await fetch('http://localhost:3000/api/deploy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contractName: 'MiContrato',
    sourceCode: 'pragma solidity ^0.8.0; contract MiContrato { ... }',
    constructorArgs: [42, "Hola mundo"]
  })
});
const deploymentResult = await deployResponse.json();
```

5. **Guardar el contrato desplegado en la base de datos**:
```javascript
await fetch('http://localhost:3000/api/db/contracts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: deploymentResult.deployment.contractAddress,
    abi: compilationResult.artifact.abi,
    bytecode: compilationResult.artifact.bytecode,
    walletAddress: '0x123...',
    conversationId: conversation.id,
    name: 'MiContrato',
    network: 'sonic'
  })
});
```

6. **Actualizar la conversación asociada a un contrato**:
```javascript
try {
  const response = await fetch('http://localhost:3000/api/db/contracts/1e5b0efd-813d-4eca-9e8e-8985a23d7caf/conversation', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      conversationId: '99865c1b-8c05-47ef-aa63-cfca245f36a1'
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error al actualizar: ${errorData.error || response.statusText}`);
  }
  
  const result = await response.json();
  console.log('Contrato actualizado:', result);
} catch (error) {
  console.error('Error:', error.message);
}
```

## Notas Adicionales

- La API está diseñada para trabajar con la red Sonic Network para contratos inteligentes.
- Todos los timestamps se devuelven en formato UTC ISO.
- Los mensajes de error incluyen un código de estado HTTP apropiado y un mensaje descriptivo. 