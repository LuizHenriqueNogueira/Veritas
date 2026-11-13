const fs=require('node:fs'),path=require('node:path');
const backend=path.resolve(__dirname,'../apps/api'),filename=path.join(backend,'.env');
require('node:module').createRequire(path.join(backend,'package.json'))('dotenv').config({path:filename,quiet:true});
const email=process.argv[2]?.trim().toLowerCase();
if(!email || !email.includes('@')){console.error('Uso: npm run admin:configurar -- email-da-conta-existente');process.exit(1);}
if(process.env.USE_POSTGRES==='true'){console.error('Esta ferramenta configura a instalação SQLite. Em PostgreSQL, defina ADMIN_USER_ID e ADMIN_EMAIL no ambiente privado usando a conta existente.');process.exit(1);}
if(!fs.existsSync(filename)){console.error('Execute npm run setup antes de configurar o administrador.');process.exit(1);}
const {DatabaseSync}=require('node:sqlite');
const data=path.resolve(backend,process.env.DATA_DIR || 'data'),dbPath=path.resolve(backend,process.env.SQLITE_DB_PATH || path.join(data,'veritas.db'));
try{
 const db=new DatabaseSync(dbPath,{readOnly:true});
 const usuario=db.prepare('SELECT id,email FROM usuario WHERE lower(trim(email))=?').get(email);db.close();
 if(!usuario)throw new Error('Conta não encontrada. Cadastre a conta no Veritas antes de conceder acesso.');
 let text=fs.readFileSync(filename,'utf8');
 for(const [name,value] of Object.entries({ADMIN_USER_ID:usuario.id,ADMIN_EMAIL:usuario.email.trim().toLowerCase()})){
  const pattern=new RegExp('^'+name+'\\s*=.*$','m');text=pattern.test(text)?text.replace(pattern,name+'='+value):text.trimEnd()+'\n'+name+'='+value+'\n';
 }
 fs.writeFileSync(filename,text);console.log('Administrador vinculado à conta existente. Reinicie o backend. Senha e histórico foram preservados.');
}catch(error){console.error(error.message);process.exitCode=1;}
