/**
 * Script para ejecutar la prueba de creación de agente
 * 
 * Ejecución: node test-agent.js
 */

const { createAgent } = require('./tests/create-agent');

console.log('Ejecutando prueba de creación de agente');

process.on('unhandledRejection', (reason, promise) => {
  console.error('Rechazo no manejado en:', promise);
  console.error('Razón:', reason);
  process.exit(1);
});

createAgent()
  .then(result => {
    console.log('\nResultado de la prueba:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('La prueba falló');
      process.exit(1);
    } else {
      console.log('La prueba se completó con éxito');
    }
  })
  .catch(error => {
    console.error('Error durante la ejecución de la prueba:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }); 