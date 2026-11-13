// Não chama modelos: consulta somente as APIs públicas dos dois portais.
const path=require('node:path');
process.chdir(path.join(__dirname,'../apps/api'));
require(require.resolve('dotenv',{paths:[process.cwd()]})).config({path:'.env'});
const {factCheckService}=require('../apps/api/dist/services/factcheck/factcheck.service.js');
(async()=>{
  const resultado=await factCheckService.consultar('Mensagem de demonstração',process.argv.slice(2).join(' ') || 'roberto carlos morreu');
  console.log(JSON.stringify({...resultado,sources:resultado.sources.map(({text,...s})=>({...s,textChars:text?.length || 0}))},null,2));
  if(!resultado.sources.length)process.exitCode=1;
})().catch(()=>{console.error('Não foi possível consultar as checagens. Confira sua conexão e tente mais tarde.');process.exitCode=1;});
