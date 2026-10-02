import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Veritas Backend - Servidor Iniciado`);
  console.log(`  Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
  console.log(`  API REST ativa em: http://localhost:${PORT}/api`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
