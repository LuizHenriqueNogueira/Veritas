import './runtime-config.js';
import app from './app.js';

const PORT = process.env.PORT === undefined ? 3001 : Number(process.env.PORT);

const server=app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
  const address=server.address();const actualPort=address && typeof address==='object'?address.port:PORT;
  console.log(`VERITAS_READY:${actualPort}`);
  console.log(`=======================================================`);
  console.log(`  Veritas Backend - Servidor Iniciado`);
  console.log(`  Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
  console.log(`  API REST ativa em: http://localhost:${actualPort}/api`);
  console.log(`  Health Check: http://localhost:${actualPort}/api/health`);
  console.log(`=======================================================`);
});
