# API de Base de Datos - Documentación

Esta documentación describe los endpoints disponibles para interactuar con la base de datos de Zephyrus.

## Base URL

```
http://localhost:3000/api/db
```

## Endpoints

### Usuarios

#### Crear Usuario
```http
POST /users
Content-Type: application/json

{
    "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Respuesta exitosa (200)**
```json
{
    "success": true
}
```

**Error de validación (400)**
```json
{
    "error": "walletAddress is required"
}
```

#### Obtener Usuario
```http
GET /users/:walletAddress
```

**Respuesta exitosa (200)**
```json
{
    "wallet_address": "0x1234567890123456789012345678901234567890",
    "created_at": "2024-03-20T12:00:00.000Z"
}
```

**Usuario no encontrado (404)**
```json
{
    "error": "User not found"
}
```

### Conversaciones

#### Crear Conversación
```http
POST /conversations
Content-Type: application/json

{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "name": "Mi Nueva Conversación"
}
```

**Respuesta exitosa**
```json
{
    "id": "uuid-de-la-conversacion"
}
```

#### Obtener Conversaciones de un Usuario
```http
GET /conversations/:walletAddress
```

**Respuesta exitosa**
```json
[
    {
        "id": "uuid-de-la-conversacion",
        "name": "Mi Nueva Conversación",
        "user_wallet": "0x1234567890123456789012345678901234567890",
        "created_at": "2024-03-20T12:00:00.000Z",
        "last_accessed": "2024-03-20T12:00:00.000Z"
    }
]
```

### Mensajes

#### Guardar Mensaje
```http
POST /messages
Content-Type: application/json

{
    "conversationId": "uuid-de-la-conversacion",
    "content": "Contenido del mensaje",
    "sender": "user",
    "metadata": {
        "key": "value"
    }
}
```

**Respuesta exitosa**
```json
{
    "success": true
}
```

#### Obtener Mensajes de una Conversación
```http
GET /messages/:conversationId
```

**Respuesta exitosa**
```json
[
    {
        "id": "uuid-del-mensaje",
        "conversation_id": "uuid-de-la-conversacion",
        "content": "Contenido del mensaje",
        "sender": "user",
        "metadata": {
            "key": "value"
        },
        "created_at": "2024-03-20T12:00:00.000Z"
    }
]
```

### Historial de Código

#### Guardar Historial de Código
```http
POST /code-history
Content-Type: application/json

{
    "conversationId": "uuid-de-la-conversacion",
    "code": "pragma solidity ^0.8.0;...",
    "language": "solidity",
    "version": "0.8.0",
    "metadata": {
        "key": "value"
    }
}
```

**Respuesta exitosa**
```json
{
    "success": true
}
```

#### Obtener Historial de Código
```http
GET /code-history/:conversationId
```

**Respuesta exitosa**
```json
[
    {
        "id": "uuid-del-codigo",
        "conversation_id": "uuid-de-la-conversacion",
        "code_content": "pragma solidity ^0.8.0;...",
        "language": "solidity",
        "version": "0.8.0",
        "metadata": {
            "key": "value"
        },
        "created_at": "2024-03-20T12:00:00.000Z"
    }
]
```

### Contratos

#### Guardar Contrato Desplegado
```http
POST /contracts
Content-Type: application/json

{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "conversationId": "uuid-de-la-conversacion",
    "contractAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
    "name": "MiContrato",
    "abi": [...],
    "bytecode": "0x...",
    "sourceCode": "pragma solidity ^0.8.0;...",
    "compilerVersion": "0.8.0",
    "constructorArgs": [],
    "networkId": 57054
}
```

**Respuesta exitosa**
```json
{
    "success": true
}
```

#### Obtener Contratos por Wallet
```http
GET /contracts/:walletAddress
```

**Respuesta exitosa**
```json
[
    {
        "id": "uuid-del-contrato",
        "user_wallet": "0x1234567890123456789012345678901234567890",
        "conversation_id": "uuid-de-la-conversacion",
        "contract_address": "0xabcdef1234567890abcdef1234567890abcdef12",
        "name": "MiContrato",
        "abi": [...],
        "bytecode": "0x...",
        "source_code": "pragma solidity ^0.8.0;...",
        "compiler_version": "0.8.0",
        "constructor_args": [],
        "network_id": 57054,
        "deployed_at": "2024-03-20T12:00:00.000Z"
    }
]
```

#### Obtener Contratos por Conversación
```http
GET /contracts/conversation/:conversationId
```

**Respuesta exitosa**
```json
[
    {
        "id": "uuid-del-contrato",
        "user_wallet": "0x1234567890123456789012345678901234567890",
        "conversation_id": "uuid-de-la-conversacion",
        "contract_address": "0xabcdef1234567890abcdef1234567890abcdef12",
        "name": "MiContrato",
        "abi": [...],
        "bytecode": "0x...",
        "source_code": "pragma solidity ^0.8.0;...",
        "compiler_version": "0.8.0",
        "constructor_args": [],
        "network_id": 57054,
        "deployed_at": "2024-03-20T12:00:00.000Z"
    }
]
```

## Códigos de Estado HTTP

La API utiliza los siguientes códigos de estado HTTP:

- `200 OK`: La solicitud se completó exitosamente
- `400 Bad Request`: Error de validación en los datos de entrada (ej: campos faltantes o inválidos)
- `404 Not Found`: El recurso solicitado no existe
- `500 Internal Server Error`: Error interno del servidor o de la base de datos

## Formato de Errores

Todos los errores siguen un formato consistente:

```json
{
    "error": "Mensaje descriptivo del error"
}
```

### Ejemplos de errores comunes:

1. Error de validación (400):
```json
{
    "error": "walletAddress is required"
}
```

2. Recurso no encontrado (404):
```json
{
    "error": "User not found"
}
```

3. Error interno (500):
```json
{
    "error": "Database error"
}
```

## Notas Adicionales

- Todos los timestamps están en formato ISO 8601
- Las direcciones de wallet deben ser direcciones Ethereum válidas (0x...)
- Los IDs de conversación son UUIDs v4
- Los metadatos son opcionales y pueden contener cualquier objeto JSON válido
- La red por defecto es Sonic (networkId: 57054)
- Todas las respuestas incluyen el header `Content-Type: application/json` 