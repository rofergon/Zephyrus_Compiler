# Documentación del Servicio de Agentes

Esta documentación describe cómo utilizar el servicio de agentes de la API, incluyendo todos los endpoints disponibles y ejemplos de uso.

## Índice
- [Agentes](#agentes)
- [Funciones de Agentes](#funciones-de-agentes)
- [Programación de Agentes](#programación-de-agentes)
- [Notificaciones](#notificaciones)
- [Logs de Ejecución](#logs-de-ejecución)

## Agentes

### Crear un Agente
**Endpoint:** `POST /api/db/agents`

Crea un nuevo agente asociado a un contrato.

**Parámetros de la Solicitud:**
```json
{
  "contractId": "string (requerido)",
  "name": "string (requerido)",
  "description": "string (opcional)",
  "status": "string (opcional, default: 'paused')",
  "gas_limit": "string (opcional)",
  "max_priority_fee": "string (opcional)",
  "owner": "string (requerido)",
  "contract_state": "object (opcional)"
}
```

**Ejemplo de Respuesta:**
```json
{
  "agent_id": "uuid-generado"
}
```

### Obtener Agentes por Contrato
**Endpoint:** `GET /api/db/agents/:contractId`

Obtiene todos los agentes asociados a un contrato específico.

**Ejemplo de Respuesta:**
```json
[
  {
    "agent_id": "string",
    "contract_id": "string",
    "name": "string",
    "description": "string",
    "status": "active|paused|stopped",
    "gas_limit": "string",
    "max_priority_fee": "string",
    "owner": "string",
    "contract_state": {},
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

### Actualizar un Agente
**Endpoint:** `PATCH /api/db/agents/:agentId`

Actualiza la información de un agente existente.

**Parámetros de la Solicitud:**
```json
{
  "name": "string (opcional)",
  "description": "string (opcional)",
  "status": "string (opcional)",
  "gas_limit": "string (opcional)",
  "max_priority_fee": "string (opcional)",
  "contract_state": "object (opcional)"
}
```

## Funciones de Agentes

### Crear una Función
**Endpoint:** `POST /api/db/agents/:agentId/functions`

Crea una nueva función para un agente.

**Parámetros de la Solicitud:**
```json
{
  "function_name": "string (requerido)",
  "function_signature": "string (requerido)",
  "function_type": "read|write|payable (requerido)",
  "is_enabled": "boolean (opcional, default: true)",
  "validation_rules": "object (opcional)",
  "abi": "object (opcional)",
  "parameters": [
    {
      "param_name": "string (requerido)",
      "param_type": "string (requerido)",
      "default_value": "string (opcional)",
      "validation_rules": "object (opcional)"
    }
  ]
}
```

### Obtener Funciones de un Agente
**Endpoint:** `GET /api/db/agents/:agentId/functions`

Obtiene todas las funciones asociadas a un agente.

### Actualizar una Función
**Endpoint:** `PATCH /api/db/agents/functions/:functionId`

Actualiza una función existente.

**Parámetros de la Solicitud:**
```json
{
  "function_name": "string (opcional)",
  "function_signature": "string (opcional)",
  "function_type": "string (opcional)",
  "is_enabled": "boolean (opcional)",
  "validation_rules": "object (opcional)",
  "abi": "object (opcional)",
  "parameters": [] // opcional, actualiza todos los parámetros
}
```

## Programación de Agentes

### Crear una Programación
**Endpoint:** `POST /api/db/agents/:agentId/schedules`

Crea una nueva programación para un agente.

**Parámetros de la Solicitud:**
```json
{
  "schedule_type": "interval|cron (requerido)",
  "interval_seconds": "number (requerido si type es interval)",
  "cron_expression": "string (requerido si type es cron)",
  "next_execution": "timestamp (opcional)",
  "is_active": "boolean (opcional, default: true)"
}
```

### Obtener Programaciones
**Endpoint:** `GET /api/db/agents/:agentId/schedules`

Obtiene todas las programaciones de un agente.

### Actualizar una Programación
**Endpoint:** `PATCH /api/db/agents/schedules/:scheduleId`

Actualiza una programación existente.

## Notificaciones

### Crear una Notificación
**Endpoint:** `POST /api/db/agents/:agentId/notifications`

Crea una nueva configuración de notificación para un agente.

**Parámetros de la Solicitud:**
```json
{
  "notification_type": "email|discord|telegram (requerido)",
  "configuration": "object (requerido)",
  "is_enabled": "boolean (opcional, default: true)"
}
```

### Obtener Notificaciones
**Endpoint:** `GET /api/db/agents/:agentId/notifications`

Obtiene todas las configuraciones de notificación de un agente.

### Actualizar una Notificación
**Endpoint:** `PATCH /api/db/agents/notifications/:notificationId`

Actualiza una configuración de notificación existente.

## Logs de Ejecución

### Crear un Log de Ejecución
**Endpoint:** `POST /api/db/agents/:agentId/logs`

Registra un nuevo log de ejecución para un agente.

**Parámetros de la Solicitud:**
```json
{
  "function_id": "string (requerido)",
  "transaction_hash": "string (opcional)",
  "status": "pending|success|failed (requerido)",
  "error_message": "string (opcional)",
  "gas_used": "string (opcional)",
  "gas_price": "string (opcional)",
  "execution_time": "timestamp (opcional, default: current time)"
}
```

### Obtener Logs de Ejecución
**Endpoint:** `GET /api/db/agents/:agentId/logs`

Obtiene todos los logs de ejecución de un agente, ordenados por fecha de ejecución descendente.

## Ejemplos de Uso

### Crear y Configurar un Agente
```javascript
// 1. Crear un agente
const agentResponse = await fetch('/api/db/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contractId: "contract-123",
    name: "Price Monitor",
    description: "Monitors token price changes",
    owner: "0x123..."
  })
});
const { agent_id } = await agentResponse.json();

// 2. Añadir una función
await fetch(`/api/db/agents/${agent_id}/functions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    function_name: "checkPrice",
    function_signature: "checkPrice()",
    function_type: "read",
    parameters: []
  })
});

// 3. Configurar programación
await fetch(`/api/db/agents/${agent_id}/schedules`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    schedule_type: "interval",
    interval_seconds: 3600 // cada hora
  })
});

// 4. Configurar notificaciones
await fetch(`/api/db/agents/${agent_id}/notifications`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notification_type: "discord",
    configuration: {
      webhook_url: "https://discord.com/api/webhooks/..."
    }
  })
});
```

### Monitorear la Ejecución
```javascript
// Obtener logs de ejecución
const logsResponse = await fetch(`/api/db/agents/${agent_id}/logs`);
const logs = await logsResponse.json();

// Analizar resultados
const successfulExecutions = logs.filter(log => log.status === 'success');
const failedExecutions = logs.filter(log => log.status === 'failed');
```

## Notas Importantes

1. Todos los endpoints requieren autenticación apropiada.
2. Las timestamps deben estar en formato ISO 8601.
3. Los IDs son UUIDs generados por el servidor.
4. Los estados de agente válidos son: 'active', 'paused', 'stopped'.
5. Los tipos de función válidos son: 'read', 'write', 'payable'.
6. Los tipos de programación válidos son: 'interval', 'cron'.
7. Los tipos de notificación válidos son: 'email', 'discord', 'telegram'.
8. Los estados de ejecución válidos son: 'pending', 'success', 'failed'.

## Manejo de Errores

La API devuelve errores en el siguiente formato:
```json
{
  "error": "Mensaje descriptivo del error"
}
```

Códigos de estado HTTP comunes:
- 200: Éxito
- 400: Error en la solicitud
- 404: Recurso no encontrado
- 500: Error interno del servidor 