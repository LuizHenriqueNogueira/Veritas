const fs = require('node:fs');
const path = require('node:path');
const {randomBytes} = require('node:crypto');
const target=path.join(__dirname,'../apps/api/.env');
if (!fs.existsSync(target)) {
  const example=fs.readFileSync(path.join(__dirname,'../apps/api/.env.example'),'utf8');
  fs.writeFileSync(target,example.replace(/^JWT_SECRET=$/m,`JWT_SECRET=${randomBytes(32).toString('hex')}`),{flag:'wx'});
  console.log('apps/api/.env criado com segredo exclusivo. Modo local ativado.');
} else console.log('apps/api/.env já existe; configuração preservada.');
