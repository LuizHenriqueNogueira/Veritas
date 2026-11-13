// Uma única análise sintética, sujeita ao mesmo orçamento persistente da aplicação.
const path=require('node:path');
process.chdir(path.join(__dirname,'../apps/api'));
require(require.resolve('dotenv',{paths:[process.cwd()]})).config({path:'.env'});
const {factCheckService}=require('../apps/api/dist/services/factcheck/factcheck.service.js');
const {aiService}=require('../apps/api/dist/services/ai/ai.service.js');
(async()=>{
  const text=process.argv.slice(2).join(' ') || 'O cantor Roberto Carlos não morreu. As mensagens que anunciam sua morte são falsas.';
  const pesquisa=await factCheckService.consultar(text,undefined,'desinformacao');
  const resultado=await aiService.analisar('desinformacao',text,pesquisa);
  console.log(JSON.stringify({iaAtiva:resultado!==null,classificacao:resultado?.classificacao,resultado:resultado?.resultado,consumo:aiService.status()},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
